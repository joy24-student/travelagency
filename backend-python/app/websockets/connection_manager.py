"""
Distributed WebSocket Connection Manager with Redis Pub/Sub Backplane.
Enables real-time push notifications across scaled multi-worker container clusters.
"""

import asyncio
import logging
from collections import defaultdict
from typing import Dict, Set
from fastapi import WebSocket
import orjson

from app.core.redis import _redis_client

logger = logging.getLogger(__name__)


class DistributedConnectionManager:
    """Manages active WebSockets and coordinates broadcasts via Redis Pub/Sub."""

    def __init__(self):
        # Local mapping: channel_name -> Set[WebSocket]
        self._active_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        self._listener_tasks: Dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, channel: str) -> None:
        """Register client to specific channel (e.g. 'booking:123', 'flight_tracker:456')."""
        await websocket.accept()
        async with self._lock:
            self._active_connections[channel].add(websocket)
            logger.info(f"WebSocket client connected to channel '{channel}' (Total: {len(self._active_connections[channel])})")

            # Start Redis Pub/Sub subscriber task for this channel if not running
            if _redis_client and channel not in self._listener_tasks:
                task = asyncio.create_task(self._listen_redis_channel(channel))
                self._listener_tasks[channel] = task

    async def disconnect(self, websocket: WebSocket, channel: str) -> None:
        """Unregister client on close."""
        async with self._lock:
            if channel in self._active_connections:
                self._active_connections[channel].discard(websocket)
                if not self._active_connections[channel]:
                    del self._active_connections[channel]
                    # Cancel Redis subscriber task if no local listeners remain
                    if channel in self._listener_tasks:
                        self._listener_tasks[channel].cancel()
                        del self._listener_tasks[channel]

        logger.info(f"WebSocket client disconnected from channel '{channel}'")

    async def broadcast_to_channel(self, channel: str, message: dict) -> None:
        """Broadcast message to all clients on channel across all cluster nodes."""
        payload_bytes = orjson.dumps(message)

        # 1. Broadcast locally
        await self._broadcast_local(channel, payload_bytes)

        # 2. Publish to Redis for other cluster instances
        if _redis_client:
            try:
                await _redis_client.publish(f"ws:{channel}", payload_bytes)
            except Exception as exc:
                logger.warning(f"Redis Pub/Sub publish failed for channel '{channel}': {exc}")

    async def _broadcast_local(self, channel: str, payload_bytes: bytes) -> None:
        """Send message to all local WebSockets on channel."""
        dead_sockets = set()
        for ws in list(self._active_connections.get(channel, set())):
            try:
                await ws.send_bytes(payload_bytes)
            except Exception:
                dead_sockets.add(ws)

        for dead in dead_sockets:
            await self.disconnect(dead, channel)

    async def _listen_redis_channel(self, channel: str) -> None:
        """Background coroutine consuming messages from Redis Pub/Sub."""
        if not _redis_client:
            return

        try:
            pubsub = _redis_client.pubsub()
            await pubsub.subscribe(f"ws:{channel}")
            async for msg in pubsub.listen():
                if msg and msg.get("type") == "message":
                    data = msg.get("data")
                    if isinstance(data, (bytes, str)):
                        raw_bytes = data if isinstance(data, bytes) else data.encode("utf-8")
                        await self._broadcast_local(channel, raw_bytes)
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.warning(f"Error in Redis Pub/Sub listener for channel '{channel}': {exc}")


ws_manager = DistributedConnectionManager()
