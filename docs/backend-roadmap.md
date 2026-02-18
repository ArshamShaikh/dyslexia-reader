# Backend Options and Production Roadmap (Team Share)

## 1) Purpose
This document defines backend choices and a production roadmap for Dyslexia Reader.
It is written for implementation planning with the current app and feature set.

## 2) Current App State
Client (Expo React Native) already supports:
1. Typed and pasted text reading.
2. Saved files in app flow.
3. TTS, highlighting, themes, dyslexia-friendly typography.
4. Imports for `.txt`, `.docx`, `.pdf`, and image OCR via backend.

Current backend (`server/index.js`) already has:
1. `POST /ocr`, `POST /pdf`, `POST /docx`.
2. `GET /health`.
3. `GET /jobs/:jobId` for async OCR status.
4. `POST /events/client-error` for client-side telemetry.
5. Size limits and text limits via env (`MAX_UPLOAD_MB`, `MAX_EXTRACTED_TEXT_CHARS`).
6. Optional API token auth (`API_ACCESS_TOKEN`).
7. Basic in-memory rate limiting (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`).
8. Optional scanned PDF fallback via Google Vision + Cloud Storage buckets.

Current gap to production:
1. No persistent auth/session model across users.
2. In-memory job tracking is not durable across restarts.
3. No durable relational data layer for users/schools/analytics.
4. No production-grade queue, audit trail, or incident visibility.

## 3) What "Production-Grade" Means for This App
1. Multi-user reliability for schools and classrooms.
2. Durable storage and repeatable extraction pipeline.
3. Secure authentication and tenant separation.
4. Recovery from failures without losing job state.
5. Monitoring, alerting, and incident response readiness.
6. Compliance-ready data handling for student environments.

## 4) Platform Options

### Option A: Supabase + Cloud Run OCR (Recommended)
Summary:
1. Supabase for Auth, Postgres, Storage metadata, Row Level Security (RLS).
2. Keep extraction/OCR service as dedicated Node worker/API on Cloud Run.
3. Use queue for OCR/doc jobs (Cloud Tasks, Pub/Sub, or Redis queue).

Pros:
1. Fastest path from current state to real production.
2. SQL model is easy for document, settings, and class-level reporting.
3. Strong per-user and per-school access controls via RLS.
4. Keeps heavy OCR logic separate from app data and auth.

Cons:
1. Two platforms to operate (Supabase and GCP).
2. Team must learn RLS rules well to avoid accidental data exposure.
3. Requires clear API ownership boundaries to avoid coupling.

Best use case:
1. Small team shipping quickly with strong data model and moderate scale.

### Option B: Firebase + Cloud Run OCR
Summary:
1. Firebase Auth + Firestore + Cloud Storage for app data.
2. Cloud Run for extraction/OCR pipeline.

Pros:
1. Very easy mobile integration.
2. Strong offline and sync behavior for app-facing data.
3. Good managed experience for auth and notifications.

Cons:
1. Firestore data modeling can become complex for analytics/reporting.
2. Query flexibility is weaker than SQL for evolving school requirements.
3. Heavy OCR jobs still need separate service and queue.

Best use case:
1. Teams optimized for mobile sync features over relational reporting.

### Option C: Full GCP Stack
Summary:
1. Firebase Auth or Identity Platform.
2. Cloud SQL Postgres + Cloud Run API + GCS + Pub/Sub/Tasks.
3. All infra in one cloud.

Pros:
1. Strong long-term control and consistency.
2. Excellent fit with existing Google Vision OCR flow.
3. Easier enterprise governance with one-cloud setup.

Cons:
1. Highest setup and operations complexity.
2. Slower early velocity for a small team.
3. Requires stronger DevOps ownership from day one.

Best use case:
1. Teams already comfortable with GCP operations at scale.

### Option D: Single Custom Node Backend (Render/Railway/VPS + Postgres)
Summary:
1. One Node backend handles auth, data, and extraction.

Pros:
1. Simple mental model and one deployable service.
2. Lower initial architecture complexity.

Cons:
1. Harder to scale reliably when OCR jobs spike.
2. Greater maintenance burden on a small team.
3. More work for security, backups, and queue durability.

Best use case:
1. Short-term prototype with low concurrent usage.

## 5) Comparison Matrix

| Criteria | Supabase + Cloud Run | Firebase + Cloud Run | Full GCP | Single Node |
|---|---|---|---|---|
| Build speed | High | High | Medium | High |
| Long-term scalability | High | High | Very high | Medium |
| Data/reporting flexibility | High | Medium | High | High |
| Operational complexity | Medium | Medium | High | Medium |
| Best fit for current app | Very strong | Strong | Strong | Medium |

## 6) Recommended Direction
Choose Option A: Supabase + Cloud Run OCR.

Reason:
1. It keeps your existing extraction pipeline investment.
2. It adds production data/auth quickly without overbuilding infra.
3. It supports future school-level features (roles, classes, analytics).

## 7) Target Architecture (Recommended)

Core services:
1. Mobile app (Expo).
2. Supabase Auth (sign in, token issuance, session handling).
3. Supabase Postgres (documents, settings, jobs, user progress).
4. Supabase Storage or GCS for source files and cleaned outputs.
5. Cloud Run API for extraction orchestration.
6. Worker service for OCR/doc processing.
7. Durable queue for heavy jobs.
8. Central logging and alerting stack.

Request flow:
1. App authenticates with Supabase and receives JWT.
2. App uploads file metadata record and requests extraction.
3. API enqueues work and returns `jobId`.
4. Worker performs extraction/OCR and writes normalized text.
5. Job status updates are stored in DB and returned to app.
6. App loads result and opens reader with source badge and metadata.

## 8) Data Model (Initial)
Proposed core tables:
1. `profiles` for user profile and role metadata.
2. `schools` for tenant/school scope.
3. `memberships` linking users to schools and roles.
4. `documents` for uploaded file metadata and ownership.
5. `document_pages` or `document_chunks` for extracted text segments.
6. `extraction_jobs` for lifecycle and debug data.
7. `reader_settings` for synced accessibility settings.
8. `bookmarks` for saved locations in documents.
9. `reading_sessions` for anonymized usage analytics (optional).

RLS policy baseline:
1. Users can only access records in their tenant/school.
2. Staff roles can access school-scoped shared content.
3. Service role can process jobs and write extraction outputs.

## 9) Delivery Roadmap (Production Plan)

### Phase 0: Architecture Freeze (2 to 4 days)
Deliverables:
1. Decide stack officially (Supabase + Cloud Run OCR).
2. Define API boundaries and ownership.
3. Define environment strategy (`dev`, `staging`, `prod`).
4. Define secrets management strategy.

Exit criteria:
1. Architecture diagram approved by team.
2. Environment variable inventory approved.

### Phase 1: Identity and Data Foundation (1 to 2 weeks)
Deliverables:
1. Supabase project setup with auth providers.
2. Core schema and migration scripts.
3. Baseline RLS policies.
4. App auth flow integrated and tested.

Exit criteria:
1. Authenticated user can create and fetch only own records.
2. Unauthorized access attempts are blocked by RLS.

### Phase 2: Durable Extraction Pipeline (1 to 2 weeks)
Deliverables:
1. Move in-memory job state to DB + queue.
2. Worker retries with backoff and error classification.
3. Idempotency key per upload to avoid duplicate billing/processing.
4. OCR fallback status and partial-progress reporting.

Exit criteria:
1. Restarting API or worker does not lose active jobs.
2. Failed jobs can be retried without duplicate records.

### Phase 3: Saved Data and Cross-Device Sync (1 week)
Deliverables:
1. Migrate saved items to cloud-backed file list.
2. Sync settings and reading position across devices.
3. Add conflict-safe updates and offline replay strategy.

Exit criteria:
1. User can sign in on second device and continue reading.
2. No duplicate saved records for same logical file.

### Phase 4: Observability and Security Hardening (1 week)
Deliverables:
1. Structured logs with request IDs and job IDs.
2. Metrics dashboards for error rate, latency, queue depth, OCR duration.
3. Alert policies for extraction failures and high latency.
4. API abuse controls and token rotation runbook.

Exit criteria:
1. On-call can identify root cause from logs/metrics in minutes.
2. Alert noise is acceptable and actionable.

### Phase 5: Compliance and Launch Hardening (1 to 2 weeks)
Deliverables:
1. Backup and restore drills for DB/storage.
2. Data retention policy and deletion workflow.
3. Privacy policy, terms, and school-facing documentation.
4. Load tests using realistic school workloads.

Exit criteria:
1. System passes agreed SLO targets.
2. Rollback and incident playbooks tested.

## 10) DevOps and Release Strategy
1. Maintain separate `dev`, `staging`, `prod` deployments.
2. Use migration-based schema changes only.
3. Require staging verification before production deploy.
4. Tag releases and keep rollback-ready images.
5. Run extraction quality suite in CI for every backend change.

## 11) Suggested Team Ownership
1. Backend lead: API, queue, worker pipeline.
2. Data lead: schema, RLS, migrations, backup strategy.
3. Mobile lead: auth flow, sync UX, offline behavior.
4. QA lead: extraction quality tests, load tests, release checks.
5. DevOps owner: deploy pipeline, monitoring, secrets management.

## 12) Risk Register and Mitigations
1. OCR cost spikes.
Mitigation: page caps, caching by file hash, usage alerts, retry policy.
2. Queue backlog during school peaks.
Mitigation: autoscaling workers, queue metrics, priority classes.
3. Data leakage risk in multi-tenant setup.
Mitigation: strict RLS tests, deny-by-default policies, security review gates.
4. Large document performance issues.
Mitigation: chunk storage, progressive loading, server-side text caps.
5. Vendor lock-in concerns.
Mitigation: clear domain boundaries and data export tooling.

## 13) Decision Checklist (Team Meeting)
1. Confirm primary stack choice.
2. Confirm auth model and user roles.
3. Confirm tenant model (school-first vs user-first).
4. Confirm storage location strategy (Supabase Storage vs GCS split).
5. Confirm queue choice for OCR jobs.
6. Confirm SLO and launch acceptance criteria.

## 14) Immediate Next Steps (This Week)
1. Approve this architecture in team meeting.
2. Create Supabase project and initial schema migrations.
3. Add JWT verification middleware to extraction API.
4. Design `extraction_jobs` persistence model and queue handoff.
5. Stand up staging environment and smoke tests.
