"""
Common reusable Pydantic schemas.
"""

from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class StandardResponse(BaseModel, Generic[T]):
    """Standard success envelope."""
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[T] = None


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated query response envelope."""
    items: List[T] = Field(..., description="Page items")
    total: int = Field(..., description="Total items matching query filter")
    page: int = Field(1, description="Current page number (1-based)")
    page_size: int = Field(20, description="Items per page")
    total_pages: int = Field(1, description="Total number of pages")
    has_next: bool = Field(False, description="Whether another page exists")
    has_prev: bool = Field(False, description="Whether previous page exists")
