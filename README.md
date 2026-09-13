<div align="center">

# ⚡ GPT 6 Astra (Astra AI) — Intelligent Multi-Agent AI Workspace

**Your complete, autonomous consumer AI workspace for chat, software engineering, academic study, PDF vector analysis, computer vision, research intelligence, and executive productivity.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![PhonePe](https://img.shields.io/badge/Payment-PhonePe_PG-5f259f?style=for-the-badge)](https://phonepe.com)
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

## 🛡️ PhonePe Payment Gateway Integration

Payment processing is built on **PhonePe Standard Payment Gateway**:

1. **Order Initiation:** Backend computes base64 payloads and cryptographic SHA-256 checksums (`X-VERIFY: SHA256(payload + endpoint + salt_key)###salt_index`).
2. **Checkout:** User completes checkout on PhonePe's secure checkout page (UPI, Credit/Debit Card, Net Banking).
3. **Server-to-Server Verification:** PhonePe posts asynchronous webhooks verified against the salt key. The backend independently queries PhonePe's status API before activating entitlements.
4. **Idempotency Guarantee:** Payments and entitlement activations are atomic. Double-charging or duplicate entitlement grants are prevented.
5. **No Secret Leaks:** Card numbers, CVVs, and UPI PINs are never handled or stored by Astra AI.

---

## 🏗️ Architecture

```
[React 19 Frontend (Vite)] ──> [FastAPI Backend] ──> [ModelRouter / GroqProvider]
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
      [MongoDB Atlas]        [PhonePe PG Service]       [ChromaDB Vector RAG]
      - users                 - POST /create-order      - PDF embeddings
      - payments              - GET /status/{id}        - Gita RAG
      - entitlements          - POST /webhook
      - usages
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
# Edit .env with your MONGO_URL, GROQ_API_KEY, and PHONEPE credentials

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:5173` connecting to the backend at `http://localhost:8000`.

---

## 🧪 Automated Testing

Run the complete test suite:

```bash
cd backend
python -m unittest discover -s tests -p "test_*.py"
```

Verified test coverage:
- `test_phonepe_payment.py`: Checksum generation, webhook validation, pricing integrity.
- `test_entitlement_and_usage.py`: Free vs 7-Day quotas, auto-expiration, pass activation.
- `test_auth_and_isolation.py`: Authentication resolution, admin authorization, rate limiting (30 req/min).

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
