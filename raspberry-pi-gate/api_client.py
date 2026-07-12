"""
API Client for Raspberry Pi Gate Device.

Handles JWT authentication, automatic token refresh, multipart image upload,
retry with exponential backoff, and all communication with the CityParking backend.
"""

import time
import uuid
import threading
from dataclasses import dataclass, field
from typing import Any, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from logger import get_logger, GateEventLogger
from config import GateConfig

logger = get_logger("api_client")


@dataclass
class VerificationResult:
    """Parsed response from the gate verification endpoint."""
    success: bool
    decision: str = "UNKNOWN"
    confidence: float = 0.0
    student_name: str = ""
    student_id: str = ""
    reason: str = ""
    raw_response: Optional[dict] = field(default=None, repr=False)
    request_id: str = ""
    duration_ms: float = 0.0


class ApiClientError(Exception):
    """Raised when API operations fail after all retries."""
    pass


class ApiClient:
    """
    HTTP client for the CityParking Gate Verification API.

    Features:
      - JWT login with automatic token refresh
      - Bearer token authentication
      - Multipart image upload to POST /api/gate/verify
      - Retry with exponential backoff
      - Connection pooling via requests.Session
      - Health check support
    """

    def __init__(self, config: GateConfig) -> None:
        self._config = config
        self._token: Optional[str] = None
        self._token_expires_at: float = 0.0
        self._token_lock = threading.Lock()
        self._event_logger = GateEventLogger(logger)

        # Create session with retry adapter for connection-level retries
        self._session = requests.Session()
        retry_strategy = Retry(
            total=2,
            backoff_factor=1.0,
            status_forcelist=[502, 503, 504],
            allowed_methods=["GET", "POST"],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self._session.mount("http://", adapter)
        self._session.mount("https://", adapter)

    def _get_base_url(self) -> str:
        """Return the base URL without trailing slash."""
        return self._config.backend_url.rstrip("/")

    def login(self) -> bool:
        """
        Authenticate with the backend and obtain a JWT token.

        Returns:
            True if login succeeded, False otherwise.
        """
        url = f"{self._get_base_url()}/api/auth/login"
        payload = {
            "usernameOrEmail": self._config.username,
            "password": self._config.password,
        }

        try:
            response = self._session.post(
                url,
                json=payload,
                timeout=self._config.timeout,
                verify=self._config.verify_ssl,
            )
            response.raise_for_status()

            data = response.json()
            with self._token_lock:
                self._token = data.get("token") or data.get("accessToken")
                # Parse expiry from token or set a conservative default (55 min)
                expires_in = data.get("expiresIn", 3300)
                self._token_expires_at = time.monotonic() + expires_in

            if self._token:
                logger.info("Login successful for user: %s", self._config.username)
                self._event_logger.token_refreshed()
                return True
            else:
                logger.error("Login response missing token: %s", list(data.keys()))
                return False

        except requests.RequestException as e:
            logger.error("Login failed: %s", e)
            return False

    def _ensure_token(self) -> bool:
        """Ensure we have a valid token, refreshing if needed."""
        with self._token_lock:
            # Refresh if token expires within the margin
            margin = self._config.jwt_refresh_margin_seconds
            if self._token and time.monotonic() < (self._token_expires_at - margin):
                return True

        # Token missing or expiring soon - re-login
        return self.login()

    def _get_auth_headers(self) -> dict[str, str]:
        """Get authorization headers with current token."""
        with self._token_lock:
            token = self._token
        if not token:
            return {}
        return {"Authorization": f"Bearer {token}"}

    def verify_face(self, image_bytes: bytes) -> VerificationResult:
        """
        Send a captured face image to the gate verification endpoint.

        Endpoint: POST /api/gate/verify
        Content-Type: multipart/form-data with field name "image"

        Args:
            image_bytes: JPEG image bytes.

        Returns:
            VerificationResult with decision, confidence, and student info.
        """
        request_id = str(uuid.uuid4())[:8]
        start_time = time.monotonic()
        self._event_logger.verification_request(request_id, len(image_bytes))

        # Ensure valid JWT
        if not self._ensure_token():
            return VerificationResult(
                success=False,
                reason="Authentication failed",
                request_id=request_id,
            )

        url = f"{self._get_base_url()}/api/gate/verify"
        files = {"image": ("capture.jpg", image_bytes, "image/jpeg")}

        last_error: Optional[Exception] = None
        for attempt in range(1, self._config.retry_count + 1):
            try:
                response = self._session.post(
                    url,
                    files=files,
                    headers=self._get_auth_headers(),
                    timeout=self._config.timeout,
                    verify=self._config.verify_ssl,
                )

                # Handle token expiry - re-login and retry once
                if response.status_code in (401, 403):
                    logger.warning("Auth rejected (status %d), re-authenticating", response.status_code)
                    if self.login():
                        response = self._session.post(
                            url,
                            files=files,
                            headers=self._get_auth_headers(),
                            timeout=self._config.timeout,
                            verify=self._config.verify_ssl,
                        )
                    else:
                        return VerificationResult(
                            success=False,
                            reason="Re-authentication failed",
                            request_id=request_id,
                            duration_ms=(time.monotonic() - start_time) * 1000,
                        )

                response.raise_for_status()
                data = response.json()

                # Parse the API response structure:
                # { "success": true, "data": { "decision", "confidence", "studentName", "studentId", "reason" } }
                inner = data.get("data", data)
                duration_ms = (time.monotonic() - start_time) * 1000

                result = VerificationResult(
                    success=True,
                    decision=inner.get("decision", "UNKNOWN"),
                    confidence=inner.get("confidence", 0.0),
                    student_name=inner.get("studentName", ""),
                    student_id=inner.get("studentId", ""),
                    reason=inner.get("reason", ""),
                    raw_response=data,
                    request_id=request_id,
                    duration_ms=duration_ms,
                )

                self._event_logger.verification_response(
                    request_id,
                    result.decision,
                    result.confidence,
                    result.student_name,
                    result.student_id,
                    duration_ms,
                )
                return result

            except requests.RequestException as e:
                last_error = e
                if attempt < self._config.retry_count:
                    wait = min(
                        self._config.retry_backoff_base ** attempt,
                        self._config.retry_backoff_max,
                    )
                    self._event_logger.retry_attempt(attempt, self._config.retry_count, wait)
                    time.sleep(wait)

        # All retries exhausted
        duration_ms = (time.monotonic() - start_time) * 1000
        error_msg = str(last_error) if last_error else "Unknown error"
        self._event_logger.api_error(error_msg, self._config.retry_count)
        return VerificationResult(
            success=False,
            reason=f"API error after {self._config.retry_count} retries: {error_msg}",
            request_id=request_id,
            duration_ms=duration_ms,
        )

    def check_health(self) -> bool:
        """
        Check if the backend is reachable via the gate health endpoint.

        Returns:
            True if backend responds with success.
        """
        try:
            url = f"{self._get_base_url()}/api/gate/health"
            response = self._session.get(
                url,
                timeout=10,
                verify=self._config.verify_ssl,
            )
            return response.status_code == 200
        except requests.RequestException:
            return False

    def check_internet(self) -> bool:
        """
        Check if the device has internet connectivity.

        Returns:
            True if internet is available.
        """
        try:
            response = self._session.get(
                "https://www.google.com",
                timeout=5,
            )
            return response.status_code == 200
        except requests.RequestException:
            return False

    def close(self) -> None:
        """Close the HTTP session."""
        self._session.close()
        logger.debug("API client session closed")