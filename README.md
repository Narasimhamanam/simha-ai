<div align="center">

<!-- Banner -->
<img src="https://raw.githubusercontent.com/Narasimhamanam/simha-ai/main/banner.png" alt="Simha AI Banner" width="100%" />

<br/>

# 🦁 Simha AI — Multi-Agent AI Platform

**Your all-in-one AI-powered productivity suite.  
Chat with specialized agents, analyze PDFs, draft emails, schedule events, and summarize URLs — all in one beautiful interface.**

<br/>

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Render-6366f1?style=for-the-badge)](https://simha-ai-frontend-production.onrender.com)
[![Backend](https://img.shields.io/badge/%E2%9A%99%EF%B8%8F%20Backend-Railway-0f172a?style=for-the-badge&logo=railway)](https://render.com)

[![Python](https://img.shields.io/badge/Python-3.11-3b82f6?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)

</div>

---

## ✨ What is Simha AI?

**Simha** (Sanskrit: *सिंह*) means **Lion** — a symbol of power, intelligence, and clarity. Simha AI is a full-stack, production-ready **Multi-Agent AI platform** that routes your queries to specialized AI agents, each optimized for a specific domain.

Whether you're a student preparing for placements, a developer debugging code, or a professional drafting emails — Simha AI has a specialized agent for you.

---

## 🎯 Core Features

<table>
<tr>
<td align="center" width="200">

### 🎓 Study Agent
Expert educational tutor covering ML, CS, aptitude & placement prep.

</td>
<td align="center" width="200">

### 💻 Coding Agent
Code generation, debugging, algorithms & technical interview help.

</td>
<td align="center" width="200">

### ⚡ Productivity Agent
Task planning, time management & professional advice.

</td>
<td align="center" width="200">

### 🦚 Krishna AI
Spiritual guidance from Bhagavad Gita with comforting personal AI persona.

</td>
</tr>
<tr>
<td align="center" width="200">

### 📄 PDF Q&A (RAG)
Upload PDFs and ask questions — powered by ChromaDB + HuggingFace embeddings.

</td>
<td align="center" width="200">

### 🖼️ Vision (OCR)
Upload images and ask the AI to explain, describe, or extract text from them.

</td>
<td align="center" width="200">

### 📧 Email Composer
AI-drafted professional emails from a single sentence prompt.

</td>
<td align="center" width="200">

### 📅 Calendar Planner
Convert natural language into structured Google Calendar events.

</td>
</tr>
<tr>
<td align="center" width="200">

### 🌐 URL Summarizer
Paste any URL → get a structured summary with key points.

</td>
<td align="center" width="200">

### 💰 SaaS Credit System
Daily 10 free credits system with PRO upgrade via Razorpay Integration.

</td>
<td align="center" width="200">

### 🎵 Ambient Flute Music
Seamless, continuous divine ambient background music with toggle controls.

</td>
<td align="center" width="200">

### ✨ Premium Glassmorphic UI
Sleek dark mode, sky-blue divine theme, and fluid micro-animations.

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SIMHA AI PLATFORM                        │
├──────────────────────────┬──────────────────────────────────┤
│      FRONTEND            │           BACKEND                 │
│  React 19 + Vite         │      FastAPI + Python 3.11        │
│  TailwindCSS             │                                   │
│  Firebase Auth           │  ┌─────────────────────────────┐ │
│  React Markdown          │  │       Agent Router           │ │
│  Syntax Highlighter      │  │  (prefix-based dispatching)  │ │
│  Lucide Icons            │  └──────────┬──────────────────┘ │
│  YouTube Music Player    │             │                     │
│                          │     ┌───────┼───────┬────────┐    │
│  Pages:                  │     ▼       ▼       ▼        ▼    │
│  • Chat (streaming)      │  Study   Coding  Product   Divine │
│  • Email Composer        │  Agent   Agent    Agent    Agent  │
│  • Calendar Planner      │                                   │
│  • URL Summarizer        │  Automation Agents:               │
│  • Documents (RAG)       │  • Email Draft (Groq LLM)        │
│  • Chat History          │  • URL Summarizer (httpx)        │
│  • Settings              │  • Calendar Event Generator       │
│                          │                                   │
│                          │  RAG Pipeline:                    │
│                          │  • PDF / Gita Processors         │
│                          │  • ChromaDB Vector Stores        │
│                          │  • HuggingFace Embeddings        │
└──────────────────────────┴──────────────────────────────────┘
         │                              │
         ▼                              ▼
   Firebase Auth                  MongoDB Atlas
   (User Accounts)              (Chat + Documents)
                                        │
                                        ▼
                               Groq Cloud API
                           (LLaMA 3.3 70B Versatile)
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI** | Async REST API framework |
| **Groq + LLaMA 3.3 70B** | Core LLM powering all agents |
| **MongoDB Atlas + Motor** | Async persistent chat/document storage |
| **ChromaDB** | Local vector store for PDF RAG |
| **HuggingFace Sentence Transformers** | PDF chunk embeddings |
| **LangChain** | RAG pipeline orchestration |
| **PyPDF** | PDF text extraction |
| **httpx** | Async HTTP for URL summarization |
| **Docker** | Containerized deployment |
| **Railway** | Cloud hosting with auto-scaling |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite** | Lightning-fast build tool |
| **TailwindCSS** | Utility-first styling |
| **Firebase Auth** | User authentication (Google OAuth + Email) |
| **React Markdown + remark-gfm** | Rich AI response rendering |
| **React Syntax Highlighter** | Code block formatting |
| **Lucide React** | Icon library |
| **Axios** | HTTP client |
| **Render** | Static site hosting |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Groq API key](https://console.groq.com) (free)
- A [MongoDB Atlas](https://cloud.mongodb.com) cluster (free tier works)
- A [Firebase](https://console.firebase.google.com) project

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Narasimhamanam/simha-ai.git
cd simha-ai
```

---

### 2️⃣ Backend Setup

```bash
cd backend
```

**Create and activate a virtual environment:**
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

**Install dependencies:**
```bash
pip install -r requirements.txt
```

**Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env`:
```env
MONGO_URL="mongodb+srv://<user>:<password>@cluster.mongodb.net/"
DATABASE_NAME="simha_ai"
GROQ_API_KEY="your_groq_api_key_here"
```

**Run the backend:**
```bash
uvicorn main:app --reload --port 8000
```

Backend will be live at `http://localhost:8000` ✅

---

### 3️⃣ Frontend Setup

```bash
cd frontend
```

**Install dependencies:**
```bash
npm install
```

**Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_FIREBASE_API_KEY="your_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"
VITE_BACKEND_URL="http://localhost:8000"
```

**Run the frontend:**
```bash
npm run dev
```

Frontend will be live at `http://localhost:5173` ✅

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/health` | Detailed health + DB status |
| `GET` | `/ping` | Keep-alive ping |
| `POST` | `/chat` | Standard chat (non-streaming) |
| `POST` | `/stream-chat` | **Streaming** chat response |
| `POST` | `/generate-email` | AI email draft generation |
| `POST` | `/summarize-url` | URL content summarization |
| `POST` | `/generate-calendar-event` | Natural language → calendar event |
| `POST` | `/upload-pdf` | Upload & process PDF for RAG |
| `POST` | `/ask-pdf` | Ask questions about uploaded PDF |
| `GET` | `/get-documents/{email}` | List user's uploaded documents |
| `DELETE` | `/delete-document/{id}` | Remove a document |
| `POST` | `/create-chat` | Create a new chat session |
| `GET` | `/get-chats/{email}` | Retrieve all user chats |
| `POST` | `/save-message` | Persist a message to MongoDB |
| `PATCH` | `/rename-chat/{id}` | Rename a chat session |
| `DELETE` | `/delete-chat/{id}` | Delete a chat session |

---

## 🤖 Agent System

Simha AI uses a **prefix-based routing** system to dispatch queries to specialized agents:

```python
# Agent Router Logic
"study: ..."        → Study Agent         (academics, placement prep, ML/AI)
"coding: ..."       → Coding Agent        (code generation, debugging)
"productivity: ..." → Productivity Agent  (tasks, planning, advice)
"divine: ..."       → Ask Krishna Agent   (Bhagavad Gita RAG wisdom)
"krishna: ..."      → Ask Krishna Agent   (Bhagavad Gita RAG wisdom)
```

Each agent has its own **system prompt**, **context window management**, and **history truncation** to stay within Groq's free-tier token limits.

---

## 🦚 Ask Krishna (Divine Mode) — Gita Wisdom & Soundscape

We have built a completely immersive experience called **Ask Krishna (Divine Mode)**. When selected, this feature transforms the environment to help users seek calm and mental clarity during stressful times.

### 🕉️ Architecture & Technical Highlights:
1. **Bhagavad Gita RAG Pipeline**:
   - Uses a dedicated Vector Database powered by **ChromaDB** containing the complete teachings and verses of the Bhagavad Gita.
   - Text chunks are encoded using the lightweight, fast `all-MiniLM-L6-v2` HuggingFace Embeddings.
   - Relevancy matching retrieves the exact teaching fitting the user's emotional query or life struggle.
2. **Comforting AI Persona**:
   - Guided by a rigorous system prompt representing the calm, comforting voice of Lord Krishna speaking on the battlefield.
   - Constrained to stay minimal (25-60 words) to avoid AI-like bulleted lists, generic opening statements, or clinical advice, leaving the user with a single, calm poetic thought.
   - Built-in keyword detectors: if the user asks Krishna to *"explain deeply"*, *"elaborate"*, or *"which chapter"*, it bypasses length constraints to provide extensive theological context.
3. **Seamless Ambient Soundscape**:
   - Integrates a seamless, background divine flute soundtrack powered by an embedded hidden media player.
   - Toggled effortlessly from a dedicated music button in the top navigation header.
4. **Calming Sky-Blue UI/UX Theme**:
   - Switching to Divine Mode instantly shifts the dark-mode aesthetic to a rich sky-blue divine theme, offering smooth transitions, breathing icons, and soft typography.

---

## 🐳 Docker Deployment

```bash
cd backend
docker build -t simha-ai-backend .
docker run -p 8000:8000 \
  -e GROQ_API_KEY=your_key \
  -e MONGO_URL=your_mongo_url \
  -e DATABASE_NAME=simha_ai \
  simha-ai-backend
```

---

## ☁️ Production Deployment

| Service | Platform | Notes |
|---|---|---|
| **Backend** | Railway | Dockerized, auto-deploys from `main` branch |
| **Frontend** | Render | Static site, connected to Railway backend |
| **Database** | MongoDB Atlas | Free M0 cluster |
| **Auth** | Firebase | Google OAuth + Email/Password |
| **LLM** | Groq Cloud | LLaMA 3.3 70B, rate-limited to 5 concurrent calls |

### Concurrency & Rate Limiting

The backend uses an `asyncio.Semaphore(5)` to cap concurrent Groq API calls, preventing rate-limit errors under multi-user load. Chat history is capped at 20 turns to manage token usage.

---

## 📁 Project Structure

```
simha-ai/
├── backend/
│   ├── agents/
│   │   ├── router.py           # Prefix-based agent dispatcher
│   │   ├── study_agent.py      # Educational tutor agent
│   │   ├── coding_agent.py     # Code & debugging agent
│   │   ├── productivity_agent.py # Productivity advisor
│   │   ├── email_agent.py      # Email draft generator
│   │   ├── automation_agent.py # URL summarizer + Calendar planner
│   │   └── system_prompt.py    # Shared system prompts
│   ├── rag/
│   │   ├── pdf_processor.py    # PDF → text chunks
│   │   ├── vector_store.py     # ChromaDB store
│   │   └── rag_chain.py        # Question → answer pipeline
│   ├── memory/
│   │   └── chat_memory.py      # In-memory conversation cache
│   ├── main.py                 # FastAPI app + all routes
│   ├── database.py             # MongoDB connection
│   ├── llm.py                  # Groq LLM wrapper
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ChatArea.jsx        # Main chat interface (streaming)
    │   │   ├── Sidebar.jsx         # Navigation + chat history
    │   │   ├── EmailComposer.jsx   # Email drafting UI
    │   │   ├── CalendarComposer.jsx # Calendar event UI
    │   │   ├── UrlSummarizer.jsx   # URL summarization UI
    │   │   ├── DocumentsPage.jsx   # PDF upload & management
    │   │   ├── ChatHistoryPage.jsx # Past conversations
    │   │   ├── SettingsPage.jsx    # User preferences
    │   │   ├── VoiceInput.jsx      # Voice-to-text input
    │   │   └── ConnectionStatus.jsx # Backend connection indicator
    │   ├── firebase.js             # Firebase config
    │   ├── App.jsx
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
```

---

## 🔐 Environment Variables

### Backend (`.env`)
| Variable | Required | Description |
|---|---|---|
| `MONGO_URL` | ✅ | MongoDB Atlas connection string |
| `DATABASE_NAME` | ✅ | MongoDB database name |
| `GROQ_API_KEY` | ✅ | Groq Cloud API key |
| `RAZORPAY_KEY_ID` | ✅ | Razorpay API Key ID |
| `RAZORPAY_KEY_SECRET` | ✅ | Razorpay API Key Secret |

### Frontend (`.env`)
| Variable | Required | Description |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase project API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | ✅ | Firebase app ID |
| `VITE_BACKEND_URL` | ✅ | Backend API base URL |
| `VITE_RAZORPAY_KEY_ID` | ✅ | Razorpay Key ID for frontend popup |

---

## 📱 Premium Mobile Experience

Simha AI is engineered with a **Mobile-First** approach. We use advanced CSS techniques (`fixed inset-0`, `overscroll-behavior: none`, and `100dvh`) to ensure:
- **Zero Window Bouncing**: The header and input bar are pinned perfectly to the viewport.
- **Native App Feel**: Smooth internal scrolling with a fixed UI shell.
- **Responsive Navigation**: A slick sidebar toggle optimized for thumb reach.

---

## 💰 SaaS Monetization (Pro Workflow)

The platform includes a fully functional simulation of a SaaS business model:
1. **Free Tier**: Users get **10 credits per day** (automatically reset every 24 hours UTC).
2. **Dynamic Deduction**: Credits are deducted based on the complexity and length of AI responses.
3. **Upgrade Path**: When credits run out, users are prompted to upgrade to **PRO**.
4. **Razorpay Integration**: Real-world payment gateway flow including signature verification for secure upgrades.
5. **Unlimited Access**: PRO users enjoy a custom "👑 PRO" badge and infinite AI usage.

---

## 🗺️ Roadmap

- [x] 🌙 Dark / Light theme toggle
- [x] 🎤 Voice input support (Web Speech API)
- [x] 🖼️ Image Vision agent (Groq Vision)
- [x] 💰 Daily Credits & PRO Membership
- [x] 💳 Razorpay Payment Integration
- [ ] 🖼️ Image generation agent (DALL-E / Stability AI)
- [ ] 📊 Analytics dashboard for usage stats
- [ ] 🔗 Google Calendar API direct integration (OAuth)
- [ ] 📤 Gmail API integration (send drafted emails)
- [ ] 📱 Mobile app (React Native)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

<div align="center">

**Narasimha Manam**

[![GitHub](https://img.shields.io/badge/GitHub-Narasimhamanam-181717?style=for-the-badge&logo=github)](https://github.com/Narasimhamanam)

*Built with ❤️ and a lot of ☕*

</div>

---

<div align="center">

**⭐ Star this repo if you find it useful!**

*Simha AI — Roar with Intelligence 🦁*

</div>
