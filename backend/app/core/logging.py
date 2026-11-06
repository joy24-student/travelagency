"""
Structured JSON Logging with Correlation ID support.
Outputs RFC 5424 / cloud-native JSON logs suitable for Datadog, CloudWatch, GCP Logging.
"""

import json
import logging
import sys
import time
import uuid
from contextvars import ContextVar
from typing import Any, Dict, Optional
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

# Context variable to store correlation ID across async coroutines
correlation_id_ctx: ContextVar[str] = ContextVar("correlation_id", default="")


def get_correlation_id() -> str:
    """Get the current correlation ID or generate a fallback."""
    cid = correlation_id_ctx.get()
    return cid if cid else str(uuid.uuid4())


class JSONLogFormatter(logging.Formatter):
    """Formats log records as structured single-line JSON."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": correlation_id_ctx.get() or getattr(record, "correlation_id", None),
        }

        # Include file/line when debug or error
        if record.levelno >= logging.WARNING or record.levelno == logging.DEBUG:
            log_entry["source"] = f"{record.filename}:{record.lineno}"

        # Capture exception tracebacks if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        # Include any custom extra dictionary attributes
        if hasattr(record, "extra") and isinstance(record.extra, dict):
            log_entry.update(record.extra)

        return json.dumps(log_entry, default=str)


def setup_logging(debug: bool = False) -> None:
    """Configure the root and application loggers with JSON formatting."""
    level = logging.DEBUG if debug else logging.INFO
    formatter = JSONLogFormatter(datefmt="%Y-%m-%dT%H:%M:%S%z")

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing default handlers to avoid duplicate unformatted logs
    for h in list(root_logger.handlers):
        root_logger.removeHandler(h)
    root_logger.addHandler(handler)

    # Intercept uvicorn and sqlalchemy loggers
    for logger_name in ("uvicorn", "uvicorn.access", "uvicorn.error", "sqlalchemy.engine"):
        target_logger = logging.getLogger(logger_name)
        target_logger.handlers = [handler]
        target_logger.propagate = False


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware that reads or generates a correlation ID for tracing distributed requests.
    Injects correlation ID into async context and response headers.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Check standard headers for incoming correlation ID
        correlation_id = (
            request.headers.get("X-Correlation-ID")
            or request.headers.get("X-Request-ID")
            or str(uuid.uuid4())
        )
        token = correlation_id_ctx.set(correlation_id)
        request.state.correlation_id = correlation_id

        logger = logging.getLogger("app.middleware.request")
        start_time = time.perf_counter()

        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # Add header to response
            response.headers["X-Correlation-ID"] = correlation_id

            logger.info(
                f"{request.method} {request.url.path} completed with status {response.status_code} in {duration_ms}ms",
                extra={
                    "extra": {
                        "method": request.method,
                        "path": request.url.path,
                        "status_code": response.status_code,
                        "duration_ms": duration_ms,
                        "client_ip": request.client.host if request.client else None,
                    }
                },
            )
            return response
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(
                f"Unhandled exception during {request.method} {request.url.path}: {exc}",
                exc_info=True,
                extra={
                    "extra": {
                        "method": request.method,
                        "path": request.url.path,
                        "duration_ms": duration_ms,
                    }
                },
            )
            raise exc
        finally:
            correlation_id_ctx.reset(token)
