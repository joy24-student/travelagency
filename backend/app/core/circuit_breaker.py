"""
Enterprise Fintech Circuit Breaker & Fault-Tolerance Pattern.
Prevents cascading failures and thread/connection exhaustion when downstream services hang.
"""

import asyncio
import logging
import time
from enum import Enum
from typing import Any, Callable, Coroutine, Dict, Optional, TypeVar

from app.core.exceptions import AppException

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CircuitState(str, Enum):
    CLOSED = "CLOSED"      # Normal operation
    OPEN = "OPEN"          # Tripped: fail immediately
    HALF_OPEN = "HALF_OPEN"# Testing downstream recovery


class CircuitBreakerOpenException(AppException):
    def __init__(self, service_name: str, retry_after_seconds: float):
        super().__init__(
            status_code=503,
            title="Service Temporarily Unavailable",
            detail=f"Downstream service '{service_name}' is currently unavailable (circuit open). Retry after {int(retry_after_seconds)}s.",
            code="CIRCUIT_BREAKER_OPEN",
        )


class CircuitBreaker:
    """
    Thread-safe / async-safe circuit breaker protecting external APIs (bKash, Nagad, Gemini, R2).
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_time_seconds: float = 20.0,
        expected_exceptions: tuple = (Exception,),
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_time_seconds = recovery_time_seconds
        self.expected_exceptions = expected_exceptions

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0
        self._lock = asyncio.Lock()

    async def call(self, coro_func: Callable[..., Coroutine[Any, Any, T]], *args, **kwargs) -> T:
        """Execute coroutine with circuit breaker protection."""
        async with self._lock:
            now = time.time()

            # Check if open circuit should transition to half-open
            if self.state == CircuitState.OPEN:
                if now - self.last_failure_time > self.recovery_time_seconds:
                    logger.info(f"Circuit Breaker '{self.name}' transitioning from OPEN to HALF_OPEN")
                    self.state = CircuitState.HALF_OPEN
                else:
                    retry_after = self.recovery_time_seconds - (now - self.last_failure_time)
                    raise CircuitBreakerOpenException(self.name, retry_after)

        # Execute call
        try:
            result = await coro_func(*args, **kwargs)
            async with self._lock:
                if self.state == CircuitState.HALF_OPEN:
                    logger.info(f"Circuit Breaker '{self.name}' probe succeeded. Resetting to CLOSED.")
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
            return result
        except self.expected_exceptions as exc:
            async with self._lock:
                self.failure_count += 1
                self.last_failure_time = time.time()
                logger.warning(
                    f"Circuit Breaker '{self.name}' recorded failure ({self.failure_count}/{self.failure_threshold}): {exc}"
                )
                if self.failure_count >= self.failure_threshold:
                    self.state = CircuitState.OPEN
                    logger.error(
                        f"Circuit Breaker '{self.name}' TRIPPED to OPEN! Shedding downstream traffic for {self.recovery_time_seconds}s."
                    )
            raise exc


# Registry of circuit breakers for external systems
bkash_circuit_breaker = CircuitBreaker("bKash_Gateway", failure_threshold=5, recovery_time_seconds=15.0)
nagad_circuit_breaker = CircuitBreaker("Nagad_Gateway", failure_threshold=5, recovery_time_seconds=15.0)
gemini_circuit_breaker = CircuitBreaker("Google_Gemini_AI", failure_threshold=4, recovery_time_seconds=30.0)
r2_circuit_breaker = CircuitBreaker("Cloudflare_R2", failure_threshold=5, recovery_time_seconds=20.0)
