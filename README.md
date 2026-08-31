# Campus Ledger — College ERP

A full-stack college ERP system: Django REST Framework backend, React (Vite) frontend,
PostgreSQL, Redis, Celery, and Nginx — all orchestrated with Docker Compose.

**Read `CHANGES_TO_MAKE.md` before deploying this anywhere real.** This is a genuinely
working scaffold with real auth, real modules, and real data flows — but a handful of
values (secrets, domain names, payment/email credentials) are placeholders you must
replace, and a few things (payment gateway, SSL, backups) are stubbed out for you to
wire up to your college's actual accounts.

## What's included

- **Auth**: JWT login, 4 roles (Admin / Faculty / Student / Parent), role-based permissions
- **Students & Faculty**: profile management, department/course assignment
- **Academics**: departments, courses, timetable slots
- **Attendance**: per-class bulk marking (faculty), history view (students)
- **Exams & Grades**: exam definitions, per-student grade entry
- **Fees**: fee structures per department/semester, payments recorded manually by staff/admin
- **Notices**: role-targeted announcements, background email sending via Celery
- **Admin panel**: full Django admin at `/admin/` for direct data management

## Architecture

```
[Nginx :80] → serves React static build
            → proxies /api/*, /admin/* → [Django/Gunicorn :8000]
            → serves /static/, /media/ directly from shared volumes
                                              ↓
                                    [PostgreSQL] + [Redis]
                                              ↓
                                    [Celery worker] (background jobs)
```

## Quick start (local / test)

1. Install Docker and Docker Compose on the server.
2. Copy environment files and fill in real values:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   # edit both files — see CHANGES_TO_MAKE.md for what must change
   ```
3. Build and start everything:
   ```bash
   docker compose up --build -d
   ```
4. The first run applies migrations, collects static files, and (if
   `SEED_DEMO_DATA=true` in `backend/.env`) creates demo logins:
   - `admin` / `ChangeMe123!` — full admin access
   - `faculty1` / `ChangeMe123!` — sample faculty account
   - `student1` / `ChangeMe123!` — sample student account
5. Visit `http://<server-ip>:8080` (or port 80 if you remapped it) for the app,
   and `http://<server-ip>:8080/admin/` for the Django admin.
6. **Set `SEED_DEMO_DATA=false` and change/remove the demo accounts before
   real students or staff start using the system.**

## Local development (without Docker, for faster iteration)

Backend:
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# point POSTGRES_HOST/REDIS_URL at local instances, or run just those two via:
# docker compose up db redis
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Frontend:
```bash
cd frontend
npm install
npm run dev
# create frontend/.env with VITE_API_BASE_URL=http://localhost:8000/api
```

## Day-to-day operations

- **Backups**: `docker compose exec db pg_dump -U <user> <db> > backup.sql` — put this
  on a cron job. This is not automated for you; see CHANGES_TO_MAKE.md.
- **Logs**: `docker compose logs -f backend` (or `frontend`, `celery_worker`, `db`)
- **Run a Django management command**: `docker compose exec backend python manage.py <command>`
- **Load test before real rollout**: use `k6` or `locust` against `/api/` endpoints
  with realistic concurrent-user counts for your college.

## Repo layout

```
college-erp/
├── backend/            Django + DRF project
│   ├── apps/           accounts, students, faculty, academics,
│   │                   attendance, exams, fees, notices
│   └── config/         settings, urls, celery, wsgi/asgi
├── frontend/            React (Vite) app
├── nginx/               reference copy of the Nginx config (also baked into frontend image)
├── docker-compose.yml
├── .env.example
└── CHANGES_TO_MAKE.md   <- read this before going live
```
