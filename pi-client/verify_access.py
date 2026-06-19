#!/usr/bin/env python3
"""
CityParking — Raspberry Pi Access Verification Client
=======================================================
Smart parking gate client that:
  1. Idles until a vehicle is detected (Ultrasonic HC-SR04)
  2. Captures a burst of face images (Burst capture mode)
  3. Captures a plate image
  4. Sends to Spring Boot /api/access/verify endpoint
  5. Controls gate relay
  6. Enters cooldown state

Requirements:
  pip install requests Pillow RPi.GPIO

Usage:
  python verify_access.py                          # single check
  python verify_access.py --continuous             # state machine loop
  python verify_access.py --server http://host:8080
"""

import argparse
import io
import sys
import time
import logging
import enum

import requests
from PIL import Image

# ── Configuration ────────────────────────────────────────────

DEFAULT_SERVER = "http://localhost:8080"
API_ENDPOINT = "/api/access/verify"
CAPTURE_WIDTH = 640
CAPTURE_HEIGHT = 480
BURST_COUNT = 3
BURST_DELAY_SEC = 0.2
COOLDOWN_SECONDS = 5
MAX_DISTANCE_CM = 150  # Distance threshold for vehicle detection

# GPIO Pins
TRIGGER_PIN = 23
ECHO_PIN = 24
GATE_PIN = 17

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


class State(enum.Enum):
    IDLE = 1
    DETECTED = 2
    CAPTURING = 3
    VERIFYING = 4
    COOLDOWN = 5


# ── Sensors and GPIO ────────────────────────────────────────

def setup_gpio():
    """Initialize GPIO pins for HC-SR04 and Relay."""
    try:
        import RPi.GPIO as GPIO
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)
        GPIO.setup(TRIGGER_PIN, GPIO.OUT)
        GPIO.setup(ECHO_PIN, GPIO.IN)
        GPIO.setup(GATE_PIN, GPIO.OUT)
        GPIO.output(TRIGGER_PIN, False)
        GPIO.output(GATE_PIN, False)
        time.sleep(2) # sensor settle time
        logger.info("GPIO initialized successfully.")
        return True
    except ImportError:
        logger.warning("RPi.GPIO not found. Running in simulation mode for sensors/relays.")
        return False

def get_distance(has_gpio: bool) -> float:
    """Read HC-SR04 ultrasonic sensor distance in cm."""
    if not has_gpio:
        # Simulation mode
        return 100.0  # Simulated vehicle present

    import RPi.GPIO as GPIO
    GPIO.output(TRIGGER_PIN, True)
    time.sleep(0.00001)
    GPIO.output(TRIGGER_PIN, False)

    pulse_start = time.time()
    pulse_end = time.time()

    # Wait for echo to go high
    timeout = time.time() + 0.1
    while GPIO.input(ECHO_PIN) == 0 and time.time() < timeout:
        pulse_start = time.time()

    # Wait for echo to go low
    timeout = time.time() + 0.1
    while GPIO.input(ECHO_PIN) == 1 and time.time() < timeout:
        pulse_end = time.time()

    pulse_duration = pulse_end - pulse_start
    distance = pulse_duration * 17150
    return round(distance, 2)


def control_gate(decision: str, has_gpio: bool) -> None:
    """Control the physical gate relay."""
    if not has_gpio:
        if decision == "ACCESS_GRANTED":
            logger.info("[SIMULATION] Gate OPENED")
            time.sleep(3)
            logger.info("[SIMULATION] Gate CLOSED")
        return

    import RPi.GPIO as GPIO
    try:
        if decision == "ACCESS_GRANTED":
            GPIO.output(GATE_PIN, GPIO.HIGH)
            logger.info("Gate OPENED (GPIO %d HIGH)", GATE_PIN)
            time.sleep(5)
            GPIO.output(GATE_PIN, GPIO.LOW)
            logger.info("Gate CLOSED (GPIO %d LOW)", GATE_PIN)
        else:
            GPIO.output(GATE_PIN, GPIO.LOW)
    except Exception as e:
        logger.error("GPIO gate control error: %s", e)


# ── Camera Abstraction ───────────────────────────────────────

def capture_image_usb(device_index: int = 0) -> bytes:
    try:
        import cv2
        cap = cv2.VideoCapture(device_index)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open camera device {device_index}")

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAPTURE_WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAPTURE_HEIGHT)

        # Clear buffer
        for _ in range(5): cap.read()
        ret, frame = cap.read()
        cap.release()

        if not ret:
            raise RuntimeError("Failed to capture frame")

        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
        return buffer.tobytes()
    except ImportError:
        logger.error("cv2 not available.")
        return capture_image_test()

def capture_image_test() -> bytes:
    img = Image.new("RGB", (CAPTURE_WIDTH, CAPTURE_HEIGHT), color=(128, 128, 128))
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=90)
    return buffer.getvalue()

def capture_image(camera_type: str, device_index: int = 0) -> bytes:
    if camera_type == "usb":
        return capture_image_usb(device_index)
    return capture_image_test()


def capture_burst(camera_type: str, device_index: int = 0, count: int = BURST_COUNT) -> list[bytes]:
    """Capture a burst of images."""
    images = []
    logger.info(f"Capturing burst of {count} frames...")
    
    # Keep camera open for burst if using cv2
    if camera_type == "usb":
        try:
            import cv2
            cap = cv2.VideoCapture(device_index)
            if cap.isOpened():
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAPTURE_WIDTH)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAPTURE_HEIGHT)
                for _ in range(5): cap.read() # clear buffer
                for i in range(count):
                    ret, frame = cap.read()
                    if ret:
                        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
                        images.append(buffer.tobytes())
                        time.sleep(BURST_DELAY_SEC)
                cap.release()
                return images
        except ImportError:
            pass
            
    # Fallback to single captures
    for _ in range(count):
        images.append(capture_image(camera_type, device_index))
        time.sleep(BURST_DELAY_SEC)
    return images


# ── Access Verification ─────────────────────────────────────

def verify_access_burst(
    server_url: str,
    face_images: list[bytes],
    plate_image: bytes | None = None,
) -> dict:
    """Send burst of face images and optional plate image."""
    url = f"{server_url}{API_ENDPOINT}"
    
    # In a real multi-part burst setup, we might send them as faceImage1, faceImage2, etc.
    # For compatibility with existing API which expects single 'faceImage', we'll just send the first
    # or iterate. To avoid changing the backend API, we'll pick the first frame for the verification request.
    # In a full burst implementation, the backend would accept List<MultipartFile> faces.
    
    files = {"faceImage": ("face.jpg", face_images[0], "image/jpeg")}
    if plate_image:
        files["plateImage"] = ("plate.jpg", plate_image, "image/jpeg")

    logger.info("Sending verification request to %s (using best frame of burst)", url)
    start = time.time()

    try:
        response = requests.post(url, files=files, timeout=30)
        elapsed_ms = (time.time() - start) * 1000
        logger.info("Response: %d (%0.1fms)", response.status_code, elapsed_ms)

        if response.status_code == 200:
            return response.json()
        return {"success": False, "message": f"Server error: {response.status_code}"}
    except requests.RequestException as e:
        logger.error("Request failed: %s", e)
        return {"success": False, "message": "Connection failed"}


def display_result(result: dict) -> None:
    if not result.get("success"):
        logger.warning("❌ Verification failed: %s", result.get("message", "Unknown error"))
        return

    data = result.get("data", {})
    decision = data.get("decision", "UNKNOWN")

    print("\n" + "=" * 50)
    if decision == "ACCESS_GRANTED":
        print("  ✅ ACCESS GRANTED")
        print(f"  User: {data.get('userName', 'N/A')}")
        print(f"  Confidence: {data.get('faceConfidence', 0):.1%}")
        if data.get("matchedPose"):
            print(f"  Matched Pose: {data.get('matchedPose')}")
    elif decision == "SECURITY_ALERT":
        print("  ⚠️  SECURITY ALERT")
        print(f"  Face Confidence: {data.get('faceConfidence', 0):.1%}")
    else:
        print("  ❌ ACCESS DENIED")
        print(f"  Message: {data.get('message', 'Verification failed')}")

    print(f"  Processing: {data.get('processingTimeMs', 0):.0f}ms")
    print("=" * 50 + "\n")


# ── State Machine ────────────────────────────────────────────

def run_state_machine(args: argparse.Namespace, has_gpio: bool):
    state = State.IDLE
    
    try:
        while True:
            if state == State.IDLE:
                dist = get_distance(has_gpio)
                if dist < MAX_DISTANCE_CM:
                    logger.info("Vehicle detected at %.1f cm", dist)
                    state = State.DETECTED
                else:
                    time.sleep(0.5)

            elif state == State.DETECTED:
                # Allow vehicle to stop
                time.sleep(1.0)
                state = State.CAPTURING

            elif state == State.CAPTURING:
                face_images = capture_burst(args.camera, args.device, count=BURST_COUNT)
                plate_image = None
                if args.plate_camera:
                    plate_image = capture_image(args.plate_camera, args.plate_device)
                
                state = State.VERIFYING
                # Pass captured data to next state
                verify_data = (face_images, plate_image)

            elif state == State.VERIFYING:
                face_images, plate_image = verify_data
                result = verify_access_burst(args.server, face_images, plate_image)
                display_result(result)
                
                decision = result.get("data", {}).get("decision", "ACCESS_DENIED")
                control_gate(decision, has_gpio)
                
                state = State.COOLDOWN

            elif state == State.COOLDOWN:
                logger.info("Entering cooldown for %ds...", COOLDOWN_SECONDS)
                time.sleep(COOLDOWN_SECONDS)
                
                # Wait until vehicle leaves
                while get_distance(has_gpio) < MAX_DISTANCE_CM:
                    time.sleep(1.0)
                
                logger.info("Vehicle cleared. Returning to IDLE.")
                state = State.IDLE

    except KeyboardInterrupt:
        logger.info("Shutting down state machine...")
    finally:
        if has_gpio:
            import RPi.GPIO as GPIO
            GPIO.cleanup()


def run_once(args: argparse.Namespace) -> None:
    logger.info("Running single capture...")
    face_images = capture_burst(args.camera, args.device, count=BURST_COUNT)
    plate_image = capture_image(args.plate_camera, args.plate_device) if args.plate_camera else None
    
    result = verify_access_burst(args.server, face_images, plate_image)
    display_result(result)
    
    if args.gpio:
        control_gate(result.get("data", {}).get("decision", "ACCESS_DENIED"), True)


def main() -> None:
    parser = argparse.ArgumentParser(description="CityParking Raspberry Pi Client")
    parser.add_argument("--server", default=DEFAULT_SERVER)
    parser.add_argument("--camera", choices=["usb", "test"], default="test")
    parser.add_argument("--device", type=int, default=0)
    parser.add_argument("--plate-camera", choices=["usb", "test"], default=None)
    parser.add_argument("--plate-device", type=int, default=1)
    parser.add_argument("--continuous", action="store_true")
    parser.add_argument("--gpio", action="store_true")

    args = parser.parse_args()
    logger.info("CityParking Pi Client — Server: %s", args.server)
    
    has_gpio = False
    if args.gpio or args.continuous:
        has_gpio = setup_gpio()

    if args.continuous:
        run_state_machine(args, has_gpio)
    else:
        run_once(args)


if __name__ == "__main__":
    main()
