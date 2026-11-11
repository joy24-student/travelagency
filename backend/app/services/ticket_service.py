"""
Offline-Capable, Tamper-Proof E-Ticket Cryptographic Signing & Lifecycle Service.
Uses Ed25519 asymmetric cryptography with canonical deterministic JSON serialization.
"""

import json
import logging
import uuid
from datetime import datetime, time, timezone
from typing import Any, Dict, List, Optional
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric import ed25519
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestError, NotFoundError, PermissionDeniedError
from app.models.booking import Booking
from app.models.ticket import Ticket, TicketScan
from app.schemas.ticket import (
    ProcessedScanResult,
    RevocationItem,
    RevocationListResponse,
    ScanBatchRequest,
    ScanBatchResponse,
    TicketResponse,
    TicketScanItem,
)

logger = logging.getLogger(__name__)


def _normalize_ed25519_private_key(key_str: str) -> ed25519.Ed25519PrivateKey:
    """Load Ed25519 private key from hex or raw string."""
    cleaned = key_str.strip()
    try:
        raw_bytes = bytes.fromhex(cleaned)
    except ValueError:
        import base64
        raw_bytes = base64.b64decode(cleaned)

    if len(raw_bytes) != 32:
        raise ValueError(f"Ed25519 private key seed must be exactly 32 bytes, got {len(raw_bytes)}")
    return ed25519.Ed25519PrivateKey.from_private_bytes(raw_bytes)


def _get_signing_key() -> ed25519.Ed25519PrivateKey:
    """Retrieve the application Ed25519 private key from settings."""
    key_str = settings.TICKET_SIGNING_PRIVATE_KEY
    if not key_str:
        raise RuntimeError("TICKET_SIGNING_PRIVATE_KEY is not configured in settings.")
    return _normalize_ed25519_private_key(key_str)


def canonicalize_ticket_payload(payload: Dict[str, Any]) -> bytes:
    """
    Produce canonical, deterministic UTF-8 bytes for cryptographic signing.
    Strictly orders keys and removes extraneous whitespace.
    Zero personal data beyond passenger name and seat.
    """
    canonical_dict = {
        "booking_id": str(payload["booking_id"]),
        "passenger_name": str(payload["passenger_name"]),
        "seat": str(payload["seat"]) if payload.get("seat") is not None else None,
        "service_type": str(payload["service_type"]),
        "ticket_id": str(payload["ticket_id"]),
        "valid_from": str(payload["valid_from"]),
        "valid_to": str(payload["valid_to"]),
    }
    return json.dumps(canonical_dict, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sign_ticket(payload: Dict[str, Any]) -> str:
    """
    Cryptographically sign a ticket payload using Ed25519.
    Returns 128-character hex string representing the 64-byte signature.
    """
    private_key = _get_signing_key()
    message_bytes = canonicalize_ticket_payload(payload)
    signature_bytes = private_key.sign(message_bytes)
    return signature_bytes.hex()


def verify_ticket_signature(
    payload: Dict[str, Any],
    signature_hex: str,
    public_key_hex: Optional[str] = None,
) -> bool:
    """
    Verify Ed25519 signature of a ticket payload against a public key.
    If public_key_hex is omitted, derives it from settings.TICKET_SIGNING_PUBLIC_KEY or private key.
    """
    try:
        if public_key_hex:
            pub_bytes = bytes.fromhex(public_key_hex.strip())
            pub_key = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
        elif settings.TICKET_SIGNING_PUBLIC_KEY:
            pub_bytes = bytes.fromhex(settings.TICKET_SIGNING_PUBLIC_KEY.strip())
            pub_key = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
        else:
            pub_key = _get_signing_key().public_key()

        sig_bytes = bytes.fromhex(signature_hex.strip())
        msg_bytes = canonicalize_ticket_payload(payload)
        pub_key.verify(sig_bytes, msg_bytes)
        return True
    except (InvalidSignature, ValueError, Exception):
        return False


def build_qr_payload_string(ticket: Ticket) -> str:
    """
    Build the deterministic QR code string containing strictly non-sensitive fields
    and the Ed25519 signature.
    """
    data = {
        "ticket_id": str(ticket.id),
        "booking_id": str(ticket.booking_id),
        "passenger_name": ticket.passenger_name,
        "service_type": ticket.service_type,
        "valid_from": ticket.valid_from.isoformat(),
        "valid_to": ticket.valid_to.isoformat(),
        "seat": ticket.seat,
        "sig": ticket.signature,
    }
    return json.dumps(data, sort_keys=True, separators=(",", ":"))


class TicketService:

    @staticmethod
    async def create_tickets_for_booking(
        db: AsyncSession,
        booking: Booking,
    ) -> List[Ticket]:
        """
        Create and sign tamper-proof e-tickets inside the booking confirmation transaction.
        Idempotent: if tickets already exist for this booking, returns them.
        """
        # 1. Check existing tickets
        stmt = select(Ticket).where(Ticket.booking_id == booking.id)
        result = await db.execute(stmt)
        existing = list(result.scalars().all())
        if existing:
            return existing

        now_utc = datetime.now(timezone.utc)

        # 2. Compute validity date range
        if booking.start_date:
            valid_from = datetime.combine(booking.start_date, time(0, 0, 0), tzinfo=timezone.utc)
        else:
            valid_from = now_utc

        if booking.end_date:
            valid_to = datetime.combine(booking.end_date, time(23, 59, 59), tzinfo=timezone.utc)
        else:
            # Default validity: 24 hours from valid_from
            from datetime import timedelta
            valid_to = valid_from + timedelta(days=1)

        passengers = booking.passengers if booking.passengers else []
        new_tickets: List[Ticket] = []

        if not passengers:
            # Single ticket under primary passenger or Valued Guest
            ticket_id = uuid.uuid4()
            payload = {
                "ticket_id": str(ticket_id),
                "booking_id": str(booking.id),
                "passenger_name": "Valued Guest",
                "service_type": booking.product_type,
                "valid_from": valid_from.isoformat(),
                "valid_to": valid_to.isoformat(),
                "seat": None,
            }
            sig = sign_ticket(payload)
            ticket = Ticket(
                id=ticket_id,
                booking_id=booking.id,
                passenger_name=payload["passenger_name"],
                service_type=booking.product_type,
                valid_from=valid_from,
                valid_to=valid_to,
                seat=None,
                status="active",
                signature=sig,
            )
            db.add(ticket)
            new_tickets.append(ticket)
        else:
            for p in passengers:
                ticket_id = uuid.uuid4()
                p_name = f"{p.first_name} {p.last_name}".strip()
                p_seat = p.seat_preference or (str(p.seat_id) if p.seat_id else None)
                payload = {
                    "ticket_id": str(ticket_id),
                    "booking_id": str(booking.id),
                    "passenger_name": p_name,
                    "service_type": booking.product_type,
                    "valid_from": valid_from.isoformat(),
                    "valid_to": valid_to.isoformat(),
                    "seat": p_seat,
                }
                sig = sign_ticket(payload)
                ticket = Ticket(
                    id=ticket_id,
                    booking_id=booking.id,
                    passenger_name=p_name,
                    service_type=booking.product_type,
                    valid_from=valid_from,
                    valid_to=valid_to,
                    seat=p_seat,
                    status="active",
                    signature=sig,
                )
                db.add(ticket)
                new_tickets.append(ticket)

        await db.flush()
        return new_tickets

    @staticmethod
    async def get_tickets_by_booking(
        db: AsyncSession,
        booking_id: uuid.UUID,
    ) -> List[TicketResponse]:
        """Fetch all tickets for a booking with their QR payload strings."""
        stmt = select(Ticket).where(Ticket.booking_id == booking_id).order_by(Ticket.created_at.asc())
        result = await db.execute(stmt)
        tickets = list(result.scalars().all())

        responses = []
        for t in tickets:
            qr_payload = build_qr_payload_string(t)
            res = TicketResponse(
                id=t.id,
                booking_id=t.booking_id,
                passenger_name=t.passenger_name,
                service_type=t.service_type,
                valid_from=t.valid_from,
                valid_to=t.valid_to,
                seat=t.seat,
                status=t.status,
                signature=t.signature,
                created_at=t.created_at,
                qr_payload=qr_payload,
            )
            responses.append(res)
        return responses

    @staticmethod
    async def get_revocations(
        db: AsyncSession,
        since: Optional[datetime] = None,
    ) -> RevocationListResponse:
        """
        Fetch all tickets with status in ('revoked', 'used', 'expired') since a given timestamp.
        Used by offline scanners to synchronize invalidation lists.
        """
        stmt = select(Ticket).where(Ticket.status.in_(["revoked", "used", "expired"]))
        if since:
            stmt = stmt.where(Ticket.updated_at >= since)
        stmt = stmt.order_by(Ticket.updated_at.asc())

        result = await db.execute(stmt)
        tickets = list(result.scalars().all())

        revocations = [
            RevocationItem(
                ticket_id=t.id,
                status=t.status,
                updated_at=t.updated_at,
            )
            for t in tickets
        ]

        return RevocationListResponse(
            success=True,
            revocations=revocations,
            synced_at=datetime.now(timezone.utc),
        )

    @staticmethod
    async def process_scans_batch(
        db: AsyncSession,
        request: ScanBatchRequest,
        scanned_by: uuid.UUID,
        is_admin: bool = False,
        agency_id: Optional[uuid.UUID] = None,
        hotel_id: Optional[uuid.UUID] = None,
    ) -> ScanBatchResponse:
        """
        Process a batch of offline scans with idempotency guaranteed by client scan id.
        Validates authorization: staff can only scan tickets for their agency or hotel.
        """
        now_utc = datetime.now(timezone.utc)
        results: List[ProcessedScanResult] = []

        for item in request.scans:
            # 1. Check idempotency: has this scan id already been recorded?
            existing_scan_stmt = select(TicketScan).where(TicketScan.id == item.id)
            existing_scan_res = await db.execute(existing_scan_stmt)
            existing_scan = existing_scan_res.scalar_one_or_none()
            if existing_scan:
                results.append(
                    ProcessedScanResult(
                        id=item.id,
                        ticket_id=item.ticket_id,
                        result=existing_scan.result,
                        status="duplicate",
                        detail="Scan already processed idempotently",
                    )
                )
                continue

            # 2. Fetch ticket with its associated booking
            ticket_stmt = select(Ticket, Booking).join(Booking, Booking.id == Ticket.booking_id).where(Ticket.id == item.ticket_id)
            ticket_res = await db.execute(ticket_stmt)
            row = ticket_res.first()

            if not row:
                # Ticket not found in server DB
                new_scan = TicketScan(
                    id=item.id,
                    ticket_id=item.ticket_id,
                    scanned_by=scanned_by,
                    scanner_device_id=item.scanner_device_id,
                    result="invalid",
                    scanned_at=item.scanned_at,
                    synced_at=now_utc,
                )
                db.add(new_scan)
                results.append(
                    ProcessedScanResult(
                        id=item.id,
                        ticket_id=item.ticket_id,
                        result="invalid",
                        status="rejected",
                        detail="Ticket not found in database",
                    )
                )
                continue

            ticket, booking = row

            # 3. Check staff authorization
            has_auth = (
                is_admin
                or (agency_id and booking.agency_id == agency_id)
                or (hotel_id and hasattr(booking, "hotel_id") and booking.hotel_id == hotel_id)
            )

            if not has_auth:
                results.append(
                    ProcessedScanResult(
                        id=item.id,
                        ticket_id=item.ticket_id,
                        result="unauthorized",
                        status="rejected",
                        detail="Scanner not authorized for this booking provider",
                    )
                )
                continue

            # 4. Determine state transition & final result
            final_result = item.result.lower()

            if ticket.status == "revoked":
                final_result = "revoked"
            elif ticket.status == "expired":
                final_result = "expired"
            elif ticket.status == "used":
                final_result = "used"
            elif ticket.status == "active":
                if final_result == "valid":
                    # Mark ticket as used in server database
                    ticket.status = "used"
                    ticket.updated_at = now_utc
            else:
                final_result = "invalid"

            new_scan = TicketScan(
                id=item.id,
                ticket_id=ticket.id,
                scanned_by=scanned_by,
                scanner_device_id=item.scanner_device_id,
                result=final_result,
                scanned_at=item.scanned_at,
                synced_at=now_utc,
            )
            db.add(new_scan)

            results.append(
                ProcessedScanResult(
                    id=item.id,
                    ticket_id=ticket.id,
                    result=final_result,
                    status="processed",
                    detail=f"Ticket status: {ticket.status}",
                )
            )

        await db.commit()

        return ScanBatchResponse(
            success=True,
            processed_count=len(results),
            results=results,
            synced_at=now_utc,
        )
