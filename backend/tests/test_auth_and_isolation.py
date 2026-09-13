import unittest
import asyncio
from unittest.mock import MagicMock, patch
from fastapi import HTTPException

from security.auth import get_current_user, require_admin, require_authenticated_user
from security.rate_limiter import rate_limit_check, _request_history


class TestAuthAndIsolation(unittest.TestCase):
    """Tests for authentication guards, admin permissions, and rate limiting."""

    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        _request_history.clear()

    def tearDown(self):
        self.loop.close()

    def test_get_current_user_from_header(self):
        req = MagicMock()
        user = self.loop.run_until_complete(
            get_current_user(req, x_user_email="student@astra.ai")
        )
        self.assertEqual(user["email"], "student@astra.ai")
        self.assertFalse(user["is_guest"])

    def test_get_current_user_guest_fallback(self):
        req = MagicMock()
        user = self.loop.run_until_complete(
            get_current_user(req, authorization=None, x_user_email=None)
        )
        self.assertEqual(user["email"], "guest@local")
        self.assertTrue(user["is_guest"])

    def test_require_authenticated_blocks_guest(self):
        guest_user = {"email": "guest@local", "is_guest": True}
        with self.assertRaises(HTTPException) as ctx:
            self.loop.run_until_complete(require_authenticated_user(guest_user))
        self.assertEqual(ctx.exception.status_code, 401)

    def test_require_admin_blocks_regular_user(self):
        regular_user = {"email": "user@example.com", "is_admin": False}
        with self.assertRaises(HTTPException) as ctx:
            self.loop.run_until_complete(require_admin(regular_user))
        self.assertEqual(ctx.exception.status_code, 403)

    def test_require_admin_allows_admin(self):
        admin_user = {"email": "admin@astra.ai", "is_admin": True}
        res = self.loop.run_until_complete(require_admin(admin_user))
        self.assertEqual(res["email"], "admin@astra.ai")

    def test_rate_limiter_triggers_429(self):
        req = MagicMock()
        req.client.host = "192.168.1.100"
        req.headers.get.return_value = None

        # Allow 5 requests in a tight test window
        test_limit = 5
        for _ in range(test_limit):
            rate_limit_check(req, limit=test_limit)

        # 6th request must raise HTTP 429
        with self.assertRaises(HTTPException) as ctx:
            rate_limit_check(req, limit=test_limit)
        self.assertEqual(ctx.exception.status_code, 429)


if __name__ == "__main__":
    unittest.main()
