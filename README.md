# CampusFlow AI

> From *"I have a problem"* to a stamped PDF in your hand — all in one conversation.

CampusFlow AI is an intelligent university companion built for Lahore Garrison University. Unlike a generic chatbot that answers questions and stops there, CampusFlow closes the full loop: it classifies your intent, retrieves answers from verified university documents via RAG, converts your problem into a concrete action plan (correct department, required documents, exact steps), generates a ready-to-submit formal application pre-filled with your profile data, and exports it as a formatted PDF. No more guessing which office to visit, no more writing letters from scratch, no more getting answers that aren't backed by an actual policy.

---

## 🔗 Live Demo

| | URL |
|---|---|
| **Frontend** | https://campus-flow-ai-delta.vercel.app |
| **Backend API** | https://backend-65be032f.fastapicloud.dev |

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| Student | `admin2@university.edu` | `alina1234` |
| Admin | `admin@university.edu` | `Admin1234` |

> **Cold-start note:** The backend runs on a free tier that scales to zero after inactivity. If the first request feels slow (5–10 s), hit the app once and wait — subsequent requests are fast. See [Deployment Notes](#deployment-notes) for how to warm it before a demo.

---

## ✨ Features

### AI Assistant (RAG-based Q&A)
Ask any question about fees, exams, scholarships, registration, or academic policy. Answers are generated exclusively from uploaded university documents — the system never fabricates policies. Every answer includes source-document citations so students can verify what they're reading.

### Problem-to-Action Assistant
Describe a real administrative problem in plain language ("My grade is wrong" / "I can't pay my challan this semester"). The system classifies the intent, retrieves relevant policy context, and returns a structured action plan: the responsible department, documents you'll need, ordered steps to take, and a single highlighted next action.

### AI Application Generator with PDF Export
One click from an action plan generates a complete, formal application letter pre-filled with your name, department, semester, and batch. If required information is missing, the system asks a clarifying question first. The generated letter is editable, copyable, and downloadable as a properly formatted PDF (university header, date, recipient block, body, signature line).

### University Directory
Browse and search all university departments and offices. Each entry shows location, working hours, contact details, and services offered. Admins manage entries through the admin panel; changes appear immediately in student views.

### University Societies
Discover clubs and societies — Tech, Sports, Literary, Arts, Social Welfare, Cultural — with descriptions, how-to-join instructions, faculty advisors, and contact details. Filter by category or search by name.

### Senior-Junior Mentorship Directory
Senior students opt in to be listed as mentors from their dashboard. Junior students can browse by department, search by name or interest, and contact seniors directly by email. No in-app messaging — straightforward, low-friction peer connection.

### Student Dashboard
A personalised landing page showing your profile, recent applications with status, recent AI conversations, mentor suggestions, and quick-access links to every feature.

### Admin Dashboard
Upload and manage knowledge-base documents (PDF, DOCX, TXT), manage directory and society entries, and view live usage statistics (total documents, students, AI queries handled, and directory entries).

### Conversation History
Every AI conversation is saved. The sidebar on the Assistant page lists past conversations with previews and timestamps — click any to resume exactly where you left off, including fully reconstructed action plan cards.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS v4 |
| **Backend** | Python 3.12, FastAPI, Motor (async MongoDB driver) |
| **Database** | MongoDB Atlas (M0 free tier) + Atlas Vector Search |
| **AI / LLM** | OpenRouter API → `openai/gpt-4o-mini` (chat) + `openai/text-embedding-3-small` (embeddings) |
| **PDF generation** | ReportLab (Python-native, no binary dependency) |
| **Frontend deploy** | Vercel |
| **Backend deploy** | FastAPI Cloud (free tier) |
| **Auth** | JWT (HS256), bcrypt password hashing |

---

## 🏗 Architecture

```
Student Browser (React + Vite)
        │  HTTPS / JWT Bearer
        ▼
FastAPI Backend
  ┌─────────────────────────────────────────────────┐
  │  POST /assistant/query  (single AI entrypoint)   │
  │                                                  │
  │  1. Intent Classifier  ── LLM call ──► {category,│
  │                                         type}    │
  │  2. Router (code, not LLM):                      │
  │     type=knowledge  → RAG Answer pipeline        │
  │     type=problem    → Action Plan pipeline       │
  │     type=application→ Application Generator      │
  │                                                  │
  │  RAG pipeline:                                   │
  │    Embed query → Atlas Vector Search (top-k)     │
  │    → cosine threshold check                      │
  │    → [below threshold] deterministic not-found   │
  │    → [above threshold] grounded LLM answer       │
  │    → source citations attached                   │
  └─────────────────────────────────────────────────┘
        │                         │
        ▼                         ▼
  MongoDB Atlas              OpenRouter API
  (data + vector index)      (LLM + embeddings)
```

**One pipeline, three use cases.** The same embed → retrieve → threshold → generate chain powers the Q&A assistant, the problem action planner, and the application generator. The intent classifier decides which flavour of prompt and response schema to use; the retrieval and grounding logic is shared.

**Why MongoDB for vectors?** Atlas Vector Search eliminates a second service (Pinecone / Chroma / Weaviate), a second connection string, and a sync problem — one database, one connection, free tier friendly. The tradeoff is that the vector index must be created manually once in the Atlas UI (it's a Search Index, not a standard `createIndex` call).

---

## 🤖 How Kiro Was Used

This project was built spec-first using [Kiro](https://kiro.dev) for the **Build with Kiro 2026 Hackathon**.

The `.kiro/specs/` directory contains three files that were written before a single line of implementation code:

- **`requirements.md`** — 18 numbered requirements (user stories + acceptance criteria), covering every feature from authentication through roll-number validation
- **`design.md`** — full system architecture: database schema, API contract, RAG pipeline diagram, frontend structure, security model, and UI design specs for every component
- **`tasks.md`** — 100+ concrete implementation tasks grouped into 18 stages (Stage 0 through Stage 18), each task referencing the requirement it satisfies

Kiro used these specs to implement every stage sequentially, with the git history reflecting the task-by-task progression — you can see commits like `Stage 3, Task 3.1: llm_client.py + intent_classifier` followed by `Stage 3, Task 3.7: POST /assistant/query orchestration`. The specs weren't written after the fact; they shaped what got built and in what order.

Kiro also performed the pre-submission QA pass, identified 25+ issues (ranging from a critical `action_plan` data-loss bug in conversation history to a missing `/mentors` link in the navbar), and fixed the prioritised ones — with the fix commits in history.

---

## 🚀 Local Development Setup

### Prerequisites

- Python 3.12+
- Node.js 18+
- A MongoDB Atlas cluster (free M0 tier is sufficient) with a Vector Search index on `document_chunks.embedding`
- An OpenRouter API key (for LLM + embeddings)

### Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Linux / macOS
# .\venv\Scripts\activate       # Windows PowerShell

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — fill in MONGODB_URI, JWT_SECRET, LLM_API_KEY

# Seed the admin account (run once)
python scripts/seed_admin.py

# Start the development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# .env already points to http://localhost:8000 — no changes needed for local dev

# Start the dev server
npm run dev
```

The app will be at `http://localhost:5173`.

### Atlas Vector Search Index

The standard `createIndex()` calls in `mongo.py` handle all regular indexes on startup. The **vector index** must be created once manually in the Atlas UI:

1. Atlas → your cluster → **Search** tab → **Create Search Index**
2. Choose **Atlas Vector Search** (not the regular text search)
3. Collection: `campusflow.document_chunks`
4. Index definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "university_id"
    },
    {
      "type": "filter",
      "path": "category"
    }
  ]
}
```

5. Index name: `document_chunks_vector_index`

No documents will be retrievable by the AI until this index is created.

### Environment Variables Reference

**Backend** (see `backend/.env.example` for the full list):

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Long random string for signing tokens — generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `LLM_API_KEY` | OpenRouter API key |
| `LLM_API_BASE` | OpenRouter base URL (default: `https://openrouter.ai/api/v1`) |
| `EMBEDDING_MODEL` | Embedding model identifier (default: `openai/text-embedding-3-small`) |
| `CHAT_MODEL` | Chat model identifier (default: `openai/gpt-4o-mini`) |
| `RAG_MIN_SCORE` | Cosine similarity threshold for Q&A retrieval (default: `0.7`) |
| `UNIVERSITY_ID` | Fixed university identifier for MVP (default: `university_mvp_001`) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (e.g. `http://localhost:5173,https://your-app.vercel.app`) |

**Frontend** (see `frontend/.env.example`):

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend URL (`http://localhost:8000` for local dev, or your deployed backend URL for production) |

---

## ☁️ Deployment Notes

### Current setup

| Service | Platform |
|---|---|
| Backend | [FastAPI Cloud](https://fastapicloud.com) (free tier) |
| Frontend | [Vercel](https://vercel.com) (Hobby tier) |
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) (M0 free cluster) |

### Deploying the backend (FastAPI Cloud)

1. Push the repo — FastAPI Cloud detects `pyproject.toml` automatically.
2. Set all environment variables from `backend/.env.example` in the dashboard.
3. The `ALLOWED_ORIGINS` variable should include your Vercel frontend URL.

### Deploying the frontend (Vercel)

1. Connect the GitHub repo to Vercel, set root directory to `frontend/`.
2. Set `VITE_API_BASE_URL` to your FastAPI Cloud backend URL.
3. Vercel picks up `vercel.json` (SPA rewrite rule + security headers) automatically.

### ⚠️ Critical gotcha #1 — MongoDB Atlas Network Access

Atlas M0 clusters restrict inbound connections to explicitly allowed IP addresses. FastAPI Cloud (and Render's free tier) does not have static egress IPs. If you see SSL handshake failures or connection timeouts from the deployed backend when it connects to Atlas, go to:

**Atlas → Network Access → Add IP Address → Allow access from anywhere (`0.0.0.0/0`)**

This was the fix that unblocked deployment. For a production system you would restrict to specific IPs; for a free-tier hackathon deploy, `0.0.0.0/0` is the pragmatic answer.

### ⚠️ Critical gotcha #2 — Cold-start mitigation

The free tier scales to zero after ~15 minutes of inactivity. The first request after an idle period takes 5–15 seconds while the container starts.

**Before any live demo:** open `https://backend-65be032f.fastapicloud.dev/health` in your browser about 30 seconds before you start. You'll see `{"status":"ok"}` when the server is warm. All subsequent requests will be fast.

---

## 📸 Screenshots

<!-- Add screenshots here -->

*Screenshots coming soon — feature areas to capture:*
- Landing page
- Student Dashboard (sidebar layout)
- AI Assistant with action plan card
- Application Generator (generated letter + PDF download)
- University Directory and Societies
- Senior Directory
- Admin Dashboard (stats + knowledge base upload)

---

## ⚠️ Known Limitations & Roadmap

### Current limitations

| Area | Limitation |
|---|---|
| **Knowledge base** | Seeded with limited real LGU data — primarily fee structure and a handful of policy excerpts. Most answers will be accurate for finance/registration topics; other topics may return "no verified information found" until more documents are uploaded. |
| **Teacher role** | Not implemented. The system supports `student` and `admin` roles. A `teacher` role with course-management and grade-entry features is designed for but deferred. |
| **Mentor contact** | Email-only. There is no in-app messaging — the Senior Directory shows contact emails for direct outreach. A messaging or scheduling feature is on the roadmap. |
| **Rate limiting** | Per-user limits (10 AI queries/minute, 5 application generations/minute) are enforced in-memory. They reset on server restart and don't scale across multiple workers. A Redis-backed implementation is the next step. |
| **DOCX table extraction** | `python-docx` extracts paragraph text only; tables and text boxes in DOCX files are skipped. Fee structure tables in DOCX format won't be fully extracted — upload as PDF or TXT instead. |
| **Single university** | The data model is multi-university-ready (every record has a `university_id`), but the UI and registration flow are fixed to one university. A multi-tenant admin portal is a V2 feature. |
| **JWT expiry UX** | Expired sessions pass the client-side route guard and only fail on the first API call. The UX could be improved with a proactive `exp` claim check on page load. |

### Roadmap

- Upload more real LGU policy documents to improve answer coverage
- Teacher role (course management, grade submission)
- In-app mentor messaging / meeting scheduling
- Redis-backed rate limiting for multi-worker deployments
- Personalized announcements (department/semester-targeted)
- Interactive campus map (the directory schema already has optional lat/lng fields)
- Mobile app (React Native, sharing the same backend)

---

## 🙏 Credits

Built by **Alina Irshad** for the **[Build with Kiro 2026 Hackathon](https://kiro.dev)**.

Development was driven end-to-end by [Kiro](https://kiro.dev) — Kiro's agentic spec workflow (`.kiro/specs/`) was used to write requirements and design documents before any code, then implement every stage task-by-task, and finally run a structured QA pass to find and fix issues before submission. The git history is a faithful record of that process.
