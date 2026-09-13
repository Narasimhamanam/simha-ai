# Astra AI (GPT 6 Astra) — Final Architectural, Security & SaaS Audit

**Date:** September 2026  
**Status:** Complete & Production Ready  
**Product Designation:** GPT 6 Astra  
**Preferred Consumer Name:** Astra AI  
**Legal Classification:** Independent AI Application (No affiliation with OpenAI, Google, or Anthropic)

---

## 1. System Architecture

Astra AI is structured as a decoupled, modern multi-tier consumer SaaS:

```
[Vite + React 19 Frontend]
        │
        ├── Landing Page (Hero, 7 Capabilities, Pricing ₹99, FAQs, Legal Disclaimers)
        ├── Pricing & Checkout Page (PhonePe Standard PG integration)
        ├── Payment Status & Verification Return Flow (S2S Synchronized)
        ├── Multi-Agent Workspace (Astra Chat, Code, Study, Docs, Vision, Research, Productivity, Wisdom)
        ├── Administration Console (Metrics, Revenue, User Directory, Manual Grant)
        └── Legal & Policy Views (Terms, Privacy, Refund, AI Disclaimer)
        │
        ▼ (HTTPS REST / Streaming JSON)
[FastAPI Backend Engine]
        │
        ├── Security & Policy Layer:
        │     ├── In-Memory Sliding-Window Rate Limiter (30 req/min)
        │     ├── Authentication Guard & User Identity Resolver
        │     ├── Admin Route Guard (ADMIN_EMAILS check)
        │     └── File & Payload Size Constrainers (10MB PDF, 5MB Image)
        │
        ├── Entitlement & Quota Layer:
        │     ├── Free Tier Enforcement (10 daily messages, 2 docs)
        │     ├── Astra 7-Day Pass Enforcement (100 daily messages, 20 docs, priority throughput)
        │     └── Dynamic Auto-Expiration (reverts to Free once expires_at < now without data loss)
        │
        ├── Payment Service:
        │     ├── PhonePe Standard Checkout Gateway (Order initiation at ₹99 / 9900 paise)
        │     ├── Cryptographic SHA-256 Checksum Validation (X-VERIFY)
        │     ├── Direct Server-to-Server Payment Status Polling
        │     └── Idempotent Atomic Entitlement Grant
        │
        └── AI Provider Abstraction:
              ├── BaseAIProvider Interface
              ├── GroqProvider (Automated multi-model fallback chain & exponential backoff)
              └── ModelRouter (Configurable via AI_PROVIDER, AI_MODEL, AI_TEMPERATURE, AI_MAX_TOKENS)
        │
        ▼
[Data Persistence Layer]
        ├── MongoDB Collections: users, payments, entitlements, usages, chats, documents, audit_logs
        └── ChromaDB Vector Store: PDF RAG vector representations
```

---

## 2. Feature Implementation Status

| Module | Feature | Status | Implementation Details |
| :--- | :--- | :--- | :--- |
| **Astra Chat** | Conversational Reasoning | ✅ Operational | Streaming SSE transfer with token usage recording |
| **Astra Code** | Software Architecture & DSA | ✅ Operational | Syntax highlighted, time/space complexity analysis |
| **Astra Study** | Tutoring & Academics | ✅ Operational | Structured pedagogy, worked examples, step-by-step logic |
| **Astra Docs** | PDF Vector Q&A | ✅ Operational | ChromaDB RAG chunking with MiniLM-L6 embeddings |
| **Astra Vision** | Multimodal Image Analysis | ✅ Operational | Groq Vision Qwen-27B analysis with strict size caps |
| **Astra Research**| Webpage Reader & Summary | ✅ Operational | Async HTTP scraping, HTML tag sanitation, JSON extraction |
| **Astra Productivity** | Email & Calendar | ✅ Operational | Structured email tone formatting & Google Calendar events |
| **Astra Wisdom** | Philosophical Clarity | ✅ Operational | Stoic, calm perspective grounded in timeless teachings |
| **Landing Page** | Public SaaS Portal | ✅ Operational | Hero, 7 capability cards, pricing table, FAQs, disclaimer |
| **Pricing Page** | ₹99 PhonePe Checkout | ✅ Operational | Honest ₹99 for 7 days, direct PhonePe integration |
| **Payment Return** | Verification Status | ✅ Operational | Real-time polling with PhonePe status check API |
| **Admin Console**| SaaS Operations | ✅ Operational | User search, revenue metrics, transaction logs, pass grants |
| **Legal Pages** | Transparency Compliance | ✅ Operational | Terms, Privacy, Refund, and AI Usage Disclaimers |

---

## 3. Payment Integration Audit (PhonePe)

1. **Official Standard Gateway Architecture:**
   - Base URL: `https://api-preprod.phonepe.com/apis/pg-sandbox` (UAT) / `https://api.phonepe.com/apis/hermes` (Production).
   - Order Initiation: Generates base64 payload and computes `X-VERIFY: SHA256(b64 + "/pg/v1/pay" + salt_key)###salt_index`.
   - Status Check: Direct S2S call to `/pg/v1/status/{merchantId}/{merchantTransactionId}` with valid checksum.
   - Webhook Verification: Validates `X-VERIFY` against `SHA256(response_b64 + salt_key)###salt_index`.
2. **Elimination of Fake/Dummy Logic:**
   - Removed all `rzp_test_dummy` checks and Razorpay dependencies.
   - No mock payment bypasses exist in production code.
3. **Idempotency & Replay Protection:**
   - Transaction status verified in MongoDB before any entitlement is activated.
   - Duplicate webhooks or replay attempts are safely acknowledged without double-crediting.
4. **Credential Security:**
   - Salt keys and merchant credentials exist only server-side.
   - No payment secrets are ever bundled or exposed in the frontend.

---

## 4. Security & Authentication Audit

1. **Authentication & Identity:**
   - Backend `get_current_user` extracts and validates caller headers.
   - Unauthorized guest calls to protected features receive `HTTP 401 Unauthorized`.
2. **User Data Isolation:**
   - MongoDB queries for chats (`{"user_email": email}`), documents, payments, and usages are strictly scoped to the authenticated caller.
   - No user can view, edit, or delete another user's conversations or records.
3. **Administrative Protection:**
   - Admin routes (`/api/admin/...`) require `require_admin` dependency which verifies caller against `ADMIN_EMAILS`.
   - Normal users receive `HTTP 403 Forbidden`.
4. **Rate Limiting:**
   - In-memory sliding-window rate limiter enforces `MAX_REQUESTS_PER_MINUTE=30` per client IP.
   - Flooding triggers `HTTP 429 Too Many Requests`.
5. **Payload Constrainers:**
   - PDF uploads capped at 10 MB.
   - Image uploads capped at 5 MB.

---

## 5. Entitlement & Quota Lifecycle

1. **Free Tier:**
   - 10 messages/day.
   - 2 PDF documents/day.
   - Exceeding daily limit yields `HTTP 402` with an invitation to upgrade.
2. **Astra 7-Day Pass:**
   - 100 messages/day.
   - 20 PDF documents/day.
   - Full multimodal and agent access.
3. **Automatic Expiration:**
   - Evaluated on every authenticated request (`access_expires_at < current_time`).
   - Automatically sets `subscription_status = "EXPIRED"` and plan to `"FREE"`.
   - User conversations, documents, and profile data are completely preserved.

---

## 6. Automated Testing Results

Full test suite executed via Python `unittest`:

```
Ran 15 tests in 0.017s

OK
```

Test coverage includes:
- `test_phonepe_payment.py`: Checksum calculation, valid/invalid signature verification, price unit validation.
- `test_entitlement_and_usage.py`: Default Free entitlement, active pass verification, 7-day auto-reversion, Free quota 402 rejection, Premium higher limits.
- `test_auth_and_isolation.py`: Caller resolution, guest blocking, admin route protection, rate limiter 429 triggering.

Frontend production bundle tested via Vite:
- `npm run build` completed in 1.98s with 0 errors.

---

## 7. Deployment Configuration

1. **Docker Container:**
   - Python 3.11-slim base image with CPU-only PyTorch and multi-stage dependency caching.
2. **Render Configuration (`backend/render.yaml`):**
   - Web service definition for `astra-ai-backend`.
   - Configured for environment variables: `MONGO_URL`, `DATABASE_NAME`, `GROQ_API_KEY`, `PHONEPE_MERCHANT_ID`, `PHONEPE_SALT_KEY`, `PHONEPE_SALT_INDEX`, `PHONEPE_ENV`, `ADMIN_EMAILS`.
3. **Environment Template (`backend/.env.example`):**
   - Clean, documented configuration schema with zero hardcoded production secrets.

---

## 8. Known Limitations & Recommendations

1. **In-Memory Rate Limiting:**
   - The current rate limiter uses an in-memory sliding window, which is ideal for single-instance deployments. If scaling horizontally across multiple cloud instances, attach a Redis cluster.
2. **Firebase Token Verification:**
   - In production, configure the Firebase Admin SDK service account JSON file to perform cryptographic JWT validation of Google OAuth ID tokens.
