"""
Centralized Error Handling with RFC 7807 Problem Details for HTTP APIs.
Ensures uniform error responses adhering to RFC 7807 (application/problem+json).
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_correlation_id


class InvalidParam(BaseModel):
    name: str = Field(..., description="Field path or query parameter name")
    reason: str = Field(..., description="Validation failure explanation")


class ProblemDetail(BaseModel):
    """RFC 7807 Problem Details representation."""
    type: str = Field(
        default="about:blank",
        description="A URI reference that identifies the problem type"
    )
    title: str = Field(..., description="Short, human-readable summary of the problem type")
    status: int = Field(..., description="HTTP status code")
    detail: Optional[str] = Field(None, description="Human-readable explanation of this occurrence")
    instance: Optional[str] = Field(None, description="URI identifying this specific occurrence")
    correlation_id: str = Field(default_factory=get_correlation_id, description="Tracing correlation ID")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="UTC timestamp of the error"
    )
    invalid_params: Optional[List[InvalidParam]] = Field(None, description="Detailed validation errors")
    code: Optional[str] = Field(None, description="Internal error code for client localization")


# Base Application Exception
class AppException(Exception):
    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        title: str = "Internal Server Error",
        detail: Optional[str] = None,
        code: Optional[str] = None,
        type_uri: Optional[str] = None,
    ):
        super().__init__(detail or title)
        self.status_code = status_code
        self.title = title
        self.detail = detail
        self.code = code or "INTERNAL_ERROR"
        self.type_uri = type_uri or f"https://api.shopnojatra.com/errors/{self.code.lower().replace('_', '-')}"


class NotFoundError(AppException):
    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            title="Resource Not Found",
            detail=f"{resource} identified by '{identifier}' was not found.",
            code="RESOURCE_NOT_FOUND",
        )


class ConflictError(AppException):
    """Raised when an operation would violate consistency (e.g., double-booking seats/rooms)."""
    def __init__(self, detail: str, code: str = "DOUBLE_BOOKING_CONFLICT"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            title="Resource Conflict",
            detail=detail,
            code=code,
        )


class AuthenticationError(AppException):
    def __init__(self, detail: str = "Invalid or expired authentication credentials."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            title="Unauthorized",
            detail=detail,
            code="AUTHENTICATION_FAILED",
        )


class PermissionDeniedError(AppException):
    def __init__(self, detail: str = "You do not have permission to perform this action."):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            title="Forbidden",
            detail=detail,
            code="PERMISSION_DENIED",
        )


class BadRequestError(AppException):
    def __init__(self, detail: str, code: str = "BAD_REQUEST"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            title="Bad Request",
            detail=detail,
            code=code,
        )


class PaymentGatewayError(AppException):
    def __init__(self, detail: str, gateway: str = "unknown"):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            title="Payment Gateway Error",
            detail=f"Payment gateway ({gateway}) returned error: {detail}",
            code="PAYMENT_GATEWAY_ERROR",
        )


def create_problem_response(
    status_code: int,
    title: str,
    detail: Optional[str],
    instance: str,
    code: Optional[str] = None,
    type_uri: Optional[str] = None,
    invalid_params: Optional[List[InvalidParam]] = None,
) -> JSONResponse:
    """Helper to build RFC 7807 compliant responses."""
    problem = ProblemDetail(
        type=type_uri or f"https://api.shopnojatra.com/errors/{(code or 'http-error').lower().replace('_', '-')}",
        title=title,
        status=status_code,
        detail=detail,
        instance=instance,
        correlation_id=get_correlation_id(),
        code=code,
        invalid_params=invalid_params,
    )
    return JSONResponse(
        status_code=status_code,
        content=problem.model_dump(exclude_none=True),
        headers={"Content-Type": "application/problem+json"},
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers on the FastAPI application."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return create_problem_response(
            status_code=exc.status_code,
            title=exc.title,
            detail=exc.detail,
            instance=str(request.url.path),
            code=exc.code,
            type_uri=exc.type_uri,
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        title_map = {
            400: "Bad Request",
            401: "Unauthorized",
            403: "Forbidden",
            404: "Resource Not Found",
            405: "Method Not Allowed",
            409: "Conflict",
            422: "Unprocessable Entity",
            429: "Too Many Requests",
            500: "Internal Server Error",
        }
        return create_problem_response(
            status_code=exc.status_code,
            title=title_map.get(exc.status_code, "HTTP Error"),
            detail=str(exc.detail),
            instance=str(request.url.path),
            code=f"HTTP_{exc.status_code}",
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        invalid_params: List[InvalidParam] = []
        for err in exc.errors():
            loc = ".".join(str(l) for l in err.get("loc", []))
            msg = err.get("msg", "Invalid value")
            invalid_params.append(InvalidParam(name=loc, reason=msg))

        return create_problem_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            title="Validation Failed",
            detail="The request body or parameters failed schema validation.",
            instance=str(request.url.path),
            code="VALIDATION_FAILED",
            invalid_params=invalid_params,
        )

    @app.exception_handler(IntegrityError)
    async def db_integrity_exception_handler(request: Request, exc: IntegrityError):
        # Translate database integrity failures into 409 Conflict
        return create_problem_response(
            status_code=status.HTTP_409_CONFLICT,
            title="Database Conflict",
            detail="Operation violates database uniqueness or foreign key constraint.",
            instance=str(request.url.path),
            code="DATABASE_INTEGRITY_VIOLATION",
        )

    @app.exception_handler(SQLAlchemyError)
    async def db_exception_handler(request: Request, exc: SQLAlchemyError):
        return create_problem_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            title="Database Error",
            detail=str(exc),
            instance=str(request.url.path),
            code="DATABASE_ERROR",
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        return create_problem_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            title="Internal Server Error",
            detail="An unexpected error occurred while processing your request.",
            instance=str(request.url.path),
            code="INTERNAL_SERVER_ERROR",
        )
