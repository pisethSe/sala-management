# Sala School Management

School management app for Sala Secondary School (Cambodia): students, teachers, classes, attendance, exams and grades, timetable, fees and payments, library, notices, calendar, reports and settings. Theme is Forest Green & Copper, with Khmer-friendly fonts.

## Stack
- **Frontend** (`frontend/`): Next.js 16 (App Router, Turbopack), React 19, plain JavaScript, Tailwind CSS v4.
- **Backend** (`backend/`): NestJS (TypeScript) REST API, Redis cache, `pg` for PostgreSQL.
- **Deployment**: `docker compose up --build` (frontend, backend, Redis). Copy `.env.example` to `.env` first.
- Commands: `npm run dev` (frontend, port 3000), `npm run start:dev` (backend, port 3001), `npm run db:init` (backend; creates the tables).

## Frontend (`frontend/`)
- Every page is a client component. Fonts come from `next/font/google`: Kantumruy Pro (`--f-body`, includes the Khmer subset) and Bricolage Grotesque (`--f-display`).
- Styling: Tailwind utilities plus component classes (`btn btn-primary`, `badge badge-ok`, `panel`, `stat`, `todo`, `cal`, …) defined in `app/globals.css` from theme tokens with `@theme inline`. Colors are CSS variables on `:root`, so dark-mode overrides (`prefers-color-scheme` and `[data-theme]`) keep working with the same class names.
- `lib/api.js` prefixes every call with `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`).
- `components/SchoolProvider.js`: context (`useSchool()`). Provides `S` (the school data), `update(fn)` (runs `fn` on a `structuredClone` draft; a returned string is a validation error), `ui`/`setUi` (shared filters), `role`/`setRole`, `openModal`/`closeModal`, `toast`, `loadError`. Saves are serialized: one PUT at a time, only the latest state next.
- `components/Shell.js`: sidebar nav (grouped, with attention counts), top bar, modal (Escape and backdrop close it), toast, role-based redirects, database error card.
- `components/dialogs.js`: `useDialogs()` — `form`, `confirm`, `confirmAsync`, `stuForm`, `removeStudent`, `teaForm`, `clsForm`, `bookForm`, `examForm`, `stuProfile`, `reportCard`, `receipt`.
- `components/ui.js`: `Badge`, `LetterBadge`, `Icon`, `Options`, `Bars` (SVG bar chart), `DataTable` (a `#` prefix on a heading means a numeric column), `FormBody`, `ConfirmBody`.
- `lib/school.js`: date and money helpers, constants (`DAYS`, `PERIODS`, `SUBJECTS`, `STATUSES`, `PAGES`, `ROLES`, `ICONS`), `emptyData()`, and selectors that take `S` first.
- Routes: `/` (dashboard), `/students`, `/teachers`, `/classes`, `/attendance`, `/gradebook`, `/timetable`, `/fees`, `/library`, `/notices`, `/calendar`, `/reports`, `/settings`.

## Backend (`backend/`)
- NestJS with a global `api` prefix. All errors return `{ error: message }` (`common/api-exceptions.filter.ts`); validation failures are 400, missing students are 404.
- `main.ts` self-loads `.env.local` when not started with `--env-file` (skipped in Docker, where compose provides the env).
- `database/` (`DatabaseService`, global): the `pg` Pool (cached on the instance), schema, `loadData`/`saveData`, `importStudents`. SSL turns on automatically for any non-local host.
- `students/`: full CRUD. The server assigns `id` (`s` + random hex) and `code` (STU-###, `max+1` under `pg_advisory_xact_lock`, so a deleted top code gets reused). Validates name, guardian, phone, status, the date format, and that the class exists (classes live in `school_data`). `common/constants.ts` holds `STATUSES`, kept in sync with `lib/school.js`.
- `school-data/`: the whole school document as one JSONB row (id 1), sent whole on every save. `saveData` never stores `students`; a first-run import from the browser is imported with `ON CONFLICT DO NOTHING`.
- `redis/` (`RedisService`, global): caches the students list (`sala:students`) and the school document (`sala:data`) read-through with a 300s TTL, invalidated on writes. Redis is never a hard dependency: when it is down every method falls through to the database and a warning is logged once.
- `health/`: `GET /api/health` reports `{ ok, redis, database }`; used by the Docker healthcheck.
- `scripts/db-init.mjs`: `npm run db:init`, run with `node --env-file=.env.local`.

## Database (Supabase PostgreSQL)
- **Project:** `sala-system`, ref `akcehyzvupivjiwqgclu`, region `ap-southeast-1`, PostgreSQL 17.
  - The app reaches it through the **Session pooler**, `aws-0-ap-southeast-1.pooler.supabase.com:5432`, database `postgres`, user `postgres.akcehyzvupivjiwqgclu`.
  - The direct host `db.<ref>.supabase.co` is IPv6-only and can't be reached from every network.
- **Connection:** `DATABASE_URL` in `backend/.env.local`, which is git-ignored. Never put the password in a committed file.
  - URL-encode `@ # / :` in the password (`%40 %23 %2F %3A`).
  - For a serverless deploy, use the **Transaction pooler** (port 6543) instead.
- **Tables:** created with `CREATE TABLE IF NOT EXISTS` (SCHEMA in `database.service.ts`, same SQL in `scripts/db-init.mjs`).
  - `students`: one row per student. `id` (text PK), `code` (unique, STU-###), `name`, `gender`, `dob` (date), `class_id`, `status`, `guardian`, `phone`, `address`, `created_at`, `updated_at`. DATE columns come back as `'YYYY-MM-DD'` strings (type parser 1082).
  - `school_data`: everything else (settings, teachers, classes, attendance, exams, grades, fees, payments, books, notices, events, timetable) as one JSONB row, id 1.
- **Browser storage:** the role is kept in `localStorage` (`sala-sms-v1-role`). Old `localStorage` data (`sala-sms-v1`) is imported only when the database has no `school_data` row.

## Data model notes
- Attendance is keyed `"YYYY-MM-DD|classId"` and maps to `{studentId: 'P'|'L'|'A'}`.
- Grades are keyed `"examId|Subject|studentId"` and map to a score from 0 to 100.
- The timetable is `timetable[classId][Day]` and holds an array of subjects, one per period.
- Roles: Admin sees everything; Teacher and Accountant see subsets (see `ROLES`).
- Grade letters: A 85+, B 70–84, C 55–69, D 40–54, F below 40. The pass mark is in settings (default 40).

## Open items
- There is no login or authentication yet. Roles only switch in the UI. Add auth before deploying anywhere public.
- Row Level Security (RLS) is off on `students` and `school_data`. The API connects as `postgres`, which bypasses RLS. Consider enabling RLS with no policies if the Data API is ever exposed with the publishable key.
- Other modules (teachers, classes, attendance, grades, fees, library, notices, calendar, timetable) still live in the single `school_data` JSONB document. Saves are last-write-wins across users. The same pattern as students could split them out one module at a time.
- Make sure `.env*.local` stays out of commits; the root `.gitignore` covers it.
