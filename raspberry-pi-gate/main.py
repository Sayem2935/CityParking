#!/usr/bin/env python3
"""
CityParking Raspberry Pi Gate Device - Main Entry Point.

Production-ready gate controller that:
  1. Captures images from camera (USB webcam or Pi Camera)
  2. Sends images to the CityParking backend for face verification
  3. Opens the gate relay when the backend returns ALLOW
  4. Logs all events with timestamps and details
  5. Runs health checks in the background
  6. Recovers automatically from all failure modes

The Pi NEVER performs local face recognition. All AI is server-side.
"""

import os
import sys
import signal
import time
import argparse

from config import GateConfig, load_config
from logger import get_logger, GateEventLogger
from camera import Camera, CameraError
from api_client import ApiClient, VerificationResult
from relay import RelayController
from health import HealthChecker

logger = get_logger("main")
event_logger = GateEventLogger(logger)


class GateDevice:
    """
    Main gate device orchestrator.

    Manages the verification loop:
      capture → send → receive → open/deny
    """

    def __init__(self, config: GateConfig) -> None:
        self._config = config
        self._running = False

        # Initialize components
        self._camera = Camera(config)
        self._api = ApiClient(config)
        self._relay = RelayController(config)
        self._health = HealthChecker(
            config=config,
            camera_check=lambda: self._camera.is_healthy,
            backend_check=lambda: self._api.check_health(),
            internet_check=lambda: self._api.check_internet(),
            relay_check=lambda: self._relay.is_healthy,
        )

    def start(self) -> None:
        """Start all subsystems and the main verification loop."""
        logger.info("=" * 60)
        logger.info("CityParking Gate Device Starting")
        logger.info("Backend: %s", self._config.backend_url)
        logger.info("Camera index: %d", self._config.camera_index)
        logger.info("Resolution: %dx%d", self._config.capture_width, self._config.capture_height)
        logger.info("Relay pin: %d", self._config.relay_pin)
        logger.info("Gate open duration: %.1fs", self._config.gate_open_seconds)
        logger.info("=" * 60)

        # Start subsystems
        try:
            self._relay.start()
            self._camera.start()
        except Exception as e:
            logger.error("Failed to start subsystems: %s", e)
            self.stop()
            sys.exit(1)

        # Authenticate with backend
        if not self._api.login():
            logger.warning("Initial login failed - will retry during verification")

        # Start health checker
        self._health.start()

        # Main loop
        self._running = True
        logger.info("Gate device ready - entering verification loop")
        self._verification_loop()

    def stop(self) -> None:
        """Gracefully stop all subsystems."""
        logger.info("Shutting down gate device...")
        self._running = False
        self._health.stop()
        self._camera.stop()
        self._relay.close_gate()
        self._relay.stop()
        self._api.close()
        logger.info("Gate device stopped")

    def _verification_loop(self) -> None:
        """Main loop: capture → verify → open/deny."""
        while self._running:
            try:
                # Check if we should pause (health issues)
                if not self._health.is_healthy:
                    status = self._health.status_summary
                    logger.warning("Health check failed: %s", status)
                    # Wait and retry
                    self._sleep_interruptible(self._config.capture_interval * 2)
                    continue

                # Capture frame
                jpeg_bytes = self._camera.capture_jpeg(quality=self._config.jpeg_quality)
                if jpeg_bytes is None:
                    logger.debug("No frame captured, retrying...")
                    self._sleep_interruptible(self._config.capture_interval)
                    continue

                # Send to backend for verification
                result = self._api.verify_face(jpeg_bytes)

                # Process result
                self._process_result(result)

                # Wait before next capture
                self._sleep_interruptible(self._config.capture_interval)

            except KeyboardInterrupt:
                logger.info("Keyboard interrupt received")
                break
            except Exception as e:
                logger.error("Verification loop error: %s", e)
                self._sleep_interruptible(self._config.capture_interval * 2)

    def _process_result(self, result: VerificationResult) -> None:
        """Process verification result and act on gate."""
        if not result.success:
            logger.warning("Verification failed: %s", result.reason)
            return

        if result.decision == "ALLOW":
            logger.info("ACCESS ALLOWED - %s (%s) confidence=%.2f",
                        result.student_name, result.student_id, result.confidence)
            event_logger.gate_opened(result.student_name, result.student_id, result.confidence)
            self._relay.open_gate()
        else:
            logger.info("ACCESS DENIED - %s (%s) decision=%s confidence=%.2f",
                        result.student_name, result.student_id, result.decision, result.confidence)
            event_logger.gate_denied(result.student_name, result.student_id, result.decision)

    def _sleep_interruptible(self, seconds: float) -> None:
        """Sleep in small increments so we can respond to shutdown."""
        end = time.monotonic() + seconds
        while self._running and time.monotonic() < end:
            time.sleep(0.1)


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="CityParking Raspberry Pi Gate Device",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py                          # Use default config.json
  python main.py --config custom.json     # Use custom config
  python main.py --backend http://myhost:8080 --camera 1
        """,
    )
    parser.add_argument(
        "--config",
        type=str,
        default="config.json",
        help="Path to config.json (default: config.json)",
    )
    parser.add_argument("--backend", type=str, help="Backend URL override")
    parser.add_argument("--camera", type=int, help="Camera index override")
    parser.add_argument("--relay-pin", type=int, help="Relay GPIO pin override")
    parser.add_argument("--dry-run", action="store_true", help="Enable dry-run mode")
    return parser.parse_args()


def main() -> None:
    """Application entry point."""
    args = parse_args()

    # Load configuration
    config_path = os.path.join(os.path.dirname(__file__), args.config)
    if not os.path.exists(config_path):
        # Try relative to CWD
        config_path = args.config

    config = load_config(config_path)

    # Apply CLI overrides
    if args.backend:
        config.backend_url = args.backend
    if args.camera is not None:
        config.camera_index = args.camera
    if args.relay_pin is not None:
        config.relay_pin = args.relay_pin

    # Create and start device
    device = GateDevice(config)

    # Handle graceful shutdown
    def signal_handler(signum, frame):
        logger.info("Signal %d received, shutting down...", signum)
        device.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        device.start()
    except Exception as e:
        logger.critical("Fatal error: %s", e, exc_info=True)
        device.stop()
        sys.exit(1)


if __name__ == "__main__":
    main()