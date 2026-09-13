# ASTRA AI (GPT 6 Astra) — Codebase Migration & Architectural Audit

**Date:** September 2026  
**Project:** Simha AI → GPT 6 Astra (Astra AI) Transformation  
**Target Brand:** GPT 6 Astra / Astra AI  
**Legal Classification:** Independent AI Application (Not affiliated with OpenAI, Google, or Anthropic)

---

## 1. Executive Summary

This document establishes the official technical audit and migration blueprint for transitioning the existing **Simha AI** single-tier prototype into **GPT 6 Astra** (marketed as **Astra AI**), an enterprise-ready, multi-tenant consumer AI SaaS.

The transformation preserves all high-performance core capabilities (multi-agent routing, streaming inference, PDF RAG, vision OCR, email drafting, calendar scheduling, URL summarization) while completely replacing legacy identity, insecure fake-payment logic, unverified authentication, and monolithic data structures with a production-grade SaaS architecture.

---

## 2. Complete Codebase Audit of Existing Simha AI

### 2.1 Technology Stack

| Layer | Existing Simha AI Implementation | Target Astra AI Implementation |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 (`^19.2.5`), Vite (`^8.0.10`), Tailwind CSS (`^3.4.3`), Framer Motion (`^12.38.0`), Lucide Icons (`^1.14.0`), Three.js (`^0.185.1`) | React 19 + Vite + Tailwind CSS with Astra AI Design System & Orbital 3D canvas |
| **Backend Framework** | FastAPI (`0.136.1`), Uvicorn (`0.46.0`), Python 3.11/3.13 | FastAPI modular architecture with APIRouters, dependency injection, and security middlewares |
| **Database** | MongoDB via `motor==3.7.1` (collections: `chats`, `documents`, `users`) | MongoDB extended schemas (`users`, `payments`, `entitlements`, `usages`, `chats`, `documents`, `audit_logs`) with compound indexes |
| **Authentication** | Firebase Auth (Google OAuth client-side only; backend receives unverified `email`/`user_id`) | Firebase Auth client-side + backend authentication guard (`require_authenticated_user`) enforcing user data isolation |
| **AI Providers** | Groq (`groq==1.2.0`), fallback list: `qwen/qwen3.8-27b`, `groq/compound-mini`, `groq/compound`, `openai/gpt-oss-120b` | Multi-provider abstraction (`BaseAIProvider`, `GroqProvider`, `ModelRouter`) with configurable env vars and strict server-side key safety |
| **RAG & Vectors** | ChromaDB (`chromadb==1.5.9`) + HuggingFace embeddings (`sentence-transformers/all-MiniLM-L6-v2`) in `chroma_db/` & `divine_rag/` | Retained and hardened for Astra Docs and Astra Wisdom modules |
| **Payment Gateway** | Razorpay (Stubbed with insecure fallback `rzp_test_dummy` granting instant free Pro on any dummy string) | **PhonePe Standard Payment Gateway (PG)** with SHA-256 checksums, S2S webhook verification, and idempotent activation |
| **Subscription Model** | Static boolean `is_pro` without expiration | Dynamic entitlement engine: `FREE` (10 messages/day) vs `ASTRA_7_DAY` (₹99 for 7 days with automatic expiration) |
| **Testing** | None (0 test files) | Comprehensive automated test suite (`unittest`/`pytest`) covering auth, payments, entitlements, usage, and admin |
| **Admin Panel** | None | Role-based administrative dashboard with metrics, user inspection, revenue logs, and audit trails |

---

### 2.2 Security & Code Vulnerability Findings in Legacy Codebase

1. **Insecure Payment Bypass:**
   - In `backend/main.py` (lines 137–139, 158–173), when `RAZORPAY_KEY_ID == "rzp_test_dummy"`, backend generated an `order_dummy`. The verification endpoint accepted any dummy signature and updated `{"$set": {"is_pro": True}}`.
   - **Remediation:** Complete elimination of Razorpay and all dummy pathways. PhonePe integration requires cryptographic SHA-256 checksum validation and direct PhonePe status checks before entitlement activation.
2. **Missing Backend Authentication:**
   - Any user could call `/get-chats/{user_email}`, `/create-chat`, `/get-documents/{user_email}`, or `/stream-chat` with another user's email to read, write, or spend credits on their behalf.
   - **Remediation:** Introduce backend `require_authenticated_user` dependency to validate caller tokens and strictly isolate user resources.
3. **No Expiration on Pro Status:**
   - Once `is_pro` was set to `True`, it remained indefinitely.
   - **Remediation:** Introduce `entitlements` collection with `starts_at` and `expires_at` timestamps, checked on every authenticated request with automatic reversion to `FREE` status once expired.
4. **Branding & Trademark Exposure:**
   - The name "Simha", lion assets, and Sanskrit lion references permeate the UI, CSS, icons, and system prompts.
   - **Remediation:** Rebrand to "GPT 6 Astra" / "Astra AI" with prominent legal disclaimers stating independence from OpenAI.

---

## 3. Astra AI Target Architecture

```
                                [Client Browser / Mobile PWA]
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │                                               │
             Public Marketing / Landing                      Astra App Workspace
             - Hero & Feature Showcase                       - Astra Chat (Conversational)
             - Capability Grid                               - Astra Code (Programming)
             - Transparent Pricing (₹99)                     - Astra Study (Academic)
             - Legal & Compliance Pages                      - Astra Docs (RAG PDF)
             - FAQ & OpenAI Disclaimer                       - Astra Vision (OCR / Multimodal)
                                                             - Astra Research (URL Intelligence)
                                                             - Astra Productivity (Email/Calendar)
                                                             - Astra Wisdom (Reflective clarity)
                                                              │
                                            HTTPS / Bearer Token
                                                              │
                                                              ▼
                                            [FastAPI Gateway (Uvicorn)]
                                                              │
                     ┌────────────────────────────────────────┼────────────────────────────────────────┐
                     ▼                                        ▼                                        ▼
             [Security Middlewares]                   [Payment Router]                         [Admin Gateway]
             - Rate Limiter (30 req/min)              - POST /create-order                     - GET /metrics
             - Auth Guard (Token Verifier)            - GET /status/{id}                       - GET /users
             - User Data Isolation                    - POST /webhook                          - POST /entitlement/grant
                     │                                        │                                        │
                     ▼                                        ▼                                        ▼
             [Entitlement & Usage Engine]             [PhonePe PG Service]                     [Admin Audit Logs]
             - Check Quota (Free vs 7-Day)            - SHA-256 Checksum                       - Role-based Access
             - Auto-Expiration Evaluation             - S2S Status Check                       - Zero Credential Leak
             - Record Daily Consumption               - Idempotent Activation
                     │
                     ▼
             [AI Provider Abstraction]
             - BaseAIProvider
             - ModelRouter (Groq / Qwen / Llama)
             - Astra Agent Orchestration
                     │
                     ▼
             [Data Persistence Layer (MongoDB)]
             - users, payments, entitlements, usages, chats, documents, audit_logs
```

---

## 4. Database Schema Extensions

### 4.1 Collection: `users`
```json
{
  "_id": "ObjectId",
  "email": "user@example.com",
  "name": "Jane Doe",
  "avatar": "https://...",
  "plan": "FREE | ASTRA_7_DAY",
  "subscription_status": "INACTIVE | ACTIVE | EXPIRED",
  "access_started_at": "ISODate or null",
  "access_expires_at": "ISODate or null",
  "is_admin": false,
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

### 4.2 Collection: `payments`
```json
{
  "_id": "ObjectId",
  "user_id": "user@example.com",
  "email": "user@example.com",
  "order_id": "ASTRA_ORD_20260913_...",
  "merchant_transaction_id": "ASTRA_TXN_...",
  "provider": "PHONEPE",
  "amount": 9900,
  "currency": "INR",
  "status": "PENDING | SUCCESS | FAILED | EXPIRED",
  "payment_method": "UPI | CARD | NETBANKING",
  "provider_reference_id": "T260913...",
  "raw_response": {},
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

### 4.3 Collection: `entitlements`
```json
{
  "_id": "ObjectId",
  "user_id": "user@example.com",
  "email": "user@example.com",
  "plan": "ASTRA_7_DAY",
  "starts_at": "ISODate",
  "expires_at": "ISODate",
  "status": "ACTIVE | EXPIRED | REVOKED",
  "source_payment_id": "ASTRA_TXN_...",
  "created_at": "ISODate"
}
```

### 4.4 Collection: `usages`
```json
{
  "_id": "ObjectId",
  "user_id": "user@example.com",
  "email": "user@example.com",
  "date": "2026-09-13",
  "messages_count": 7,
  "tokens_estimated": 3500,
  "document_requests": 1,
  "image_requests": 2,
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

---

## 5. PhonePe Payment Flow Specification

1. **User Action:** Clicks "Get 7-Day Pass — ₹99" on Pricing Page.
2. **Order Initiation (`POST /api/payments/create-order`):**
   - Backend creates unique `merchantTransactionId = f"ASTRA_{uuid4().hex[:16]}"`
   - Builds PhonePe payload (amount = 9900 paise, ₹99)
   - Computes SHA-256 checksum: `sha256(base64_payload + "/pg/v1/pay" + salt_key) + "###" + salt_index`
   - Stores payment record as `PENDING`
   - Returns PhonePe payment redirect URL
3. **User Payment:** User completes payment on PhonePe checkout (UPI, Card, Net Banking).
4. **Server-to-Server Callback (`POST /api/payments/webhook`):**
   - PhonePe posts base64 payload with `X-VERIFY` header
   - Backend verifies checksum: `sha256(response_base64 + salt_key) + "###" + salt_index`
   - Backend queries PhonePe status API directly to confirm authentic payment status
   - If payment is `COMPLETED` / `PAYMENT_SUCCESS`:
     - Checks if `merchant_transaction_id` is already processed (Idempotency guarantee)
     - Updates payment status to `SUCCESS`
     - Inserts entitlement: `starts_at = now`, `expires_at = now + 7 days`
     - Updates user: `plan = "ASTRA_7_DAY"`, `subscription_status = "ACTIVE"`, `access_expires_at = now + 7 days`
5. **Client Redirection:** Frontend redirects to `/payment/status?order_id=...` which queries `GET /api/payments/status/{order_id}` and displays success state with expiry date.

---

## 6. Migration Safeguards & Fallbacks

- **Zero Data Loss:** Existing users in MongoDB will be preserved. When queried, any user lacking the new `plan` or `access_expires_at` fields will automatically be read as `FREE` tier.
- **Chats & Documents Isolation:** Existing chats and documents remain intact and are scoped strictly by authenticated `user_email`.
- **Safe Environment Variables:** All secrets remain server-side. Frontend accesses only public environment variables.
