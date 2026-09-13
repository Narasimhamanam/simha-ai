# 🔄 Astra AI: Cashfree Payment Links Migration Audit

**Document Version:** 1.0.0  
**Date:** September 2026  
**Status:** In Progress / Migration Design  
**Author:** Principal Full-Stack & Payment Security Architect  

---

## 1. Executive Summary

This audit establishes the blueprint for migrating the **Astra AI** SaaS monetization infrastructure from the interim PhonePe Standard Gateway / legacy payment code to **Cashfree Payment Links** (`2023-08-01` API). 

The goal is to provide a zero-trust, server-controlled payment verification flow for the **Astra 7-Day Pass (₹99 INR one-time)**. Client-side state, frontend redirects, and query parameters will never be trusted to grant entitlements. Every premium activation must be cryptographically verified server-side or via an authentic Cashfree server-to-server webhook before the entitlement engine marks the user's subscription as `ACTIVE`.

---

## 2. Inventory of Existing Payment-Related Files

| Layer | File Path | Current Role / Implementation | Migration Action |
|---|---|---|---|
| **Backend Service** | `backend/services/payment/phonepe.py` | PhonePe payment service (order creation, checksum calculation, status check) | **Replace** with `backend/services/payment/cashfree.py` |
| **Backend Routes** | `backend/routes/payments.py` | Payment endpoints (`/create-order`, `/status/{order_id}`, `/webhook`, `/history`) | **Refactor** to Cashfree Payment Links API (`/create`, `/status/{order_id}`, `/cashfree/webhook`, `/reconcile/{order_id}`) |
| **Backend Schemas** | `backend/models/schemas.py` | Pydantic models for payment requests, responses, and statuses | **Update** with Cashfree link IDs, provider references, and verification timestamps |
| **Backend Database** | `backend/database.py` | MongoDB collections and indexes (`payments`, `entitlements`, `users`) | **Update** indexes for `order_id`, `payment_id`, `link_id`, and `provider` |
| **Backend Entitlement** | `backend/services/entitlement.py` | 7-day entitlement calculation, pass activation, auto-expiration | **Retain & Enhance** (pure server-side time calculation, renewal handling) |
| **Backend Auth** | `backend/security/auth.py` | `require_active_premium` guard and authentication dependencies | **Retain** (strictly protects AI and premium features) |
| **Backend Admin** | `backend/routes/admin.py` | Admin metrics and transaction listing | **Update** to report Cashfree order IDs, verified timestamps, and reconciliation |
| **Backend Tests** | `backend/tests/test_phonepe_payment.py` | Unit tests for PhonePe checksums and orders | **Replace** with `backend/tests/test_cashfree_payment.py` (20+ test cases) |
| **Backend Env** | `backend/.env.example` | Environment variable template | **Update** to include Cashfree credentials and environment modes |
| **Frontend Pricing** | `frontend/src/pages/PricingPage.jsx` | Pricing card and checkout initiator | **Refactor** to call Cashfree creation endpoint, redirect to real Cashfree link URL, show active pass state |
| **Frontend Status** | `frontend/src/pages/PaymentStatusPage.jsx` | Post-payment verification and polling page | **Refactor** to support `/payment/success` and `/payment/status`, verify via backend API, remove localStorage fallback |
| **Frontend App** | `frontend/src/pages/Home.jsx` | Main view routing and usage polling | **Update** to route `/payment/success` and handle returning from Cashfree |
| **Frontend Admin** | `frontend/src/pages/AdminDashboard.jsx` | SaaS revenue and transaction dashboard | **Update** transaction table with Cashfree fields and reconciliation trigger |
| **Frontend Legal** | `frontend/src/pages/LegalPages.jsx` | Terms, Privacy, Refund policies | **Update** payment references to Cashfree Payments |
| **Frontend Landing** | `frontend/src/pages/LandingPage.jsx` | Marketing landing page and FAQ | **Update** payment methods to Cashfree Payments |

---

## 3. Findings from Repository Payment Audit

### 3.1 Legacy / Static / Insecure Logic Discovered
1. **Frontend Fallback to `localStorage` in Payment Status:**
   - In `frontend/src/pages/PaymentStatusPage.jsx` (line 12):
     ```javascript
     const orderId = queryParams.get("order_id") || localStorage.getItem("astra_last_order_id") || "";
     ```
   - While the backend actually verified the order, relying on `localStorage` for checkout state is brittle and insecure.
   - **Remediation:** Pass the authentic `order_id` / `link_id` via query parameters configured in the server-generated Cashfree `return_url`.

2. **PhonePe PG Direct Pay Page (Interim Solution):**
   - The prior PhonePe implementation utilized `PAY_PAGE` base64 redirects and pre-prod UAT credentials (`PGTESTPAYUAT`).
   - The user requires a direct, official **Cashfree Payment Links** integration where the customer is redirected to Cashfree's hosted checkout page.
   - **Remediation:** Remove all PhonePe-specific signing (`calculate_sha256`, `generate_checksum`, `verify_checksum` with salt keys) and replace with Cashfree's HMAC-SHA256 signature verification over `timestamp + rawBody` using `CASHFREE_CLIENT_SECRET`.

3. **Client-Side Pricing & Button Text:**
   - Button text and legal copy explicitly mentioned PhonePe.
   - **Remediation:** Update all frontend UI, trust badges, and legal policies to Cashfree Payments. Ensure button states show "Creating secure payment..." followed by browser redirect to the Cashfree hosted link.

4. **Entitlement Renewal Edge Case:**
   - If an existing active subscriber purchases a pass, the duration must extend from their existing `access_expires_at` rather than resetting from `now`, preventing loss of prepaid time.
   - **Remediation:** Implement proactive active pass detection on the Pricing page and non-destructive duration stacking in `activate_7_day_pass`.

---

## 4. Target Architecture: Cashfree Payment Links

### 4.1 Flow Diagram
```
  [User on Astra Pricing Page]
              │
              ▼ (Click "Get 7-Day Pass — ₹99")
  [POST /api/payments/create] ──(Requires Bearer / Authenticated Email)
              │
              ├─► Verify caller authentication
              ├─► Generate internal order_id: "ASTRA_ORD_<UUID>"
              ├─► Generate link_id: "link_<UUID>"
              ├─► Call Cashfree API: POST /links
              │     Headers: x-client-id, x-client-secret, x-api-version: 2023-08-01
              │     Payload: link_id, link_amount: 99.00, link_currency: "INR",
              │              customer_details, link_meta: { notify_url, return_url }
              ├─► Insert record into MongoDB `payments` as PENDING
              └─► Return { order_id, link_id, payment_link: link_url, amount: 99.0 }
              │
              ▼
  [Browser Redirects to Cashfree Hosted Checkout Link]
              │
              ▼ (User completes UPI / Card / Net Banking payment)
  ┌───────────────────────────────────────────┴───────────────────────────────────────────┐
  ▼                                                                                       ▼
[Return URL Redirect: /payment/success?order_id=...]                 [Asynchronous Cashfree Webhook: POST /api/payments/cashfree/webhook]
  │                                                                                       │
  ▼                                                                                       ▼
[Frontend calls GET /api/payments/status/{order_id}]                 [Verify HMAC-SHA256 signature with CASHFREE_CLIENT_SECRET]
  │                                                                                       │
  ├─► Backend checks DB; if PENDING, queries Cashfree API             ├─► Confirm amount == 99.00 & currency == INR & status == SUCCESS
  ├─► If SUCCESS: verify amount == 99.00 & currency == INR            ├─► Idempotently update payment status to SUCCESS
  ├─► Atomically set payment.status = SUCCESS                         └─► Activate 7-day Astra Pass (access_expires_at = now + 7 days)
  └─► Return active entitlement & expiration date
              │
              ▼
  [Frontend Displays "Payment Successful 🎉" + Valid Until Date + "Start Using Astra" Button]
```

---

## 5. Security Specifications

1. **Server-Controlled Pricing:**
   - Amount is strictly hardcoded on the backend as `99.00` INR.
   - Any client payload attempting to specify amount is discarded.

2. **Cryptographic Webhook Verification:**
   - Header `x-webhook-signature`: Base64 HMAC-SHA256.
   - Header `x-webhook-timestamp`: Request timestamp.
   - Computed signature: `HMAC_SHA256(timestamp + raw_body, CASHFREE_CLIENT_SECRET)`.
   - Requests failing signature verification receive `HTTP 401 Unauthorized` and are logged in security audits.

3. **Strict Idempotency:**
   - Unique MongoDB index on `order_id` and `link_id`.
   - Webhook handler verifies whether `payment.status == "SUCCESS"`. If already processed, it returns `HTTP 200 OK` without re-extending the entitlement.

4. **Zero Client Trust:**
   - Frontend navigation to `/payment/success` does NOT activate anything.
   - Only backend database records with `status == "SUCCESS"` updated through verified gateway responses confer premium access.
