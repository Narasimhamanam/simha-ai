import os
import json
import base64
import hmac
import hashlib
import uuid
import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import httpx
from dotenv import load_dotenv

from database import get_payments_collection, get_audit_logs_collection

load_dotenv()

# ── Cashfree Environment Configuration ──────────────────────────────
CASHFREE_ENVIRONMENT = os.getenv("CASHFREE_ENVIRONMENT", "sandbox").strip().lower()
CASHFREE_CLIENT_ID = os.getenv("CASHFREE_CLIENT_ID", "").strip()
CASHFREE_CLIENT_SECRET = os.getenv("CASHFREE_CLIENT_SECRET", "").strip()
CASHFREE_API_VERSION = os.getenv("CASHFREE_API_VERSION", "2023-08-01").strip()

# Official Cashfree PG Gateways
CASHFREE_SANDBOX_BASE_URL = "https://sandbox.cashfree.com/pg"
CASHFREE_PROD_BASE_URL = "https://api.cashfree.com/pg"

CASHFREE_BASE_URL = (
    CASHFREE_PROD_BASE_URL
    if CASHFREE_ENVIRONMENT in ["production", "prod"]
    else CASHFREE_SANDBOX_BASE_URL
)

# Product Specification: Astra 7-Day Pass
ASTRA_PASS_AMOUNT_INR = 99.00
ASTRA_PASS_CURRENCY = "INR"
ASTRA_PASS_PLAN = "ASTRA_7_DAY"
ASTRA_PASS_PURPOSE = "Astra AI 7-Day Pass"


def verify_cashfree_signature(
    signature: Optional[str],
    raw_body: str,
    timestamp: Optional[str],
    client_secret: Optional[str] = None,
) -> bool:
    """
    Verifies Cashfree Webhook HMAC-SHA256 signature according to official Cashfree PG specs:
    computedSignature = base64(hmac_sha256(timestamp + raw_body, client_secret))
    """
    if not signature or not timestamp or not raw_body:
        return False

    secret = client_secret or CASHFREE_CLIENT_SECRET
    if not secret:
        return False

    try:
        signature_data = f"{timestamp}{raw_body}"
        message_bytes = signature_data.encode("utf-8")
        secret_bytes = secret.encode("utf-8")

        digest = hmac.new(secret_bytes, message_bytes, hashlib.sha256).digest()
        computed_signature = base64.b64encode(digest).decode("utf-8")

        # Constant-time comparison to prevent timing attacks
        return hmac.compare_digest(computed_signature, signature)
    except Exception as exc:
        print(f"[Cashfree Signature] Verification error: {exc}")
        return False


class CashfreeService:
    """
    Production Cashfree Payment Gateway & Payment Links Service.
    Handles official Payment Link creation, server-to-server status verification,
    cryptographic webhook validation, and idempotent entitlement activation.
    """

    @classmethod
    def get_headers(cls) -> Dict[str, str]:
        """Returns official Cashfree PG API headers."""
        return {
            "x-client-id": CASHFREE_CLIENT_ID,
            "x-client-secret": CASHFREE_CLIENT_SECRET,
            "x-api-version": CASHFREE_API_VERSION,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    @classmethod
    async def create_payment_link(
        cls,
        user_email: str,
        return_url: str,
        notify_url: str,
        customer_name: Optional[str] = None,
        customer_phone: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Creates an official Cashfree Payment Link for the Astra 7-Day Pass (₹99).
        Amount is strictly server-controlled.
        Stores the pending transaction in MongoDB prior to external dispatch.
        """
        now = datetime.now(timezone.utc)
        unique_suffix = uuid.uuid4().hex[:12].lower()

        # Sanitize link_id & order_id (must be alphanumeric, hyphens, underscores)
        clean_email_prefix = re.sub(r"[^a-zA-Z0-9]", "_", user_email.split("@")[0])[:12]
        order_id = f"astra_ord_{clean_email_prefix}_{unique_suffix}"
        link_id = f"astra_link_{clean_email_prefix}_{unique_suffix}"

        # Clean customer_id
        customer_id = re.sub(r"[^a-zA-Z0-9_-]", "", user_email.replace("@", "_").replace(".", "_"))[:40]
        if not customer_id:
            customer_id = f"cust_{unique_suffix}"

        phone = customer_phone or "9999999999"
        # Validate 10-digit phone
        phone_digits = re.sub(r"\D", "", phone)
        if len(phone_digits) < 10:
            phone_digits = "9999999999"
        elif len(phone_digits) > 10:
            phone_digits = phone_digits[-10:]

        name = customer_name or user_email.split("@")[0] or "Astra User"

        # Format return URL to carry order_id and link_id back to Astra
        formatted_return_url = return_url
        if "{order_id}" not in formatted_return_url and "order_id=" not in formatted_return_url:
            separator = "&" if "?" in formatted_return_url else "?"
            formatted_return_url = f"{formatted_return_url}{separator}order_id={order_id}&link_id={link_id}"

        payload = {
            "link_id": link_id,
            "link_amount": ASTRA_PASS_AMOUNT_INR,
            "link_currency": ASTRA_PASS_CURRENCY,
            "link_purpose": ASTRA_PASS_PURPOSE,
            "customer_details": {
                "customer_id": customer_id,
                "customer_name": name,
                "customer_email": user_email,
                "customer_phone": phone_digits,
            },
            "link_meta": {
                "notify_url": notify_url,
                "return_url": formatted_return_url,
            },
            "link_notify": {
                "send_email": True,
                "send_sms": False,
            },
            "link_notes": {
                "order_id": order_id,
                "user_email": user_email,
                "product": "Astra 7-Day Pass",
            },
        }

        # Store PENDING payment document in MongoDB
        payments_col = get_payments_collection()
        payment_doc_id = str(uuid.uuid4())
        if payments_col is not None:
            await payments_col.insert_one({
                "payment_id": payment_doc_id,
                "user_id": user_email,
                "email": user_email,
                "order_id": order_id,
                "link_id": link_id,
                "provider": "cashfree",
                "amount": ASTRA_PASS_AMOUNT_INR,
                "currency": ASTRA_PASS_CURRENCY,
                "status": "PENDING",
                "payment_link": None,
                "provider_payment_id": None,
                "provider_reference": None,
                "created_at": now,
                "updated_at": now,
                "verified_at": None,
                "environment": CASHFREE_ENVIRONMENT,
            })

        # Check if Cashfree API credentials are set
        if not CASHFREE_CLIENT_ID or not CASHFREE_CLIENT_SECRET:
            # If credentials are not configured in environment, provide clear informative error
            print("[Cashfree] Missing CASHFREE_CLIENT_ID or CASHFREE_CLIENT_SECRET in environment")
            raise RuntimeError(
                "Cashfree Payment Gateway credentials are not configured. "
                "Please set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in backend/.env"
            )

        endpoint = f"{CASHFREE_BASE_URL}/links"
        headers = cls.get_headers()

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                response = await client.post(endpoint, json=payload, headers=headers)
                data = response.json()
            except Exception as exc:
                print(f"[Cashfree] Network error calling /links: {exc}")
                raise RuntimeError(f"Unable to connect to Cashfree payment gateway: {exc}")

        if response.status_code not in [200, 201]:
            error_msg = data.get("message", "Cashfree payment link creation failed")
            print(f"[Cashfree] Error ({response.status_code}): {data}")
            raise RuntimeError(f"Cashfree link creation rejected: {error_msg}")

        link_url = data.get("link_url")
        cf_link_id = data.get("cf_link_id")

        if not link_url:
            raise RuntimeError("Cashfree did not return a valid hosted payment link URL.")

        # Update MongoDB with real Cashfree payment link URL
        if payments_col is not None:
            await payments_col.update_one(
                {"order_id": order_id},
                {
                    "$set": {
                        "payment_link": link_url,
                        "provider_link_id": cf_link_id,
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )

        return {
            "order_id": order_id,
            "link_id": link_id,
            "amount": ASTRA_PASS_AMOUNT_INR,
            "currency": ASTRA_PASS_CURRENCY,
            "payment_link": link_url,
            "checkout_url": link_url,
            "status": "PENDING",
            "provider": "cashfree",
        }

    @classmethod
    async def check_payment_status(cls, order_id_or_link_id: str) -> Dict[str, Any]:
        """
        Queries Cashfree server-to-server for authentic payment status.
        Checks Payment Link status and associated orders/payments.
        """
        payments_col = get_payments_collection()
        payment = None
        if payments_col is not None:
            payment = await payments_col.find_one({
                "$or": [
                    {"order_id": order_id_or_link_id},
                    {"link_id": order_id_or_link_id},
                    {"payment_id": order_id_or_link_id},
                ]
            })

        link_id = payment.get("link_id") if payment else order_id_or_link_id
        order_id = payment.get("order_id") if payment else order_id_or_link_id

        if not CASHFREE_CLIENT_ID or not CASHFREE_CLIENT_SECRET:
            # Fallback to current database state if gateway credentials not active
            db_status = payment.get("status", "PENDING") if payment else "PENDING"
            return {
                "success": db_status == "SUCCESS",
                "status": db_status,
                "message": "Gateway credentials not configured; reporting local database state.",
            }

        headers = cls.get_headers()

        # 1. Query Payment Link details from Cashfree: GET /links/{link_id}
        link_endpoint = f"{CASHFREE_BASE_URL}/links/{link_id}"
        link_data = {}
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                link_res = await client.get(link_endpoint, headers=headers)
                if link_res.status_code == 200:
                    link_data = link_res.json()
            except Exception as exc:
                print(f"[Cashfree] Error fetching link details: {exc}")

        link_status = link_data.get("link_status", "").upper()
        # Cashfree Link statuses: ACTIVE, PAID, EXPIRED, CANCELLED, TERMINATED

        if link_status == "PAID":
            # Fetch specific payments/orders for this link: GET /links/{link_id}/orders
            orders_endpoint = f"{CASHFREE_BASE_URL}/links/{link_id}/orders"
            orders_list = []
            async with httpx.AsyncClient(timeout=15.0) as client:
                try:
                    orders_res = await client.get(orders_endpoint, headers=headers)
                    if orders_res.status_code == 200:
                        orders_list = orders_res.json()
                except Exception as exc:
                    print(f"[Cashfree] Error fetching link orders: {exc}")

            provider_payment_id = None
            bank_ref = None
            payment_method = "CASHFREE"

            if orders_list and isinstance(orders_list, list) and len(orders_list) > 0:
                first_order = orders_list[0]
                provider_payment_id = str(first_order.get("cf_order_id") or first_order.get("order_id") or "")
                bank_ref = str(first_order.get("bank_reference") or "")

            return {
                "success": True,
                "status": "SUCCESS",
                "amount": float(link_data.get("link_amount_paid", ASTRA_PASS_AMOUNT_INR)),
                "currency": link_data.get("link_currency", ASTRA_PASS_CURRENCY),
                "provider_payment_id": provider_payment_id,
                "bank_reference": bank_ref,
                "payment_method": payment_method,
                "raw_data": link_data,
            }
        elif link_status in ["EXPIRED", "CANCELLED", "TERMINATED"]:
            return {
                "success": False,
                "status": "FAILED",
                "message": f"Payment link was {link_status.lower()}.",
                "raw_data": link_data,
            }
        elif link_status == "ACTIVE":
            return {
                "success": False,
                "status": "PENDING",
                "message": "Payment is in progress or awaiting customer completion.",
                "raw_data": link_data,
            }

        # 2. Query Orders endpoint directly: GET /orders/{order_id}/payments
        orders_endpoint = f"{CASHFREE_BASE_URL}/orders/{order_id}/payments"
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.get(orders_endpoint, headers=headers)
                if res.status_code == 200:
                    payments_list = res.json()
                    if isinstance(payments_list, list):
                        for p in payments_list:
                            p_status = p.get("payment_status", "").upper()
                            if p_status == "SUCCESS":
                                return {
                                    "success": True,
                                    "status": "SUCCESS",
                                    "amount": float(p.get("payment_amount", ASTRA_PASS_AMOUNT_INR)),
                                    "currency": p.get("payment_currency", ASTRA_PASS_CURRENCY),
                                    "provider_payment_id": str(p.get("cf_payment_id")),
                                    "bank_reference": str(p.get("bank_reference", "")),
                                    "payment_method": p.get("payment_group", "CASHFREE"),
                                    "raw_data": p,
                                }
            except Exception as exc:
                print(f"[Cashfree] Error querying orders payments: {exc}")

        # Default to database state or PENDING
        current_status = payment.get("status", "PENDING") if payment else "PENDING"
        return {
            "success": current_status == "SUCCESS",
            "status": current_status,
            "message": "Payment pending confirmation.",
        }

    @classmethod
    async def process_successful_payment(
        cls,
        order_id: str,
        provider_payment_id: Optional[str] = None,
        provider_reference: Optional[str] = None,
        payment_method: str = "CASHFREE",
        amount: float = ASTRA_PASS_AMOUNT_INR,
        currency: str = ASTRA_PASS_CURRENCY,
        raw_response: Optional[dict] = None,
    ) -> bool:
        """
        Idempotent payment completion & entitlement activation.
        Strictly guarantees that a payment is activated only once.
        Validates amount and currency before updating entitlement.
        """
        from services.entitlement import activate_7_day_pass

        # Amount validation: Must be exactly ₹99
        if float(amount) != ASTRA_PASS_AMOUNT_INR:
            print(f"[Cashfree] Incompatible payment amount rejected: {amount} (expected {ASTRA_PASS_AMOUNT_INR})")
            return False

        if currency.upper() != ASTRA_PASS_CURRENCY:
            print(f"[Cashfree] Incompatible currency rejected: {currency} (expected {ASTRA_PASS_CURRENCY})")
            return False

        payments_col = get_payments_collection()
        if payments_col is None:
            return False

        payment = await payments_col.find_one({
            "$or": [
                {"order_id": order_id},
                {"link_id": order_id},
                {"payment_id": order_id},
            ]
        })

        if not payment:
            print(f"[Cashfree] No payment record found in database for order_id: {order_id}")
            return False

        # Idempotency check: if already completed, do not re-extend or double-grant
        if payment.get("status") == "SUCCESS":
            print(f"[Cashfree] Order {order_id} was already verified as SUCCESS. Skipping redundant grant.")
            return True

        now = datetime.now(timezone.utc)
        user_email = payment.get("email") or payment.get("user_id")

        # Atomically update payment record to SUCCESS
        await payments_col.update_one(
            {"_id": payment["_id"]},
            {
                "$set": {
                    "status": "SUCCESS",
                    "provider_payment_id": provider_payment_id or payment.get("provider_payment_id"),
                    "provider_reference": provider_reference or payment.get("provider_reference"),
                    "payment_method": payment_method,
                    "raw_response": raw_response or {},
                    "verified_at": now,
                    "updated_at": now,
                }
            },
        )

        # Activate 7-Day Pass in user profile & entitlement collection
        await activate_7_day_pass(
            user_email=user_email,
            source_payment_id=payment.get("order_id", order_id),
        )

        # Audit log creation
        audit_col = get_audit_logs_collection()
        if audit_col is not None:
            await audit_col.insert_one({
                "action": "PAYMENT_SUCCESS",
                "provider": "cashfree",
                "user_email": user_email,
                "order_id": payment.get("order_id", order_id),
                "provider_payment_id": provider_payment_id,
                "amount": ASTRA_PASS_AMOUNT_INR,
                "currency": ASTRA_PASS_CURRENCY,
                "timestamp": now,
            })

        print(f"[Cashfree] Successfully verified payment & activated Astra 7-Day Pass for {user_email}")
        return True

    @classmethod
    async def reconcile_payment(cls, order_id: str) -> Dict[str, Any]:
        """
        Administrative reconciliation tool to verify transaction state directly
        with Cashfree and synchronize database.
        """
        payments_col = get_payments_collection()
        if payments_col is None:
            raise RuntimeError("Database connection unavailable")

        payment = await payments_col.find_one({
            "$or": [{"order_id": order_id}, {"link_id": order_id}]
        })
        if not payment:
            raise RuntimeError(f"Payment record not found for {order_id}")

        status_result = await cls.check_payment_status(order_id)
        if status_result.get("success") and status_result.get("status") == "SUCCESS":
            await cls.process_successful_payment(
                order_id=payment.get("order_id", order_id),
                provider_payment_id=status_result.get("provider_payment_id"),
                provider_reference=status_result.get("bank_reference"),
                payment_method=status_result.get("payment_method", "CASHFREE"),
                amount=status_result.get("amount", ASTRA_PASS_AMOUNT_INR),
                currency=status_result.get("currency", ASTRA_PASS_CURRENCY),
                raw_response=status_result.get("raw_data"),
            )
            return {
                "order_id": order_id,
                "reconciled": True,
                "status": "SUCCESS",
                "message": "Payment verified with Cashfree and entitlement activated.",
            }
        elif status_result.get("status") == "FAILED":
            await payments_col.update_one(
                {"_id": payment["_id"]},
                {"$set": {"status": "FAILED", "updated_at": datetime.now(timezone.utc)}},
            )
            return {
                "order_id": order_id,
                "reconciled": True,
                "status": "FAILED",
                "message": status_result.get("message", "Payment failed or cancelled."),
            }
        else:
            return {
                "order_id": order_id,
                "reconciled": False,
                "status": "PENDING",
                "message": status_result.get("message", "Payment is still pending on Cashfree."),
            }
