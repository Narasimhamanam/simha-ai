import unittest
import time
import json
import base64
from unittest.mock import AsyncMock, patch, MagicMock
from routes.auth import decode_jwt_unverified, create_or_sync_session, SessionInitRequest
from fastapi import HTTPException


class TestAuthRoutes(unittest.IsolatedAsyncioTestCase):
    def test_decode_jwt_unverified(self):
        claims = {"sub": "uid_123", "email": "test@astra.ai", "name": "Astra Tester", "exp": int(time.time()) + 3600}
        payload_b64 = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
        fake_token = f"eyJhbGciOiJSUzI1NiJ9.{payload_b64}.fake_sig"

        decoded = decode_jwt_unverified(fake_token)
        self.assertEqual(decoded.get("sub"), "uid_123")
        self.assertEqual(decoded.get("email"), "test@astra.ai")
        self.assertEqual(decoded.get("name"), "Astra Tester")

    @patch("routes.auth.get_user_entitlement")
    @patch("routes.auth.get_users_collection")
    async def test_session_creation_new_user(self, mock_get_users, mock_get_entitlement):
        mock_col = AsyncMock()
        mock_col.find_one.return_value = None
        mock_col.insert_one = AsyncMock()
        mock_get_users.return_value = mock_col

        mock_get_entitlement.return_value = {
            "plan": "FREE",
            "subscription_status": "INACTIVE",
            "is_active": False,
            "days_remaining": 0,
        }

        req = SessionInitRequest(email="newuser@astra.ai", name="New User")
        mock_http_req = MagicMock()

        res = await create_or_sync_session(
            request=req,
            req=mock_http_req,
            authorization=None,
            x_user_email=None,
        )

        self.assertEqual(res["status"], "authenticated")
        self.assertEqual(res["user"]["email"], "newuser@astra.ai")
        self.assertEqual(res["user"]["plan"], "FREE")
        mock_col.insert_one.assert_awaited_once()

    @patch("routes.auth.get_user_entitlement")
    @patch("routes.auth.get_users_collection")
    async def test_session_sync_existing_user(self, mock_get_users, mock_get_entitlement):
        mock_col = AsyncMock()
        mock_col.find_one.return_value = {
            "uid": "existing_uid",
            "email": "existing@astra.ai",
            "name": "Existing",
            "plan": "ASTRA_7_DAY",
        }
        mock_col.update_one = AsyncMock()
        mock_get_users.return_value = mock_col

        mock_get_entitlement.return_value = {
            "plan": "ASTRA_7_DAY",
            "subscription_status": "ACTIVE",
            "is_active": True,
            "days_remaining": 6,
        }

        req = SessionInitRequest(email="existing@astra.ai")
        mock_http_req = MagicMock()

        res = await create_or_sync_session(
            request=req,
            req=mock_http_req,
            authorization=None,
            x_user_email=None,
        )

        self.assertEqual(res["status"], "authenticated")
        self.assertEqual(res["user"]["is_active_premium"], True)
        mock_col.update_one.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
