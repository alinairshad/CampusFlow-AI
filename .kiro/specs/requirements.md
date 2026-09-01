# Requirements Document — CampusFlow AI

## Introduction

CampusFlow AI is an intelligent university companion that helps students navigate academic, administrative, and campus-related problems. Unlike a generic chatbot, it grounds every answer in verified university documents, classifies student intent, converts problems into concrete action plans, and generates ready-to-submit formal applications. The system starts as an MVP for a single university, with an architecture that anticipates future multi-university and multi-feature expansion.

This document defines the requirements for the MVP scope: AI Campus Assistant, Problem-to-Action Assistant, AI Application Generator, RAG Knowledge Base with Admin Upload, University Directory, Student Dashboard, and Admin Dashboard.

---

## Requirement 1: User Authentication & Roles

**User Story:** As a user, I want to securely register and log in with a role-appropriate account, so that I can access features relevant to me (student or admin).

### Acceptance Criteria

1. WHEN a new user registers THEN the system SHALL require name, email, password, and role selection (student).
2. WHEN a student registers THEN the system SHALL additionally collect department, semester, and batch to build their profile.
3. WHEN a user submits valid registration data THEN the system SHALL hash the password before storage and SHALL NOT store plaintext passwords.
4. WHEN a user logs in with valid credentials THEN the system SHALL issue a JWT access token scoped to their role.
5. WHEN a user logs in with invalid credentials THEN the system SHALL reject the request with a generic error message that does not reveal whether the email or password was incorrect.
6. WHEN a request is made to a protected endpoint without a valid JWT THEN the system SHALL reject the request with a 401 Unauthorized response.
7. WHEN a student attempts to access an admin-only endpoint THEN the system SHALL reject the request with a 403 Forbidden response.
8. IF an admin account is created THEN the system SHALL restrict admin account creation to a controlled process (seed script or existing-admin invitation), not open self-registration.

---

## Requirement 2: University Knowledge Base & Admin Document Upload

**User Story:** As an admin, I want to upload and manage official university documents, so that the AI Campus Assistant can answer student questions with verified information.

### Acceptance Criteria

1. WHEN an admin uploads a document THEN the system SHALL accept PDF, DOCX, and TXT formats only, and SHALL reject other formats with a clear error.
2. WHEN a document is uploaded THEN the system SHALL require the admin to tag it with a category (e.g., Fees, Examination, Scholarship, Registration, Academic Policy, Department Info, FAQ).
3. WHEN a document is successfully uploaded THEN the system SHALL extract its text content, split it into chunks, generate embeddings for each chunk, and store the chunks with their embeddings and source metadata in the vector store.
4. IF text extraction fails for an uploaded file (e.g., corrupted or unreadable file) THEN the system SHALL notify the admin of the failure and SHALL NOT create partial/incomplete chunks.
5. WHEN an admin views the document library THEN the system SHALL display all uploaded documents with title, category, upload date, and uploader.
6. WHEN an admin deletes a document THEN the system SHALL remove the document record and all associated chunks/embeddings from the vector store.
7. WHEN chunks are created from a document THEN each chunk SHALL retain a reference back to its source document so that future answers can cite it.
8. WHEN a document is uploaded THEN the system SHALL associate it with a `university_id` so the schema supports multiple universities in the future.

---

## Requirement 3: AI Campus Assistant (RAG-based Q&A)

**User Story:** As a student, I want to ask natural-language questions about university policies and procedures, so that I get accurate, source-backed answers instead of guessing or searching manually.

### Acceptance Criteria

1. WHEN a student submits a question THEN the system SHALL embed the query and retrieve the most relevant document chunks from the vector store.
2. WHEN relevant chunks are retrieved above a defined relevance-score threshold THEN the system SHALL generate an answer using only the retrieved context.
3. WHEN the system generates an answer THEN it SHALL display the source document(s) the answer was derived from alongside the answer.
4. IF no retrieved chunks meet the relevance-score threshold THEN the system SHALL respond that verified information could not be found, and SHALL NOT fabricate an answer.
5. WHEN generating an answer THEN the system prompt SHALL explicitly instruct the LLM to answer only from provided context and to avoid speculation.
6. WHEN a student asks a follow-up question THEN the system SHALL use recent conversation history to maintain context for query understanding.
7. WHEN a student's query is ambiguous or short THEN the system SHALL apply query rewriting before retrieval to improve search relevance.
8. WHEN an answer is generated THEN the system SHALL persist the conversation (query, answer, sources) to the student's conversation history.

---

## Requirement 4: AI Intent Classification

**User Story:** As the system, I want to automatically classify a student's query into a category, so that I can route it to the correct downstream logic (knowledge answer vs. action plan vs. application).

### Acceptance Criteria

1. WHEN a student submits a query THEN the system SHALL classify it into one of the defined categories: Academic, Finance, Registration, Examination, Scholarship, IT Support, Administration, Campus Life, Hostel, Transport, or Other.
2. WHEN a query is classified THEN the system SHALL also determine whether it is a factual question, a problem/complaint, or an application request.
3. WHEN classification confidence is low THEN the system SHALL default to treating the query as a general knowledge question (safest fallback).
4. WHEN a query is classified THEN the classification result SHALL be used to route the request to the appropriate pipeline (RAG answer, Problem-to-Action, or Application Generator) without requiring the student to manually select a mode.

---

## Requirement 5: Problem-to-Action Assistant

**User Story:** As a student facing a real administrative problem, I want the system to understand my situation and tell me exactly what to do, so that I don't have to figure out the right department or process myself.

### Acceptance Criteria

1. WHEN a student describes a problem THEN the system SHALL identify the relevant category/categories (e.g., Finance + Registration).
2. WHEN a problem is understood THEN the system SHALL retrieve relevant policy context from the knowledge base to ground its recommendation.
3. WHEN generating a response THEN the system SHALL identify the correct department or office responsible for resolving the issue.
4. WHEN generating a response THEN the system SHALL list the documents required to resolve the issue, if applicable.
5. WHEN generating a response THEN the system SHALL provide clear, ordered, step-by-step actions the student should take.
6. WHEN generating a response THEN the system SHALL highlight a single recommended "next action" distinct from the full step list.
7. IF the knowledge base has no grounded information relevant to the problem THEN the system SHALL state that it could not find verified guidance rather than inventing a process.
8. WHEN the response is generated THEN the system SHALL offer the student a direct option to generate a related formal application if applicable (e.g., a fee extension letter for a fee-related problem).

---

## Requirement 6: AI Application Generator

**User Story:** As a student, I want the system to generate a formal, ready-to-submit application based on my situation, so that I don't have to write it myself from scratch.

### Acceptance Criteria

1. WHEN a student requests an application THEN the system SHALL support at minimum: fee extension, leave request, course withdrawal, transcript request, scholarship request, department transfer, and exam-related request types.
2. WHEN generating an application THEN the system SHALL pre-fill relevant details from the student's profile (name, department, semester, batch) and the conversation context.
3. WHEN generating an application THEN the system SHALL use grounded policy/deadline information from the knowledge base where relevant (e.g., correct office name, applicable deadline) rather than inventing details.
4. WHEN an application is generated THEN the system SHALL display it to the student in an editable text form before finalizing.
5. WHEN a student finalizes an application THEN the system SHALL allow the student to copy the text directly.
6. WHEN a student finalizes an application THEN the system SHALL allow the student to download it as a PDF.
7. WHEN an application is generated THEN the system SHALL save a record of it (type, content, timestamp, student) to the student's application history.
8. IF required information is missing to generate a complete application (e.g., no reason provided) THEN the system SHALL ask the student a clarifying question before generating the final document.

---

## Requirement 7: University Directory

**User Story:** As a student, I want to look up university departments and offices with their location, timings, contact, and services, so that I know where to go and when.

### Acceptance Criteria

1. WHEN an admin adds a department/office entry THEN the system SHALL require name, location (building/room description), working hours, contact information, and a list of services offered.
2. WHEN a student views the University Directory THEN the system SHALL display all department/office entries in a browsable list.
3. WHEN a student searches the directory THEN the system SHALL support keyword search across name, services, and description fields.
4. WHEN a student views a single directory entry THEN the system SHALL display all its details (location, hours, contact, services) in full.
5. WHEN an admin edits or removes a directory entry THEN the changes SHALL be reflected immediately in student-facing views.
6. WHEN directory data is modeled THEN the schema SHALL be structured to allow an interactive map view to be added later without requiring a data model change (e.g., optional coordinate fields may exist but are not required for MVP).

---

## Requirement 8: Smart University Search

**User Story:** As a student, I want to search across university information using natural language, so that I can find relevant offices, policies, or documents without knowing exact keywords.

### Acceptance Criteria

1. WHEN a student enters a search query THEN the system SHALL search across knowledge base documents and directory entries.
2. WHEN search results are returned THEN the system SHALL rank them by semantic relevance rather than exact keyword match alone.
3. WHEN a search result is a document chunk THEN the system SHALL link back to the source document.
4. WHEN a search result is a directory entry THEN the system SHALL show a summary (name, category, one-line service description) with a link to full details.
5. IF no relevant results are found THEN the system SHALL clearly indicate no results were found rather than showing irrelevant matches.

---

## Requirement 9: Student Dashboard

**User Story:** As a student, I want a single dashboard summarizing what matters to me, so that I can quickly access the tools and information I need.

### Acceptance Criteria

1. WHEN a student logs in THEN the system SHALL display a dashboard showing their profile summary, pending applications, and quick-access links to the AI Assistant, Application Generator, and University Directory/Search.
2. WHEN a student has generated applications THEN the dashboard SHALL show their status (e.g., generated, downloaded).
3. WHEN a student has recent conversations THEN the dashboard SHALL provide quick access to resume or view recent AI Assistant interactions.
4. WHEN the dashboard loads THEN all data displayed SHALL belong only to the logged-in student (no cross-user data leakage).

---

## Requirement 10: Admin Dashboard

**User Story:** As an admin, I want a simple dashboard to manage university data, so that the knowledge base and directory stay accurate and useful.

### Acceptance Criteria

1. WHEN an admin logs in THEN the system SHALL display an admin dashboard with sections for document management and directory management.
2. WHEN an admin views the dashboard THEN the system SHALL show basic usage statistics (total documents, total students, total queries handled).
3. WHEN an admin performs an upload, edit, or delete action THEN the system SHALL confirm the action succeeded or clearly report the error.
4. WHEN an admin accesses any admin dashboard feature THEN the system SHALL verify the user's role is admin before rendering data or allowing actions (enforced both frontend and backend).

---

## Requirement 11: Non-Functional Requirements

**User Story:** As a stakeholder (student, admin, or hackathon judge), I want the system to be reliable, secure, and maintainable, so that it functions as a credible real-world product.

### Acceptance Criteria

1. WHEN any API endpoint is called THEN the system SHALL validate input data and return clear, structured error messages for invalid input.
2. WHEN an unexpected error occurs THEN the system SHALL log the error server-side and SHALL NOT expose internal stack traces to the client.
3. WHEN the backend is deployed THEN sensitive configuration (API keys, database URIs, JWT secrets) SHALL be stored in environment variables, not in source code.
4. WHEN the frontend is built THEN it SHALL be responsive across desktop and mobile viewport sizes.
5. WHEN data models are designed THEN every core collection SHALL include a `university_id` field to support future multi-university expansion without schema migration.
6. WHEN the system is deployed THEN the frontend SHALL be hosted on Vercel and the backend on a free-tier platform (e.g., Render), both accessible via public URLs.
7. WHEN LLM-generated content is produced (answers, action plans, applications) THEN the system SHALL never present fabricated university-specific facts (deadlines, fees, policies) that are not grounded in retrieved source documents.

---

## Requirement 12: University Societies

**User Story:** As a student, I want to discover university societies — their purpose, how to join, and who to contact — so that I can find extracurricular activities that match my interests without needing to ask around.

### Acceptance Criteria

1. WHEN an admin creates a society entry THEN the system SHALL require name, category (Tech, Sports, Literary, Arts, Social Welfare, Cultural, or Other), description, how-to-join instructions, and contact email.
2. WHEN an admin creates a society entry THEN the system SHALL optionally accept a social media link and faculty advisor name.
3. WHEN a student views the Societies section THEN the system SHALL display all society entries in a browsable list, grouped or filterable by category.
4. WHEN a student views a single society entry THEN the system SHALL display all its details (category, description, how to join, contact email, social media link if present, faculty advisor if present) in full.
5. WHEN a student searches the societies list THEN the system SHALL support keyword search across society name, description, and category fields.
6. WHEN an admin edits or removes a society entry THEN the changes SHALL be reflected immediately in student-facing views.
7. WHEN society data is stored THEN the system SHALL associate each entry with a `university_id` so the schema supports future multi-university use without migration.
8. WHEN a student views society contact information THEN the system SHALL display it as-is for direct outreach — there is no in-app join or registration flow; students contact the society directly.

---

## Requirement 13: Senior-Junior Mentorship Directory

**User Story:** As a junior student, I want to find senior students who are available as mentors so that I can reach out to someone experienced in my department or area of interest for peer guidance.

### Acceptance Criteria

1. WHEN a student views their profile THEN the system SHALL display a toggle indicating whether they are available as a mentor, defaulting to off.
2. WHEN a student enables their mentor availability THEN the system SHALL update their profile immediately with no additional verification step required — the student's registered university account serves as their identity verification.
3. WHEN a student disables their mentor availability THEN they SHALL no longer appear in mentor listings immediately.
4. WHEN a student browses the Mentors section THEN the system SHALL display all students who have enabled mentor availability, showing name, department, semester, batch, interests, and contact email.
5. WHEN a student searches the Mentors section THEN the system SHALL support filtering by department and keyword search across name and interests fields.
6. WHEN a student views a mentor's listing THEN the system SHALL display the mentor's contact email for direct outreach — there is no in-app messaging or matching flow; the browsing student contacts the mentor directly.
7. WHEN mentor data is displayed THEN the system SHALL pull it from existing `student_profiles` and `users` data — no new collection is required.
8. WHEN the system displays mentor listings THEN it SHALL scope the results by `university_id` so students only see mentors from their own university.
9. WHEN an unauthenticated request is made to the mentor listing or search endpoints THEN the system SHALL reject the request with 401 Unauthorized — mentor listings are student-auth-required (not public) to protect student contact information from being freely crawled.

---

## Requirement 14: Student Dashboard Visual Redesign

**User Story:** As a student, I want the dashboard to feel like it belongs to LGU — not a generic SaaS product — so that it reflects the university's institutional identity.

### Acceptance Criteria

1. WHEN a student views the dashboard THEN the Profile card SHALL be restyled as an "ID card" motif with a solid LGU green accent bar along the top edge and an LGU crest or seal mark in a corner; all existing content (avatar, name, email, Dept/Semester/Batch tags, mentor toggle, member-since date) SHALL remain intact and functional.
2. WHEN a student views the quick-access section THEN the uniform shadow-cards for Assistant, Applications, Directory, Societies, and Mentors SHALL be replaced with a list-tile layout — left-aligned icon, label, and description per row, separated by hairline dividers, with icons in sage-green (#E8EDE4) backgrounds and LGU green icon colour.
3. WHEN a student hovers over a quick-access tile THEN the tile SHALL show a subtle green background tint with no drop shadow, replacing the current shadow-on-hover behaviour.
4. WHEN the redesigned dashboard is viewed on mobile THEN the layout SHALL remain fully responsive; the tile list SHALL stack single-column naturally.
5. WHEN the dashboard redesign is applied THEN it SHALL be a visual-only change — all existing navigation, click behaviour, data loading, mentor toggle, and link destinations SHALL remain exactly as before.
6. WHEN the primary colour palette is applied THEN it SHALL use LGU green (#1B5E20) and white as the core palette, consistent with the rest of the application.
