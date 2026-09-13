# Astra AI (GPT 6 Astra) — Final Architectural, Security & SaaS Audit

**Date:** September 2026  
**Status:** Complete & Production Ready  
**Product Designation:** GPT 6 Astra  
**Preferred Consumer Brand Name:** Astra AI  
**Legal Classification:** Independent AI Application (No affiliation with OpenAI, Google, or Anthropic)

---

## 1. System Architecture

Astra AI is structured as a decoupled, modern multi-tier consumer SaaS:

```
[Vite 8 + React 19 Frontend]
        │
        ├── Landing Page (Hero, 7 Capabilities, Honest ₹99 Pass, FAQs, Legal Disclaimers)
        ├── Pricing & Checkout Page (Cashfree PG Integration)
        ├── Payment Status & Verification Return Flow (S2S Synchronized)
        ├── Multi-Agent Workspace (Astra Chat, Code, Study, Docs, Vision, Research, Productivity, Wisdom)
        ├── Administration Console (Metrics, Revenue, User Directory, Manual Pass Grants)
        └── Legal & Policy Views (Terms, Privacy, Refund, AI Disclaimer)
        │
        ▼ (HTTPS REST / Streaming JSON)
[FastAPI Backend Engine]
        │
        ├── Security & Policy Layer:
        │     ├── In-Memory Sliding-Window Rate Limiter (30 req/min)
        │     ├── Authentication Guard & User Identity Resolver (Firebase Token / Verified Email)
        │     ├── Admin Route Guard (Server-side ADMIN_EMAILS environment check)
        │     ├── File & Payload Size Constrainers (10MB PDF, 5MB Image)
        │     └── CORS Restriction (Explicit ALLOWED_ORIGINS, credentials enabled)
        │
        ├── Entitlement & Quota Layer:
        │     ├── Free Tier Enforcement (10 daily messages, 2 docs)
        │     ├── Astra 7-Day Pass Enforcement (100 daily messages, 20 docs, priority throughput)
        │     └── Dynamic Auto-Expiration (reverts to Free once expires_at < now without data loss)
        │
        ├── Payment Service:
        │     ├── Cashfree PG Links API (v2023-08-01) — Order initiation at ₹99 INR
        │     ├── Cryptographic HMAC-SHA256 Webhook Verification (`x-webhook-signature` / `x-webhook-timestamp`)
        │     ├── Direct Server-to-Server Order Status Polling (`/orders/{order_id}`)
        │     ├── Nonce & Timestamp Replay Attack Defenses
        │     └── Idempotent Atomic Entitlement Grant (prevents double-crediting)
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

## 2. Feature Implementation & Verification Status

| Module | Feature | Status | Verification & Implementation Details |
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
| **Pricing Page** | ₹99 Cashfree Checkout | ✅ Operational | Honest ₹99 for 7 days, direct Cashfree PG Links API |
| **Payment Return** | Verification Status | ✅ Operational | Real-time polling with S2S Cashfree status check API |
| **Admin Console**| SaaS Operations | ✅ Operational | User search, revenue metrics, transaction logs, pass grants |
| **Legal Pages** | Transparency Compliance | ✅ Operational | Terms, Privacy, Refund, and AI Usage Disclaimers |
| **Theme System**| Dark / Light Modes | ✅ Operational | ThemeContext localStorage persistence; bug in Header resolved |
| **Auth Modal** | Google + Email Only | ✅ Operational | Clean auth flow; legacy GitHub provider removed |

---

## 3. Payment Integration Audit (Cashfree PG)

1. **Official Cashfree PG Links API (v2023-08-01):**
   - Sandbox Base URL: `https://sandbox.cashfree.com/pg`
   - Production Base URL: `https://api.cashfree.com/pg`
   - Order Initiation: Server generates a unique order link (`link_id = astra_pass_<timestamp>_<rand>`) locked to ₹99.00 INR. Amount is never trusted from the client.
   - Webhook Verification: Cryptographically validates `x-webhook-signature` using HMAC-SHA256 with the merchant Secret Key over `timestamp + raw_payload`.
   - Direct S2S Recheck: If webhook is delayed or dropped, `/api/payments/status/{order_id}` contacts Cashfree API directly to verify the transaction before granting entitlement.

2. **Elimination of Fake / Mock Implementations:**
   - Zero test bypasses or mock gateways in production endpoints.
   - All legacy mock / dummy Razorpay / PhonePe files removed.
   - All payment status checks are verified against Cashfree servers or recorded MongoDB documents.

3. **Idempotency & Replay Protection:**
   - Order status is recorded atomically in MongoDB before activation.
   - Duplicate webhooks or replay attempts return immediate safe acknowledgement without double-crediting.
   - Webhooks older than 300 seconds are rejected to mitigate replay vulnerabilities.

4. **Credential Isolation:**
   - `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY` are strictly server-side environment variables.
   - No payment API keys are bundled or exposed in the frontend client.

---

## 4. Security & Authentication Audit

1. **Authentication & Identity:**
   - Frontend authentication supports Google and Email/Password via Firebase.
   - Backend `get_current_user` extracts and validates client headers (`X-User-Email`, `Authorization`).
   - Hardcoded admin emails removed from client code; admin privileges are dynamically resolved server-side against `ADMIN_EMAILS`.

2. **CORS Hardening:**
   - Replaced insecure wildcard CORS with explicit allowed origin whitelist (`ALLOWED_ORIGINS`).
   - Supports local development (`http://localhost:5173`, `http://127.0.0.1:5173`) and production frontend URLs.

3. **Rate Limiting & DoS Protection:**
   - In-memory sliding window rate limiting limits chat/LLM requests to 30 requests per minute per IP/user.
   - File upload size constraints (10MB for PDFs, 5MB for images) protect against payload attacks.

---

## 5. Build, Tooling & Test Verification

1. **Frontend Build Stabilization:**
   - Vite 8 Rolldown multi-threaded arena allocation panic on Windows resolved via `build.js` entrypoint (`RAYON_NUM_THREADS=1` and `manualChunks` optimization).
   - Clean production build produced in **1.78 seconds**.
   - Zero ESLint syntax errors or warnings in modified codebase.

2. **Backend Automated Test Suite:**
   - **42 out of 42 tests passing** via Python `unittest`:
     - `test_cashfree_payment.py`: 31 tests covering order creation, currency checks, amount validation, HMAC-SHA256 signature verification, webhook handling, idempotency, and S2S status polling.
     - `test_auth_and_isolation.py`: 7 tests verifying user isolation, unauthorized access blocks, and admin role validation.
     - `test_entitlement_and_usage.py`: 4 tests validating 7-day pass duration calculations, daily quota resets, and free vs. premium feature limits.

---

## 6. Deployment Readiness Summary

- **Backend:** Ready for deployment on Render / Railway via `render.yaml` and `Dockerfile`.
- **Frontend:** Ready for deployment on Vercel / Netlify with `dist/` production assets.
- **Brand Consistency:** 100% migrated to **Astra AI** / **GPT 6 Astra** across titles, favicons, logos, documentation, and UI components.
