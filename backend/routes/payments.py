import os
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, Header, Depends
from typing import Optional

from models.schemas import (
    CheckoutRequest,
    PaymentOrderResponse,
    PaymentStatusResponse,
    PaymentReconcileResponse,
)
from services.payment.cashfree import (
    CashfreeService,
    verify_cashfree_signature,
    ASTRA_PASS_AMOUNT_INR,
    ASTRA_PASS_CURRENCY,
    ASTRA_PASS_PLAN,
)
from services.entitlement import get_user_entitlement
from database import get_payments_collection
from security.auth import get_current_user, require_authenticated_user, require_admin

router = APIRouter(prefix="/api/payments", tags=["Payments"])

BACKEND_BASE_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
FRONTEND_BASE_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


@router.post("/create", response_model=PaymentOrderResponse)
@router.post("/create-order", response_model=PaymentOrderResponse)
async def create_payment_order(
    request: CheckoutRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Creates an official Cashfree Payment Link for the Astra 7-Day Pass (₹99).
    The amount is strictly server-controlled (99.00 INR).
    Never trusts client-supplied pricing.
    """
    email = request.email or current_user.get("email")
    if not email or email in ["guest", "guest@local"]:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in to purchase the Astra 7-Day Pass.",
        )

    # Server-configured return and webhook endpoints
    redirect_url = request.redirect_url or f"{FRONTEND_BASE_URL}/payment/status"
    notify_url = f"{BACKEND_BASE_URL}/api/payments/cashfree/webhook"

    try:
        order_info = await CashfreeService.create_payment_link(
            user_email=email,
            return_url=redirect_url,
            notify_url=notify_url,
            customer_name=request.customer_name,
            customer_phone=request.customer_phone,
        )
        return PaymentOrderResponse(
            order_id=order_info["order_id"],
            link_id=order_info["link_id"],
            merchant_transaction_id=order_info["order_id"],
            amount=order_info["amount"],
            currency=order_info["currency"],
            payment_link=order_info["payment_link"],
            checkout_url=order_info["checkout_url"],
            status=order_info["status"],
            provider="cashfree",
        )
    except RuntimeError as exc:
        print(f"[Payments Router] Error creating Cashfree link: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        print(f"[Payments Router] Unexpected error creating payment: {exc}")
        raise HTTPException(status_code=500, detail="Failed to initialize payment gateway.")


@router.get("/status/{order_id}", response_model=PaymentStatusResponse)
async def check_payment_status(order_id: str):
    """
    Server-side verification of payment state with Cashfree.
    Never trusts frontend state or client claims of payment success.
    Idempotently activates Astra 7-Day Pass only after genuine verification.
    """
    payments_col = get_payments_collection()
    if payments_col is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    payment = await payments_col.find_one({
        "$or": [
            {"order_id": order_id},
            {"link_id": order_id},
            {"payment_id": order_id},
            {"merchant_transaction_id": order_id},
        ]
    })

    if not payment:
        raise HTTPException(status_code=404, detail="Payment order not found")

    current_status = payment.get("status", "PENDING")
    user_email = payment.get("email") or payment.get("user_id")
    internal_order_id = payment.get("order_id", order_id)
    link_id = payment.get("link_id")

    # If already marked SUCCESS in our DB, return verified entitlement
    if current_status == "SUCCESS":
        entitlement = await get_user_entitlement(user_email)
        verified_at_val = payment.get("verified_at")
        iso_verified = verified_at_val.isoformat() if isinstance(verified_at_val, datetime) else verified_at_val

        return PaymentStatusResponse(
            order_id=internal_order_id,
            link_id=link_id,
            merchant_transaction_id=internal_order_id,
            status="SUCCESS",
            amount=float(payment.get("amount", ASTRA_PASS_AMOUNT_INR)),
            currency=payment.get("currency", ASTRA_PASS_CURRENCY),
            plan=ASTRA_PASS_PLAN,
            access_expires_at=entitlement.get("access_expires_at"),
            provider="cashfree",
            provider_payment_id=payment.get("provider_payment_id"),
            verified_at=iso_verified,
            message="Your Astra 7-Day Pass is active.",
        )

    # If PENDING, query Cashfree official API directly for live status
    pg_status = await CashfreeService.check_payment_status(internal_order_id)

    if pg_status.get("success") and pg_status.get("status") == "SUCCESS":
        # Process and activate entitlement idempotently
        await CashfreeService.process_successful_payment(
            order_id=internal_order_id,
            provider_payment_id=pg_status.get("provider_payment_id"),
            provider_reference=pg_status.get("bank_reference"),
            payment_method=pg_status.get("payment_method", "CASHFREE"),
            amount=pg_status.get("amount", ASTRA_PASS_AMOUNT_INR),
            currency=pg_status.get("currency", ASTRA_PASS_CURRENCY),
            raw_response=pg_status.get("raw_data"),
        )
        entitlement = await get_user_entitlement(user_email)
        return PaymentStatusResponse(
            order_id=internal_order_id,
            link_id=link_id,
            merchant_transaction_id=internal_order_id,
            status="SUCCESS",
            amount=float(pg_status.get("amount", ASTRA_PASS_AMOUNT_INR)),
            currency=pg_status.get("currency", ASTRA_PASS_CURRENCY),
            plan=ASTRA_PASS_PLAN,
            access_expires_at=entitlement.get("access_expires_at"),
            provider="cashfree",
            provider_payment_id=pg_status.get("provider_payment_id"),
            verified_at=datetime.now(timezone.utc).isoformat(),
            message="Payment verified successfully! Your Astra 7-Day Pass is active.",
        )
    elif pg_status.get("status") == "PENDING":
        return PaymentStatusResponse(
            order_id=internal_order_id,
            link_id=link_id,
            merchant_transaction_id=internal_order_id,
            status="PENDING",
            amount=float(payment.get("amount", ASTRA_PASS_AMOUNT_INR)),
            currency=payment.get("currency", ASTRA_PASS_CURRENCY),
            plan="FREE",
            provider="cashfree",
            message=pg_status.get("message", "Payment is being processed by Cashfree."),
        )
    else:
        # Mark as FAILED in database
        await payments_col.update_one(
            {"_id": payment["_id"]},
            {"$set": {"status": "FAILED", "updated_at": datetime.now(timezone.utc)}},
        )
        return PaymentStatusResponse(
            order_id=internal_order_id,
            link_id=link_id,
            merchant_transaction_id=internal_order_id,
            status="FAILED",
            amount=float(payment.get("amount", ASTRA_PASS_AMOUNT_INR)),
            currency=payment.get("currency", ASTRA_PASS_CURRENCY),
            plan="FREE",
            provider="cashfree",
            message="Payment was not completed. You may try again.",
        )


@router.post("/cashfree/webhook")
@router.post("/webhook")
async def cashfree_webhook(
    request: Request,
    x_webhook_signature: Optional[str] = Header(None),
    x_webhook_timestamp: Optional[str] = Header(None),
):
    """
    Official Cashfree Server-to-Server Webhook receiver.
    Verifies cryptographic HMAC-SHA256 signature, validates payment details,
    and idempotently activates Astra 7-Day Pass.
    """
    raw_body_bytes = await request.body()
    raw_body_str = raw_body_bytes.decode("utf-8")

    # Cryptographic signature verification
    if not verify_cashfree_signature(x_webhook_signature, raw_body_str, x_webhook_timestamp):
        print(f"[Cashfree Webhook] Signature verification failed for timestamp: {x_webhook_timestamp}")
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = json.loads(raw_body_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed JSON payload")

    event_type = payload.get("type", "")
    data = payload.get("data", {})
    order_data = data.get("order", {})
    payment_data = data.get("payment", {})

    # Extract order and payment identifiers
    order_id = order_data.get("order_id") or data.get("order_id")
    if not order_id and "link_id" in data:
        order_id = data.get("link_id")

    if not order_id:
        print("[Cashfree Webhook] Missing order_id in webhook payload")
        return {"status": "ACK", "message": "Missing order_id; ignored"}

    # Handle Payment Success Event
    if event_type in ["PAYMENT_SUCCESS_WEBHOOK", "ORDER_PAID_WEBHOOK"] or payment_data.get("payment_status") == "SUCCESS":
        # Validate amount
        amount_val = payment_data.get("payment_amount") or order_data.get("order_amount") or data.get("link_amount_paid")
        amount = float(amount_val) if amount_val is not None else ASTRA_PASS_AMOUNT_INR

        # Validate currency
        currency = str(payment_data.get("payment_currency") or order_data.get("order_currency") or "INR").upper()

        provider_payment_id = str(payment_data.get("cf_payment_id") or data.get("cf_payment_id") or "")
        bank_reference = str(payment_data.get("bank_reference") or "")
        payment_method = str(payment_data.get("payment_group") or "CASHFREE")

        await CashfreeService.process_successful_payment(
            order_id=order_id,
            provider_payment_id=provider_payment_id,
            provider_reference=bank_reference,
            payment_method=payment_method,
            amount=amount,
            currency=currency,
            raw_response=data,
        )
        return {"status": "SUCCESS", "message": "Payment verified and entitlement activated."}

    # Handle Payment Failure Event
    elif event_type in ["PAYMENT_FAILED_WEBHOOK", "PAYMENT_USER_DROPPED_WEBHOOK"]:
        payments_col = get_payments_collection()
        if payments_col is not None:
            await payments_col.update_one(
                {"$or": [{"order_id": order_id}, {"link_id": order_id}]},
                {"$set": {"status": "FAILED", "raw_response": data, "updated_at": datetime.now(timezone.utc)}},
            )
        return {"status": "ACK", "message": "Payment failure recorded"}

    return {"status": "ACK", "message": f"Event {event_type} acknowledged"}


@router.post("/reconcile/{order_id}", response_model=PaymentReconcileResponse)
async def reconcile_payment_order(
    order_id: str,
    admin: dict = Depends(require_admin),
):
    """
    Admin-only tool to reconcile transaction status directly with Cashfree.
    """
    try:
        result = await CashfreeService.reconcile_payment(order_id)
        return PaymentReconcileResponse(
            order_id=order_id,
            reconciled=result["reconciled"],
            status=result["status"],
            message=result["message"],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/history")
async def payment_history(current_user: dict = Depends(require_authenticated_user)):
    """Returns payment history for the authenticated user."""
    email = current_user.get("email")
    payments_col = get_payments_collection()
    if payments_col is None:
        return []

    cursor = payments_col.find(
        {"$or": [{"user_id": email}, {"email": email}]},
        sort=[("created_at", -1)],
    )

    records = []
    async for doc in cursor:
        created_at_val = doc.get("created_at")
        verified_at_val = doc.get("verified_at")
        records.append({
            "order_id": doc.get("order_id"),
            "link_id": doc.get("link_id"),
            "amount_inr": float(doc.get("amount", ASTRA_PASS_AMOUNT_INR)),
            "currency": doc.get("currency", "INR"),
            "status": doc.get("status"),
            "provider": doc.get("provider", "cashfree"),
            "payment_link": doc.get("payment_link"),
            "created_at": created_at_val.isoformat() if isinstance(created_at_val, datetime) else "",
            "verified_at": verified_at_val.isoformat() if isinstance(verified_at_val, datetime) else "",
        })
    return records
