"""
WebSocket Endpoints for Real-Time Mobile App Interactions.
"""

import json
import logging
import uuid
from typing import Optional
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.security import decode_supabase_jwt
from app.websockets.connection_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["WebSockets"])


@router.websocket("/bookings/{booking_id}")
async def websocket_booking_updates(
    websocket: WebSocket,
    booking_id: uuid.UUID,
):
    """
    Real-time updates for a specific booking.
    Notifies mobile client immediately when payment completes or status changes.
    """
    channel = f"booking:{booking_id}"
    await ws_manager.connect(websocket, channel)

    try:
        # Send initial confirmation
        await ws_manager.send_personal_message(
            {
                "event": "connected",
                "channel": channel,
                "message": f"Subscribed to live status updates for booking {booking_id}",
            },
            websocket,
        )

        while True:
            # Keep-alive heartbeat & client pings
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await ws_manager.send_personal_message({"type": "pong"}, websocket)
            except Exception:
                pass

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, channel)
    except Exception as exc:
        logger.warning(f"WebSocket error in {channel}: {exc}")
        ws_manager.disconnect(websocket, channel)


@router.websocket("/concierge")
async def websocket_ai_concierge(
    websocket: WebSocket,
    session_id: Optional[str] = Query(None),
):
    """
    Interactive bidirectional chat with the AI Travel Concierge.
    Enables low-latency back-and-forth travel recommendations.
    """
    active_session = session_id or str(uuid.uuid4())
    channel = f"concierge:{active_session}"
    await ws_manager.connect(websocket, channel)

    try:
        await ws_manager.send_personal_message(
            {
                "event": "session_started",
                "session_id": active_session,
                "message": "Welcome to Shopno Jatra Concierge! Where would you like to travel next?",
            },
            websocket,
        )

        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
                user_msg = data.get("message", "")
            except Exception:
                user_msg = raw_text

            if not user_msg:
                continue

            # Process with concierge
            reply = f"I'd love to help you plan that! Exploring options for: '{user_msg}'..."
            await ws_manager.send_personal_message(
                {
                    "event": "assistant_reply",
                    "session_id": active_session,
                    "text": reply,
                },
                websocket,
            )

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, channel)
    except Exception as exc:
        logger.warning(f"Concierge WS disconnected: {exc}")
        ws_manager.disconnect(websocket, channel)


@router.websocket("/notifications/{user_id}")
async def websocket_user_notifications(
    websocket: WebSocket,
    user_id: uuid.UUID,
    token: Optional[str] = Query(None),
):
    """
    Real-time push notification stream for mobile users (booking updates, price alerts, promotions).
    """
    # Optional token verification if passed in query string for WebSockets
    if token:
        try:
            payload = await decode_supabase_jwt(token)
            if payload.get("sub") != str(user_id):
                await websocket.close(code=4003)
                return
        except Exception:
            await websocket.close(code=4003)
            return

    channel = f"user:{user_id}"
    await ws_manager.connect(websocket, channel)

    try:
        await ws_manager.send_personal_message(
            {
                "event": "notification_stream_ready",
                "user_id": str(user_id),
            },
            websocket,
        )

        while True:
            data = await websocket.receive_text()
            # Client heartbeat
            if "ping" in data.lower():
                await ws_manager.send_personal_message({"type": "pong"}, websocket)

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, channel)
    except Exception as exc:
        logger.warning(f"Notification WS disconnected: {exc}")
        ws_manager.disconnect(websocket, channel)
