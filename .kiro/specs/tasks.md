# Implementation Plan — CampusFlow AI

This plan breaks the MVP into small, sequential, trackable tasks. Each task references the requirement(s) it satisfies from `requirements.md`. Tasks are grouped into stages; complete a stage before moving to the next, since later stages (AI pipeline, applications) depend on earlier ones (auth, data models, ingestion).

**Locked technical decision:** PDF generation for the AI Application Generator uses **ReportLab** (Python-native, no external binary dependency, installs cleanly on Render free tier). This is fixed — do not substitute WeasyPrint or another library mid-build.

---

## Stage 0 — Project Setup

- [ ] 0.1 Initialize backend FastAPI project structure (`app/` layout per design.md section 4), add `requirements.txt` with core deps (fastapi, uvicorn, motor, pydantic, passlib, python-jose, pdfplumber, python-docx, reportlab)
- [ ] 0.2 Initialize frontend Vite + React + Tailwind project, set up folder structure per design.md section 3
- [ ] 0.3 Set up MongoDB Atlas cluster (M0 free tier), create database, add connection string to backend `.env`
- [ ] 0.4 Set up `.env.example` files (backend and frontend) documenting all required environment variables without real secrets
- [ ] 0.5 Initialize Git repository, create `.gitignore` (node_modules, .env, __pycache__, etc.), make initial commit
- [ ] 0.6 Set up `.kiro/specs/` folder with finalized `requirements.md` and `design.md` committed

---

## Stage 1 — Authentication & User Foundation
*Implements Requirement 1*

- [ ] 1.1 Define Pydantic models for `User` and `StudentProfile` per design.md section 6
- [ ] 1.2 Implement `core/security.py` — password hashing (bcrypt) and JWT creation/verification functions
- [ ] 1.3 Implement `POST /auth/register` — student registration with profile fields, hashed password storage
- [ ] 1.4 Implement `POST /auth/login` — credential verification, JWT issuance
- [ ] 1.5 Implement `deps.py` — `get_current_user` and `require_role()` FastAPI dependencies
- [ ] 1.6 Create a seed script to create one admin account (controlled admin creation, not open registration)
- [ ] 1.7 Test auth flow end-to-end: register → login → access protected route → role rejection on mismatch
- [ ] 1.8 Frontend: build Login and Register pages, AuthContext, token storage, `ProtectedRoute` component
- [ ] 1.9 Frontend: wire login/register forms to backend, redirect by role after login

---

## Stage 2 — Knowledge Base & Admin Document Upload
*Implements Requirement 2*

- [ ] 2.1 Define `Document` and `DocumentChunk` Pydantic/DB models per design.md section 6
- [ ] 2.2 Implement `services/document_processor.py` — text extraction for PDF (pdfplumber), DOCX (python-docx), TXT
- [ ] 2.3 Implement chunking logic (overlapping ~500–800 token chunks)
- [ ] 2.4 Implement `services/embeddings.py` — embedding generation via LLM provider API
- [ ] 2.5 Implement `services/vector_store.py` — insert chunks with embeddings; create Atlas Vector Search index on `document_chunks.embedding`
- [ ] 2.6 Implement `POST /admin/documents` — file upload, format validation, extraction → chunking → embedding → storage pipeline, admin-only
- [ ] 2.7 Implement `GET /admin/documents` and `DELETE /admin/documents/{id}` (cascade-delete associated chunks)
- [ ] 2.8 Handle extraction failure case — mark document `status: "failed"`, notify admin, no partial chunks created
- [ ] 2.9 Test upload pipeline with sample PDF, DOCX, and TXT files; verify chunks and embeddings are stored correctly
- [ ] 2.10 Frontend: build Admin document upload UI (file picker, category tag, upload progress, document list with delete)

---

## Stage 3 — AI Intent Classification & RAG Query Pipeline
*Implements Requirements 3 and 4*

- [ ] 3.1 Implement `services/intent_classifier.py` — LLM call producing structured `{category, type}` JSON, validated against Pydantic schema
- [ ] 3.2 Implement query rewriting step for short/ambiguous queries
- [ ] 3.3 Implement `services/rag_answer.py` — embed query, Atlas Vector Search top-k retrieval, relevance threshold check
- [ ] 3.4 Implement the deterministic "not found" fallback path (below threshold → no LLM generation call, static "not found" response)
- [ ] 3.5 Implement RAG answer generation LLM call — grounded-only system prompt, returns answer + source document references
- [ ] 3.6 Implement `conversations` persistence — save each query/answer/sources exchange
- [ ] 3.7 Implement `POST /assistant/query` router — orchestrates rewrite → classify → route to RAG answer path when `type == "knowledge"`
- [ ] 3.8 Test RAG pipeline: ask questions with known answers in uploaded docs (verify correct answer + citation) and known-absent questions (verify "not found" response, no hallucination)
- [ ] 3.9 Frontend: build Chat UI (message list, input box, source citation chips under AI messages)
- [ ] 3.10 Frontend: wire chat UI to `POST /assistant/query`, handle loading and error states

---

## Stage 4 — Problem-to-Action Assistant
*Implements Requirement 5*

- [ ] 4.1 Implement `services/action_plan.py` — retrieval filtered/boosted by classified category, structured LLM call producing `{department, required_docs[], steps[], next_action}`
- [ ] 4.2 Extend `POST /assistant/query` router to call action plan path when `type == "problem"`
- [ ] 4.3 Implement grounded-fallback behavior when no relevant policy context is found for a problem
- [ ] 4.4 Test with example problem queries (e.g., fee challan issue) — verify department routing, docs list, and next-action are all populated and grounded
- [ ] 4.5 Frontend: build Action Plan card component (department, required docs, numbered steps, highlighted next action, "Generate Application" button)
- [ ] 4.6 Frontend: wire chat UI to render Action Plan card when response `type == "problem"`

---

## Stage 5 — AI Application Generator (with ReportLab PDF)
*Implements Requirement 6*

- [ ] 5.1 Implement `services/application_generator.py` — retrieval + structured LLM call producing `{application_type, body_text}`, using student profile + conversation context
- [ ] 5.2 Implement clarifying-question fallback when required info is missing before generation
- [ ] 5.3 Implement `services/pdf_generator.py` using **ReportLab** — formal letter template (header, date, recipient, body, signature block)
- [ ] 5.4 Implement `POST /applications/generate` — generates application text, returns editable draft
- [ ] 5.5 Implement `GET /applications/{id}/pdf` — renders finalized application to PDF via ReportLab, returns as downloadable file
- [ ] 5.6 Implement `applications` collection persistence (type, content, status, source_conversation_id)
- [ ] 5.7 Implement `GET /applications` — list a student's application history with status
- [ ] 5.8 Test generation for each application type (fee extension, leave request, course withdrawal, transcript request, scholarship request, department transfer, exam-related) — verify grounded details, no invented deadlines/office names
- [ ] 5.9 Test PDF output — verify formatting renders correctly and downloads properly
- [ ] 5.10 Frontend: build Application preview/edit UI, "Copy" and "Download PDF" actions
- [ ] 5.11 Frontend: wire "Generate Application" button from Action Plan card to application flow

---

## Stage 6 — University Directory & Smart Search
*Implements Requirements 7 and 8*

- [ ] 6.1 Define `DepartmentOffice` model per design.md section 6 (with optional lat/lng fields for future map support)
- [ ] 6.2 Implement `POST/PUT/DELETE /admin/directory` endpoints (admin-only)
- [ ] 6.3 Implement `GET /directory` and `GET /directory/{id}` (student-facing)
- [ ] 6.4 Create MongoDB text index on directory `name`/`services` fields
- [ ] 6.5 Implement `GET /directory/search` — keyword search fallback
- [ ] 6.6 Implement `GET /search` — unified natural-language search combining vector search over documents and directory text search
- [ ] 6.7 Test directory CRUD and search with sample department/office data
- [ ] 6.8 Frontend: build Admin directory management UI (add/edit/delete entries)
- [ ] 6.9 Frontend: build student-facing Directory list, detail view, and search bar

---

## Stage 7 — Student Dashboard
*Implements Requirement 9*

- [ ] 7.1 Implement dashboard data aggregation (profile summary, recent applications with status, recent conversations)
- [ ] 7.2 Ensure all dashboard data is scoped strictly to the logged-in student (authorization check)
- [ ] 7.3 Frontend: build Student Dashboard page — profile summary card, pending applications widget, recent conversations widget, quick-access links (Assistant, Applications, Directory)
- [ ] 7.4 Test dashboard with a seeded student account containing sample applications and conversation history

---

## Stage 8 — Admin Dashboard
*Implements Requirement 10*

- [ ] 8.1 Implement `GET /admin/stats` — basic counts (total documents, total students, total queries handled)
- [ ] 8.2 Frontend: build Admin Dashboard page — stats overview, links to document management and directory management sections
- [ ] 8.3 Enforce role check on all admin dashboard routes/components (frontend guard + backend dependency)
- [ ] 8.4 Test admin dashboard access control (student attempting access is blocked)

---

## Stage 9 — Non-Functional Hardening
*Implements Requirement 11*

- [ ] 9.1 Add input validation (Pydantic) review pass across all endpoints; ensure structured error responses
- [ ] 9.2 Add server-side error logging; verify no stack traces leak to client responses
- [ ] 9.3 Review all secrets are loaded from environment variables only; confirm `.env` is gitignored
- [ ] 9.4 Responsive design pass across Chat UI, Dashboard, Directory, Admin pages (mobile + desktop)
- [ ] 9.5 Add basic per-user rate limiting on `/assistant/query` and `/applications/generate`
- [ ] 9.6 Verify every core collection includes `university_id` and MVP data is consistently seeded with one fixed value

---

## Stage 10 — Deployment

- [ ] 10.1 Deploy backend to Render — configure environment variables, verify `/health` endpoint responds
- [ ] 10.2 Deploy frontend to Vercel — configure `VITE_API_BASE_URL`, verify build succeeds
- [ ] 10.3 Configure backend CORS to allow only the deployed Vercel origin (plus localhost for dev)
- [ ] 10.4 Run full end-to-end smoke test against deployed URLs (register → login → chat → action plan → application PDF → directory search → admin upload)
- [ ] 10.5 Document cold-start mitigation step (ping `/health` before live demo) in README

---

## Stage 11 — Demo Preparation

- [ ] 11.1 Seed database with realistic sample documents (handbook excerpt, fee policy, exam policy) for one university
- [ ] 11.2 Seed sample directory entries (Finance Office, Registrar, Examination Department, etc.)
- [ ] 11.3 Rehearse the 2–3 minute demo flow defined in the product analysis (login → problem query → action plan → generate application → PDF download → admin live upload → new source appears in citation)
- [ ] 11.4 Write README covering setup, architecture summary, and how Kiro specs guided development
- [ ] 11.5 Final Git history review — confirm commits are meaningful and map to the stages above, `.kiro/specs/` files present and unmodified post-generation
