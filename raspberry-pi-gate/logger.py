"""
Structured logging for Raspberry Pi Gate Device.

Provides rotating file logs + optional console output with
structured fields for every gate event.
"""

import json
import logging
import logging.handlers
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional


class JsonFormatter(logging.Formatter):
    """Formats log records as JSON for machine-parseable output."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Include extra structured fields
        for key in (
            "event", "decision", "confidence", "student_name",
            "student_id", "request_id", "duration_ms", "error",
            "retry_count", "gate_opened", "camera_status",
            "backend_status", "relay_status",
        ):
            value = getattr(record, key, None)
            if value is not None:
                log_entry[key] = value

        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)


class HumanFormatter(logging.Formatter):
    """Human-readable console formatter with color codes."""

    COLORS = {
        "DEBUG": "\033[36m",    # cyan
        "INFO": "\033[32m",     # green
        "WARNING": "\033[33m",  # yellow
        "ERROR": "\033[31m",    # red
        "CRITICAL": "\033[35m", # magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.RESET)
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        msg = f"{color}[{ts}] [{record.levelname:8s}] {record.name}: {record.getMessage()}{self.RESET}"

        # Append key extras inline
        extras = []
        for key in ("event", "decision", "confidence", "student_name"):
            value = getattr(record, key, None)
            if value is not None:
                extras.append(f"{key}={value}")
        if extras:
            msg += f"  ({', '.join(extras)})"

        if record.exc_info and record.exc_info[0] is not None:
            msg += "\n" + self.formatException(record.exc_info)

        return msg


def setup_logging(
    log_dir: str = "logs",
    log_level: str = "INFO",
    log_to_console: bool = True,
    log_max_bytes: int = 5_242_880,
    log_backup_count: int = 5,
    device_id: str = "gate-pi",
) -> logging.Logger:
    """
    Configure application-wide logging.

    Creates:
      - logs/gate_device.json  (JSON structured, rotating)
      - logs/gate_device.log   (human-readable, rotating)
      - console output (optional)

    Returns the root gate logger.
    """
    # Create log directory
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)

    # Root gate logger
    logger = logging.getLogger("gate")
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    logger.handlers.clear()
    logger.propagate = False

    # JSON file handler
    json_handler = logging.handlers.RotatingFileHandler(
        log_path / "gate_device.json",
        maxBytes=log_max_bytes,
        backupCount=log_backup_count,
        encoding="utf-8",
    )
    json_handler.setLevel(logging.DEBUG)
    json_handler.setFormatter(JsonFormatter())
    logger.addHandler(json_handler)

    # Human-readable file handler
    file_handler = logging.handlers.RotatingFileHandler(
        log_path / "gate_device.log",
        maxBytes=log_max_bytes,
        backupCount=log_backup_count,
        encoding="utf-8",
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(HumanFormatter())
    logger.addHandler(file_handler)

    # Console handler
    if log_to_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(getattr(logging, log_level.upper(), logging.INFO))
        console_handler.setFormatter(HumanFormatter())
        logger.addHandler(console_handler)

    # Suppress noisy third-party loggers
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)

    logger.info("Logging initialized", extra={"event": "logging_init", "device_id": device_id})

    return logger


def get_logger(name: str) -> logging.Logger:
    """Get a child logger under the 'gate' namespace."""
    return logging.getLogger(f"gate.{name}")


class GateEventLogger:
    """
    Convenience wrapper for logging gate-specific events
    with consistent structured fields.
    """

    def __init__(self, logger: logging.Logger) -> None:
        self._logger = logger

    def verification_request(self, request_id: str, image_size: int) -> None:
        self._logger.info(
            "Sending verification request",
            extra={"event": "verification_request", "request_id": request_id, "image_bytes": image_size},
        )

    def verification_response(
        self,
        request_id: str,
        decision: str,
        confidence: float,
        student_name: str,
        student_id: str,
        duration_ms: float,
    ) -> None:
        self._logger.info(
            f"Verification result: {decision}",
            extra={
                "event": "verification_response",
                "request_id": request_id,
                "decision": decision,
                "confidence": confidence,
                "student_name": student_name,
                "student_id": student_id,
                "duration_ms": round(duration_ms, 2),
            },
        )

    def gate_opened(self, student_name: str, duration_seconds: float) -> None:
        self._logger.info(
            f"Gate opened for {student_name}",
            extra={
                "event": "gate_opened",
                "gate_opened": True,
                "student_name": student_name,
                "duration_seconds": duration_seconds,
            },
        )

    def gate_denied(self, reason: str, student_name: Optional[str] = None) -> None:
        self._logger.warning(
            f"Access denied: {reason}",
            extra={
                "event": "gate_denied",
                "decision": "DENY",
                "gate_opened": False,
                "student_name": student_name or "unknown",
            },
        )

    def camera_error(self, error: str) -> None:
        self._logger.error(
            f"Camera error: {error}",
            extra={"event": "camera_error", "error": error},
        )

    def api_error(self, error: str, retry_count: int = 0) -> None:
        self._logger.error(
            f"API error: {error}",
            extra={"event": "api_error", "error": error, "retry_count": retry_count},
        )

    def health_check(self, camera_ok: bool, backend_ok: bool, relay_ok: bool) -> None:
        status = "HEALTHY" if all([camera_ok, backend_ok, relay_ok]) else "DEGRADED"
        self._logger.info(
            f"Health check: {status}",
            extra={
                "event": "health_check",
                "camera_status": "ok" if camera_ok else "fail",
                "backend_status": "ok" if backend_ok else "fail",
                "relay_status": "ok" if relay_ok else "fail",
            },
        )

    def token_refreshed(self) -> None:
        self._logger.info("JWT token refreshed", extra={"event": "token_refresh"})

    def retry_attempt(self, attempt: int, max_attempts: int, wait_seconds: float) -> None:
        self._logger.warning(
            f"Retry {attempt}/{max_attempts} in {wait_seconds:.1f}s",
            extra={"event": "retry", "retry_count": attempt},
        )