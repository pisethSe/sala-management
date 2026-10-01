# sala-management

Sala School Management, a school management system for students, teachers, classes, attendance, grades, timetable, fees, library, notices, calendar and reports.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (App Router) + Tailwind CSS v4 + shadcn/ui, React 19, plain JavaScript |
| Backend | NestJS (TypeScript) REST API with Redis caching |
| Database | Supabase PostgreSQL, reached through `pg` with automatic SSL |
| Auth | Supabase Auth (ES256 JWTs, verified against the public JWKS) |
| Deployment | Docker Compose (frontend, backend, Redis) |

- **Frontend** — `frontend/`: the UI (App Router, one route per module). Styling is Tailwind utilities plus a small set of component classes defined in `app/globals.css` from theme tokens. shadcn/ui components (Button, Card, Badge, Dialog, Table, Field, Input, Alert, Progress…) carry the UI. Fonts come from `next/font/google`: Kantumruy Pro (Khmer subset) and Bricolage Grotesque.
- **Backend** — `backend/`: the API. Modules: `students` (full CRUD, server-assigned IDs and codes), `school-data` (the whole school document as one JSONB row), `database` (the `pg` pool and schema), `redis` (cache with graceful fallback), `auth` (JWT guard), `health`.
- **Auth**: every API call carries the Supabase session's access token as a Bearer header; the NestJS `JwtAuthGuard` verifies the signature against the project's JWKS (`SUPABASE_URL` + `/auth/v1/.well-known/jwks.json`) and rejects anything else with 401. Only `GET /api/health` is public. Roles (Admin/Teacher/Accountant) come from the JWT's `app_metadata.role` — set per user in the Supabase dashboard (Authentication → Users → edit user → Raw user JSON → `"app_metadata": {"role": "Admin"}`); users without an explicit role default to Admin. RLS is enabled on `students` and `school_data` with no policies: the API connects as `postgres` (bypasses RLS), the Supabase Data API is denied.
- Redis caches the students list and the school document (read-through, invalidated on writes, 300s TTL). If Redis is down the API keeps serving from the database.
- The database stores students in their own table; everything else (settings, teachers, classes, attendance, exams, grades, fees, payments, books, notices, events, timetable) is one JSONB document.

## Running with Docker

```bash
cp .env.example .env        # then fill in DATABASE_URL
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:3001/api
- Health check: http://localhost:3001/api/health

## Running without Docker

Backend (needs a local or remote Redis; without `REDIS_URL` it skips caching):

```bash
cd backend
cp .env.example .env.local  # then fill in DATABASE_URL, SUPABASE_URL
npm install
npm run db:init             # creates the tables (and enables RLS)
npm run start:dev           # http://localhost:3001/api
```

Frontend:

```bash
cd frontend
npm install
npm run dev                 # http://localhost:3000
```

First run: open the app, sign up with your email, confirm the link, sign in.
For instant sign-in (no email roundtrip), either turn off "Confirm email" in
Supabase (Authentication → Sign In → Providers → Email) or create users with
auto-confirm in Authentication → Users.

## Environment

- `DATABASE_URL` — Supabase PostgreSQL connection string (Session pooler `:5432` for long-running servers, Transaction pooler `:6543` for serverless). Special characters in the password must be URL-encoded.
- `SUPABASE_URL` — project URL; the backend verifies auth JWTs against its JWKS endpoint.
- `SUPABASE_JWT_SECRET` — optional; only needed for legacy HS256 tokens (projects signing with asymmetric keys don't need it).
- `REDIS_URL` — Redis connection string, e.g. `redis://localhost:6379`.
- `NEXT_PUBLIC_API_URL` — the API base URL the frontend calls; defaults to `http://localhost:3001`.
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the Supabase Auth endpoint and publishable key the frontend signs in with.

All secrets live in git-ignored `.env*local` files. Never commit them.
