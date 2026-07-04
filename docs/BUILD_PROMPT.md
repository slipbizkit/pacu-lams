Build the PACU Information System per CLAUDE.md and the agents/ playbooks in this repo.
Use the fullstack agent's 7-step order (DB → backend types → service → controller/route →
frontend types → frontend service → UI) for every feature. Route schema/migration work
through the database agent's conventions (snake_case, idx_{table}_{col} naming, updated_at
triggers, migrations in db/migrations/NNN_description.sql).

## Purpose
Digitize DOLE PACU's walk-in legal assistance intake, consultation, and referral process,
replacing the manual logbook and paper referral form.

## UI Foundation & Theming
Base the frontend on the **Volt React Dashboard** template (Bootstrap 5 admin dashboard):
sidebar navigation, top navbar, card-based dashboard widgets, data table patterns. Adapt
its layout/components to PACU's screens rather than building layout primitives from scratch.

The app has 3 themes, all switchable from the navbar and persisted to localStorage
(`pacu-theme` key, values `light` | `soft-light` | `dark`). Implement as CSS custom
properties (Bootstrap CSS variable overrides) scoped per `data-theme` attribute on `<html>`
or `<body>`, so components don't need theme-conditional logic.

### Light (default)
- Background: cool gray `#f1f5f9`
- Surface/cards: pure white `#ffffff`
- Text: dark slate scale `#0f172a` → `#94a3b8`
- Borders: light gray `#e2e8f0`

### Soft Light
- Background: warm ivory/parchment `#f7f1e1`
- Surface/cards: cream `#fffcf2`
- Text: warm brown scale `#3a2f1e` → `#a6926a`
- Borders: warm tan `#e0d0a8`
- Designed to feel like "paper" — every value carries a subtle yellow undertone.

### Dark
- Background: deep navy `#0f172a`
- Surface/cards: dark slate `#1e293b`
- Text: light slate scale `#f8fafc` → `#475569`
- Borders: muted slate `#334155`

Theme switcher: a dropdown or 3-way toggle in the navbar (icon-based is fine — sun /
paper / moon). On load, read `pacu-theme` from localStorage and apply before first paint
(or accept a brief flash) to avoid a jarring theme pop-in.

## Actors & Roles
- Client — no account, never authenticates. Fills out one open, unauthenticated intake
  screen (runs on whatever device is set up at the intake area — typically a laptop, not
  dedicated kiosk hardware). PACU personnel may physically help a client type or read the
  form on request, but never logs into their own account to do it — there is no separate
  "personnel-assisted" authenticated entry mode. `encoded_by` is always null.
- PACU Personnel (users.role = 'personnel') — assists intake, manages the queue, assigns
  clients to an available lawyer.
- PACU Lawyer (users.role = 'lawyer') — claims waiting clients from the queue (or receives
  a personnel assignment), reviews client info, conducts consultation, tags issues, records
  legal advice and referral, completes the transaction (or saves it as incomplete to
  finish later).
- Administrator (users.role = 'admin') — manages users, issue categories, referral offices,
  and generates reports.

Auth: JWT + bcryptjs + speakeasy TOTP 2FA, per CLAUDE.md conventions. Only the three
PACU roles above authenticate — no client-facing login.

**2FA is mandatory for every account, enforced from first login — there is no
password-only path.** Accounts are always admin-created (username + temporary password,
`totp_enabled = false`); self-registration doesn't exist. On first login, `/auth/login`
detects `totp_enabled = false` and returns `{ requiresTOTPSetup: true, tempToken }` instead
of an access token. The frontend routes to a forced setup screen that calls
`/auth/totp/setup-init` (QR + secret) then `/auth/totp/setup-confirm` (6-digit code) —
only on success does the backend set `totp_enabled = true` and issue a real access token.
Subsequent logins with `totp_enabled = true` use the existing `requiresTOTP` /
`/auth/verify-totp` path. Losing a 2FA device means an admin resets the account
(`totp_enabled = false`, clear `totp_secret`), which routes the user through forced setup
again on next login — 2FA can be reset, never permanently bypassed.

## Workflow (implement as the client's status progression)
1. Client arrives and fills out the open intake screen themselves (personnel may help
   physically if asked, without logging in) → status: 'waiting'
2. System generates a queue number, sequential and UNIQUE PER DAY (not globally unique —
   reset the sequence at local midnight; use a dedicated counter, not MAX()+1 under
   concurrent kiosk submissions).
3. Priority flags (is_senior, is_pwd, is_pregnant) are captured at intake; priority clients
   are shown ahead of regular clients in the queue view, not literally reordered in the DB.
4. A client is assigned to a lawyer one of two ways, both resulting in status: 'assigned':
   - Personnel assigns a waiting client to a specific available lawyer, OR
   - A signed-in lawyer self-claims ("Take Next") a waiting client from the queue.
   Either path enforces the same priority-queue rule (see Business Rules): a regular
   (non-priority) client cannot be claimed/assigned while any priority client is still
   'waiting'.
5. Lawyer reviews client info, conducts consultation → status: 'in_progress'
6. Lawyer opens the "Complete Transaction" modal — the single place where the rest of the
   consultation is recorded:
   - Tags one or more issue categories (client_issues, many-to-one to clients; 'Others'
     reveals a free-text field).
   - Records legal_advice in a multi-line textbox.
   - Optionally sets referral: office (referred_office_id) + referred_reason together —
     referral is optional, but if one is set both are required.
   - Checks "Mark as incomplete" if the case isn't ready to close (e.g. still gathering
     info, waiting on the client). Saving with this checked keeps status at 'in_progress'
     and keeps the transaction on the lawyer's active list to reopen and finish later —
     nothing here has to be filled out in one sitting.
7. Saving without "Mark as incomplete" checked requires legal_advice and at least one
   tagged issue, and sets status: 'completed'. Optionally capture feedback_rating /
   feedback_comments from the client at this point (simple 1–5 rating + comment box on an
   unauthenticated confirmation screen).

## Data Model
Build these tables (adjust the schema notes below into the migrations):

users: user_id PK, username UNIQUE, password_hash, first_name, middle_name, last_name,
  position, role ENUM('admin','lawyer','personnel'), is_active, created_at, updated_at

clients: client_id PK, reference_no UNIQUE, queue_number, transaction_date,
  first_name, middle_name, last_name, suffix, sex, birth_date, civil_status,
  contact_no, email, address, city, province, occupation, employer,
  is_pwd, is_senior, is_pregnant,
  assigned_lawyer_id FK -> users.user_id (nullable until assigned),
  legal_advice, referred_office_id FK -> referred_offices.office_id (nullable),
  referred_reason,
  feedback_rating, feedback_comments,
  status ENUM('waiting','assigned','in_progress','completed') DEFAULT 'waiting',
  encoded_by FK -> users.user_id (always null — intake has no authenticated entry path;
    column kept nullable in case that ever changes, but Phase 2 never writes to it),
  created_at, updated_at

issue_categories: category_id PK, category_group (e.g. 'Wages', 'Social Welfare Benefits',
  'Leave Benefits', 'Kinds of Employment', 'Termination of Employment',
  'Management Prerogative', 'Conditions of Employment', 'Others'),
  category_name (e.g. 'Delay', 'SSS', 'Resignation'), description, is_active
  — seed with the full category list from the business requirements; 'Others' allows
  free-text via client_issues.issue_description.

client_issues: client_issue_id PK, client_id FK -> clients.client_id,
  category_id FK -> issue_categories.category_id, issue_description (nullable, required
  when category_group/category_name is 'Others')

referred_offices: office_id PK, office_name, office_type, is_active

Relationships: users (1)—(*) clients [assigned_lawyer_id, encoded_by];
clients (1)—(*) client_issues; issue_categories (1)—(*) client_issues;
referred_offices (1)—(*) clients.

## Business Rules / Constraints
- One client record = one legal assistance transaction (no attachments).
- A transaction may carry multiple tagged issues.
- Queue number is sequential and unique per day.
- Referral is optional; when present, both office and reason are required together.
- Issue categories and referral offices are admin-configurable master tables (soft-disable
  via is_active, never hard-delete rows referenced by existing transactions).
- Priority queue enforcement: a lawyer cannot claim/be assigned a regular (non-priority)
  'waiting' client while one or more priority clients (is_senior OR is_pwd OR is_pregnant)
  are still 'waiting'. Enforce this server-side in the claim/assign endpoint (return 409 if
  violated), not just as UI sort order — concurrent lawyers must not be able to bypass it by
  picking a specific client directly.
- Clients never authenticate; only PACU personnel/lawyers/admins do. Intake itself has no
  authenticated variant — personnel assistance at the intake screen is always informal
  (physical help, no login), never a separate tracked entry mode.
- Client PII (names, contact info, case narrative in concern/legal_advice) must never be
  logged, printed to console, or included in commit messages/seed data — use synthetic data
  only, per CLAUDE.md.

## Features to Build (in this order)

### Phase 1 — Foundation
- Vite/React/TS frontend scaffold based on the Volt React Dashboard layout (sidebar +
  navbar shell, theme switcher wired to the 3 themes above), Express/TS backend scaffold,
  per CLAUDE.md folder conventions.
- Neon connection (db/migrations/, migration runner per database-agent.md).
- All 5 tables + indexes + updated_at triggers.
- Auth: login, JWT issue/refresh, speakeasy TOTP enrollment + verification, bcryptjs hashing.
- Seed script: one admin user (synthetic credentials, never real names).

### Phase 2 — Intake & Queue
- One public, unauthenticated intake screen (personal info, concern, priority flags) —
  this is the only intake path; there is no separate authenticated/personnel variant.
  Runs on whatever device is at the intake area (laptop in practice). On submit, generates
  queue_number + reference_no, status='waiting', encoded_by stays null.
- Personnel queue dashboard: list of 'waiting' clients, priority clients visually surfaced
  first, "Assign to Lawyer" action (select an active lawyer) → status='assigned'. Backend
  rejects the assignment (409) if it would skip a still-waiting priority client.

### Phase 3 — Lawyer Console
- Queue view for lawyers: 'waiting' clients, priority clients surfaced first, "Take Next
  Client" action that claims the top-priority-eligible waiting client (or a specific one —
  backend still enforces the priority rule either way) → status='assigned',
  assigned_lawyer_id = self. Reuses the same atomic claim/assign endpoint from Phase 2.
- "My Clients" list: clients assigned to the signed-in lawyer with status in
  'assigned'/'in_progress' — this is where incomplete transactions reappear to be finished.
- **Complete Transaction modal** — opened from a client row, this is the only place the
  rest of the consultation is recorded (there is no separate full-page consultation form,
  and no action_taken/remarks fields — those were dropped from the plan). Contains:
  - Issue category tagging (multi-select, grouped by category_group, 'Others' reveals a
    free-text field)
  - Legal advice — multi-line textbox
  - Referral — office select + reason, optional but required together when set
  - "Mark as incomplete" checkbox
  - Saving with the checkbox **checked**: relaxed validation (nothing required), status
    stays 'in_progress', modal closes, client stays on "My Clients" to reopen later —
    this is a save-as-draft, not a dead end.
  - Saving **unchecked**: requires legal_advice and at least one tagged issue, status
    becomes 'completed'. Confirm via SweetAlert2 before finalizing (destructive/final
    action per CLAUDE.md) since completing can't be undone from this screen.
- No PDF generation in this phase — the system-generated referral form is built in
  Phase 5, once referred_office_id/referred_reason data actually exists to render.

### Phase 4 — Admin
- User management: CRUD, role assignment, activate/deactivate (soft, never hard-delete).
- Issue category management: CRUD, group + name, is_active toggle.
- Referral office management: CRUD, is_active toggle.
- Reports: filter by date range, lawyer, issue category, referral office, sex, age,
  city/province, priority-client flags, status. Export to PDF and Excel.

### Phase 5 — Feedback & Referral PDF
- Post-completion, unauthenticated feedback capture (rating 1–5 + comment) tied to
  reference_no, writes to clients.feedback_rating/feedback_comments.
- System-generated referral form (PDF), available whenever a client has
  referred_office_id/referred_reason set. Printable from the lawyer's client view
  (and/or the admin reports view) — office name, referral reason, client name/reference_no,
  and the tagged issues, laid out as a standalone document PACU staff can hand to the
  client or file. Pick a Node PDF library (e.g. pdf-lib or pdfkit) per the backend agent's
  conventions; generate on-demand via an authenticated endpoint rather than storing
  generated files.

## Conventions to Follow (already defined in this repo)
- Status codes, error shape { message }, SweetAlert2 patterns, env var naming, TS strict
  mode: see CLAUDE.md.
- Feature build order, file structure, service/controller/route split: see
  agents/fullstack-agent.md.
- Migration naming, Neon query patterns, indexing: see agents/database-agent.md.
- Auth/JWT/2FA specifics: see agents/auth-agent.md.
- Deploy/env/CORS specifics: see agents/devops-agent.md.

Start with Phase 1 and confirm the schema (including the ENUM/status/queue-numbering
decisions above) before generating migrations.
