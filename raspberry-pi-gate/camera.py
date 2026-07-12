"""
Camera module for Raspberry Pi Gate Device.

Supports USB webcam and Pi Camera with automatic reconnection,
configurable resolution, and a watchdog thread for continuous health monitoring.
"""

import io
import time
import threading
from typing import Optional

import cv2
import numpy as np

from logger import get_logger
from config import GateConfig

logger = get_logger("camera")


class CameraError(Exception):
    """Raised when camera operations fail."""
    pass


class Camera:
    """
    Manages camera capture with automatic reconnection and watchdog.

    Supports:
      - USB webcam via OpenCV
      - Raspberry Pi Camera via picamera2 (fallback to OpenCV)

    Features:
      - Auto-reconnect on disconnect
      - Camera watchdog thread
      - Configurable resolution
      - Warmup frame discard
      - JPEG encoding for API upload
    """

    def __init__(self, config: GateConfig) -> None:
        self._config = config
        self._cap: Optional[cv2.VideoCapture] = None
        self._lock = threading.Lock()
        self._is_healthy = False
        self._last_frame_time: float = 0.0
        self._use_picamera = False
        self._picamera = None
        self._watchdog_thread: Optional[threading.Thread] = None
        self._running = False

    def start(self) -> None:
        """Initialize camera and start watchdog thread."""
        self._running = True
        self._connect()
        self._start_watchdog()
        logger.info("Camera started (index=%d, %dx%d)",
                     self._config.camera_index,
                     self._config.capture_width,
                     self._config.capture_height)

    def stop(self) -> None:
        """Release camera resources and stop watchdog."""
        self._running = False
        if self._watchdog_thread and self._watchdog_thread.is_alive():
            self._watchdog_thread.join(timeout=5.0)
        self._release()
        logger.info("Camera stopped")

    def _connect(self) -> None:
        """Connect to camera, trying picamera2 first, then OpenCV."""
        with self._lock:
            self._release()

            # Try picamera2 first (Raspberry Pi Camera)
            try:
                from picamera2 import Picamera2
                self._picamera = Picamera2()
                config = self._picamera.create_still_configuration(
                    main={"size": (self._config.capture_width, self._config.capture_height)}
                )
                self._picamera.configure(config)
                self._picamera.start()
                self._use_picamera = True
                self._is_healthy = True
                self._last_frame_time = time.monotonic()
                logger.info("Connected via picamera2")
                return
            except (ImportError, Exception) as e:
                logger.debug("picamera2 not available: %s", e)
                self._picamera = None
                self._use_picamera = False

            # Fallback to OpenCV USB webcam
            try:
                self._cap = cv2.VideoCapture(self._config.camera_index)
                if not self._cap.isOpened():
                    raise CameraError(f"Cannot open camera index {self._config.camera_index}")

                self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self._config.capture_width)
                self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self._config.capture_height)
                self._cap.set(cv2.CAP_PROP_FPS, self._config.capture_fps)
                self._cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

                # Warmup: discard initial frames
                for _ in range(self._config.warmup_frames):
                    ret, _ = self._cap.read()
                    if not ret:
                        raise CameraError("Warmup frame read failed")

                self._is_healthy = True
                self._last_frame_time = time.monotonic()
                logger.info("Connected via OpenCV (camera index %d)", self._config.camera_index)
            except Exception as e:
                self._is_healthy = False
                logger.error("Camera connection failed: %s", e)
                raise CameraError(f"Camera connection failed: {e}") from e

    def _release(self) -> None:
        """Release camera resources."""
        if self._picamera is not None:
            try:
                self._picamera.stop()
                self._picamera.close()
            except Exception:
                pass
            self._picamera = None

        if self._cap is not None:
            try:
                self._cap.release()
            except Exception:
                pass
            self._cap = None

        self._is_healthy = False

    def capture_frame(self) -> Optional[np.ndarray]:
        """
        Capture a single frame from the camera.

        Returns:
            numpy array (BGR) of the frame, or None on failure.
        """
        with self._lock:
            if not self._is_healthy:
                logger.warning("Camera not healthy, attempting reconnect")
                try:
                    self._connect()
                except CameraError:
                    return None

            try:
                if self._use_picamera and self._picamera is not None:
                    frame = self._picamera.capture_array()
                    # picamera2 returns RGB, convert to BGR for OpenCV
                    frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                elif self._cap is not None:
                    ret, frame = self._cap.read()
                    if not ret or frame is None:
                        self._is_healthy = False
                        logger.warning("Frame capture failed")
                        return None
                else:
                    return None

                self._last_frame_time = time.monotonic()
                return frame

            except Exception as e:
                self._is_healthy = False
                logger.error("Frame capture exception: %s", e)
                return None

    def capture_jpeg(self, quality: int = 85) -> Optional[bytes]:
        """
        Capture a frame and encode as JPEG bytes.

        Args:
            quality: JPEG compression quality (1-100).

        Returns:
            JPEG bytes, or None on failure.
        """
        frame = self.capture_frame()
        if frame is None:
            return None

        try:
            encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]
            success, buffer = cv2.imencode(".jpg", frame, encode_params)
            if not success:
                logger.warning("JPEG encoding failed")
                return None
            return buffer.tobytes()
        except Exception as e:
            logger.error("JPEG encoding exception: %s", e)
            return None

    @property
    def is_healthy(self) -> bool:
        """Check if the camera is currently healthy."""
        return self._is_healthy

    @property
    def seconds_since_last_frame(self) -> float:
        """Seconds elapsed since last successful frame capture."""
        if self._last_frame_time == 0:
            return float("inf")
        return time.monotonic() - self._last_frame_time

    def _start_watchdog(self) -> None:
        """Start background watchdog thread that monitors camera health."""
        def watchdog_loop() -> None:
            while self._running:
                try:
                    time.sleep(10.0)
                    if not self._running:
                        break

                    # If no frame captured in 30s, consider camera stale
                    if self.seconds_since_last_frame > 30.0:
                        logger.warning("Camera watchdog: no frames in %.0fs, reconnecting",
                                       self.seconds_since_last_frame)
                        try:
                            self._connect()
                        except CameraError as e:
                            logger.error("Watchdog reconnect failed: %s", e)
                    else:
                        # Try a test capture
                        if not self._is_healthy:
                            logger.info("Watchdog: camera unhealthy, reconnecting")
                            try:
                                self._connect()
                            except CameraError:
                                pass
                except Exception as e:
                    logger.error("Watchdog exception: %s", e)

        self._watchdog_thread = threading.Thread(
            target=watchdog_loop, daemon=True, name="camera-watchdog"
        )
        self._watchdog_thread.start()
        logger.debug("Camera watchdog started")