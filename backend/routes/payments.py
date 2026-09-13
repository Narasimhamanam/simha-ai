import os
import json
import base64
from fastapi import APIRouter, HTTPException, Request, Header, Depends
from typing import Optional

from models.schemas import CheckoutRequest, PaymentOrderResponse, PaymentStatusResponse
from services.payment.phonepe import (
    PhonePeService,
    verify_checksum,
    ASTRA_PASS_AMOUNT_PAISE,
    ASTRA_PASS_CURRENCY,
)
from services.entitlement import get_user_entitlement
from database import get_payments_collection
from security.auth import get_current_user

router = APIRouter(prefix="/api/payments", tags=["Payments"])

BACKEND_BASE_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
FRONTEND_BASE_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


@router.post("/create-order", response_model=PaymentOrderResponse)
async def create_order(request: CheckoutRequest):
    """
    Creates an official PhonePe payment order for the Astra 7-Day Pass (₹99).
    """
    if not request.email:
        raise HTTPException(status_code=400, detail="User email is required to initiate pass purchase.")

    redirect_url = request.redirect_url or f"{FRONTEND_BASE_URL}/payment/status"
    callback_url = f"{BACKEND_BASE_URL}/api/payments/webhook"

    try:
        order_info = await PhonePeService.create_order(
            user_email=request.email,
            redirect_url=redirect_url,
            callback_url=callback_url,
        )
        return order_info
    except Exception as exc:
        print(f"[Payments Router] Error creating PhonePe order: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/status/{order_id}", response_model=PaymentStatusResponse)
async def check_status(order_id: str):
    """
    Checks payment status with PhonePe and synchronizes entitlement if successful.
    """
    payments_col = get_payments_collection()
    if payments_col is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    # Match by order_id or merchant_transaction_id
    payment = await payments_col.find_one({
        "$or": [
            {"order_id": order_id},
            {"merchant_transaction_id": order_id},
        ]
    })

    if not payment:
        raise HTTPException(status_code=404, detail="Payment order not found")

    current_status = payment.get("status", "PENDING")
    merchant_txn_id = payment.get("merchant_transaction_id")
    user_email = payment.get("email")

    # If already SUCCESS in DB, return current entitlement status
    if current_status == "SUCCESS":
        entitlement = await get_user_entitlement(user_email)
        return PaymentStatusResponse(
            order_id=payment.get("order_id", order_id),
            merchant_transaction_id=merchant_txn_id,
            status="SUCCESS",
            amount=payment.get("amount", ASTRA_PASS_AMOUNT_PAISE),
            currency=payment.get("currency", ASTRA_PASS_CURRENCY),
            plan="ASTRA_7_DAY",
            access_expires_at=entitlement.get("access_expires_at"),
            message="Your Astra 7-Day Pass is active.",
        )

    # If PENDING, query PhonePe server directly for real-time status update
    pg_status = await PhonePeService.check_payment_status(merchant_txn_id)

    if pg_status.get("success") and pg_status.get("state") == "SUCCESS":
        # Process and activate entitlement
        await PhonePeService.process_successful_payment(
            merchant_transaction_id=merchant_txn_id,
            provider_reference_id=str(pg_status.get("transaction_id", "")),
            payment_method=pg_status.get("payment_mode", "PHONEPE"),
            raw_response=pg_status.get("data"),
        )
        entitlement = await get_user_entitlement(user_email)
        return PaymentStatusResponse(
            order_id=payment.get("order_id", order_id),
            merchant_transaction_id=merchant_txn_id,
            status="SUCCESS",
            amount=payment.get("amount", ASTRA_PASS_AMOUNT_PAISE),
            currency=payment.get("currency", ASTRA_PASS_CURRENCY),
            plan="ASTRA_7_DAY",
            access_expires_at=entitlement.get("access_expires_at"),
            message="Payment verified successfully! Your Astra 7-Day Pass is active.",
        )
    elif pg_status.get("state") == "PENDING":
        return PaymentStatusResponse(
            order_id=payment.get("order_id", order_id),
            merchant_transaction_id=merchant_txn_id,
            status="PENDING",
            amount=payment.get("amount", ASTRA_PASS_AMOUNT_PAISE),
            currency=payment.get("currency", ASTRA_PASS_CURRENCY),
            plan="FREE",
            message="Payment is processing with your bank. Please wait a few seconds.",
        )
    else:
        # Mark as FAILED in DB
        await payments_col.update_one(
            {"merchant_transaction_id": merchant_txn_id},
            {"$set": {"status": "FAILED"}},
        )
        return PaymentStatusResponse(
            order_id=payment.get("order_id", order_id),
            merchant_transaction_id=merchant_txn_id,
            status="FAILED",
            amount=payment.get("amount", ASTRA_PASS_AMOUNT_PAISE),
            currency=payment.get("currency", ASTRA_PASS_CURRENCY),
            plan="FREE",
            message="Payment was not completed. You may try again.",
        )


@router.post("/webhook")
async def phonepe_webhook(
    request: Request,
    x_verify: Optional[str] = Header(None),
):
    """
    Asynchronous Server-to-Server Webhook endpoint called by PhonePe.
    Verifies cryptographic signature, confirms payment, and activates entitlement idempotently.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    response_b64 = body.get("response")
    if not response_b64:
        raise HTTPException(status_code=400, detail="Missing response parameter")

    # Cryptographic verification of PhonePe signature
    if not verify_checksum(response_b64, x_verify):
        print(f"[PhonePe Webhook] Invalid checksum received: {x_verify}")
        raise HTTPException(status_code=401, detail="Checksum verification failed")

    try:
        decoded_str = base64.b64decode(response_b64).decode("utf-8")
        payload = json.loads(decoded_str)
    except Exception as e:
        print(f"[PhonePe Webhook] Error decoding payload: {e}")
        raise HTTPException(status_code=400, detail="Malformed base64 data")

    code = payload.get("code")
    data = payload.get("data", {})
    merchant_txn_id = data.get("merchantTransactionId")

    if not merchant_txn_id:
        raise HTTPException(status_code=400, detail="Missing merchantTransactionId")

    if code in ["PAYMENT_SUCCESS", "SUCCESS"]:
        await PhonePeService.process_successful_payment(
            merchant_transaction_id=merchant_txn_id,
            provider_reference_id=str(data.get("transactionId", "")),
            payment_method=data.get("paymentInstrument", {}).get("type", "PHONEPE"),
            raw_response=data,
        )
        return {"status": "SUCCESS", "message": "Entitlement processed"}
    else:
        # Mark payment as FAILED
        payments_col = get_payments_collection()
        if payments_col is not None:
            await payments_col.update_one(
                {"merchant_transaction_id": merchant_txn_id},
                {"$set": {"status": "FAILED", "raw_response": data}},
            )
        return {"status": "ACK", "message": "Non-success status acknowledged"}


@router.get("/history")
async def payment_history(current_user: dict = Depends(get_current_user)):
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
        iso_date = created_at_val.isoformat() if created_at_val else ""
        records.append({
            "order_id": doc.get("order_id"),
            "merchant_transaction_id": doc.get("merchant_transaction_id"),
            "amount_inr": doc.get("amount", 9900) / 100.0,
            "currency": doc.get("currency", "INR"),
            "status": doc.get("status"),
            "payment_method": doc.get("payment_method", "PhonePe"),
            "created_at": iso_date,
        })
    return records
