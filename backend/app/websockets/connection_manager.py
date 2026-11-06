"""
WebSocket Connection Manager.
Handles real-time room-based pub/sub, broadcasting booking updates, and live concierge sessions.
"""

import json
import logging
from collections import defaultdict
from typing import Any, Dict, List, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSockets categorized by channels (e.g., booking ID, user ID)."""

    def __init__(self):
        # channel_name -> set of WebSockets
        self.active_channels: Dict[str, Set[WebSocket]] = defaultdict(set)

    async def connect(self, websocket: WebSocket, channel: str) -> None:
        """Accept WebSocket connection and register to specified channel."""
        await websocket.accept()
        self.active_channels[channel].add(websocket)
        logger.info(f"WebSocket client connected to channel: {channel}. (Active in channel: {len(self.active_channels[channel])})")

    def disconnect(self, websocket: WebSocket, channel: str) -> None:
        """Unregister WebSocket from channel."""
        if channel in self.active_channels:
            self.active_channels[channel].discard(websocket)
            if not self.active_channels[channel]:
                del self.active_channels[channel]
        logger.info(f"WebSocket client disconnected from channel: {channel}")

    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket) -> None:
        """Send message to a single connected client."""
        await websocket.send_text(json.dumps(message, default=str))

    async def broadcast_to_channel(self, channel: str, message: Dict[str, Any]) -> int:
        """Broadcast JSON message to all subscribers of a channel."""
        if channel not in self.active_channels:
            return 0

        dead_connections: List[WebSocket] = []
        sent_count = 0
        payload = json.dumps(message, default=str)

        for connection in list(self.active_channels[channel]):
            try:
                await connection.send_text(payload)
                sent_count += 1
            except Exception as exc:
                logger.warning(f"Error broadcasting to client in {channel}: {exc}")
                dead_connections.append(connection)

        # Cleanup dead connections
        for dead in dead_connections:
            self.disconnect(dead, channel)

        return sent_count


ws_manager = ConnectionManager()
