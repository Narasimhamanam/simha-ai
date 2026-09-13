import unittest
import asyncio
import json
import base64
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import HTTPException

from services.payment.cashfree import (
    CashfreeService,
    verify_cashfree_signature,
    ASTRA_PASS_AMOUNT_INR,
    ASTRA_PASS_CURRENCY,
    ASTRA_PASS_PLAN,
)
from services.entitlement import get_user_entitlement, activate_7_day_pass
from services.usage import check_user_quota, FREE_DAILY_MESSAGES
from security.auth import require_active_premium
from models.schemas import CheckoutRequest
from routes.payments import create_payment_order, check_payment_status, cashfree_webhook
from routes.admin import get_admin_metrics


class TestCashfreePayment(unittest.TestCase):
    """
    Automated Test Suite for Astra AI Cashfree Payment Links Integration.
    Covers all 20 required production and security test scenarios.
    """

    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        self.test_secret = "test_cashfree_secret_key_12345"

    def tearDown(self):
        self.loop.close()

    def generate_test_signature(self, raw_body: str, timestamp: str, secret: str = None) -> str:
        sec = secret or self.test_secret
        sig_data = f"{timestamp}{raw_body}"
        digest = hmac.new(sec.encode("utf-8"), sig_data.encode("utf-8"), hashlib.sha256).digest()
        return base64.b64encode(digest).decode("utf-8")

    # ── Test 1: Create payment link ─────────────────────────────────────────
    @patch("services.payment.cashfree.httpx.AsyncClient")
    @patch("services.payment.cashfree.get_payments_collection")
    @patch("services.payment.cashfree.CASHFREE_CLIENT_ID", "test_app_id")
    @patch("services.payment.cashfree.CASHFREE_CLIENT_SECRET", "test_secret")
    def test_01_create_payment_link(self, mock_get_payments, mock_client_cls):
        mock_col = AsyncMock()
        mock_get_payments.return_value = mock_col

        mock_http = AsyncMock()
        mock_http.post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "cf_link_id": 998877,
                "link_id": "astra_link_test",
                "link_url": "https://payments-test.cashfree.com/links/astra_link_test",
                "link_status": "ACTIVE",
            },
        )
        mock_client_cls.return_value.__aenter__.return_value = mock_http

        result = self.loop.run_until_complete(
            CashfreeService.create_payment_link(
                user_email="buyer@astra.ai",
                return_url="http://localhost:5173/payment/status",
                notify_url="http://localhost:8000/api/payments/cashfree/webhook",
            )
        )

        self.assertIn("payment_link", result)
        self.assertEqual(result["payment_link"], "https://payments-test.cashfree.com/links/astra_link_test")
        self.assertEqual(result["status"], "PENDING")
        self.assertEqual(result["provider"], "cashfree")

    # ── Test 2: Correct amount ₹99 ──────────────────────────────────────────
    def test_02_correct_amount_99(self):
        self.assertEqual(ASTRA_PASS_AMOUNT_INR, 99.00)
        self.assertEqual(ASTRA_PASS_CURRENCY, "INR")
        self.assertEqual(ASTRA_PASS_PLAN, "ASTRA_7_DAY")

    # ── Test 3: Invalid/client-tampered amount rejected ──────────────────────
    @patch("services.payment.cashfree.get_payments_collection")
    def test_03_invalid_client_amount_rejected(self, mock_get_payments):
        # Even if someone attempts to process a payment with ₹1 instead of ₹99
        result = self.loop.run_until_complete(
            CashfreeService.process_successful_payment(
                order_id="tampered_order_123",
                amount=1.00,  # Invalid amount!
                currency="INR",
            )
        )
        self.assertFalse(result)

    # ── Test 4: Authentication required ─────────────────────────────────────
    def test_04_authentication_required(self):
        req = CheckoutRequest(email="guest")
        with self.assertRaises(HTTPException) as ctx:
            self.loop.run_until_complete(
                create_payment_order(
                    request=req,
                    current_user={"email": "guest@local", "is_guest": True},
                )
            )
        self.assertEqual(ctx.exception.status_code, 401)

    # ── Test 5: Pending payment stored in DB ────────────────────────────────
    @patch("services.payment.cashfree.httpx.AsyncClient")
    @patch("services.payment.cashfree.get_payments_collection")
    @patch("services.payment.cashfree.CASHFREE_CLIENT_ID", "test_app_id")
    @patch("services.payment.cashfree.CASHFREE_CLIENT_SECRET", "test_secret")
    def test_05_pending_payment_stored(self, mock_get_payments, mock_client_cls):
        mock_col = AsyncMock()
        mock_get_payments.return_value = mock_col

        mock_http = AsyncMock()
        mock_http.post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"link_url": "https://payments.cashfree.com/links/123", "cf_link_id": 123},
        )
        mock_client_cls.return_value.__aenter__.return_value = mock_http

        self.loop.run_until_complete(
            CashfreeService.create_payment_link(
                user_email="user@astra.ai",
                return_url="http://localhost/payment/status",
                notify_url="http://localhost/webhook",
            )
        )

        mock_col.insert_one.assert_called_once()
        inserted_doc = mock_col.insert_one.call_args[0][0]
        self.assertEqual(inserted_doc["status"], "PENDING")
        self.assertEqual(inserted_doc["amount"], 99.00)
        self.assertEqual(inserted_doc["currency"], "INR")
        self.assertEqual(inserted_doc["provider"], "cashfree")

    # ── Test 6: Successful payment status check ─────────────────────────────
    @patch("services.payment.cashfree.httpx.AsyncClient")
    @patch("services.payment.cashfree.get_payments_collection")
    @patch("services.payment.cashfree.CASHFREE_CLIENT_ID", "test_app_id")
    @patch("services.payment.cashfree.CASHFREE_CLIENT_SECRET", "test_secret")
    def test_06_successful_payment_verification(self, mock_get_payments, mock_client_cls):
        mock_col = AsyncMock()
        mock_col.find_one.return_value = {
            "order_id": "ord_100",
            "link_id": "link_100",
            "status": "PENDING",
            "email": "user@astra.ai",
        }
        mock_get_payments.return_value = mock_col

        mock_http = AsyncMock()
        mock_http.get.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "link_id": "link_100",
                "link_status": "PAID",
                "link_amount_paid": 99.00,
                "link_currency": "INR",
            },
        )
        mock_client_cls.return_value.__aenter__.return_value = mock_http

        res = self.loop.run_until_complete(CashfreeService.check_payment_status("ord_100"))
        self.assertTrue(res["success"])
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["amount"], 99.00)

    # ── Test 7: Failed payment status handling ──────────────────────────────
    @patch("services.payment.cashfree.httpx.AsyncClient")
    @patch("services.payment.cashfree.get_payments_collection")
    @patch("services.payment.cashfree.CASHFREE_CLIENT_ID", "test_app_id")
    @patch("services.payment.cashfree.CASHFREE_CLIENT_SECRET", "test_secret")
    def test_07_failed_payment_status(self, mock_get_payments, mock_client_cls):
        mock_col = AsyncMock()
        mock_col.find_one.return_value = {
            "order_id": "ord_fail",
            "link_id": "link_fail",
            "status": "PENDING",
        }
        mock_get_payments.return_value = mock_col

        mock_http = AsyncMock()
        mock_http.get.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "link_id": "link_fail",
                "link_status": "EXPIRED",
            },
        )
        mock_client_cls.return_value.__aenter__.return_value = mock_http

        res = self.loop.run_until_complete(CashfreeService.check_payment_status("ord_fail"))
        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "FAILED")

    # ── Test 8: Invalid webhook payload ─────────────────────────────────────
    def test_08_invalid_webhook_payload(self):
        # Empty body or missing timestamp
        valid = verify_cashfree_signature("signature", "", "1672531199", self.test_secret)
        self.assertFalse(valid)

    # ── Test 9: Invalid webhook signature rejected ──────────────────────────
    def test_09_invalid_webhook_signature(self):
        raw_body = json.dumps({"type": "PAYMENT_SUCCESS_WEBHOOK"})
        timestamp = "1726000000"

        # Wrong signature
        is_valid = verify_cashfree_signature("tampered_signature", raw_body, timestamp, self.test_secret)
        self.assertFalse(is_valid)

        # Valid signature matches
        good_sig = self.generate_test_signature(raw_body, timestamp)
        is_good = verify_cashfree_signature(good_sig, raw_body, timestamp, self.test_secret)
        self.assertTrue(is_good)

    # ── Test 10: Wrong user/order in verification ───────────────────────────
    @patch("services.payment.cashfree.get_payments_collection")
    def test_10_wrong_user_or_order(self, mock_get_payments):
        mock_col = AsyncMock()
        mock_col.find_one.return_value = None  # Not found
        mock_get_payments.return_value = mock_col

        result = self.loop.run_until_complete(
            CashfreeService.process_successful_payment(
                order_id="non_existent_order_999",
                amount=99.00,
                currency="INR",
            )
        )
        self.assertFalse(result)

    # ── Test 11: Wrong amount rejected ──────────────────────────────────────
    @patch("services.payment.cashfree.get_payments_collection")
    def test_11_wrong_amount_rejected(self, mock_get_payments):
        result = self.loop.run_until_complete(
            CashfreeService.process_successful_payment(
                order_id="ord_test",
                amount=50.00,  # Expected 99.00
                currency="INR",
            )
        )
        self.assertFalse(result)

    # ── Test 12: Wrong currency rejected ────────────────────────────────────
    @patch("services.payment.cashfree.get_payments_collection")
    def test_12_wrong_currency_rejected(self, mock_get_payments):
        result = self.loop.run_until_complete(
            CashfreeService.process_successful_payment(
                order_id="ord_test",
                amount=99.00,
                currency="USD",  # Expected INR
            )
        )
        self.assertFalse(result)

    # ── Test 13: Duplicate webhook (idempotency) ────────────────────────────
    @patch("services.payment.cashfree.get_payments_collection")
    def test_13_duplicate_webhook_idempotent(self, mock_get_payments):
        mock_col = AsyncMock()
        mock_col.find_one.return_value = {
            "_id": "doc_id_1",
            "order_id": "ord_idempotent",
            "status": "SUCCESS",  # Already processed!
            "user_id": "user@astra.ai",
        }
        mock_get_payments.return_value = mock_col

        result = self.loop.run_until_complete(
            CashfreeService.process_successful_payment(
                order_id="ord_idempotent",
                amount=99.00,
                currency="INR",
            )
        )
        # Should return True safely without triggering another insert/update
        self.assertTrue(result)
        mock_col.update_one.assert_not_called()

    # ── Test 14: Duplicate payment processing ───────────────────────────────
    @patch("services.payment.cashfree.get_payments_collection")
    def test_14_duplicate_payment_processing(self, mock_get_payments):
        mock_col = AsyncMock()
        mock_col.find_one.return_value = {
            "_id": "doc_id_2",
            "order_id": "ord_double",
            "status": "SUCCESS",
            "email": "user@astra.ai",
        }
        mock_get_payments.return_value = mock_col

        # First duplicate call
        res1 = self.loop.run_until_complete(
            CashfreeService.process_successful_payment("ord_double", amount=99.00, currency="INR")
        )
        # Second duplicate call
        res2 = self.loop.run_until_complete(
            CashfreeService.process_successful_payment("ord_double", amount=99.00, currency="INR")
        )

        self.assertTrue(res1)
        self.assertTrue(res2)
        mock_col.update_one.assert_not_called()

    # ── Test 15: Successful entitlement activation ──────────────────────────
    @patch("services.entitlement.get_users_collection")
    @patch("services.entitlement.get_entitlements_collection")
    def test_15_successful_entitlement_activation(self, mock_get_entitlements, mock_get_users):
        mock_users = AsyncMock()
        mock_users.find_one.return_value = {"email": "winner@astra.ai", "plan": "FREE"}
        mock_get_users.return_value = mock_users

        mock_ent = AsyncMock()
        mock_get_entitlements.return_value = mock_ent

        res = self.loop.run_until_complete(
            activate_7_day_pass(
                user_email="winner@astra.ai",
                source_payment_id="cashfree_ord_123",
            )
        )

        self.assertEqual(res["plan"], "ASTRA_7_DAY")
        self.assertEqual(res["subscription_status"], "ACTIVE")
        self.assertTrue(res["is_active"])
        self.assertEqual(res["days_remaining"], 7)

    # ── Test 16: 7-day expiry calculation from server time ───────────────────
    @patch("services.entitlement.get_users_collection")
    @patch("services.entitlement.get_entitlements_collection")
    def test_16_7_day_expiry_calculation(self, mock_get_entitlements, mock_get_users):
        mock_users = AsyncMock()
        mock_users.find_one.return_value = None
        mock_get_users.return_value = mock_users

        mock_ent = AsyncMock()
        mock_get_entitlements.return_value = mock_ent

        now = datetime.now(timezone.utc)
        res = self.loop.run_until_complete(
            activate_7_day_pass("calc@astra.ai", "ord_calc", days=7)
        )

        exp_dt = datetime.fromisoformat(res["access_expires_at"])
        delta = exp_dt - now
        # Delta should be approximately 7 days (tolerance: within 5 seconds)
        self.assertAlmostEqual(delta.total_seconds(), 7 * 86400, delta=5)

    # ── Test 17: Expired premium access detection ───────────────────────────
    @patch("services.entitlement.get_users_collection")
    def test_17_expired_premium_access_detection(self, mock_get_users):
        now = datetime.now(timezone.utc)
        expired_time = now - timedelta(hours=5)

        mock_users = AsyncMock()
        mock_users.find_one.return_value = {
            "email": "expired@astra.ai",
            "plan": "ASTRA_7_DAY",
            "subscription_status": "ACTIVE",
            "access_expires_at": expired_time,
        }
        mock_get_users.return_value = mock_users

        res = self.loop.run_until_complete(get_user_entitlement("expired@astra.ai"))
        self.assertEqual(res["plan"], "FREE")
        self.assertEqual(res["subscription_status"], "EXPIRED")
        self.assertFalse(res["is_active"])
        self.assertEqual(res["days_remaining"], 0)

    # ── Test 18: Premium API access denied after expiry ──────────────────────
    @patch("security.auth.get_user_entitlement")
    def test_18_premium_api_after_expiry(self, mock_get_entitlement):
        mock_get_entitlement.return_value = {
            "plan": "FREE",
            "subscription_status": "EXPIRED",
            "is_active": False,
        }

        with self.assertRaises(HTTPException) as ctx:
            self.loop.run_until_complete(
                require_active_premium(current_user={"email": "expired@astra.ai", "is_guest": False})
            )
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(ctx.exception.detail.get("error"), "PREMIUM_REQUIRED")

    @patch("services.usage.get_user_entitlement")
    @patch("services.usage.get_usages_collection")
    def test_19_free_user_restrictions(self, mock_get_usages, mock_get_entitlement):
        mock_get_entitlement.return_value = {"is_active": False, "plan": "FREE"}
        mock_col = AsyncMock()
        mock_col.find_one.return_value = {
            "user_id": "free@astra.ai",
            "messages_count": FREE_DAILY_MESSAGES,  # Already used all 10 messages
            "document_requests": 0,
            "image_requests": 0,
        }
        mock_get_usages.return_value = mock_col

        with self.assertRaises(HTTPException) as ctx:
            self.loop.run_until_complete(
                check_user_quota(email="free@astra.ai", request_type="message")
            )
        self.assertEqual(ctx.exception.status_code, 402)


    # ── Test 20: Admin payment reporting based on verified payments ─────────
    @patch("routes.admin.get_users_collection")
    @patch("routes.admin.get_payments_collection")
    def test_20_admin_payment_reporting(self, mock_get_payments, mock_get_users):
        mock_users = AsyncMock()
        mock_users.count_documents.side_effect = [100, 20, 10]  # total, active, expired
        mock_get_users.return_value = mock_users

        mock_payments = AsyncMock()
        # total_payments, successful_payments, failed_payments, pending_payments
        mock_payments.count_documents.side_effect = [30, 25, 3, 2]
        mock_get_payments.return_value = mock_payments

        metrics = self.loop.run_until_complete(
            get_admin_metrics(admin={"email": "admin@astra.ai", "is_admin": True})
        )

        self.assertEqual(metrics.total_users, 100)
        self.assertEqual(metrics.active_premium_users, 20)
        self.assertEqual(metrics.successful_payments, 25)
        self.assertEqual(metrics.failed_payments, 3)
        self.assertEqual(metrics.pending_payments, 2)
        # Revenue strictly calculated from 25 successful payments * ₹99 = ₹2475
        self.assertEqual(metrics.total_revenue_inr, 2475.0)


if __name__ == "__main__":
    unittest.main()
