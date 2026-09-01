# CampusFlow AI

An AI-powered university companion that helps students navigate academic life.
Students can ask questions about university policies, get step-by-step action
plans for administrative problems, generate formal application letters, and
browse the university directory — all grounded in uploaded university documents.

**Live demo**
- Frontend: https://campus-flow-ai-delta.vercel.app
- Backend API: https://backend-65be032f.fastapicloud.dev/docs

---

## Architecture

```
Vercel (React + Vite + Tailwind v4)
        │  HTTPS
FastAPI Cloud (Python 3.11 + FastAPI 0.115)
        │  Motor async driver
MongoDB Atlas M0 (vector search + document storage)
        │
OpenRouter API (text-embedding-3-small + gpt-4o-mini)
```

**Key flows:**
- **RAG Q&A** — student query → embed → Atlas Vector Search → threshold check → grounded LLM answer
- **Problem-to-Action** — classify intent → retrieve context → structured JSON action plan
- **Application Generator** — student profile + conversation context + KB retrieval → formal letter → ReportLab PDF
- **Directory** — MongoDB `$text` search + unified vector/keyword search endpoint

---

## Local Development Setup

### Prerequisites
- Python 3.11
- Node.js 20+
- A MongoDB Atlas account (M0 free tier works)
- An OpenRouter API key (https://openrouter.ai)

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy env template and fill in your values
cp .env.example .env
# Edit .env — set MONGODB_URI, JWT_SECRET, LLM_API_KEY at minimum
```

**Required `.env` values:**

| Variable | Where to get it |
|---|---|
| `MONGODB_URI` | Atlas dashboard → Connect → Drivers |
| `JWT_SECRET` | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `LLM_API_KEY` | https://openrouter.ai/keys |

```bash
# Seed the admin account
python scripts/seed_admin.py   # needs ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME in .env

# Start the development server
uvicorn app.main:app --reload
# API docs: http://localhost:8000/docs
```

### Frontend

```bash
cd frontend

npm install

# Copy env template
cp .env.example .env
# Edit .env — set VITE_API_BASE_URL=http://localhost:8000

npm run dev
# App: http://localhost:5173
```

### Atlas Vector Search index (one-time manual setup)

After the backend starts and documents are uploaded, create the vector index
in the Atlas UI:

1. Atlas UI → cluster → Browse Collections → `campusflow` → `document_chunks`
2. "Search Indexes" tab → Create Search Index → JSON editor → paste:

```json
{
  "name": "document_chunks_vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      { "type": "vector", "path": "embedding", "numDimensions": 1536, "similarity": "cosine" },
      { "type": "filter", "path": "university_id" },
      { "type": "filter", "path": "category" }
    ]
  }
}
```

---

## Deployment

### Backend — FastAPI Cloud

The backend is deployed to [FastAPI Cloud](https://fastapicloud.com) using
their CLI. `pyproject.toml` defines the project and `backend/.fastapicloudignore`
controls what is uploaded.

**Install the deploy CLI (one-time, not a project dependency):**
```bash
pip install fastapi-cloud-cli
```

**Deploy:**
```bash
cd backend
fastapi login     # opens browser for auth
fastapi deploy    # first time: prompts to create/link an app
```

**Environment variables — set in FastAPI Cloud dashboard → Variables tab:**

Non-sensitive (can also be set from CLI):
```
DATABASE_NAME=campusflow
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
LLM_API_BASE=https://openrouter.ai/api/v1
EMBEDDING_MODEL=openai/text-embedding-3-small
CHAT_MODEL=openai/gpt-4o-mini
RAG_MIN_SCORE=0.7
ACTION_PLAN_MIN_SCORE=0.65
UNIVERSITY_ID=uni_001
ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173
```

Secrets (use the secret variable UI — these cannot be viewed after creation):
```
MONGODB_URI      ← Atlas connection string
JWT_SECRET       ← long random hex
LLM_API_KEY      ← OpenRouter API key
```

After deploying, go to Settings → Networking → **Generate Domain** to get
the public URL.

### Frontend — Vercel

```bash
# Install Vercel CLI (optional — can also use the web dashboard)
npm i -g vercel
vercel --cwd frontend
```

Or import via the Vercel dashboard:
1. New Project → import GitHub repo → set Root Directory to `frontend/`
2. Add environment variable: `VITE_API_BASE_URL=https://your-backend.fastapicloud.dev`
3. Deploy

`frontend/vercel.json` handles SPA routing (all paths → `index.html`) and
adds security headers automatically.

---

## Common Issues & Gotchas

### MongoDB Atlas Network Access — most important

> **If the backend starts successfully locally but fails in production with
> connection errors or 503s, this is almost certainly the cause.**

Atlas M0 free tier blocks all connections by default. You must whitelist
the backend's IP — or for cloud platforms where IPs are dynamic:

1. Atlas UI → Network Access → Add IP Address
2. Add `0.0.0.0/0` (allow from anywhere)

This is safe for an M0 cluster that already requires a username/password.
Without this step, FastAPI Cloud's servers cannot reach Atlas and every
request that touches the database will fail.

### FastAPI Cloud cold starts (Hobby plan)

The Hobby plan always scales to zero when idle. After a period of inactivity:
- The first request triggers a cold start (5–15 seconds to wake up)
- The app connects to Atlas during startup, so the first real request usually
  succeeds once the container is ready

**Before a live demo:** open `https://your-backend.fastapicloud.dev/health`
60–90 seconds before you need it. Wait for `{"status": "ok"}` — that confirms
the container is warm and Atlas is connected. Subsequent requests will be fast.

If the Hobby plan's scale-to-zero causes persistent issues, upgrading to
FastAPI Cloud Pro (minimum 1 replica) or switching to a platform that supports
always-on free tiers (Railway, Fly.io) will solve it permanently.

### pydantic-settings and ALLOWED_ORIGINS

`ALLOWED_ORIGINS` is stored as a plain string in the Settings model (not
`List[str]`) to avoid pydantic-settings v2's automatic JSON parsing of list
fields. The `settings.allowed_origins_list` property converts it at access
time. Both formats work:

```
# Plain (recommended for dashboard entry — no quoting needed):
ALLOWED_ORIGINS=https://app.vercel.app,http://localhost:5173

# JSON array (also accepted):
ALLOWED_ORIGINS=["https://app.vercel.app","http://localhost:5173"]
```

### passlib / bcrypt incompatibility

`passlib==1.7.4` is incompatible with `bcrypt>=4.1` (passlib's wrap-bug
detection triggers a hard error). This project uses `bcrypt` directly
(not via passlib) for password hashing. `passlib` is intentionally absent
from `requirements.txt`.

### `fastapi[standard]` is required

FastAPI Cloud's runtime starts the app with `fastapi run`, which requires
the `fastapi` CLI binary. This binary is only installed when the
`[standard]` extra is included. Plain `fastapi==x.x.x` without `[standard]`
will cause `"sh: fastapi: not found"` at startup.

The `[standard]` extra was added to `fastapi` in version 0.112.0 — pinning
to `0.111.0` or earlier will silently ignore the extra and still fail.
This project pins `fastapi[standard]==0.115.0`.

---

## Project Structure

```
CampusFlow AI/
├── backend/
│   ├── app/
│   │   ├── core/          config, security, deps, rate_limit
│   │   ├── db/            mongo.py (Motor async driver)
│   │   ├── models/        Pydantic schemas
│   │   ├── routers/       FastAPI route handlers
│   │   └── services/      LLM, RAG, embeddings, PDF generation
│   ├── scripts/           seed_admin.py
│   ├── pyproject.toml     FastAPI Cloud entrypoint + dependencies
│   ├── requirements.txt   pinned deps for local venv
│   └── .fastapicloudignore
├── frontend/
│   ├── src/
│   │   ├── api/           axios wrappers per feature
│   │   ├── auth/          AuthContext, ProtectedRoute
│   │   ├── features/      assistant, applications, admin, directory
│   │   └── pages/         route-level components
│   └── vercel.json        SPA rewrite + security headers
└── .kiro/specs/           requirements.md, design.md, tasks.md
```
