"""
Configuration manager for Raspberry Pi Gate Device.

Loads settings from config.json and provides typed access
with sensible defaults and environment variable overrides.
"""

import json
import os
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

CONFIG_FILE = Path(__file__).parent / "config.json"


@dataclass
class GateConfig:
    """Typed configuration for the gate device."""

    # Backend connection
    backend_url: str = "http://localhost:8080"
    username: str = "gate_device"
    password: str = "gate_secure_password"

    # Camera settings
    camera_index: int = 0
    capture_width: int = 1280
    capture_height: int = 720
    capture_fps: int = 15
    warmup_frames: int = 10
    frame_retry_delay: float = 0.5

    # GPIO / Relay settings
    relay_pin: int = 17
    gate_open_seconds: float = 3.0
    relay_active_high: bool = True

    # Network / API
    timeout: int = 30
    retry_count: int = 3
    retry_backoff_base: float = 2.0
    retry_backoff_max: float = 60.0
    jwt_refresh_margin_seconds: int = 300  # refresh 5 min before expiry

    # Device identification
    device_id: str = "gate-pi-001"
    gate_location: str = "Main Entrance"

    # Health check interval
    health_check_interval: int = 60

    # Verification loop
    loop_cooldown: float = 5.0  # seconds between verification attempts
    no_face_cooldown: float = 2.0  # seconds when no face detected

    # Logging
    log_dir: str = "logs"
    log_max_bytes: int = 5_242_880  # 5 MB
    log_backup_count: int = 5
    log_to_console: bool = True
    log_level: str = "INFO"

    # Security
    verify_ssl: bool = True

    @classmethod
    def load(cls, config_path: Optional[str] = None) -> "GateConfig":
        """
        Load configuration from JSON file, with environment variable overrides.

        Priority: Environment variables > config.json > defaults
        """
        config = cls()
        path = Path(config_path) if config_path else CONFIG_FILE

        # Load from JSON file
        if path.exists():
            try:
                with open(path, "r") as f:
                    data = json.load(f)
                for key, value in data.items():
                    if hasattr(config, key):
                        setattr(config, key, value)
                logger.info("Configuration loaded from %s", path)
            except (json.JSONDecodeError, IOError) as e:
                logger.warning("Failed to load config from %s: %s. Using defaults.", path, e)
        else:
            logger.warning("Config file %s not found. Using defaults.", path)

        # Environment variable overrides (GATE_ prefix)
        env_map = {
            "GATE_BACKEND_URL": ("backend_url", str),
            "GATE_USERNAME": ("username", str),
            "GATE_PASSWORD": ("password", str),
            "GATE_CAMERA_INDEX": ("camera_index", int),
            "GATE_CAPTURE_WIDTH": ("capture_width", int),
            "GATE_CAPTURE_HEIGHT": ("capture_height", int),
            "GATE_RELAY_PIN": ("relay_pin", int),
            "GATE_OPEN_SECONDS": ("gate_open_seconds", float),
            "GATE_TIMEOUT": ("timeout", int),
            "GATE_RETRY_COUNT": ("retry_count", int),
            "GATE_DEVICE_ID": ("device_id", str),
            "GATE_LOCATION": ("gate_location", str),
            "GATE_LOG_LEVEL": ("log_level", str),
            "GATE_VERIFY_SSL": ("verify_ssl", lambda v: v.lower() in ("true", "1", "yes")),
        }

        for env_var, (attr, cast) in env_map.items():
            value = os.environ.get(env_var)
            if value is not None:
                try:
                    setattr(config, attr, cast(value))
                except (ValueError, TypeError) as e:
                    logger.warning("Invalid env var %s=%s: %s", env_var, value, e)

        return config

    def to_dict(self) -> dict:
        """Serialize config to dictionary."""
        return {k: v for k, v in self.__dict__.items() if not k.startswith("_")}

    def validate(self) -> list[str]:
        """Validate configuration and return list of errors."""
        errors = []
        if not self.backend_url:
            errors.append("backend_url is required")
        if not self.username:
            errors.append("username is required")
        if not self.password:
            errors.append("password is required")
        if self.camera_index < 0:
            errors.append("camera_index must be >= 0")
        if self.capture_width <= 0 or self.capture_height <= 0:
            errors.append("capture dimensions must be positive")
        if self.relay_pin < 0:
            errors.append("relay_pin must be >= 0")
        if self.gate_open_seconds <= 0:
            errors.append("gate_open_seconds must be positive")
        if self.timeout <= 0:
            errors.append("timeout must be positive")
        if self.retry_count < 0:
            errors.append("retry_count must be >= 0")
        return errors