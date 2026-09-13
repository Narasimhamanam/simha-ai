# Astra AI (GPT 6 Astra) — Backend API Documentation

**Version:** 3.0.0  
**Specification:** RESTful OpenAPI 3.1 compatible  
**Base URL (Local):** `http://localhost:8000`  
**Base URL (Production):** Configurable via `BACKEND_URL` (e.g. `https://api.astra.ai`)  
**Legal Notice:** Astra AI is an independent AI application and is not affiliated with or endorsed by OpenAI, Google, or Anthropic.

---

## 1. Authentication & Headers

| Header | Type | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer <token>` | Firebase ID token or user email identifier. |
| `X-User-Email` | `string` | Authenticated user email (e.g. `user@example.com`). |
| `Content-Type` | `application/json` | Standard payload format. |

---

## 2. Health & System Endpoints

### 2.1 Service Info
- **Endpoint:** `GET /`
- **Auth Required:** No
- **Response:**
```json
{
  "service": "Astra AI (GPT 6 Astra)",
  "status": "operational",
  "version": "3.0.0",
  "disclaimer": "Astra AI is an independent AI application and is not affiliated with or endorsed by OpenAI."
}
```

### 2.2 Pre-warm / Ping
- **Endpoint:** `GET /ping`
- **Auth Required:** No
- **Response:** `{"status": "ok", "message": "Astra AI core is warm ⚡"}`

### 2.3 Healthcheck
- **Endpoint:** `GET /health`
- **Auth Required:** No
- **Response:** `{"status": "healthy", "database": "connected", "version": "3.0.0"}`

---

## 3. Entitlement & Usage Endpoints

### 3.1 User Usage Summary
- **Endpoint:** `GET /user-usage/{email}` (Alias: `/user-credits/{email}`)
- **Auth Required:** Recommended
- **Response:**
```json
{
  "plan": "FREE | ASTRA_7_DAY",
  "subscription_status": "INACTIVE | ACTIVE | EXPIRED",
  "is_premium": true,
  "days_remaining": 6,
  "access_expires_at": "2026-09-20T12:00:00Z",
  "messages_used": 14,
  "messages_limit": 100,
  "documents_used": 2,
  "documents_limit": 20,
  "quota_reached": false
}
```

### 3.2 User Entitlement Details
- **Endpoint:** `GET /user-entitlement/{email}`
- **Auth Required:** Yes
- **Response:**
```json
{
  "plan": "ASTRA_7_DAY",
  "subscription_status": "ACTIVE",
  "access_started_at": "2026-09-13T12:00:00Z",
  "access_expires_at": "2026-09-20T12:00:00Z",
  "days_remaining": 7,
  "is_active": true
}
```

---

## 4. PhonePe Payment Endpoints

### 4.1 Create Payment Order
- **Endpoint:** `POST /api/payments/create-order`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "email": "user@example.com",
  "redirect_url": "https://astra.ai/payment/status"
}
```
- **Response (HTTP 200):**
```json
{
  "order_id": "ASTRA_ORD_A1B2C3D4",
  "merchant_transaction_id": "ASTRA_TXN_20260913_A1B2C3D4",
  "amount": 9900,
  "currency": "INR",
  "checkout_url": "https://mercury-uat.phonepe.com/transact/...",
  "status": "PENDING"
}
```
- **Errors:** `400 Bad Request` (missing email), `500 Internal Error` (gateway connection error).

### 4.2 Check Payment Status
- **Endpoint:** `GET /api/payments/status/{order_id}`
- **Auth Required:** Yes
- **Response (HTTP 200):**
```json
{
  "order_id": "ASTRA_ORD_A1B2C3D4",
  "merchant_transaction_id": "ASTRA_TXN_20260913_A1B2C3D4",
  "status": "SUCCESS | PENDING | FAILED",
  "amount": 9900,
  "currency": "INR",
  "plan": "ASTRA_7_DAY",
  "access_expires_at": "2026-09-20T12:00:00Z",
  "message": "Payment verified successfully! Your Astra 7-Day Pass is active."
}
```

### 4.3 PhonePe Server-to-Server Webhook
- **Endpoint:** `POST /api/payments/webhook`
- **Auth Required:** Signature Header (`X-VERIFY`)
- **Headers:** `X-VERIFY: <sha256_hash>###<salt_index>`
- **Request Body:** `{"response": "<base64_encoded_payload>"}`
- **Response:** `{"status": "SUCCESS", "message": "Entitlement processed"}`
- **Security:** Rejects tampered or unverified signatures with `HTTP 401 Unauthorized`.

---

## 5. Astra AI Core Endpoints

### 5.1 Stream Chat (Astra Chat, Code, Study, Wisdom)
- **Endpoint:** `POST /stream-chat`
- **Rate Limit:** 30 req/min
- **Quota Enforced:** Yes (10/day on Free; 100/day on 7-Day Pass)
- **Request Body:**
```json
{
  "query": "Explain quantum computing algorithms",
  "agent": "study | coding | productivity | wisdom",
  "chat_id": "64f1a2b3...",
  "user_id": "user@example.com"
}
```
- **Response:** Streaming `text/plain` chunked transfer.
- **Errors:**
  - `HTTP 402 Payment Required`: Daily quota exceeded.
  - `HTTP 429 Too Many Requests`: Rate limit threshold reached.

### 5.2 Astra Vision (Multimodal Image Analysis)
- **Endpoint:** `POST /analyze-image`
- **Quota Enforced:** Yes
- **Max Size:** 5 MB
- **Request Body:**
```json
{
  "image_base64": "data:image/jpeg;base64,...",
  "prompt": "Extract the error log and suggest a fix.",
  "user_email": "user@example.com"
}
```
- **Response:** `{"response": "Extracted text and analysis..."}`
- **Errors:** `HTTP 413 Payload Too Large` if image exceeds 5MB.

### 5.3 Astra Docs (PDF Upload & Vector RAG)
- **Endpoint:** `POST /upload-pdf`
- **Form Data:** `file` (binary), `user_email` (string), `chat_id` (string)
- **Max Size:** 10 MB
- **Quota Enforced:** Yes (2 docs/day on Free; 20 docs/day on 7-Day Pass)
- **Response:**
```json
{
  "message": "PDF indexed successfully in Astra Docs",
  "doc_id": "64f1c9d8...",
  "file_name": "research_paper.pdf",
  "pages": 14
}
```

### 5.4 Astra Research & Productivity Endpoints
- `POST /summarize-url`: Webpage reader and structured intelligence extraction.
- `POST /generate-email`: High-precision professional email drafting.
- `POST /generate-calendar-event`: Natural language to calendar scheduling.

---

## 6. Admin Endpoints

All admin endpoints require caller to be listed in `ADMIN_EMAILS`.

### 6.1 Platform Metrics
- **Endpoint:** `GET /api/admin/metrics`
- **Response:**
```json
{
  "total_users": 150,
  "free_users": 110,
  "active_premium_users": 40,
  "expired_passes": 12,
  "total_revenue_inr": 3960.0,
  "total_payments": 45,
  "successful_payments": 40,
  "failed_payments": 5
}
```

### 6.2 User Search & Inspection
- **Endpoint:** `GET /api/admin/users?query=user@example.com`
- **Response:** Array of user records with active pass status.

### 6.3 Manual Entitlement Grant
- **Endpoint:** `POST /api/admin/entitlement/grant`
- **Body:** `{"email": "user@example.com", "days": 7, "reason": "VIP Support"}`
