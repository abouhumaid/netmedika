"""Email delivery helpers for account and order notifications."""

from __future__ import annotations

import asyncio
import smtplib
from email.message import EmailMessage

from backend.core.settings import settings


def is_email_configured() -> bool:
    return bool(settings.smtp_host.strip() and settings.smtp_from_email.strip())


def _send_message(message: EmailMessage) -> None:
    if settings.smtp_use_ssl:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=20) as server:
            if settings.smtp_username:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
        return

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
        server.ehlo()
        if settings.smtp_starttls:
            server.starttls()
            server.ehlo()
        if settings.smtp_username:
            server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)


async def send_admin_credentials(email: str, username: str, password: str) -> None:
    if not is_email_configured():
        raise RuntimeError("SMTP is not configured. Set SMTP_HOST and SMTP_FROM_EMAIL to send account email.")

    message = EmailMessage()
    message["Subject"] = "Your NetMedika administrator account"
    message["From"] = settings.smtp_from_email
    message["To"] = email
    message.set_content(
        f"Hello {username},\n\n"
        "An administrator account has been created for you.\n\n"
        f"Email: {email}\n"
        f"Temporary password: {password}\n\n"
        "Please sign in and change your password as soon as possible.\n"
    )
    await _deliver(message)


async def send_order_created_email(
    email: str,
    username: str,
    order_id: str,
    medication_name: str | None,
    quantity: int,
) -> None:
    message = EmailMessage()
    message["Subject"] = f"We received your NetMedika order {order_id}"
    message["From"] = settings.smtp_from_email
    message["To"] = email
    message.set_content(
        f"Hello {username},\n\n"
        "Your order has been received. Our pharmacy team will review it and update you as it progresses.\n\n"
        f"Order: {order_id}\n"
        f"Item: {medication_name or 'Prescription review'}\n"
        f"Quantity: {quantity}\n"
        "Current status: Pending review\n\n"
        "Thank you for choosing NetMedika."
    )
    await _deliver(message)


async def send_order_completed_email(
    email: str,
    username: str,
    order_id: str,
    medication_name: str | None,
) -> None:
    message = EmailMessage()
    message["Subject"] = f"Your NetMedika order {order_id} is complete"
    message["From"] = settings.smtp_from_email
    message["To"] = email
    message.set_content(
        f"Hello {username},\n\n"
        "Your order has been marked as completed. Thank you for choosing NetMedika.\n\n"
        f"Order: {order_id}\n"
        f"Item: {medication_name or 'Prescription order'}\n"
        "Status: Completed\n"
    )
    await _deliver(message)


async def _deliver(message: EmailMessage) -> None:
    if not is_email_configured():
        raise RuntimeError("SMTP email delivery is not configured")
    await asyncio.to_thread(_send_message, message)
