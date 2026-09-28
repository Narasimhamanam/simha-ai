<div align="center">

# 🦁 Simha AI — Intelligent Multi-Agent AI Platform

**Your complete, autonomous consumer AI workspace for chat, software engineering, academic study, PDF vector analysis, computer vision, research intelligence, and executive productivity.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Cashfree](https://img.shields.io/badge/Payment-Cashfree_PG-14b8a6?style=for-the-badge)](https://cashfree.com)
[![Python](https://img.shields.io/badge/Python-3.11+-3b82f6?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB_Motor-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com)

</div>

---

> [!IMPORTANT]
> **Independent Multi-Agent Platform:**  
> **Simha AI** is an independent software application and multi-agent AI workspace. It is **not** an official OpenAI product, nor is it affiliated with, sponsored by, or endorsed by OpenAI, Google, Anthropic, or Meta. Simha AI utilizes licensed commercial and open-weights foundation models through secure server-side inference infrastructure.

---

## 🌟 Overview

**Simha AI** is an enterprise-grade, multi-tenant consumer AI SaaS platform. Instead of forcing every query through a generic model, Simha features an intelligent **ModelRouter** that dynamically directs queries to specialized domain agents:

- **Simha Chat:** Open-domain, conversational reasoning with context persistence.
- **Simha Code:** Software architecture, algorithm design (DSA with time/space complexity), debugging, and refactoring.
- **Simha Study:** Concept breakdown, curriculum prep, technical interview tutoring, and worked examples.
- **Simha Docs:** Instant document vectorization and semantic question-answering powered by ChromaDB RAG.
- **Simha Vision:** Multimodal visual analysis, diagram inspection, and OCR text extraction.
- **Simha Research:** URL intelligence and structured content extraction.
- **Simha Productivity:** Natural language email drafting with tone adaptation and Google Calendar event scheduling.
- **Simha Wisdom:** Reflective, calm stoic clarity on duty, focus, and perspective.

---

## 💎 Pricing & Entitlement Engine

Simha AI rejects deceptive pricing tactics, hidden recurring subscriptions, and fake countdowns.

| Tier | Price | Duration | Messages | Document Uploads | Special Features |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Simha Free** | **₹0** | Lifetime | 10 / day | 2 / day | Chat, Code, Study, History |
| **Simha 7-Day Pass** | **₹99** | 7 Days | 100 / day | 20 / day | All Agents, Vision, Docs RAG, Priority throughput |

### 7-Day Expiration Lifecycle
- Passes are non-recurring one-time purchases of **₹99**.
- Expiration is enforced server-side (`access_expires_at < current_time`).
- Upon expiry, the user account gracefully reverts to the **Free** tier.
- Conversations, history, and uploaded files are **never** deleted upon expiration.

---

## 🛡️ Cashfree Payment Links Integration

Payment processing is powered by **Cashfree Payment Gateway & Payment Links** (`2023-08-01` API):

1. **Order Initiation:** Backend generates unique internal order & link IDs and initiates a server-controlled Payment Link (`POST /links`) for ₹99.00 INR.
2. **Hosted Checkout:** Customer is redirected to Cashfree's hosted payment page (UPI, Credit/Debit Cards, Net Banking).
3. **Cryptographic Webhook Verification:** Cashfree sends asynchronous webhooks verified with HMAC-SHA256 (`x-webhook-signature` computed over `timestamp + raw_body`).
4. **Server-Side Status Polling:** The application independently verifies payment status against Cashfree's status API before activating entitlements.
5. **Idempotency Guarantee:** Duplicate webhooks or retried verification checks never duplicate or over-extend subscriptions.
6. **Zero Client Trust:** Neither frontend redirects nor client state can activate premium access. Expiry is computed strictly from server time.

---

## 🏗️ Architecture

```
[React 19 Frontend (Vite)] ──> [FastAPI Backend] ──> [ModelRouter / GroqProvider]
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
      [MongoDB Atlas]       [Cashfree PG Service]       [ChromaDB Vector RAG]
      - users                - POST /links              - PDF embeddings
      - payments             - GET /links/{id}          - Simha Wisdom
      - entitlements         - POST /cashfree/webhook
      - usages               - POST /reconcile/{id}
      - audit_logs
```

---

## 🚀 Quickstart & Local Setup

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your MONGO_URL, GROQ_API_KEY, and CASHFREE credentials
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:5173` connecting to the backend at `http://localhost:8000`.

---

## 🧪 Automated Tests

Execute backend test suites covering authentication, entitlements, quotas, and Cashfree payment integration:

```bash
cd backend
python -m unittest discover tests/ -v
```

- `test_cashfree_payment.py`: Cashfree Payment Links creation, amount verification (₹99), HMAC-SHA256 webhook signatures, idempotency, 7-day expiry calculation.
- `test_entitlement_and_usage.py`: Quotas, auto-expiration, and multi-tenant isolation.
- `test_auth_and_isolation.py`: Per-IP sliding-window rate limiting and admin security guards.

---

## 🔒 Security Posture

- **CORS Restricted:** Specific domain policies for production.
- **Input Validation:** Strict payload constraints (PDFs capped at 30MB, Images at 20MB).
- **Rate Limiting:** Sliding-window per-IP limiter preventing denial-of-service.
- **User Data Isolation:** Database queries enforce user ownership on all chats, documents, and payments.
- **Zero Insecure Logic:** No dummy payment bypasses or test bypasses in production code.

---

## ⚖️ Legal

© 2026 Simha AI. All rights reserved.  
Simha AI is an independent software application and is not affiliated with OpenAI.
