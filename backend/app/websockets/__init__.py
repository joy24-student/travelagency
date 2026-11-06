"""WebSockets package."""

from app.websockets.connection_manager import ws_manager
from app.websockets.endpoints import router as ws_router

__all__ = ["ws_manager", "ws_router"]
