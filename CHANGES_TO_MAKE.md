# CHANGES_TO_MAKE.md

This system is a working scaffold, not a shrink-wrapped product. Everything below is
either a placeholder you must replace, or a decision your team needs to make before
real students, faculty, or money touch this system. Items are grouped by urgency.

## ✅ What's new in this update

Roles were expanded from 4 (Admin/Faculty/Student/Parent) to 8, and department
management was fleshed out end-to-end (backend + frontend, both were previously
disconnected):

- **Roles**: Super Admin (system-wide), Department Admin, Head of Department (HOD),
  Advisor/Mentor, Faculty, Non-Teaching Staff, Student, Parent. Department Admins and
  HODs are scoped to their own department everywhere (students, faculty, courses,
  fee structures, bonafide approvals) — a Super Admin sees everything.
- **Department handling**: the Departments page (previously built but never wired
  into the app's routing/navigation — a real bug) is now live, with HOD/Dept Admin
  assignment and live student/staff/course counts per department.
- **Staff Directory**: one page listing every kind of staff (teaching and
  non-teaching), filterable by role.
- **Advisor/mentor system**: HOD/Dept Admin assign an Advisor to a student for an
  academic year; the advisor sees only their assigned advisees.
- **Bonafide certificate requests**: students submit a request with a purpose; their
  department's HOD/Dept Admin approves or rejects it, with an audit trail of who
  processed it and when.
- **Course materials**: faculty share syllabus/notes/assignments/video links per
  course; anyone signed in can view them.
- **Staff-only notices**: a new "STAFF" notice audience reaches all staff (teaching
  and non-teaching), separate from "FACULTY only".

Existing `ADMIN` accounts are migrated to `SUPER_ADMIN` automatically by a data
migration (`accounts/migrations/0003_migrate_admin_role_to_super_admin.py`) — no
manual step needed. `seed_demo_data` now creates one login for every role.

## 🔴 Must change before ANY real deployment (even a pilot)

1. **Django secret key** — `backend/.env` → `DJANGO_SECRET_KEY`
   Generate one: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`

2. **Database password** — `backend/.env` and root `.env` → `POSTGRES_PASSWORD`
   Must match in both files. Use a long random value, not the placeholder.

3. **Allowed hosts / CORS** — `backend/.env`:
   - `DJANGO_ALLOWED_HOSTS` — set to your actual server domain/IP
   - `CORS_ALLOWED_ORIGINS` — set to the actual frontend URL students will use

4. **Demo accounts** — `admin`, `deptadmin1`, `hod1`, `faculty1`, `advisor1`,
   `staff1`, `student1`, `parent1` (password `ChangeMe123!`) are created by
   `seed_demo_data` when `SEED_DEMO_DATA=true`. Before real rollout:
   - Set `SEED_DEMO_DATA=false` in `backend/.env`
   - Delete the demo accounts (or change their passwords) via Django admin
   - Create a real admin account: `docker compose exec backend python manage.py createsuperuser`
     (remember to set its `role` to `SUPER_ADMIN` in Django admin afterward)

5. **Timezone** — `backend/.env` → `DJANGO_TIME_ZONE` (defaults to `Asia/Kolkata`,
   change if your college is elsewhere)

## 🟠 Must configure before specific features work

6. **Email sending** (used for notice notifications) — `backend/.env`:
   - `EMAIL_BACKEND` — currently prints to console logs, not real email
   - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
   - If using Gmail, you need an "App Password", not your regular login password

7. **Online payment gateway** — not included for now. Fee payments are recorded
   manually: an admin/staff user creates a `FeePayment` record (via the Django
   admin or the `/api/fees/payments/` endpoint) after receiving payment by cash,
   bank transfer, etc., optionally noting a receipt number or mode of payment in
   `remarks`. Students can only view their own fee structure and payment history.
   If you later want online checkout (Razorpay/Stripe/PayU), you'll need to
   reintroduce a payment-order endpoint, gateway keys, and a webhook to confirm
   payment success — ask if you'd like this added back in.

8. **SSL / HTTPS** — `frontend/nginx.conf` has a commented-out `listen 443 ssl` block:
   - Get a certificate (Let's Encrypt via certbot is free and standard)
   - Uncomment and point at your cert files
   - Set `DJANGO_SECURE_SSL_REDIRECT=True`, `DJANGO_SESSION_COOKIE_SECURE=True`,
     `DJANGO_CSRF_COOKIE_SECURE=True` in `backend/.env` once HTTPS is live
   - Without this, login credentials travel in plaintext over the network —
     do not use this for real student data over plain HTTP

## 🟡 Operational things not automated for you

9. **Backups** — no automated backup job is included. Set up a cron job or systemd
   timer running `docker compose exec db pg_dump ...` to a safe location
   (ideally off the same server) on a daily schedule.

10. **Monitoring/alerting** — nothing is wired up. At minimum, watch
    `docker compose logs` for the first few weeks, or add a tool like
    Uptime Kuma / Healthchecks.io for basic uptime alerts.

11. **Load testing** — run `k6` or `locust` against the API with your actual
    expected concurrent-user count (e.g. "entire batch checking results at once")
    before relying on this for anything time-sensitive like result day.

12. **User onboarding** — there's no bulk-import tool yet. For onboarding an entire
    existing student/faculty list, you'll want to write a one-off Django management
    command that reads a CSV and calls the same creation logic as
    `apps/students/models.py` / `apps/accounts/models.py`. Ask me for this if needed
    — it's a quick addition once you have your data's actual column layout.

13. **Parent portal** — the `PARENT` role and `ParentStudentLink` model exist, but
    the parent-facing views (e.g. viewing their child's grades/attendance/fees)
    are not yet built out — only the notices page works for parents currently.
    This is the most obviously partial module; treat it as "future work," not done.

14. **Hostel, library, transport modules** — mentioned in the original module list
    but not implemented in this build. The architecture (Django app pattern used
    throughout) makes them straightforward to add the same way the existing
    apps were built, but they don't exist yet.

## 🟢 Nice-to-haves, not blockers

15. Rate limiting is set fairly loose (`1000/day` per user) — tune
    `REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]` in `settings.py` if you see abuse.

16. Password policy is Django's default (min 8 chars + a few common checks) —
    tighten `AUTH_PASSWORD_VALIDATORS` in `settings.py` if your college has
    specific requirements.

17. No automated tests are included yet. If this becomes a long-lived project,
    add pytest-django tests for the attendance and fees logic first — those are
    the modules where a silent bug costs someone real money or a real grade.

## How to verify you haven't missed anything

Before go-live, grep the whole `backend/` folder for the literal string
`CHANGE_ME` — every instance is a placeholder called out above:

```bash
grep -rn "CHANGE_ME" backend/ frontend/ nginx/ docker-compose.yml
```
