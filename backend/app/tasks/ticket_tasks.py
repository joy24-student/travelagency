"""
Asynchronous PDF Travel Ticket Generation with QR Code.
Uses ReportLab and QRCode libraries.
"""

import io
import logging
import os
from typing import Any, Dict, Optional
import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import HRFlowable, Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.config import settings
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def build_ticket_pdf_buffer(ticket_data: Dict[str, Any]) -> bytes:
    """
    Generate professional travel voucher / boarding ticket PDF with QR code.
    Fully parameterized with zero hardcoded business variables.
    Returns raw PDF bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TicketTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        textColor=colors.HexColor("#0D47A1"),
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "TicketSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=colors.HexColor("#555555"),
        spaceAfter=12,
    )
    section_style = ParagraphStyle(
        "TicketSection",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        textColor=colors.HexColor("#1A237E"),
        spaceAfter=4,
    )
    cell_style = ParagraphStyle(
        "CellNormal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#222222"),
    )
    cell_bold = ParagraphStyle(
        "CellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=colors.HexColor("#111111"),
    )

    story = []

    # 1. Header Banner
    company_heading = f"{settings.APP_NAME.upper()} TRAVEL TICKET & BOARDING VOUCHER"
    story.append(Paragraph(company_heading, title_style))
    story.append(Paragraph(f"Official Confirmation & Verification Document - {settings.COMPANY_NAME}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0D47A1"), spaceAfter=15))

    # 2. Generate QR Code
    booking_ref = ticket_data.get("booking_reference", "UNKNOWN")
    qr_content = f"{settings.VERIFICATION_URL_BASE}?ref={booking_ref}"
    qr_img = qrcode.make(qr_content)
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)

    # 3. Booking Details Table & QR Code side-by-side
    details_data = [
        [
            Paragraph("<b>Booking Reference:</b>", cell_style),
            Paragraph(booking_ref, cell_bold),
            Paragraph("<b>Issue Date:</b>", cell_style),
            Paragraph(ticket_data.get("issue_date", "Today"), cell_style),
        ],
        [
            Paragraph("<b>Primary Traveler:</b>", cell_style),
            Paragraph(ticket_data.get("passenger_name", "Valued Guest"), cell_bold),
            Paragraph("<b>Product Type:</b>", cell_style),
            Paragraph(ticket_data.get("product_type", "Hotel / Flight").capitalize(), cell_style),
        ],
        [
            Paragraph("<b>Destination:</b>", cell_style),
            Paragraph(ticket_data.get("destination_city", settings.DEFAULT_COUNTRY), cell_bold),
            Paragraph("<b>Travel Dates:</b>", cell_style),
            Paragraph(f"{ticket_data.get('start_date', 'N/A')} to {ticket_data.get('end_date', 'N/A')}", cell_style),
        ],
        [
            Paragraph("<b>Total Amount:</b>", cell_style),
            Paragraph(f"{ticket_data.get('total_price', '0.00')} {ticket_data.get('currency', settings.DEFAULT_CURRENCY)}", cell_bold),
            Paragraph("<b>Payment Status:</b>", cell_style),
            Paragraph(ticket_data.get("status_text", "CONFIRMED & PAID"), ParagraphStyle("PaidStyle", parent=cell_bold, textColor=colors.green)),
        ],
    ]

    details_table = Table(details_data, colWidths=[110, 140, 90, 140])
    details_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8F9FA")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDDDDD")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#EEEEEE")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )

    story.append(details_table)
    story.append(Spacer(1, 15))

    # 4. QR Verification Box
    qr_flowable = Image(qr_buffer, width=1.5 * inch, height=1.5 * inch)
    qr_box_data = [
        [
            qr_flowable,
            Paragraph(
                "<b>Digital Boarding & Verification QR Code</b><br/><br/>"
                "Scan this code at the airport counter, hotel reception, or transport lounge to instantly verify "
                "ticket validity and passenger manifest details.<br/><br/>"
                f"<i>Reference: {booking_ref}</i>",
                cell_style,
            ),
        ]
    ]
    qr_table = Table(qr_box_data, colWidths=[1.8 * inch, 4.8 * inch])
    qr_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EEF2F6")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#C5CAE9")),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ])
    )
    story.append(qr_table)
    story.append(Spacer(1, 15))

    # 5. Terms & Advisory
    story.append(Paragraph("Travel Advisory & Check-in Requirements", section_style))
    terms_text = (
        f"• Please carry a government-issued photo identification (NID or Passport) matching passenger details.<br/>"
        f"• For flights, report at the check-in desk at least 90 minutes prior to departure for domestic routes.<br/>"
        f"• Hotel check-in typically commences at 14:00. Early check-in is subject to room availability.<br/>"
        f"• 24/7 {settings.COMPANY_NAME} Concierge helpline: {settings.SUPPORT_HELPLINE} | {settings.SUPPORT_EMAIL}"
    )
    story.append(Paragraph(terms_text, subtitle_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


@celery_app.task(name="generate_ticket_task")
def generate_travel_ticket_task(ticket_data: Dict[str, Any], output_path: Optional[str] = None) -> str:
    """
    Celery background worker task for generating ticket PDF.
    Saves PDF file to specified output_path or default tickets directory.
    """
    try:
        pdf_bytes = build_ticket_pdf_buffer(ticket_data)
        booking_ref = ticket_data.get("booking_reference", "ticket")

        if not output_path:
            out_dir = os.path.join(os.getcwd(), "storage", "tickets")
            os.makedirs(out_dir, exist_ok=True)
            output_path = os.path.join(out_dir, f"{booking_ref}.pdf")

        with open(output_path, "wb") as f:
            f.write(pdf_bytes)

        logger.info(f"Generated PDF ticket for {booking_ref} at {output_path} ({len(pdf_bytes)} bytes)")
        return output_path
    except Exception as exc:
        logger.error(f"Failed to generate ticket PDF: {exc}", exc_info=True)
        raise exc
