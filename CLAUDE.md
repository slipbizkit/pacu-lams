# CLAUDE.md — PACU System

## Project Overview

PACU System is an internal case management system for DOLE's Public Assistance and Complaints Unit (PACU). It records, processes, and documents legal assistance transactions.

**Workflow:** clients self-encode via an intake kiosk or are assisted by PACU personnel → PACU lawyers document legal advice, determine referrals, record actions taken, and close the transaction.

**Data model:** one transaction per client; a transaction can carry multiple tagged legal issues for reporting/analytics.

**Access:** internal, authenticated PACU personnel only. Client data (names, case narratives, contact info) is sensitive PII — never log it, and never use real client data in examples, tests, seed data, or commit messages.

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 18, TypeScript, Vite, Bootstrap 5.3, SweetAlert2 → Vercel |
| Backend | Express, TypeScript, JWT, bcryptjs, speakeasy (TOTP 2FA) → Vercel |
| Database | Neon (serverless PostgreSQL) |

## Commands

> Not confirmed against `package.json` — verify and update once known.

- Frontend dev: `npm run dev` (Vite)
- Frontend build: `npm run build`
- Backend dev: `npm run dev`
- Backend build: `npm run build`
- Lint: `npm run lint`
- Tests: `npm test`

## Subagents

Each agent owns one layer of the stack. Use the narrowest agent that covers the task; reach for `fullstack` only when a change spans schema + API + UI.

| Agent | Owns | File |
|---|---|---|
| `frontend` | Pages/components, Bootstrap layouts, Vite config, API integration, auth UI | `@agents/frontend-agent.md` |
| `backend` | REST endpoints, controllers/services, middleware, CORS, error handling | `@agents/backend-agent.md` |
| `database` | Schema design, migrations, indexes, query optimization, seed data | `@agents/database-agent.md` |
| `auth` | JWT auth, bcryptjs, speakeasy 2FA, login/register, refresh tokens, rate limiting | `@agents/auth-agent.md` |
| `devops` | `vercel.json`, env vars, deploy failures, prod CORS, Neon connectivity, local setup | `@agents/devops-agent.md` |
| `fullstack` | End-to-end features (DB → API → UI); follows the project's standard 7-step workflow | `@agents/fullstack-agent.md` |

## Conventions

### TypeScript
- Strict mode on.
- Avoid `any`; if unavoidable, comment why.
- API response types live in `src/types/`.
- ES module imports only.

### Environment variables
- Frontend: `import.meta.env.VITE_*` — must be prefixed `VITE_`.
- Backend: `process.env.*`.
- Never commit `.env` or `.env.local`.

### API communication
- Base URL: `import.meta.env.VITE_API_URL`.
- Auth header: `Authorization: Bearer <token>`.
- Error shape: `{ "message": "Error description" }`.

### Backend status codes
| Status | Meaning |
|---|---|
| 400 | Invalid or missing input |
| 401 | Missing or invalid authentication |
| 403 | Authenticated, insufficient permissions |
| 404 | Resource not found |
| 409 | Duplicate/conflicting resource |
| 500 | Internal server error |

### SweetAlert2
- Success → toast: `{ toast: true, position: "top-end", timer: 3000 }`.
- Destructive actions → always confirm before proceeding.
- Errors → `Swal.fire({ icon: "error", title, text })`.

### Commit messages
`type: short description` — types: `feat`, `fix`, `db`, `auth`, `deploy`.

```
feat: add client intake workflow
fix: resolve production CORS issue
db: optimize dashboard queries
auth: implement JWT refresh tokens
```

## Do Not
- Log, print, or commit client PII (names, case narratives, contact info).
- Hardcode secrets, tokens, or API URLs — use env vars.
- Hand-write DB migrations or SQL from the `frontend` agent's context — route to `database`.
- Skip confirmation prompts on destructive UI actions.