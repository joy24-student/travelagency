"""
WebSocket Endpoints for Real-Time Booking Updates and Live Flight Seat Tracking.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websockets.connection_manager import ws_manager

ws_router = APIRouter(prefix="/ws", tags=["Real-Time WebSockets"])


@ws_router.websocket("/bookings/{booking_id}")
async def booking_live_updates(websocket: WebSocket, booking_id: str):
    """
    Real-time push channel for booking updates and payment confirmations.
    Clients receive instant confirmation pushes when payment webhooks arrive.
    """
    channel = f"booking:{booking_id}"
    await ws_manager.connect(websocket, channel)
    try:
        while True:
            # Keepalive ping/pong
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket, channel)


@ws_router.websocket("/flights/{flight_id}/seats")
async def flight_seat_live_tracker(websocket: WebSocket, flight_id: str):
    """
    Real-time seat reservation broadcast.
    Informs mobile users immediately when another passenger selects or reserves a seat.
    """
    channel = f"flight:{flight_id}:seats"
    await ws_manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket, channel)
