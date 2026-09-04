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

---

## Stage 12 — University Societies
*Implements Requirement 12*

- [ ] 12.1 Define `Society` Pydantic model and response shapes (`SocietyInDB`, `SocietyCreateRequest`, `SocietyUpdateRequest`, `SocietyResponse`, `SocietyListItem`, `SocietyListResponse`) following the `DepartmentOffice` model pattern from Stage 6
- [ ] 12.2 Implement `POST/PUT/DELETE /admin/societies` endpoints (admin-only), extend `_create_indexes` in `mongo.py` to add text index on name/description/category and compound index on university_id
- [ ] 12.3 Implement `GET /societies` (student-facing list, sorted by name) and `GET /societies/{id}` (full detail), both public/no-auth following the same pattern as `GET /directory`
- [ ] 12.4 Implement `GET /societies/search?q=` — MongoDB `$text` search across name, description, and category fields; empty query returns empty list; route declared before `/{id}` to prevent path conflict
- [ ] 12.5 Test CRUD, search, and access control with sample society data (at least one entry per category)
- [ ] 12.6 Frontend: build Admin societies management UI (`SocietyManager.jsx`) — create/edit form with all fields (name, category dropdown from enum, description, how-to-join, contact email, optional social media link and faculty advisor), entry list with edit/delete buttons, mounted as a third section in `AdminDashboardPlaceholder.jsx` following the `DirectoryManager` pattern
- [ ] 12.7 Frontend: build student-facing Societies browse page (`SocietiesPage.jsx`) — debounced search bar, category filter chips, entry cards (name, category badge, one-line description preview), click-through to full detail view; add `/societies` route to `App.jsx` (student ProtectedRoute) and a "Societies" card to `StudentDashboardPlaceholder.jsx`
- [ ] 12.8 Test full flow: admin creates societies → student browses and searches → student views full detail including optional fields (social media, faculty advisor) and contact info
- [ ] 12.9 Extend `GET /search` to include societies as a third result section (`society_results`) alongside `document_results` and `directory_results` — `$text` search over societies collection, same university_id scoping, returns `{id, name, category, description_preview}` per hit; update the "no results" message to cover all three sections

---

## Stage 13 — Senior-Junior Mentorship Directory
*Implements Requirement 13*

- [ ] 13.1 Extend `StudentProfileInDB` with `is_mentor: bool = False` field; add `is_mentor` to `StudentProfileUpdateRequest` and `StudentProfileResponse` in `models/user.py`
- [ ] 13.2 Extend `_create_indexes` in `mongo.py` to add: compound index on `student_profiles(is_mentor, university_id)` for mentor list queries, and text index on `student_profiles(name, interests)` for keyword search
- [ ] 13.3 Implement `GET /mentors` — returns all students with `is_mentor=True` scoped to `university_id`, sorted by name; requires valid student JWT (Option A — auth-required, not public, to protect student emails)
- [ ] 13.4 Implement `GET /mentors/search?q=&department=` — `$text` search across name and interests, optional exact `department` filter; same student-auth requirement; empty q + no dept returns all mentors (same as `GET /mentors`)
- [ ] 13.5 Verify `PUT /students/me` correctly persists `is_mentor` when included in the request body — no new endpoint needed, extends the existing partial-update handler
- [ ] 13.6 Test: student enables is_mentor → appears in GET /mentors → student disables → disappears; search by department and keyword both work; university_id isolation confirmed; unauthenticated request returns 401
- [ ] 13.7 Frontend: add `is_mentor` toggle to student profile — simple checkbox/toggle on the Student Dashboard or a profile card, wired to `PUT /students/me`
- [ ] 13.8 Frontend: build student-facing Mentors browse page (`MentorsPage.jsx`) — department filter dropdown, keyword search bar (debounced, 400ms), mentor cards (name, department, semester, batch, interests chips, contact email), click-through to a simple detail view or inline expand; add `/mentors` route to `App.jsx` (student ProtectedRoute) and a "Mentors" card to `StudentDashboardPlaceholder.jsx`
- [ ] 13.9 Test full flow: student A enables mentor toggle → student B (logged in) browses `/mentors` and finds student A → student B sees student A's contact email → unauthenticated access to `/mentors` returns 401

---

## Stage 14 — Student Dashboard Visual Redesign
*Implements Requirement 14*

- [ ] 14.1 Restyle `ProfileCard` as an ID-card motif: add a solid LGU green accent bar along the top edge (`h-2 bg-lgu-700 rounded-t-2xl`), add an LGU crest/seal mark in the top-right corner; all existing content (avatar, name, email, dept/semester/batch tags, mentor toggle, member-since date) unchanged
- [ ] 14.2 Replace the 3-column shadow-card grid (Assistant, Applications, Directory) with a list-tile layout: each tile is a full-width `<Link>` row with left-aligned icon circle (sage-green `#E8EDE4` background, LGU green icon), label + subtitle, right-pointing chevron, hairline `divide-y` divider between rows, wrapped in a single white rounded card
- [ ] 14.3 Replace the standalone Societies and Mentors full-width cards with the same list-tile format, consolidating all five quick-access entries into one unified tile list
- [ ] 14.4 Apply hover behaviour: `hover:bg-lgu-50` tint on the tile row, remove `hover:shadow-sm` — no drop shadow on hover
- [ ] 14.5 Verify responsiveness: tile list is single-column on mobile, looks correct at 320px–768px+ breakpoints
- [ ] 14.6 Verify all existing behaviour is preserved: all links navigate correctly, mentor toggle still works, Recent Applications and Recent Conversations widgets unchanged

---

## Stage 15 — AI Assistant Chat History Sidebar
*Implements Requirement 15*

- [ ] 15.1 Create `ConversationSidebar.jsx` in `src/features/assistant/` — presentational component accepting `conversations`, `activeConvId`, `onSelect`, `onNewChat`, `isOpen` (mobile), `onClose` props; renders "+ New Chat" button, divider-separated conversation items with truncated preview and relative timestamp, active highlight, sage-green hover, and "No conversations yet" empty state
- [ ] 15.2 Add `formatRelativeTime(dateStr)` pure helper (no external library) to `ConversationSidebar.jsx` or a shared `src/utils/time.js` — handles just-now / X min / X hours / X days / date-string cases
- [ ] 15.3 Update `ChatPage.jsx` — add `conversations`, `convLoading`, and `sidebarOpen` state; call `listConversations(token)` on mount and after each successful `sendQuery` to keep sidebar fresh; handle `onSelect` to call `getConversation`, map returned messages into local shape, set `convId`; handle `onNewChat` to reset `messages` and `convId`; add mobile hamburger icon to header
- [ ] 15.4 Wire the mobile drawer: sidebar hidden by default on `< md` breakpoints, slides in as an overlay when `sidebarOpen=true`; semi-transparent backdrop closes it on click; hamburger icon toggles it
- [ ] 15.5 Add `convLoading` guard — disable the send input and show a loading indicator in the chat area while a past conversation is being fetched; re-enable once loaded
- [ ] 15.6 Verify: open AI Assistant → sidebar shows past conversations → click one → full message history loads → send a new message → it appends to that thread → click "+ New Chat" → blank slate, new thread on next send → mobile: hamburger opens drawer, backdrop closes it

---

## Stage 16 — App-wide Pill Navbar
*Implements Requirement 16*

- [ ] 16.1 Create `src/components/Navbar.jsx` — pill-shaped floating navbar; reads `user.role` from `useAuth()` and current path from `useLocation()`; renders logo + wordmark on left, student nav links (Dashboard, Assistant, Applications, Directory, Societies) in center/left-adjacent with active-link highlight, Sign out pill-button on right; Admin role shows "Admin" badge and no nav links; all links use React Router `<NavLink>`
- [ ] 16.2 Add mobile hamburger menu to `Navbar.jsx` — hidden on `md+`; toggles a dropdown panel with all nav links + Sign out; closes on outside click/touch via `useEffect` document listener; closes on any link click
- [ ] 16.3 Remove `<header>` block from `StudentDashboardPlaceholder.jsx` and replace with `<Navbar />`; remove `logout` import usage from header (still used elsewhere if needed)
- [ ] 16.4 Remove `<header>` block from `AdminDashboardPlaceholder.jsx` and replace with `<Navbar />`
- [ ] 16.5 Remove `<header>` block from `ChatPage.jsx` (including hamburger sidebar toggle); insert `<Navbar />` as first child of the root flex-col; move sidebar hamburger trigger into `ConversationSidebar` or keep it in the sidebar header — chat layout preserved with `flex flex-1 overflow-hidden` wrapper around sidebar + chat column
- [ ] 16.6 Remove `<header>` blocks from `DirectoryPage.jsx`, `SocietiesPage.jsx`, `MentorsPage.jsx`, and `ApplicationPage.jsx`; replace each with `<Navbar />`; remove per-page back-arrow links (navbar provides full navigation)
- [ ] 16.7 Build check — `npm run build` must pass with 0 errors; verify all 7 pages compile cleanly and nav links resolve to correct routes

---

## Stage 17 — Student Dashboard Sidebar Layout Redesign
*Implements Requirement 17*

- [ ] 17.1 Create `src/features/dashboard/DashboardSidebar.jsx` — fixed left sidebar with CampusFlow AI wordmark, nav items (Dashboard, Assistant, Applications, Directory, Societies, Mentors) with SVG icons, active-link highlight via `useLocation`, Sign out at bottom; mobile overlay drawer with backdrop and slide-in animation; props: `isOpen`, `onClose`, `onSignOut`
- [ ] 17.2 Rewrite `StudentDashboardPlaceholder.jsx` with sidebar layout: full-height flex row (`DashboardSidebar` + scrollable main column), hamburger in top bar for mobile, `sidebarOpen` state
- [ ] 17.3 Add WelcomeBanner inline component: `bg-lgu-700 rounded-2xl` card, "Welcome back, {name}!", today's date formatted `toLocaleDateString`, short subtext
- [ ] 17.4 Add StatsRow inline component: two stat cards derived from `dashboard.recent_applications.length` and `dashboard.recent_conversations.length`, green icon circles
- [ ] 17.5 Add ApplicationsGrid inline component: 2-column responsive grid of application cards, each showing `type_label`, date, `StatusBadge`, "View →" link to `/applications`; empty state with CTA
- [ ] 17.6 Add MentorsPanel inline component: fires `listMentors(token)` (or reuses parent-fetched data), shows up to 3 mentor rows (avatar initial, name, department), "See all" → `/mentors`; graceful error/empty fallback
- [ ] 17.7 Add ConversationsPanel inline component: reuses existing conversation list + polished empty state (chat icon, heading, CTA button to `/assistant`)
- [ ] 17.8 Verify: sidebar highlights active link, mobile drawer opens/closes correctly, all section data renders, Navbar still works on other pages (Assistant, Directory, etc.), build passes with 0 errors

---

## Stage 18 — LGU Roll Number Format Validation
*Implements Requirement 18*

- [ ] 18.1 Add `roll_number: str` to `UserRegisterRequest` in `app/models/user.py` with a `roll_number_format` Pydantic `field_validator` using regex `^(Fa|Sp|Su)-\d{2}/[A-Z][A-Za-z\-]{1,9}/\d{1,4}-[A-Z]$`; add `roll_number: Optional[str] = None` to `StudentProfileInDB` and `StudentProfileResponse`
- [ ] 18.2 Update `POST /auth/register` in `app/routers/auth.py` to include `roll_number=body.roll_number` in `profile_doc`
- [ ] 18.3 Add Roll Number input field to `RegisterPage.jsx` (between Batch and submit button); placeholder `Fa-23/BSSE/199-D`; static format hint below the field
- [ ] 18.4 Verify: POST `/auth/register` with a valid roll number → 201; with an invalid roll number → 422 with a clear message; frontend shows the error inline; existing login flow still works
