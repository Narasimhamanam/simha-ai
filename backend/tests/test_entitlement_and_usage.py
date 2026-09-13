import unittest
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock
from fastapi import HTTPException

from services.entitlement import get_user_entitlement, activate_7_day_pass
from services.usage import check_user_quota, FREE_DAILY_MESSAGES, PREMIUM_DAILY_MESSAGES


class TestEntitlementAndUsage(unittest.TestCase):
    """Tests for Astra AI entitlement engine and 7-day expiration logic."""

    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

    def test_guest_entitlement_is_free(self):
        result = self.loop.run_until_complete(get_user_entitlement("guest"))
        self.assertEqual(result["plan"], "FREE")
        self.assertFalse(result["is_active"])
        self.assertEqual(result["days_remaining"], 0)

    @patch("services.entitlement.get_users_collection")
    def test_active_pass_evaluation(self, mock_get_users):
        now = datetime.now(timezone.utc)
        future_expiry = now + timedelta(days=5)

        mock_col = AsyncMock()
        mock_col.find_one.return_value = {
            "email": "test@astra.ai",
            "plan": "ASTRA_7_DAY",
            "subscription_status": "ACTIVE",
            "access_started_at": now - timedelta(days=2),
            "access_expires_at": future_expiry,
        }
        mock_get_users.return_value = mock_col

        result = self.loop.run_until_complete(get_user_entitlement("test@astra.ai"))
        self.assertEqual(result["plan"], "ASTRA_7_DAY")
        self.assertTrue(result["is_active"])
        self.assertGreaterEqual(result["days_remaining"], 5)

    @patch("services.entitlement.get_users_collection")
    def test_expired_pass_auto_reversion(self, mock_get_users):
        now = datetime.now(timezone.utc)
        past_expiry = now - timedelta(hours=2)

        mock_col = AsyncMock()
        mock_col.find_one.return_value = {
            "email": "test@astra.ai",
            "plan": "ASTRA_7_DAY",
            "subscription_status": "ACTIVE",
            "access_started_at": now - timedelta(days=8),
            "access_expires_at": past_expiry,
        }
        mock_get_users.return_value = mock_col

        result = self.loop.run_until_complete(get_user_entitlement("test@astra.ai"))
        # Must automatically revert to FREE plan
        self.assertEqual(result["plan"], "FREE")
        self.assertFalse(result["is_active"])
        self.assertEqual(result["days_remaining"], 0)
        self.assertEqual(result["subscription_status"], "EXPIRED")

    @patch("services.usage.get_user_entitlement")
    @patch("services.usage.get_or_create_daily_usage")
    def test_free_quota_exceeded_raises_402(self, mock_usage, mock_entitlement):
        mock_entitlement.return_value = {"plan": "FREE", "is_active": False}
        mock_usage.return_value = {
            "messages_count": FREE_DAILY_MESSAGES,
            "document_requests": 0,
        }

        with self.assertRaises(HTTPException) as ctx:
            self.loop.run_until_complete(check_user_quota("freeuser@astra.ai", request_type="message"))

        self.assertEqual(ctx.exception.status_code, 402)
        self.assertEqual(ctx.exception.detail["error"], "QUOTA_EXCEEDED")

    @patch("services.usage.get_user_entitlement")
    @patch("services.usage.get_or_create_daily_usage")
    def test_premium_quota_higher_limit(self, mock_usage, mock_entitlement):
        # 15 messages would block Free user, but should be allowed for Premium
        mock_entitlement.return_value = {"plan": "ASTRA_7_DAY", "is_active": True}
        mock_usage.return_value = {
            "messages_count": 15,
            "document_requests": 0,
        }

        result = self.loop.run_until_complete(check_user_quota("premium@astra.ai", request_type="message"))
        self.assertTrue(result["is_premium"])
        self.assertEqual(result["message_limit"], PREMIUM_DAILY_MESSAGES)


if __name__ == "__main__":
    unittest.main()
