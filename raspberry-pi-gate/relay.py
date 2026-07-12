"""
GPIO Relay Controller for Raspberry Pi Gate Device.

Controls the gate relay via Raspberry Pi GPIO pins with configurable
pulse duration, active-high/low support, and fallback for non-Pi systems.
"""

import time
import threading
from typing import Optional

from logger import get_logger
from config import GateConfig

logger = get_logger("relay")


class RelayController:
    """
    Manages GPIO relay for gate actuation.

    Features:
      - Configurable GPIO pin
      - Active-high or active-low relay support
      - Configurable pulse duration
      - Thread-safe gate open/close
      - Dry-run mode for non-Pi systems
      - Health check via GPIO state readback
    """

    def __init__(self, config: GateConfig) -> None:
        self._config = config
        self._gpio = None
        self._is_dry_run = False
        self._gate_open = False
        self._lock = threading.Lock()
        self._open_count = 0

    def start(self) -> None:
        """Initialize GPIO and configure the relay pin."""
        try:
            import RPi.GPIO as GPIO
            self._gpio = GPIO
            self._gpio.setmode(GPIO.BCM)
            self._gpio.setup(self._config.relay_pin, GPIO.OUT)
            # Set initial state to OFF (gate closed)
            initial = GPIO.LOW if self._config.relay_active_high else GPIO.HIGH
            self._gpio.output(self._config.relay_pin, initial)
            self._is_dry_run = False
            logger.info("GPIO relay initialized on pin %d (active-%s)",
                        self._config.relay_pin,
                        "high" if self._config.relay_active_high else "low")
        except (ImportError, RuntimeError) as e:
            logger.warning("GPIO not available (%s), running in dry-run mode", e)
            self._gpio = None
            self._is_dry_run = True

    def stop(self) -> None:
        """Release GPIO resources."""
        if self._gpio is not None:
            try:
                # Ensure relay is OFF
                initial = self._gpio.LOW if self._config.relay_active_high else self._gpio.HIGH
                self._gpio.output(self._config.relay_pin, initial)
                self._gpio.cleanup(self._config.relay_pin)
            except Exception as e:
                logger.error("GPIO cleanup error: %s", e)
        logger.info("Relay controller stopped (total opens: %d)", self._open_count)

    def open_gate(self, duration: Optional[float] = None) -> bool:
        """
        Activate the relay to open the gate.

        Args:
            duration: How long to keep the relay active (seconds).
                      Defaults to config.gate_open_seconds.

        Returns:
            True if gate was activated successfully.
        """
        pulse_time = duration if duration is not None else self._config.gate_open_seconds

        with self._lock:
            if self._is_dry_run:
                logger.info("[DRY-RUN] Gate OPEN for %.1fs", pulse_time)
                self._gate_open = True
                self._open_count += 1
                time.sleep(pulse_time)
                self._gate_open = False
                logger.info("[DRY-RUN] Gate CLOSED")
                return True

            try:
                on_value = self._gpio.HIGH if self._config.relay_active_high else self._gpio.LOW
                off_value = self._gpio.LOW if self._config.relay_active_high else self._gpio.HIGH

                self._gpio.output(self._config.relay_pin, on_value)
                self._gate_open = True
                self._open_count += 1
                logger.info("Gate OPENED (pin %d active for %.1fs)",
                            self._config.relay_pin, pulse_time)

                time.sleep(pulse_time)

                self._gpio.output(self._config.relay_pin, off_value)
                self._gate_open = False
                logger.info("Gate CLOSED")
                return True

            except Exception as e:
                logger.error("Gate relay error: %s", e)
                # Safety: try to deactivate
                try:
                    off_value = self._gpio.LOW if self._config.relay_active_high else self._gpio.HIGH
                    self._gpio.output(self._config.relay_pin, off_value)
                except Exception:
                    pass
                self._gate_open = False
                return False

    def close_gate(self) -> bool:
        """Force-close the gate (deactivate relay)."""
        with self._lock:
            if self._is_dry_run:
                self._gate_open = False
                logger.info("[DRY-RUN] Gate force-CLOSED")
                return True

            try:
                off_value = self._gpio.LOW if self._config.relay_active_high else self._gpio.HIGH
                self._gpio.output(self._config.relay_pin, off_value)
                self._gate_open = False
                logger.info("Gate force-CLOSED")
                return True
            except Exception as e:
                logger.error("Gate close error: %s", e)
                return False

    @property
    def is_healthy(self) -> bool:
        """Check if relay controller is functional."""
        if self._is_dry_run:
            return True
        return self._gpio is not None

    @property
    def is_gate_open(self) -> bool:
        """Check if the gate is currently open."""
        return self._gate_open

    @property
    def total_opens(self) -> int:
        """Total number of gate opens."""
        return self._open_count