# sala-management

Sala School Management, a school management system for students, teachers, classes, attendance, grades, timetable, fees, library, notices, calendar and reports.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (App Router) + Tailwind CSS v4, React 19, plain JavaScript |
| Backend | NestJS (TypeScript) REST API with Redis caching |
| Database | Supabase PostgreSQL, reached through `pg` with automatic SSL |
| Deployment | Docker Compose (frontend, backend, Redis) |

- **Frontend** — `frontend/`: the UI (App Router, one route per module). Styling is Tailwind utilities plus a small set of component classes defined in `app/globals.css` from theme tokens. Fonts come from `next/font/google`: Kantumruy Pro (Khmer subset) and Bricolage Grotesque.
- **Backend** — `backend/`: the API. Modules: `students` (full CRUD, server-assigned IDs and codes), `school-data` (the whole school document as one JSONB row), `database` (the `pg` pool and schema), `redis` (cache with graceful fallback), `health`.
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
cp .env.example .env.local  # then fill in DATABASE_URL
npm install
npm run db:init             # creates the tables
npm run start:dev           # http://localhost:3001/api
```

Frontend:

```bash
cd frontend
npm install
npm run dev                 # http://localhost:3000
```

## Environment

- `DATABASE_URL` — Supabase PostgreSQL connection string (Session pooler `:5432` for long-running servers, Transaction pooler `:6543` for serverless). Special characters in the password must be URL-encoded.
- `REDIS_URL` — Redis connection string, e.g. `redis://localhost:6379`.
- `NEXT_PUBLIC_API_URL` — the API base URL the frontend calls; defaults to `http://localhost:3001`.

All secrets live in git-ignored `.env*local` files. Never commit them.
