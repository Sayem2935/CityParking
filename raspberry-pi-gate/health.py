"""
Health check module for Raspberry Pi Gate Device.

Runs background checks for camera, backend, internet, and relay connectivity.
"""

import time
import threading
from typing import Callable, Optional

from logger import get_logger, GateEventLogger
from config import GateConfig

logger = get_logger("health")


class HealthChecker:
    """
    Background health monitor for gate device components.

    Checks every interval:
      - Camera responsiveness
      - Backend reachability
      - Internet connectivity
      - Relay functionality

    Notifies via callback on status changes.
    """

    def __init__(
        self,
        config: GateConfig,
        camera_check: Callable[[], bool],
        backend_check: Callable[[], bool],
        internet_check: Callable[[], bool],
        relay_check: Callable[[], bool],
        on_status_change: Optional[Callable[[bool, bool, bool], None]] = None,
    ) -> None:
        """
        Initialize health checker.

        Args:
            config: Application configuration.
            camera_check: Function that returns True if camera is working.
            backend_check: Function that returns True if backend is reachable.
            internet_check: Function that returns True if internet is available.
            relay_check: Function that returns True if relay is functional.
            on_status_change: Optional callback(camera_ok, backend_ok, relay_ok).
        """
        self._config = config
        self._camera_check = camera_check
        self._backend_check = backend_check
        self._internet_check = internet_check
        self._relay_check = relay_check
        self._on_status_change = on_status_change
        self._event_logger = GateEventLogger(logger)

        self._thread: Optional[threading.Thread] = None
        self._running = False
        self._last_camera_ok = True
        self._last_backend_ok = True
        self._last_internet_ok = True
        self._last_relay_ok = True
        self._consecutive_failures = 0

    def start(self) -> None:
        """Start the background health check thread."""
        if self._running:
            return

        self._running = True
        self._thread = threading.Thread(
            target=self._check_loop,
            daemon=True,
            name="health-checker",
        )
        self._thread.start()
        logger.info("Health checker started (interval=%ds)", self._config.health_check_interval)

    def stop(self) -> None:
        """Stop the health check thread."""
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5.0)
        logger.info("Health checker stopped")

    def _check_loop(self) -> None:
        """Main health check loop."""
        while self._running:
            try:
                self._perform_checks()
                self._consecutive_failures = 0
            except Exception as e:
                self._consecutive_failures += 1
                logger.error("Health check error: %s (consecutive: %d)",
                             e, self._consecutive_failures)

            # Sleep in small increments to allow quick shutdown
            for _ in range(self._config.health_check_interval * 2):
                if not self._running:
                    break
                time.sleep(0.5)

    def _perform_checks(self) -> None:
        """Run all health checks and report status."""
        camera_ok = self._camera_check()
        backend_ok = self._backend_check()
        internet_ok = self._internet_check()
        relay_ok = self._relay_check()

        # Check for status changes
        status_changed = (
            camera_ok != self._last_camera_ok or
            backend_ok != self._last_backend_ok or
            internet_ok != self._last_internet_ok or
            relay_ok != self._last_relay_ok
        )

        if status_changed:
            self._event_logger.health_check(camera_ok, backend_ok, relay_ok)
            if self._on_status_change:
                self._on_status_change(camera_ok, backend_ok, relay_ok)

        # Update last known status
        self._last_camera_ok = camera_ok
        self._last_backend_ok = backend_ok
        self._last_internet_ok = internet_ok
        self._last_relay_ok = relay_ok

    @property
    def is_healthy(self) -> bool:
        """Check if all components are currently healthy."""
        return all([
            self._last_camera_ok,
            self._last_backend_ok,
            self._last_internet_ok,
            self._last_relay_ok,
        ])

    @property
    def status_summary(self) -> dict:
        """Get current status summary."""
        return {
            "camera": self._last_camera_ok,
            "backend": self._last_backend_ok,
            "internet": self._last_internet_ok,
            "relay": self._last_relay_ok,
            "healthy": self.is_healthy,
            "consecutive_failures": self._consecutive_failures,
        }