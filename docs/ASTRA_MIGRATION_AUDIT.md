# 🔍 GPT-6 Astra (Astra AI) — Comprehensive Architecture & Migration Audit

**Document Version:** 2.0.0  
**Date:** September 2026  
**Auditor:** Principal SaaS Systems & Full-Stack Security Architect  
**Project:** Astra AI (formerly Simha AI)  

---

## 1. Executive Summary

This audit performs an exhaustive, ground-truth inspection of the **Astra AI** repository prior to executing the platform-wide transformation into **GPT-6 Astra** (branded primarily as **Astra AI**). 

The application possesses a strong modular core (multi-agent routing, streaming completions, ChromaDB RAG, and Cashfree payment link foundations), but exhibits specific systemic deficiencies:
1. **Broken Theme Toggler:** Theme state toggled `theme` in React, but failed to set `.light` class on `<html>`, reset to dark on reload due to missing `localStorage` hydration, and components contained hard-coded dark color classes.
2. **Failing Vision Pipeline:** Vision analysis at `/analyze-image` used text-only model `qwen/qwen3.8-27b`, causing `rate_limit_exceeded` / token errors (HTTP 429).
3. **Broken Document Upload & RAG:** Upload endpoint `/upload-pdf` lacked support for non-PDF files (`.docx`, `.txt`, `.csv`), lacked collision-safe filenames, and didn't return text context to the client, while frontend lacked drag-and-drop state machines.
4. **Authentication Gaps:** Firebase auth was limited to Google popup; lacked Email/Password, GitHub, Microsoft, password reset, and email verification.
5. **CORS Vulnerability:** `allow_origins=["*"]` with `allow_credentials=True` is prohibited by web standards and insecure for production SaaS.
6. **Residual Legacy Branding & Assets:** Lion image files (`logo-lion.png`, `neon-lion.png`, `narasimha-hero.jpg`) in `frontend/public/` and old SVG favicons remained.

---

## 2. Component-by-Component Inventory

### 2.1 Frontend Architecture (`frontend/`)
- **Core Framework:** React 19 + Vite 8 + Tailwind CSS.
- **Current Working Features:**
  - Sidebar workspace navigation, chat history listing, agent selection (Wisdom, Coding, Study, Productivity).
  - Streaming SSE chat UI in `ChatArea.jsx`.
  - Cashfree hosted checkout link redirect and status polling in `PricingPage.jsx` and `PaymentStatusPage.jsx`.
  - Admin metrics dashboard in `AdminDashboard.jsx`.
- **Broken / Flawed Features:**
  - **Theme Toggling:** `Home.jsx` forces `dark` on initial mount; never saves or reads from `localStorage`; never toggles `html.light`.
  - **Document Upload:** No drag-and-drop zone; file input restricted; errors unformatted.
  - **Vision Input:** Uploads raw base64 uncompressed; triggers backend 429 errors.
  - **Authentication:** Only a bare Google sign-in button without proper modal, email/password, or password recovery.
- **Branding Assets:**
  - `frontend/public/` contains legacy lion images: `logo-lion.png`, `neon-lion.png`, `narasimha-hero.jpg`, `narasimha-hero.png`.
  - `favicon.svg` is an old Vite icon.

### 2.2 Backend Architecture (`backend/`)
- **Core Framework:** FastAPI + Uvicorn + Motor (Async MongoDB) + ChromaDB.
- **Current Working Features:**
  - Server-side Cashfree Payment Links service (`services/payment/cashfree.py`).
  - Cashfree Webhook HMAC-SHA256 signature verification.
  - 7-Day Pass entitlement calculation from server time and renewal stacking (`services/entitlement.py`).
  - Daily quota and sliding-window rate limiter (`services/usage.py`, `security/rate_limiter.py`).
  - Agent routing (`agents/router.py`, `coding_agent.py`, `study_agent.py`, `productivity_agent.py`, `divine_agent.py`).
- **Broken / Incomplete Features:**
  - **Vision Endpoint (`/analyze-image`):** Uses non-vision model `qwen/qwen3.8-27b`, causing immediate 429 token errors. Needs migration to `llama-3.2-11b-vision-preview` with Gemini fallback.
  - **Document Processing (`/upload-pdf`):** Hardcoded to `PyPDFLoader` only. Needs universal document parser for PDF, DOCX, TXT, CSV with collision-safe filenames.
  - **CORS:** Uses wildcard `allow_origins=["*"]` with `allow_credentials=True`. Needs explicit origins (`http://localhost:5173`, `https://gpt-6-astra.onrender.com`).
  - **Gemini Fallback:** Missing backend Gemini provider abstraction for multimodal reasoning.

### 2.3 Database Layer (MongoDB Motor)
- **Collections:** `users`, `payments`, `entitlements`, `usages`, `chats`, `documents`, `audit_logs`.
- **Indexes:** Properly indexed on `order_id`, `link_id`, `payment_id`, `user_id`, `status`, and `email`.
- **Status:** Healthy and functional.

---

## 3. Detailed Deficiency Analysis & Root Causes

| Feature Area | Current State | Root Cause | Remediation |
|---|---|---|---|
| **Theme Toggler** | Broken / Resets to Dark | 1. No `localStorage` read/write. 2. `html.light` class never added. 3. Hard-coded dark classes in views. | Implement `ThemeProvider` + hook with `localStorage`, system preference listener, `.light` CSS variables, and clean theme switching. |
| **Image / Vision** | HTTP 429 Rate Limit Error | Model set to `qwen/qwen3.8-27b` (not vision capable) + large uncompressed base64 images exceeding token capacity. | Create `VisionRouter` with Pillow image pre-scaling (max 1024px), using `llama-3.2-11b-vision-preview` on Groq and `gemini-2.0-flash` on Google Gemini. |
| **Document Upload** | Fails on non-PDF, no context returned | 1. `PyPDFLoader` crashes on DOCX/TXT/CSV. 2. File collisions in `uploads/{filename}`. 3. `/upload-pdf` returns no context snippet. | Create `DocumentProcessor` supporting PDF, DOCX, TXT, CSV; save files with UUID prefix; return `context_preview`. Add drag & drop in UI. |
| **Authentication** | Google-only popup | Missing Email/Password, GitHub, Microsoft providers, password reset, and verify email. | Implement comprehensive `AuthModal` with Firebase Auth (Google, GitHub, Microsoft, Email/Password, Reset, Verification). |
| **CORS** | `allow_origins=["*"]` | Insecure wildcard configuration with credentials. | Set explicit allowed origins from environment with localhost and production Render domains. |
| **Branding & Logo** | Legacy lion motifs in public/ | Old logo files present in `frontend/public/`. | Remove all lion assets; generate original geometric quantum star Astra AI logo component and SVG favicon. |
| **Render URL** | `simha-ai-frontend-production` | Needs transition to `gpt-6-astra.onrender.com`. | Update `render.yaml`, document exact manual Render service rename steps, and configure CORS. |

---

## 4. File Modification Matrix

### 4.1 Files to Modify
- `frontend/src/index.css` — Fix light mode styles, ensure readable semantic color tokens.
- `frontend/src/pages/Home.jsx` — Integrate ThemeProvider, AuthModal, drag-and-drop document upload, and refined routing.
- `frontend/src/components/ThemeToggle.jsx` — Connect to ThemeProvider with support for Light, Dark, System modes.
- `frontend/src/components/Header.jsx` — Display new Astra logo, auth status, theme toggle.
- `frontend/src/components/Sidebar.jsx` — New Astra logo, navigation items, quota pill.
- `frontend/src/components/ChatArea.jsx` — Complete document drag-and-drop, preview badge, image compression before upload.
- `frontend/src/firebase.js` — Add GitHub, Microsoft, and Email/Password provider configurations.
- `frontend/index.html` — Updated title (`GPT-6 Astra — AI Workspace`), favicon, OpenGraph, and meta tags.
- `backend/main.py` — Fix CORS origins, fix `/analyze-image` to route to vision models, expand `/upload-document`.
- `backend/ai/provider.py` — Add Gemini provider, update Groq models to actual IDs, build `VisionRouter`.
- `backend/rag/pdf_processor.py` -> `backend/rag/document_processor.py` — Support PDF, DOCX, TXT, CSV.
- `backend/.env.example` — Add `GEMINI_API_KEY`, `ALLOWED_ORIGINS`, Cashfree variables.
- `backend/render.yaml` — Update environment definitions and service names.

### 4.2 New Files to Create
- `frontend/src/components/AstraLogo.jsx` — Original professional quantum star Astra AI logo.
- `frontend/src/components/AuthModal.jsx` — Complete Firebase authentication modal.
- `frontend/src/context/ThemeContext.jsx` — Persistent light/dark/system theme manager.
- `backend/rag/document_processor.py` — Universal document extraction engine.
- `docs/ASTRA_MIGRATION_AUDIT.md` — This audit document.
- `docs/ASTRA_FINAL_AUDIT.md` — Final audit after all phases complete.

### 4.3 Files to Delete / Remove
- `frontend/public/logo-lion.png` — Legacy Simha lion logo.
- `frontend/public/neon-lion.png` — Legacy neon lion asset.
- `frontend/public/narasimha-hero.jpg` — Legacy hero image.
- `frontend/public/narasimha-hero.png` — Legacy hero image.

### 4.4 Files to Retain Untouched
- `backend/services/payment/cashfree.py` — Real Cashfree payment link service.
- `backend/services/entitlement.py` — Server-time 7-day entitlement logic.
- `backend/database.py` — Motor collections and indexes.
- `backend/security/auth.py` — `require_active_premium` guard.
- `backend/security/rate_limiter.py` — Sliding-window rate limiter.
