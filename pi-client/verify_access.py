#!/usr/bin/env python3
"""
CityParking — Raspberry Pi Access Verification Client
=======================================================
Thin client that:
  1. Captures a face image from the Pi Camera
  2. Captures a plate image (optional second camera/frame crop)
  3. Sends both to the Spring Boot /api/access/verify endpoint
  4. Displays the access decision (GRANTED / DENIED / ALERT)
  5. Controls the gate relay via GPIO (optional)

Requirements:
  pip install requests Pillow

Usage:
  python verify_access.py                          # one-shot verification
  python verify_access.py --continuous             # continuous loop mode
  python verify_access.py --server http://host:8080  # custom server URL
"""

import argparse
import io
import sys
import time
import logging

import requests
from PIL import Image

# ── Configuration ────────────────────────────────────────────

DEFAULT_SERVER = "http://localhost:8080"
API_ENDPOINT = "/api/access/verify"
CAPTURE_WIDTH = 640
CAPTURE_HEIGHT = 480
LOOP_INTERVAL_SECONDS = 5

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Camera Abstraction ───────────────────────────────────────

def capture_image_picamera() -> bytes:
    """Capture an image using the Raspberry Pi Camera Module (picamera2)."""
    try:
        from picamera2 import Picamera2

        camera = Picamera2()
        config = camera.create_still_configuration(
            main={"size": (CAPTURE_WIDTH, CAPTURE_HEIGHT), "format": "RGB888"}
        )
        camera.configure(config)
        camera.start()
        time.sleep(1)  # Let auto-exposure settle

        array = camera.capture_array()
        camera.stop()

        # Convert numpy array to JPEG bytes
        img = Image.fromarray(array)
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=90)
        return buffer.getvalue()
    except ImportError:
        raise RuntimeError(
            "picamera2 not available. Install with: sudo apt install python3-picamera2"
        )


def capture_image_usb(device_index: int = 0) -> bytes:
    """Capture an image using a USB webcam via OpenCV."""
    try:
        import cv2

        cap = cv2.VideoCapture(device_index)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open camera device {device_index}")

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAPTURE_WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAPTURE_HEIGHT)

        ret, frame = cap.read()
        cap.release()

        if not ret:
            raise RuntimeError("Failed to capture frame from USB camera")

        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
        return buffer.tobytes()
    except ImportError:
        raise RuntimeError(
            "OpenCV not available. Install with: pip install opencv-python-headless"
        )


def capture_image_test() -> bytes:
    """
    Fallback: create a small test image (for development without a camera).
    """
    img = Image.new("RGB", (CAPTURE_WIDTH, CAPTURE_HEIGHT), color=(128, 128, 128))
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=90)
    logger.warning("Using TEST image (no real camera). For production, use --camera pi or --camera usb")
    return buffer.getvalue()


def capture_image(camera_type: str, device_index: int = 0) -> bytes:
    """Capture an image from the configured camera source."""
    if camera_type == "pi":
        return capture_image_picamera()
    elif camera_type == "usb":
        return capture_image_usb(device_index)
    else:
        return capture_image_test()


# ── Access Verification ─────────────────────────────────────

def verify_access(
    server_url: str,
    face_image: bytes,
    plate_image: bytes | None = None,
) -> dict:
    """
    Send face (and optionally plate) images to the server for verification.

    Returns the JSON response from the server.
    """
    url = f"{server_url}{API_ENDPOINT}"
    files = {"faceImage": ("face.jpg", face_image, "image/jpeg")}

    if plate_image:
        files["plateImage"] = ("plate.jpg", plate_image, "image/jpeg")

    logger.info("Sending verification request to %s", url)
    start = time.time()

    try:
        response = requests.post(url, files=files, timeout=30)
        elapsed_ms = (time.time() - start) * 1000
        logger.info("Response: %d (%0.1fms)", response.status_code, elapsed_ms)

        if response.status_code == 200:
            return response.json()
        else:
            logger.error("Server error: %s", response.text[:500])
            return {"success": False, "message": f"Server error: {response.status_code}"}

    except requests.ConnectionError:
        logger.error("Cannot connect to server at %s", server_url)
        return {"success": False, "message": "Connection failed"}
    except requests.Timeout:
        logger.error("Request timed out")
        return {"success": False, "message": "Request timed out"}


# ── Result Display ───────────────────────────────────────────

def display_result(result: dict) -> None:
    """Display the verification result to the console (or LCD in production)."""
    if not result.get("success"):
        logger.warning("❌ Verification failed: %s", result.get("message", "Unknown error"))
        return

    data = result.get("data", {})
    decision = data.get("decision", "UNKNOWN")

    print("\n" + "=" * 50)

    if decision == "ACCESS_GRANTED":
        print("  ✅ ACCESS GRANTED")
        print(f"  User: {data.get('userId', 'N/A')}")
        print(f"  Face Confidence: {data.get('faceConfidence', 0):.1%}")
        if data.get("plateVerified"):
            print(f"  Plate Confidence: {data.get('plateConfidence', 0):.1%}")
    elif decision == "SECURITY_ALERT":
        print("  ⚠️  SECURITY ALERT")
        print(f"  Face verified but plate mismatch")
        print(f"  Face Confidence: {data.get('faceConfidence', 0):.1%}")
    else:
        print("  ❌ ACCESS DENIED")
        print(f"  Message: {data.get('message', 'Verification failed')}")

    print(f"  Processing: {data.get('processingTimeMs', 0):.0f}ms")
    print("=" * 50 + "\n")


# ── GPIO Gate Control (Optional) ─────────────────────────────

def control_gate(decision: str) -> None:
    """
    Control the physical gate relay via GPIO.
    Only runs on Raspberry Pi with RPi.GPIO installed.
    """
    GATE_PIN = 17  # BCM pin number

    try:
        import RPi.GPIO as GPIO

        GPIO.setmode(GPIO.BCM)
        GPIO.setup(GATE_PIN, GPIO.OUT)

        if decision == "ACCESS_GRANTED":
            GPIO.output(GATE_PIN, GPIO.HIGH)
            logger.info("Gate OPENED (GPIO %d HIGH)", GATE_PIN)
            time.sleep(5)  # Keep gate open for 5 seconds
            GPIO.output(GATE_PIN, GPIO.LOW)
            logger.info("Gate CLOSED (GPIO %d LOW)", GATE_PIN)
        else:
            GPIO.output(GATE_PIN, GPIO.LOW)

        GPIO.cleanup(GATE_PIN)
    except ImportError:
        logger.debug("RPi.GPIO not available — skipping gate control")
    except Exception as e:
        logger.error("GPIO error: %s", e)


# ── Main ─────────────────────────────────────────────────────

def run_once(args: argparse.Namespace) -> None:
    """Run a single verification cycle."""
    # Capture face image
    logger.info("Capturing face image...")
    face_image = capture_image(args.camera, args.device)

    # Capture plate image (if plate camera configured)
    plate_image = None
    if args.plate_camera:
        logger.info("Capturing plate image...")
        plate_image = capture_image(args.plate_camera, args.plate_device)

    # Verify
    result = verify_access(args.server, face_image, plate_image)

    # Display result
    display_result(result)

    # Control gate
    if args.gpio:
        data = result.get("data", {})
        control_gate(data.get("decision", "ACCESS_DENIED"))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="CityParking Raspberry Pi Access Verification Client"
    )
    parser.add_argument(
        "--server", default=DEFAULT_SERVER,
        help=f"Server URL (default: {DEFAULT_SERVER})"
    )
    parser.add_argument(
        "--camera", choices=["pi", "usb", "test"], default="test",
        help="Face camera source (default: test)"
    )
    parser.add_argument(
        "--device", type=int, default=0,
        help="USB camera device index for face (default: 0)"
    )
    parser.add_argument(
        "--plate-camera", choices=["pi", "usb", "test"], default=None,
        help="Plate camera source (default: none — face-only verification)"
    )
    parser.add_argument(
        "--plate-device", type=int, default=1,
        help="USB camera device index for plate (default: 1)"
    )
    parser.add_argument(
        "--continuous", action="store_true",
        help="Run in continuous loop mode"
    )
    parser.add_argument(
        "--interval", type=float, default=LOOP_INTERVAL_SECONDS,
        help=f"Seconds between checks in continuous mode (default: {LOOP_INTERVAL_SECONDS})"
    )
    parser.add_argument(
        "--gpio", action="store_true",
        help="Enable GPIO gate control"
    )

    args = parser.parse_args()

    logger.info("CityParking Pi Client — Server: %s", args.server)
    logger.info("Face camera: %s | Plate camera: %s", args.camera, args.plate_camera or "none")

    if args.continuous:
        logger.info("Running in continuous mode (interval: %.1fs)", args.interval)
        try:
            while True:
                run_once(args)
                time.sleep(args.interval)
        except KeyboardInterrupt:
            logger.info("Stopped by user")
            sys.exit(0)
    else:
        run_once(args)


if __name__ == "__main__":
    main()
