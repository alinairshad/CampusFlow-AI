# Design Document — CampusFlow AI

## 1. Overview

CampusFlow AI is a full-stack application with a React frontend, a FastAPI backend, MongoDB Atlas (including Atlas Vector Search) as the single database, and an LLM (via an API such as OpenRouter) powering intent classification, RAG-based answering, action-plan generation, and application generation. The system is designed around one core pipeline — **classify → retrieve → generate → act** — reused across the AI Assistant, Problem-to-Action, and Application Generator features, rather than three separate ad-hoc implementations.

The MVP targets a single university (`university_id` fixed to one seeded value) but every schema and API is written to support multiple universities later without migration.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React + Vite Frontend                 │
│   (Student Dashboard, Admin Dashboard, Chat UI, Directory)    │
└───────────────────────────┬────────────────────────────────┘
                             │ HTTPS / JWT Bearer
┌───────────────────────────▼────────────────────────────────┐
│                     FastAPI Backend (Render)                 │
│  ┌───────────┐ ┌───────────────┐ ┌────────────────────────┐ │
│  │   Auth     │ │  Core Routers  │ │   AI Orchestration      │ │
│  │  (JWT)     │ │ (students,     │ │  Layer                  │ │
│  │            │ │  admin, docs,  │ │  - Intent Classifier    │ │
│  │            │ │  directory)    │ │  - RAG Pipeline          │ │
│  │            │ │                │ │  - Action Plan Generator │ │
│  │            │ │                │ │  - Application Generator │ │
│  └───────────┘ └───────────────┘ └────────────────────────┘ │
└───────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┴───────────────┐
              ▼                               ▼
   ┌─────────────────────┐        ┌───────────────────────┐
   │   MongoDB Atlas       │        │   LLM Provider API     │
   │  (data + vector index)│        │  (OpenRouter/similar)  │
   └─────────────────────┘        └───────────────────────┘
```

**Key decision:** MongoDB Atlas Vector Search is used instead of a dedicated vector database (Pinecone/Chroma/Weaviate). This avoids a second service to provision, secure, and keep in sync — one database, one connection string, simpler for a solo hackathon build and free-tier friendly.

---

## 3. Frontend Architecture

**Stack:** React + Vite + Tailwind CSS.

**Structure:**
```
src/
  api/            # axios client + endpoint wrappers, one file per resource
  auth/           # AuthContext, ProtectedRoute, token storage/refresh
  components/     # shared UI (Button, Card, Modal, ChatBubble, etc.)
  features/
    assistant/    # chat UI, message list, source citations
    applications/ # application form/preview, PDF download trigger
    directory/    # directory list, search, detail view
    dashboard/    # student dashboard widgets
    admin/        # document upload, directory management, stats
  pages/          # route-level pages composed from features
  hooks/          # useAuth, useChat, useDebouncedSearch, etc.
  types/          # shared TS-style JSDoc or PropTypes definitions
```

**Routing:** role-aware routing — `/dashboard`, `/assistant`, `/applications`, `/directory` for students; `/admin/*` for admins. A `ProtectedRoute` component checks JWT + role before rendering, redirecting to `/login` or `/unauthorized` as needed.

**State:** React Context for auth/session; local component state or lightweight query hooks (e.g., a small fetch-and-cache hook) for server data. No heavyweight global state library needed for MVP scope.

**Chat UI:** streams or polls assistant responses, renders source citations as expandable reference chips beneath each AI message, and renders a distinct "Action Plan" card format (department, docs required, steps, next action) when the response type is `action_plan`, versus a plain answer bubble for `knowledge_answer` type responses. This distinction comes from the backend response `type` field (see API structure below).

---

## 4. Backend Architecture

**Stack:** Python, FastAPI, Motor (async MongoDB driver) or PyMongo, Pydantic for schema validation.

**Structure:**
```
app/
  main.py
  core/
    config.py       # env var loading
    security.py     # JWT creation/verification, password hashing
    deps.py         # get_current_user, require_role dependencies
  models/            # Pydantic schemas (request/response + DB documents)
  routers/
    auth.py
    students.py
    admin_documents.py
    admin_directory.py
    directory.py
    assistant.py      # chat, intent routing
    applications.py
    search.py
  services/
    document_processor.py   # extraction, chunking
    embeddings.py            # embedding generation calls
    vector_store.py          # Atlas Vector Search query/insert wrappers
    intent_classifier.py
    rag_answer.py
    action_plan.py
    application_generator.py
    pdf_generator.py
  db/
    mongo.py         # connection setup, index creation on startup
```

**Layering rule:** routers handle HTTP concerns only (auth, validation, response shaping); all AI/business logic lives in `services/`, so logic is testable independent of FastAPI and reusable across routers (e.g., `applications.py` and `action_plan.py` both call the same `vector_store.py` retrieval function).

---

## 5. AI / RAG Pipeline

### 5.1 Document Ingestion (Admin Upload)

1. Admin uploads PDF/DOCX/TXT via `admin_documents.py`.
2. `document_processor.py` extracts raw text (pdfplumber for PDF, python-docx for DOCX, direct read for TXT).
3. Text is split into overlapping chunks (~500–800 tokens, ~100 token overlap) preserving section context where possible.
4. `embeddings.py` generates an embedding vector per chunk via the LLM provider's embedding endpoint.
5. Each chunk is stored in the `document_chunks` collection with: `document_id`, `university_id`, `category`, `chunk_text`, `embedding`, `chunk_index`.
6. Atlas Vector Search index (defined on `embedding` field) picks up new chunks automatically.

### 5.2 Query Pipeline (shared by Assistant, Problem-to-Action, Applications)

```
Student Query
   │
   ▼
[Query Rewrite]  — optional LLM call to expand/clarify short or ambiguous queries
   │
   ▼
[Intent Classifier]  — single LLM call, structured JSON output:
   { category: <enum>, type: "knowledge" | "problem" | "application" }
   │
   ▼
[Router — service layer, not LLM]
   │
   ├─ type == "knowledge" ──► [Embed query] → [Atlas Vector Search top-k]
   │                          → [Relevance threshold check]
   │                          → IF below threshold: return "not found" response
   │                          → ELSE: [RAG Answer LLM call w/ retrieved chunks]
   │                          → attach source document references
   │
   ├─ type == "problem" ────► [Embed query] → [Atlas Vector Search top-k,
   │                          filtered/boosted by classified category]
   │                          → [Action Plan LLM call] → structured JSON:
   │                          { department, required_docs[], steps[], next_action }
   │
   └─ type == "application" ► [Embed query] → [Atlas Vector Search top-k]
                              → [Application Generator LLM call] using
                              student profile + context + retrieved policy
                              → structured JSON: { application_type, body_text }
                              → IF required info missing: return clarifying
                              question instead of final document
```

**Prompting rules enforced in every generation call:**
- System prompt explicitly states: answer/act only using the provided retrieved context; do not invent deadlines, fees, policies, or office names.
- If retrieved context is empty or below the relevance threshold, the LLM is not called for content generation — the "not found" path is a deterministic code branch, not left to the model to decide.
- All structured outputs (action plan, application) are requested as strict JSON and validated against a Pydantic schema before being returned to the frontend; a malformed response triggers one retry with a stricter format reminder before falling back to an error message.

### 5.3 Application PDF Generation

Once the student confirms/edits the generated application text, `pdf_generator.py` (using `reportlab` or `weasyprint`) renders a clean, formal PDF layout (university-agnostic template: header, date, recipient, body, signature block) and returns it as a downloadable file.

---

## 6. Database Design (MongoDB Atlas)

All collections include `university_id` (string/ObjectId) for future multi-university support.

**`users`**
```
_id, university_id, email (unique), password_hash, role ("student"|"admin"),
created_at
```

**`student_profiles`**
```
_id, user_id (ref), university_id, name, department, semester, batch,
interests[], created_at
```

**`documents`**
```
_id, university_id, title, category, filename, uploaded_by (ref user),
uploaded_at, status ("processed"|"failed")
```

**`document_chunks`**
```
_id, document_id (ref), university_id, category, chunk_index, chunk_text,
embedding (vector, Atlas Vector Search index), created_at
```

**`departments_offices`** (University Directory)
```
_id, university_id, name, location, working_hours, contact,
services[], category, updated_at
```

**`societies`** (University Societies)
```
_id, university_id, name,
category ("Tech"|"Sports"|"Literary"|"Arts"|"Social Welfare"|"Cultural"|"Other"),
description, how_to_join, contact_email,
social_media_link (optional), faculty_advisor (optional),
updated_at
```

**`announcements`**
```
_id, university_id, title, body, target_department, target_semester,
created_at, created_by
```

**`applications`**
```
_id, university_id, student_id (ref), type, content, status
("generated"|"downloaded"), source_conversation_id, created_at
```

**`conversations`**
```
_id, university_id, student_id (ref), messages: [
  { role: "user"|"assistant", content, type ("knowledge"|"problem"|
    "application"), sources[], created_at }
], created_at, updated_at
```

**Indexes:**
- `users.email` — unique index
- `document_chunks.embedding` — Atlas Vector Search index
- `document_chunks.university_id, category` — compound index for filtered retrieval
- `departments_offices.name, services` — text index for keyword search fallback
- `societies.name, description, category` — text index for keyword search
- `societies.university_id` — for scoped list queries
- `applications.student_id`, `conversations.student_id` — for dashboard queries

---

## 7. Authentication & Authorization

- JWT-based auth. Access token issued on login, containing `user_id`, `role`, `university_id`, short expiry (e.g., 60 min).
- Passwords hashed with bcrypt via `passlib`.
- `deps.py` provides `get_current_user` (validates token) and `require_role("admin")` (raises 403 if role mismatch) as FastAPI dependencies, applied per-route.
- Frontend stores the JWT in memory + a secure httpOnly-style pattern where feasible (given SPA constraints, stored in memory/context and refreshed on load rather than persisted insecurely); route guards additionally check role client-side for UX (not as a security boundary — backend enforcement is authoritative).

---

## 8. API Structure (representative endpoints)

```
POST   /auth/register
POST   /auth/login

GET    /students/me
PUT    /students/me

POST   /admin/documents               (upload, admin only)
GET    /admin/documents
DELETE /admin/documents/{id}

POST   /admin/directory               (admin only)
PUT    /admin/directory/{id}
DELETE /admin/directory/{id}
GET    /directory                     (student-facing list)
GET    /directory/{id}
GET    /directory/search?q=...

POST   /admin/societies               (admin only)
PUT    /admin/societies/{id}
DELETE /admin/societies/{id}
GET    /societies                     (student-facing list)
GET    /societies/{id}
GET    /societies/search?q=...

POST   /assistant/query               (unified entrypoint — classify + route)
GET    /assistant/conversations
GET    /assistant/conversations/{id}

POST   /applications/generate
GET    /applications
GET    /applications/{id}/pdf

GET    /search?q=...                  (cross knowledge base + directory + societies)

GET    /admin/stats                   (admin only — basic counts)
```

`POST /assistant/query` is the single entrypoint for the AI Campus Assistant and Problem-to-Action Assistant — the backend classifies and routes internally, returning a `type` field so the frontend knows which UI card to render. This keeps the frontend simple and the intent-classification logic in one place server-side.

---

## 9. Data Flow (end-to-end example)

1. Student sends message → `POST /assistant/query` with JWT.
2. Backend validates JWT, loads student profile.
3. Intent Classifier LLM call → `{category: "Finance", type: "problem"}`.
4. Query embedded, Atlas Vector Search retrieves top-k chunks filtered by `category`.
5. Action Plan LLM call generates structured plan grounded in retrieved chunks.
6. Response saved to `conversations`, returned to frontend with `type: "problem"`.
7. Frontend renders Action Plan card with a "Generate Application" button.
8. Student clicks it → `POST /applications/generate` with conversation context reference.
9. Application Generator retrieves relevant policy chunks again, generates application text, returns for student edit/preview.
10. Student confirms → PDF generated → `applications` record saved → download link returned.

---

## 10. Deployment Architecture

- **Frontend:** deployed to Vercel, built via `vite build`, environment variable `VITE_API_BASE_URL` pointing to the Render backend.
- **Backend:** deployed to Render (free tier web service), environment variables for `MONGODB_URI`, `JWT_SECRET`, `LLM_API_KEY`, `LLM_API_BASE`.
- **Database:** MongoDB Atlas free tier cluster (M0), with Atlas Vector Search index configured on `document_chunks.embedding`.
- **CORS:** backend configured to allow only the deployed Vercel origin (plus localhost for development).
- **Cold start mitigation:** Render free tier sleeps after inactivity; a lightweight `/health` endpoint is pinged before live demos to warm the instance.

---

## 11. Security Considerations

- All secrets (DB URI, JWT secret, LLM API key) loaded from environment variables, never committed to the repo.
- Passwords hashed with bcrypt; never logged or returned in API responses.
- Role checks enforced server-side on every protected route, not just hidden client-side.
- Input validation via Pydantic models on all request bodies; file upload size/type validated before processing.
- Rate limiting consideration: basic per-user request throttling on `/assistant/query` and `/applications/generate` to prevent abuse of paid LLM calls (simple in-memory or MongoDB-based counter is sufficient for MVP).
- Error responses never leak stack traces or internal paths; errors are logged server-side with enough detail for debugging.
- Document uploads restricted to admin role only; file type validated by content inspection, not just file extension.

---

## 12. Extensibility Notes (not built in MVP, but designed for)

- **Multi-university:** every collection already keyed by `university_id`; a university-switcher would only require a new `universities` collection and a selector in the auth/registration flow.
- **Interactive campus map:** `departments_offices` can later add optional `latitude`/`longitude` fields without breaking existing records.
- **Senior-Junior Knowledge Sharing:** would be added as new collections (`questions`, `answers`) plus a `verified_senior` boolean on `student_profiles` — intentionally excluded from MVP but does not conflict with current schema.
- **Personalized Announcements:** current `announcements` schema already supports department/semester targeting; a full "personalization" ranking layer can be added later without a schema change.
