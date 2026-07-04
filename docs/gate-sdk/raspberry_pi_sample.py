#!/usr/bin/env python3
"""
CityParking Gate Controller — Raspberry Pi Sample Client

This is a complete sample implementation for the Raspberry Pi gate device.
It demonstrates camera capture, face verification via the CityParking API,
and GPIO relay control for gate operation.

Requirements:
    pip install opencv-python-headless requests RPi.GPIO

Usage:
    python3 raspberry_pi_sample.py

Configuration:
    Edit config.json in the same directory, or use environment variables.

NOTE: This is sample code for reference only. Adapt to your specific
      hardware setup and requirements.
"""

import cv2
import json
import logging
import os
import random
import signal
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple

import requests

# ---------------------------------------------------------------------------
# Conditional GPIO import (allows running on non-Pi machines for testing)
# ---------------------------------------------------------------------------
try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except (ImportError, RuntimeError):
    GPIO_AVAILABLE = False
    print("[WARNING] RPi.GPIO not available — running in simulation mode")

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("/var/log/gate-access.log", mode="a"),
    ],
)
logger = logging.getLogger("gate-controller")


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DEFAULT_CONFIG = {
    "server_url": "https://cityparking-api.onrender.com/api",
    "device_email": "gate-device@cityparking.edu",
    "device_password": "change-me",
    "camera_index": 0,
    "capture_width": 640,
    "capture_height": 480,
    "capture_jpeg_quality": 85,
    "relay_gpio_pin": 17,
    "relay_duration_ms": 5000,
    "request_timeout_sec": 30,
    "max_retries": 5,
    "initial_retry_delay_sec": 2,
    "max_retry_delay_sec": 60,
    "token_refresh_hours": 20,
    "min_request_interval_sec": 2.0,
    "motion_threshold": 5000,
    "led_red_pin": 27,
    "led_green_pin": 22,
}


def load_config(config_path: str = "config.json") -> dict:
    """Load configuration from JSON file, falling back to defaults."""
    config = DEFAULT_CONFIG.copy()
    path = Path(config_path)

    if path.exists():
        try:
            with open(path, "r") as f:
                file_config = json.load(f)
            config.update(file_config)
            logger.info("Configuration loaded from %s", config_path)
        except (json.JSONDecodeError, IOError) as e:
            logger.error("Failed to load config file: %s — using defaults", e)
    else:
        logger.warning("Config file %s not found — using defaults", config_path)

    # Allow environment variable overrides
    env_map = {
        "GATE_SERVER_URL": "server_url",
        "GATE_EMAIL": "device_email",
        "GATE_PASSWORD": "device_password",
        "GATE_CAMERA_INDEX": ("camera_index", int),
        "GATE_RELAY_PIN": ("relay_gpio_pin", int),
        "GATE_TIMEOUT": ("request_timeout_sec", int),
    }
    for env_key, cfg_key in env_map.items():
        env_val = os.environ.get(env_key)
        if env_val is not None:
            if isinstance(cfg_key, tuple):
                config[cfg_key[0]] = cfg_key[1](env_val)
            else:
                config[cfg_key] = env_val
            logger.info("Config override from env: %s", env_key)

    return config


# ---------------------------------------------------------------------------
# GPIO / Hardware Controller
# ---------------------------------------------------------------------------
class HardwareController:
    """Manages GPIO pins for relay and LED control."""

    def __init__(self, config: dict):
        self.relay_pin = config["relay_gpio_pin"]
        self.led_red_pin = config.get("led_red_pin", 27)
        self.led_green_pin = config.get("led_green_pin", 22)
        self.relay_duration_ms = config["relay_duration_ms"]
        self._setup()

    def _setup(self):
        if not GPIO_AVAILABLE:
            logger.info("[SIM] GPIO setup skipped — no hardware")
            return
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)
        GPIO.setup(self.relay_pin, GPIO.OUT)
        GPIO.output(self.relay_pin, GPIO.LOW)
        GPIO.setup(self.led_red_pin, GPIO.OUT)
        GPIO.setup(self.led_green_pin, GPIO.OUT)
        GPIO.output(self.led_red_pin, GPIO.LOW)
        GPIO.output(self.led_green_pin, GPIO.LOW)
        logger.info("GPIO initialized — relay pin BCM %d", self.relay_pin)

    def open_gate(self):
        """Activate relay to open gate, wait, then deactivate."""
        duration_sec = self.relay_duration_ms / 1000.0
        if GPIO_AVAILABLE:
            GPIO.output(self.relay_pin, GPIO.HIGH)
            GPIO.output(self.led_green_pin, GPIO.HIGH)
            logger.info("Gate OPEN — relay HIGH for %.1fs", duration_sec)
            time.sleep(duration_sec)
            GPIO.output(self.relay_pin, GPIO.LOW)
            GPIO.output(self.led_green_pin, GPIO.LOW)
            logger.info("Gate CLOSED — relay LOW")
        else:
            logger.info("[SIM] Gate OPEN for %.1fs", duration_sec)
            time.sleep(duration_sec)
            logger.info("[SIM] Gate CLOSED")

    def flash_red(self, duration: float = 2.0):
        """Flash red LED to indicate denial."""
        if not GPIO_AVAILABLE:
            logger.info("[SIM] Red LED flash for %.1fs", duration)
            return
        end_time = time.time() + duration
        state = False
        while time.time() < end_time:
            state = not state
            GPIO.output(self.led_red_pin, GPIO.HIGH if state else GPIO.LOW)
            time.sleep(0.3)
        GPIO.output(self.led_red_pin, GPIO.LOW)

    def cleanup(self):
        """Reset all GPIO pins."""
        if GPIO_AVAILABLE:
            GPIO.output(self.relay_pin, GPIO.LOW)
            GPIO.output(self.led_red_pin, GPIO.LOW)
            GPIO.output(self.led_green_pin, GPIO.LOW)
            GPIO.cleanup()
            logger.info("GPIO cleaned up")


# ---------------------------------------------------------------------------
# Camera Controller
# ---------------------------------------------------------------------------
class CameraController:
    """Manages USB camera capture."""

    def __init__(self, config: dict):
        self.camera_index = config["camera_index"]
        self.width = config["capture_width"]
        self.height = config["capture_height"]
        self.jpeg_quality = config["capture_jpeg_quality"]
        self.camera: Optional[cv2.VideoCapture] = None

    def initialize(self) -> bool:
        """Open camera and set resolution."""
        try:
            self.camera = cv2.VideoCapture(self.camera_index)
            if not self.camera.isOpened():
                logger.error("Camera %d failed to open", self.camera_index)
                return False
            self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
            self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
            logger.info(
                "Camera %d initialized at %dx%d",
                self.camera_index, self.width, self.height,
            )
            return True
        except Exception as e:
            logger.error("Camera initialization error: %s", e)
            return False

    def capture(self) -> Optional[bytes]:
        """Capture a frame and return as JPEG bytes."""
        if self.camera is None or not self.camera.isOpened():
            logger.error("Camera not available for capture")
            return None
        ret, frame = self.camera.read()
        if not ret or frame is None:
            logger.error("Failed to capture frame")
            return None
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, self.jpeg_quality]
        success, buffer = cv2.imencode(".jpg", frame, encode_params)
        if not success:
            logger.error("Failed to encode frame as JPEG")
            return None
        return buffer.tobytes()

    def release(self):
        """Release camera resources."""
        if self.camera is not None:
            self.camera.release()
            self.camera = None
            logger.info("Camera released")


# ---------------------------------------------------------------------------
# API Client
# ---------------------------------------------------------------------------
class CityParkingAPI:
    """Client for the CityParking backend API."""

    def __init__(self, config: dict):
        self.base_url = config["server_url"].rstrip("/")
        self.email = config["device_email"]
        self.password = config["device_password"]
        self.timeout = config["request_timeout_sec"]
        self.max_retries = config["max_retries"]
        self.initial_delay = config["initial_retry_delay_sec"]
        self.max_delay = config["max_retry_delay_sec"]
        self.min_interval = config["min_request_interval_sec"]
        self.token: Optional[str] = None
        self.token_acquired_at: float = 0
        self.token_refresh_sec = config["token_refresh_hours"] * 3600
        self.last_request_time: float = 0

    # --- Authentication ---

    def authenticate(self) -> bool:
        """Login and obtain JWT token."""
        logger.info("Authenticating as %s", self.email)
        for attempt in range(3):
            try:
                resp = requests.post(
                    f"{self.base_url}/auth/login",
                    json={"email": self.email, "password": self.password},
                    timeout=15,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("success") and data.get("data", {}).get("token"):
                        self.token = data["data"]["token"]
                        self.token_acquired_at = time.time()
                        logger.info(
                            "Authentication successful (token: ...%s)",
                            self.token[-8:],
                        )
                        return True
                    logger.error("Login failed: %s", data.get("message"))
                else:
                    logger.error("Login HTTP %d: %s", resp.status_code, resp.text)
            except requests.RequestException as e:
                logger.error("Login network error (attempt %d/3): %s", attempt + 1, e)
            time.sleep(5)
        logger.critical("Authentication failed after 3 attempts")
        return False

    def ensure_token(self) -> bool:
        """Check token validity and refresh if needed."""
        if self.token is None:
            return self.authenticate()
        elapsed = time.time() - self.token_acquired_at
        if elapsed > self.token_refresh_sec:
            logger.info("Token refresh needed (age: %.0fs)", elapsed)
            return self.authenticate()
        return True

    # --- Rate Limiting ---

    def _rate_limit(self):
        """Enforce minimum interval between requests."""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self.last_request_time = time.time()

    # --- Verification ---

    def verify_access(self, image_bytes: bytes) -> Optional[dict]:
        """
        Send face image for access verification.
        Returns the parsed JSON response, or None on failure.
        Includes retry logic with exponential backoff.
        """
        if not self.ensure_token():
            return None

        for attempt in range(self.max_retries):
            self._rate_limit()
            try:
                files = {"image": ("capture.jpg", image_bytes, "image/jpeg")}
                headers = {"Authorization": f"Bearer {self.token}"}
                resp = requests.post(
                    f"{self.base_url}/gate/verify",
                    files=files,
                    headers=headers,
                    timeout=self.timeout,
                )

                # Handle 401 — token expired
                if resp.status_code == 401:
                    logger.warning("Token expired (401) — re-authenticating")
                    if self.authenticate():
                        headers = {"Authorization": f"Bearer {self.token}"}
                        resp = requests.post(
                            f"{self.base_url}/gate/verify",
                            files=files,
                            headers=headers,
                            timeout=self.timeout,
                        )
                    else:
                        return None

                # Handle 429 — rate limited
                if resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", 10))
                    logger.warning("Rate limited (429) — waiting %ds", retry_after)
                    time.sleep(retry_after)
                    continue

                # Handle 5xx — server error (retryable)
                if resp.status_code >= 500:
                    delay = self._backoff_delay(attempt)
                    logger.warning(
                        "Server error %d (attempt %d/%d) — retrying in %.1fs",
                        resp.status_code, attempt + 1, self.max_retries, delay,
                    )
                    time.sleep(delay)
                    continue

                # Handle 4xx — client error (not retryable)
                if resp.status_code >= 400:
                    logger.error(
                        "Client error %d: %s",
                        resp.status_code, resp.text[:200],
                    )
                    return resp.json() if resp.text else None

                # Success (200)
                return resp.json()

            except requests.exceptions.Timeout:
                delay = self._backoff_delay(attempt)
                logger.warning(
                    "Request timeout (attempt %d/%d) — retrying in %.1fs",
                    attempt + 1, self.max_retries, delay,
                )
                time.sleep(delay)

            except requests.exceptions.ConnectionError as e:
                delay = self._backoff_delay(attempt)
                logger.warning(
                    "Connection error (attempt %d/%d): %s — retrying in %.1fs",
                    attempt + 1, self.max_retries, e, delay,
                )
                time.sleep(delay)

            except requests.RequestException as e:
                logger.error("Unexpected request error: %s", e)
                return None

        logger.error("Max retries (%d) exhausted", self.max_retries)
        return None

    def _backoff_delay(self, attempt: int) -> float:
        """Calculate exponential backoff delay with jitter."""
        delay = min(
            self.initial_delay * (2 ** attempt),
            self.max_delay,
        )
        jitter = random.uniform(0, delay * 0.1)
        return delay + jitter


# ---------------------------------------------------------------------------
# Gate Controller (Main Logic)
# ---------------------------------------------------------------------------
class GateController:
    """Main gate controller orchestrating camera, API, and hardware."""

    def __init__(self, config: dict):
        self.config = config
        self.hw = HardwareController(config)
        self.camera = CameraController(config)
        self.api = CityParkingAPI(config)
        self.running = False
        self._prev_frame_gray = None

    def start(self):
        """Initialize hardware and start main loop."""
        logger.info("=" * 60)
        logger.info("CityParking Gate Controller starting")
        logger.info("=" * 60)

        # Initialize camera
        if not self.camera.initialize():
            logger.critical("Camera initialization failed — entering safe mode")
            self._safe_mode()
            return

        # Authenticate
        if not self.api.authenticate():
            logger.critical("Authentication failed — entering safe mode")
            self._safe_mode()
            return

        self.running = True
        logger.info("System ready — waiting for vehicles")

        # Main loop
        try:
            while self.running:
                self._main_loop_iteration()
        except KeyboardInterrupt:
            logger.info("Shutdown requested (Ctrl+C)")
        finally:
            self.shutdown()

    def _main_loop_iteration(self):
        """Single iteration of the main capture-verify-act loop."""
        # Capture frame
        image_bytes = self.camera.capture()
        if image_bytes is None:
            logger.warning("Capture failed — retrying in 1s")
            time.sleep(1)
            return

        # Check image size (server max is 10 MB)
        size_mb = len(image_bytes) / (1024 * 1024)
        if size_mb > 10:
            logger.error("Image too large (%.1f MB) — skipping", size_mb)
            return

        logger.info("Captured image (%.1f KB)", len(image_bytes) / 1024)

        # Send for verification
        response = self.api.verify_access(image_bytes)
        if response is None:
            logger.error("Verification request failed — will retry next cycle")
            return

        # Process response
        self._process_response(response)

    def _process_response(self, response: dict):
        """Parse the API response and act on the decision."""
        success = response.get("success", False)
        message = response.get("message", "Unknown")
        data = response.get("data")

        if not success or data is None:
            logger.warning("API error: %s", message)
            self.hw.flash_red(2)
            return

        decision = data.get("decision", "UNKNOWN")
        reason = data.get("reason", "UNKNOWN")
        confidence = data.get("confidence", 0)

        logger.info(
            "Decision: %s | Reason: %s | Confidence: %.2f",
            decision, reason, confidence,
        )

        if decision == "ALLOW":
            user = data.get("user", {})
            vehicle = data.get("vehicle", {})
            logger.info(
                "ACCESS GRANTED — User: %s (%s) | Vehicle: %s %s [%s]",
                user.get("name", "N/A"),
                user.get("email", "N/A"),
                vehicle.get("make", ""),
                vehicle.get("model", ""),
                vehicle.get("licensePlate", "N/A"),
            )
            self.hw.open_gate()
        else:
            logger.info("ACCESS DENIED — Reason: %s", reason)
            self.hw.flash_red(2)

        # Log event locally
        self._log_event(decision, reason, confidence, data)

    def _log_event(self, decision: str, reason: str, confidence: float, data: dict):
        """Append event to local log file."""
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "decision": decision,
            "reason": reason,
            "confidence": confidence,
            "user_id": data.get("user", {}).get("id") if data.get("user") else None,
            "user_name": data.get("user", {}).get("name") if data.get("user") else None,
            "vehicle_plate": data.get("vehicle", {}).get("licensePlate") if data.get("vehicle") else None,
            "access_log_id": data.get("accessLogId"),
        }
        try:
            log_path = "/tmp/gate-events.jsonl"
            with open(log_path, "a") as f:
                f.write(json.dumps(entry) + "\n")
        except IOError as e:
            logger.warning("Failed to write event log: %s", e)

    def _safe_mode(self):
        """Enter safe mode — gate stays closed, attempt reconnect periodically."""
        logger.critical("Entering SAFE MODE — gate stays CLOSED")
        reconnect_interval = 60  # seconds
        while True:
            try:
                logger.info("Safe mode — attempting reconnect...")
                if self.camera.camera is None or not self.camera.camera.isOpened():
                    self.camera.initialize()
                if self.api.authenticate():
                    logger.info("Reconnect successful — resuming normal operation")
                    self.running = True
                    return
            except Exception as e:
                logger.error("Reconnect failed: %s", e)
            logger.info("Safe mode — retrying in %ds", reconnect_interval)
            time.sleep(reconnect_interval)

    def shutdown(self):
        """Graceful shutdown."""
        logger.info("Shutting down gate controller")
        self.running = False
        self.camera.release()
        self.hw.cleanup()
        logger.info("Shutdown complete")


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------
def main():
    """Main entry point."""
    config_path = os.environ.get("GATE_CONFIG", "config.json")
    config = load_config(config_path)

    controller = GateController(config)

    # Handle graceful shutdown signals
    def signal_handler(signum, frame):
        logger.info("Received signal %d — shutting down", signum)
        controller.shutdown()
        sys.exit(0)

    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    controller.start()


if __name__ == "__main__":
    main()