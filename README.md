<div align="center">

# ⚡ GPT 6 Astra (Astra AI) — Intelligent Multi-Agent AI Workspace

**Your complete, autonomous consumer AI workspace for chat, software engineering, academic study, PDF vector analysis, computer vision, research intelligence, and executive productivity.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Cashfree](https://img.shields.io/badge/Payment-Cashfree_PG-14b8a6?style=for-the-badge)](https://cashfree.com)
[![Python](https://img.shields.io/badge/Python-3.11+-3b82f6?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB_Motor-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com)

</div>

---

> [!IMPORTANT]
> **Independent Application Notice & Legal Disclaimer:**  
> **Astra AI** (product designation: **GPT 6 Astra**) is an independent software application. It is **not** an official OpenAI product, nor is it affiliated with, sponsored by, or endorsed by OpenAI, Google, Anthropic, or Meta. Astra AI utilizes licensed commercial and open-weights foundation models through secure server-side inference infrastructure.

---

## 🌟 Overview

**Astra AI** is an enterprise-grade, multi-tenant consumer AI SaaS platform. Instead of forcing every query through a generic model, Astra features an intelligent **ModelRouter** that dynamically directs queries to specialized domain agents:

- **Astra Chat:** Open-domain, conversational reasoning with context persistence.
- **Astra Code:** Software architecture, algorithm design (DSA with time/space complexity), debugging, and refactoring.
- **Astra Study:** Concept breakdown, curriculum prep, technical interview tutoring, and worked examples.
- **Astra Docs:** Instant PDF vectorization and semantic question-answering powered by ChromaDB RAG.
- **Astra Vision:** Multimodal visual analysis, diagram inspection, and OCR text extraction.
- **Astra Research:** URL intelligence and structured content extraction.
- **Astra Productivity:** Natural language email drafting with tone adaptation and Google Calendar event scheduling.
- **Astra Wisdom:** Reflective, calm stoic clarity on duty and focus.

---

## 💎 Pricing & Entitlement Engine

Astra AI rejects deceptive pricing tactics, hidden recurring subscriptions, and fake countdowns.

| Tier | Price | Duration | Messages | Document Uploads | Special Features |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Astra Free** | **₹0** | Lifetime | 10 / day | 2 / day | Chat, Code, Study, History |
| **Astra 7-Day Pass** | **₹99** | 7 Days | 100 / day | 20 / day | All Agents, Vision, Docs RAG, Priority throughput |

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
      - payments             - GET /links/{id}          - Astra Wisdom
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
- **Input Validation:** Strict payload constraints (PDFs capped at 10MB, Images at 5MB).
- **Rate Limiting:** Sliding-window per-IP limiter preventing denial-of-service.
- **User Data Isolation:** Database queries enforce user ownership on all chats, documents, and payments.
- **Zero Insecure Logic:** No dummy payment bypasses or test bypasses in production code.

---

## 📄 Documentation

- [Migration Audit](docs/ASTRA_MIGRATION_AUDIT.md)
- [API Documentation](docs/ASTRA_API_DOCUMENTATION.md)
- [Final Audit Report](docs/ASTRA_FINAL_AUDIT.md)

---

## ⚖️ Legal

© 2026 Astra AI. All rights reserved.  
Astra AI is an independent software application and is not affiliated with OpenAI.
