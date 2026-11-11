"""
RFC 7807 Compliant Problem Details & Application Exception Hierarchy.
Ensures unified, secure error schemas across all API endpoints with correlation IDs.
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import get_correlation_id

logger = logging.getLogger(__name__)


class InvalidParam(BaseModel):
    name: str = Field(..., description="Field name that failed validation")
    reason: str = Field(..., description="Explanation of validation constraint violation")


class ProblemDetail(BaseModel):
    """RFC 7807 Standard Error Response."""
    type: str = Field(default="about:blank", description="URI reference identifying problem type")
    title: str = Field(..., description="Short, human-readable summary of problem")
    status: int = Field(..., description="HTTP status code")
    detail: Optional[str] = Field(None, description="Human-readable explanation of this occurrence")
    instance: Optional[str] = Field(None, description="URI reference of specific occurrence")
    correlation_id: str = Field(..., description="Unique tracing correlation ID")
    code: Optional[str] = Field(None, description="Application error code for programmatic handling")
    invalid_params: Optional[List[InvalidParam]] = Field(None, description="Field validation errors")


class AppException(Exception):
    """Base class for all business domain exceptions."""
    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        title: str = "Internal Server Error",
        detail: Optional[str] = None,
        code: Optional[str] = None,
        type_uri: Optional[str] = None,
    ):
        self.status_code = status_code
        self.title = title
        self.detail = detail
        self.code = code
        self.type_uri = type_uri
        super().__init__(detail or title)


class NotFoundError(AppException):
    def __init__(self, resource_name: str, identifier: Any):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            title="Resource Not Found",
            detail=f"{resource_name} with identifier '{identifier}' was not found.",
            code="NOT_FOUND",
        )


class AuthenticationError(AppException):
    def __init__(self, detail: str = "Authentication credentials were invalid or missing."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            title="Unauthorized",
            detail=detail,
            code="UNAUTHORIZED",
        )


class PermissionDeniedError(AppException):
    def __init__(self, detail: str = "You do not have permission to perform this action."):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            title="Forbidden",
            detail=detail,
            code="FORBIDDEN",
        )


class ConflictError(AppException):
    def __init__(self, detail: str, code: str = "CONFLICT"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            title="Resource Conflict",
            detail=detail,
            code=code,
        )


class BadRequestError(AppException):
    def __init__(self, detail: str, code: str = "BAD_REQUEST"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            title="Bad Request",
            detail=detail,
            code=code,
        )


class RateLimitExceededError(AppException):
    def __init__(self, detail: str = "Rate limit exceeded. Please retry later."):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            title="Too Many Requests",
            detail=detail,
            code="RATE_LIMIT_EXCEEDED",
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
    """Builds RFC 7807 compliant problem response."""
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
    """Registers exception handlers on the FastAPI application."""

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
            status_code=getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422),
            title="Validation Failed",
            detail="The request body or parameters failed schema validation.",
            instance=str(request.url.path),
            code="VALIDATION_FAILED",
            invalid_params=invalid_params,
        )

    @app.exception_handler(IntegrityError)
    async def db_integrity_exception_handler(request: Request, exc: IntegrityError):
        return create_problem_response(
            status_code=status.HTTP_409_CONFLICT,
            title="Database Conflict",
            detail="Operation violates database uniqueness or foreign key constraint.",
            instance=str(request.url.path),
            code="DATABASE_INTEGRITY_VIOLATION",
        )

    @app.exception_handler(SQLAlchemyError)
    async def db_exception_handler(request: Request, exc: SQLAlchemyError):
        logger.error(f"Database error on {request.url.path}: {exc}", exc_info=True)
        detail = str(exc) if settings.DEBUG else "A persistence layer error occurred. Please try again later."
        return create_problem_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            title="Database Error",
            detail=detail,
            instance=str(request.url.path),
            code="DATABASE_ERROR",
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
        detail = str(exc) if settings.DEBUG else "An unexpected error occurred while processing your request."
        return create_problem_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            title="Internal Server Error",
            detail=detail,
            instance=str(request.url.path),
            code="INTERNAL_SERVER_ERROR",
        )
