import os
import json
import base64
import hashlib
import uuid
from datetime import datetime, timezone
import httpx
from dotenv import load_dotenv

from database import get_payments_collection, get_audit_logs_collection

load_dotenv()

# ── PhonePe Environment Configuration ──────────────────────────────
PHONEPE_ENV = os.getenv("PHONEPE_ENV", "UAT").upper()
PHONEPE_MERCHANT_ID = os.getenv("PHONEPE_MERCHANT_ID", "PGTESTPAYUAT")
PHONEPE_SALT_KEY = os.getenv("PHONEPE_SALT_KEY", "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399")
PHONEPE_SALT_INDEX = os.getenv("PHONEPE_SALT_INDEX", "1")

# Standard PhonePe Endpoints
UAT_BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox"
PROD_BASE_URL = "https://api.phonepe.com/apis/hermes"

BASE_URL = PROD_BASE_URL if PHONEPE_ENV == "PRODUCTION" else UAT_BASE_URL

# Astra 7-Day Pass Pricing: ₹99 = 9900 paise
ASTRA_PASS_AMOUNT_PAISE = 9900
ASTRA_PASS_CURRENCY = "INR"


def calculate_sha256(data_str: str) -> str:
    """Computes SHA-256 hex digest for PhonePe signature verification."""
    return hashlib.sha256(data_str.encode("utf-8")).hexdigest()


def generate_checksum(payload_b64: str, api_endpoint: str) -> str:
    """
    Computes X-VERIFY header for PhonePe requests:
    SHA256(base64Payload + apiEndpoint + saltKey) + "###" + saltIndex
    """
    to_hash = f"{payload_b64}{api_endpoint}{PHONEPE_SALT_KEY}"
    hash_hex = calculate_sha256(to_hash)
    return f"{hash_hex}###{PHONEPE_SALT_INDEX}"


def verify_checksum(response_b64: str, x_verify_header: str) -> bool:
    """
    Verifies PhonePe Webhook or Response X-VERIFY header:
    SHA256(responseBase64 + saltKey) + "###" + saltIndex
    """
    if not x_verify_header or "###" not in x_verify_header:
        return False
    expected_hash = calculate_sha256(f"{response_b64}{PHONEPE_SALT_KEY}")
    actual_hash = x_verify_header.split("###")[0]
    return expected_hash == actual_hash


class PhonePeService:
    """
    Production PhonePe Standard Payment Gateway Service.
    Handles order initiation, status queries, and webhook signature verification.
    """

    @classmethod
    async def create_order(
        cls,
        user_email: str,
        redirect_url: str,
        callback_url: str,
    ) -> dict:
        """
        Creates a new payment order for the Astra 7-Day Pass (₹99).
        Saves transaction record in MongoDB as PENDING.
        """
        now = datetime.now(timezone.utc)
        unique_suffix = uuid.uuid4().hex[:12].upper()
        merchant_transaction_id = f"ASTRA_TXN_{now.strftime('%Y%m%d%H%M')}_{unique_suffix}"
        order_id = f"ASTRA_ORD_{unique_suffix}"

        # Clean user identifier for PhonePe
        user_hash = hashlib.md5(user_email.encode("utf-8")).hexdigest()[:24]

        payload_dict = {
            "merchantId": PHONEPE_MERCHANT_ID,
            "merchantTransactionId": merchant_transaction_id,
            "merchantUserId": user_hash,
            "amount": ASTRA_PASS_AMOUNT_PAISE,
            "redirectUrl": redirect_url,
            "redirectMode": "REDIRECT",
            "callbackUrl": callback_url,
            "mobileNumber": "9999999999",
            "paymentInstrument": {
                "type": "PAY_PAGE"
            },
        }

        payload_json = json.dumps(payload_dict)
        payload_b64 = base64.b64encode(payload_json.encode("utf-8")).decode("utf-8")
        x_verify = generate_checksum(payload_b64, "/pg/v1/pay")

        # Save record in database as PENDING before making external call
        payments_col = get_payments_collection()
        if payments_col is not None:
            await payments_col.insert_one({
                "user_id": user_email,
                "email": user_email,
                "order_id": order_id,
                "merchant_transaction_id": merchant_transaction_id,
                "provider": "PHONEPE",
                "amount": ASTRA_PASS_AMOUNT_PAISE,
                "currency": ASTRA_PASS_CURRENCY,
                "status": "PENDING",
                "payment_method": None,
                "provider_reference_id": None,
                "created_at": now,
                "updated_at": now,
            })

        # Initiate call to PhonePe
        request_url = f"{BASE_URL}/pg/v1/pay"
        headers = {
            "Content-Type": "application/json",
            "X-VERIFY": x_verify,
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                response = await client.post(
                    request_url,
                    json={"request": payload_b64},
                    headers=headers,
                )
                res_data = response.json()
            except Exception as exc:
                print(f"[PhonePe] Order initiation network error: {exc}")
                raise RuntimeError(f"Unable to connect to PhonePe gateway: {exc}")

        if not res_data.get("success"):
            error_msg = res_data.get("message", "Payment order initiation failed")
            print(f"[PhonePe] Order initiation error: {res_data}")
            raise RuntimeError(f"PhonePe order rejected: {error_msg}")

        instrument = res_data.get("data", {}).get("instrumentResponse", {})
        redirect_info = instrument.get("redirectInfo", {})
        checkout_url = redirect_info.get("url")

        if not checkout_url:
            raise RuntimeError("PhonePe did not return a valid checkout redirect URL.")

        return {
            "order_id": order_id,
            "merchant_transaction_id": merchant_transaction_id,
            "amount": ASTRA_PASS_AMOUNT_PAISE,
            "currency": ASTRA_PASS_CURRENCY,
            "checkout_url": checkout_url,
            "status": "PENDING",
        }

    @classmethod
    async def check_payment_status(cls, merchant_transaction_id: str) -> dict:
        """
        Queries PhonePe server-to-server for status of a transaction.
        GET /pg/v1/status/{merchantId}/{merchantTransactionId}
        """
        api_path = f"/pg/v1/status/{PHONEPE_MERCHANT_ID}/{merchant_transaction_id}"
        to_hash = f"{api_path}{PHONEPE_SALT_KEY}"
        hash_hex = calculate_sha256(to_hash)
        x_verify = f"{hash_hex}###{PHONEPE_SALT_INDEX}"

        headers = {
            "Content-Type": "application/json",
            "X-VERIFY": x_verify,
            "X-MERCHANT-ID": PHONEPE_MERCHANT_ID,
            "Accept": "application/json",
        }

        request_url = f"{BASE_URL}{api_path}"

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.get(request_url, headers=headers)
                data = response.json()
            except Exception as exc:
                print(f"[PhonePe] Status check failed: {exc}")
                return {"success": False, "state": "FAILED", "message": str(exc)}

        is_success = data.get("success", False)
        code = data.get("code", "")
        status_data = data.get("data", {})
        state = status_data.get("responseCode", "")

        # PhonePe states: COMPLETED / PAYMENT_SUCCESS
        if is_success and code in ["PAYMENT_SUCCESS", "SUCCESS"]:
            return {
                "success": True,
                "state": "SUCCESS",
                "amount": status_data.get("amount", ASTRA_PASS_AMOUNT_PAISE),
                "transaction_id": status_data.get("transactionId"),
                "payment_mode": status_data.get("paymentInstrument", {}).get("type"),
                "data": status_data,
            }
        elif code in ["PAYMENT_PENDING", "INTERNAL_SERVER_ERROR"]:
            return {
                "success": False,
                "state": "PENDING",
                "message": data.get("message", "Payment in progress"),
            }
        else:
            return {
                "success": False,
                "state": "FAILED",
                "message": data.get("message", "Payment was not successful"),
            }

    @classmethod
    async def process_successful_payment(
        cls,
        merchant_transaction_id: str,
        provider_reference_id: str = "",
        payment_method: str = "PHONEPE",
        raw_response: dict = None,
    ) -> bool:
        """
        Idempotent payment completion & entitlement activation.
        Guarantees that a payment is activated only once.
        """
        from services.entitlement import activate_7_day_pass

        payments_col = get_payments_collection()
        if payments_col is None:
            return False

        payment = await payments_col.find_one({"merchant_transaction_id": merchant_transaction_id})
        if not payment:
            print(f"[PhonePe] Payment record not found for {merchant_transaction_id}")
            return False

        # Idempotency check: if already completed, do not double-grant
        if payment.get("status") == "SUCCESS":
            print(f"[PhonePe] Transaction {merchant_transaction_id} already marked SUCCESS. Skipping.")
            return True

        now = datetime.now(timezone.utc)
        user_email = payment.get("email") or payment.get("user_id")

        # Update payment record atomically
        await payments_col.update_one(
            {"merchant_transaction_id": merchant_transaction_id},
            {
                "$set": {
                    "status": "SUCCESS",
                    "provider_reference_id": provider_reference_id,
                    "payment_method": payment_method,
                    "raw_response": raw_response or {},
                    "updated_at": now,
                }
            },
        )

        # Grant 7-day entitlement
        await activate_7_day_pass(
            user_email=user_email,
            source_payment_id=merchant_transaction_id,
        )

        # Audit log
        audit_col = get_audit_logs_collection()
        if audit_col is not None:
            await audit_col.insert_one({
                "action": "PAYMENT_SUCCESS",
                "user_email": user_email,
                "merchant_transaction_id": merchant_transaction_id,
                "amount": ASTRA_PASS_AMOUNT_PAISE,
                "timestamp": now,
            })

        print(f"[PhonePe] Successfully activated Astra 7-Day Pass for {user_email}")
        return True
