# 🚀 Cashfree Payment Gateway Setup & Operations Guide

**Product:** Astra AI (Astra 7-Day Pass — ₹99 INR)  
**API Specification:** Cashfree Payment Gateway & Payment Links (`2023-08-01` API)  
**Document Version:** 1.0.0  
**Security Clearance:** Public Developer Documentation (Zero Secret Exposure)  

---

## 1. Cashfree Merchant Account Setup

1. **Register Merchant Account:**
   - Navigate to [Cashfree Payments](https://www.cashfree.com/) and create or sign in to your merchant account.
   - Complete basic business onboarding, KYC, and bank account verification for settlement.
2. **Access Payment Gateway (PG):**
   - From the Cashfree dashboard sidebar, select **Payment Gateway**.
   - Switch between **Sandbox (Test Mode)** and **Production (Live Mode)** using the environment toggle in the header.

---

## 2. Generating Required Credentials

1. Go to **Developers** / **API Keys** in the Cashfree Merchant Dashboard:
   - For Sandbox: [https://merchant.cashfree.com/merchants/login](https://merchant.cashfree.com/merchants/login) (Toggle to Sandbox)
   - For Production: [https://merchant.cashfree.com/merchants/login](https://merchant.cashfree.com/merchants/login) (Toggle to Production)
2. Generate your API Key pair:
   - **App ID / Client ID:** A unique alphanumeric identifier representing your account (e.g. `TEST1034...` or `PROD1034...`).
   - **Secret Key / Client Secret:** A secure cryptographic private key used to authenticate API calls and verify webhook signatures.
3. Keep your **Secret Key** confidential. Never commit it to git, embed it in frontend code, or expose it in public logs.

---

## 3. Sandbox Configuration

In development and staging environments, use Cashfree's Sandbox to simulate real payments without actual monetary debit:

```env
# backend/.env
CASHFREE_ENVIRONMENT=sandbox
CASHFREE_CLIENT_ID=your_sandbox_app_id_here
CASHFREE_CLIENT_SECRET=your_sandbox_secret_key_here
CASHFREE_API_VERSION=2023-08-01
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
```

- **Sandbox API Endpoint:** `https://sandbox.cashfree.com/pg`
- **Hosted Payment Link Domain:** `https://payments-test.cashfree.com/links/...`
- **Test Instruments:** Cashfree provides test UPI IDs (e.g. `success@upi`) and test card numbers in their developer studio to test `SUCCESS`, `FAILED`, and `USER_DROPPED` scenarios.

---

## 4. Production Configuration

When transitioning to live payment collection:

```env
# backend/.env
CASHFREE_ENVIRONMENT=production
CASHFREE_CLIENT_ID=your_production_app_id_here
CASHFREE_CLIENT_SECRET=your_production_secret_key_here
CASHFREE_API_VERSION=2023-08-01
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

- **Production API Endpoint:** `https://api.cashfree.com/pg`
- **Hosted Payment Link Domain:** `https://payments.cashfree.com/links/...`
- **Production Readiness Checklist:**
  - Verify bank account settlement status in Cashfree dashboard.
  - Verify webhook endpoint is HTTPS and publicly reachable.
  - Test a real ₹99 payment with UPI or card to ensure end-to-end activation.

---

## 5. Webhook Configuration

Cashfree sends real-time asynchronous notifications upon payment events (success, failure, user drop).

1. In the Cashfree Merchant Dashboard, go to **Payment Gateway** -> **Webhooks**.
2. Click **Add Webhook Endpoint**.
3. Configure the following settings:
   - **Webhook URL:** `https://api.yourdomain.com/api/payments/cashfree/webhook`
   - **Events to Subscribe:**
     - `PAYMENT_SUCCESS_WEBHOOK`
     - `PAYMENT_FAILED_WEBHOOK`
     - `PAYMENT_USER_DROPPED_WEBHOOK`
     - `ORDER_PAID_WEBHOOK`
4. **Cryptographic Verification Formula:**
   Every incoming webhook includes headers:
   - `x-webhook-signature`: Base64-encoded HMAC-SHA256 digest.
   - `x-webhook-timestamp`: Request timestamp.
   The backend independently computes:
   ```python
   signature_data = f"{timestamp}{raw_request_body}"
   computed_signature = base64.b64encode(
       hmac.new(CASHFREE_CLIENT_SECRET.encode(), signature_data.encode(), hashlib.sha256).digest()
   ).decode("utf-8")
   assert hmac.compare_digest(computed_signature, received_signature)
   ```
   Requests failing this check receive `HTTP 401 Unauthorized` and are discarded.

---

## 6. Architecture & Data Flow

```
+─────────────────+         +──────────────────+         +──────────────────+
|  Astra Frontend |         |   Astra Backend  |         | Cashfree Gateway |
+─────────────────+         +──────────────────+         +──────────────────+
         |                           |                            |
         | 1. Click "Get Pass (₹99)" |                            |
         |-------------------------->|                            |
         |                           | 2. Create link request     |
         |                           |--------------------------->|
         |                           |    (amount: 99.00 INR)     |
         |                           |<---------------------------|
         |                           | 3. Stores PENDING in DB    |
         | 4. Returns link_url       |                            |
         |<--------------------------|                            |
         |                                                        |
         | 5. Redirects to official Cashfree checkout link        |
         |------------------------------------------------------->|
         |                                                        |
         | 6. User completes payment on Cashfree hosted page      |
         |                                                        |
         | 7. Return redirect        |                            |
         |-------------------------->| (Webhook async)            |
         |                           |<---------------------------|
         | 8. Polls /status/order_id | 9. Verifies signature      |
         |-------------------------->|    Checks amount & order   |
         |                           | 10. Marks SUCCESS in DB    |
         |                           |     Activates 7-day pass   |
         | 11. Returns active pass   |                            |
         |<--------------------------|                            |
         |                                                        |
         | 12. Displays "Payment Successful 🎉"                   |
         |     Valid until: DD MMM YYYY                           |
```

---

## 7. Database Schemas

### 7.1 Payment Record (`payments` collection)
```json
{
  "_id": "ObjectId(...)",
  "payment_id": "uuid_v4_string",
  "user_id": "customer@example.com",
  "email": "customer@example.com",
  "order_id": "astra_ord_customer_4b1a2c3d4e5f",
  "link_id": "astra_link_customer_4b1a2c3d4e5f",
  "provider": "cashfree",
  "amount": 99.00,
  "currency": "INR",
  "status": "SUCCESS",
  "payment_link": "https://payments.cashfree.com/links/...",
  "provider_payment_id": "cf_payment_12345678",
  "provider_reference": "bank_ref_987654321",
  "created_at": "2026-09-13T12:00:00Z",
  "updated_at": "2026-09-13T12:00:15Z",
  "verified_at": "2026-09-13T12:00:15Z",
  "environment": "production"
}
```

### 7.2 Entitlement Record (`entitlements` collection)
```json
{
  "_id": "ObjectId(...)",
  "user_id": "customer@example.com",
  "email": "customer@example.com",
  "plan": "ASTRA_7_DAY",
  "starts_at": "2026-09-13T12:00:15Z",
  "expires_at": "2026-09-20T12:00:15Z",
  "status": "ACTIVE",
  "source_payment_id": "astra_ord_customer_4b1a2c3d4e5f",
  "created_at": "2026-09-13T12:00:15Z"
}
```

---

## 8. Idempotency Guarantee

- Every payment link generates a unique internal `order_id` indexed with a MongoDB unique constraint.
- When a webhook or manual status check arrives:
  ```python
  if payment.get("status") == "SUCCESS":
      return True  # Skip without re-activating or extending
  ```
- A single successful ₹99 transaction grants exactly one 7-day entitlement window.
- Retried webhook deliveries never duplicate time or revenue metrics.

---

## 9. Testing Procedures

### Running Backend Unit & Security Tests
```powershell
cd backend
python -m unittest discover tests/ -v
```

### Running Frontend Production Build
```powershell
cd frontend
npm run build
```

---

## 10. Troubleshooting & FAQ

| Symptom | Cause | Resolution |
|---|---|---|
| `Cashfree credentials are not configured` | Missing `.env` variables | Set `CASHFREE_CLIENT_ID` and `CASHFREE_CLIENT_SECRET` in `backend/.env`. |
| `Invalid webhook signature` | Mismatched secret or timestamp | Ensure webhook secret in Cashfree dashboard matches `CASHFREE_CLIENT_SECRET`. |
| Status remains `PENDING` after payment | User closed browser before redirect & webhook delayed | Use Admin Dashboard to click **Reconcile** on the pending transaction. |
| Customer paid but pass is not active | Gateway verification issue | Check Cashfree Merchant Dashboard transactions and backend audit logs. |
