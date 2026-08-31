"""
Bulk-import students from a CSV file - for onboarding an existing student list
without clicking through the UI one at a time.

Usage:
    python manage.py import_students students.csv
    python manage.py import_students students.csv --dry-run

Expected CSV columns (header row required, order doesn't matter):
    username, email, first_name, last_name, password,
    roll_number, department_code, semester, admission_year,
    date_of_birth (optional, YYYY-MM-DD), guardian_name (optional),
    guardian_phone (optional)

- `department_code` must match an existing Department.code (create departments
  first via the admin or the API).
- If `password` is left blank, a random temporary password is generated and
  printed at the end (share it with the student securely, then have them
  change it on first login).
- Existing users (matched by username) are skipped, not overwritten - re-run
  the same file safely if it partially failed.
"""
import csv
import secrets

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.academics.models import Department
from apps.students.models import StudentProfile

User = get_user_model()

REQUIRED_COLUMNS = {
    "username", "email", "first_name", "last_name",
    "roll_number", "department_code", "semester", "admission_year",
}


class Command(BaseCommand):
    help = "Bulk-import student accounts + profiles from a CSV file."

    def add_arguments(self, parser):
        parser.add_argument("csv_path")
        parser.add_argument("--dry-run", action="store_true", help="Validate the file without writing anything.")

    def handle(self, *args, **options):
        path = options["csv_path"]
        dry_run = options["dry_run"]

        try:
            f = open(path, newline="", encoding="utf-8-sig")
        except OSError as exc:
            raise CommandError(f"Couldn't open {path}: {exc}")

        with f:
            reader = csv.DictReader(f)
            missing = REQUIRED_COLUMNS - set(reader.fieldnames or [])
            if missing:
                raise CommandError(f"CSV is missing required column(s): {', '.join(sorted(missing))}")

            rows = list(reader)

        created, skipped, errors, generated_passwords = 0, 0, [], {}

        dept_cache = {d.code: d for d in Department.objects.all()}

        for i, row in enumerate(rows, start=2):  # row 1 is the header
            username = (row.get("username") or "").strip()
            if not username:
                errors.append(f"Row {i}: missing username, skipped.")
                continue
            if User.objects.filter(username=username).exists():
                skipped += 1
                continue

            dept_code = (row.get("department_code") or "").strip()
            department = dept_cache.get(dept_code)
            if not department:
                errors.append(f"Row {i} ({username}): unknown department_code '{dept_code}', skipped.")
                continue

            password = (row.get("password") or "").strip() or secrets.token_urlsafe(9)
            if not row.get("password"):
                generated_passwords[username] = password

            try:
                semester = int(row["semester"])
                admission_year = int(row["admission_year"])
            except (ValueError, KeyError):
                errors.append(f"Row {i} ({username}): semester/admission_year must be numbers, skipped.")
                continue

            if dry_run:
                created += 1
                continue

            try:
                with transaction.atomic():
                    user = User.objects.create_user(
                        username=username,
                        email=(row.get("email") or "").strip(),
                        first_name=(row.get("first_name") or "").strip(),
                        last_name=(row.get("last_name") or "").strip(),
                        password=password,
                        role=User.Role.STUDENT,
                    )
                    StudentProfile.objects.create(
                        user=user,
                        roll_number=(row.get("roll_number") or "").strip(),
                        department=department,
                        semester=semester,
                        admission_year=admission_year,
                        date_of_birth=(row.get("date_of_birth") or "").strip() or None,
                        guardian_name=(row.get("guardian_name") or "").strip(),
                        guardian_phone=(row.get("guardian_phone") or "").strip(),
                    )
                created += 1
            except Exception as exc:
                errors.append(f"Row {i} ({username}): {exc}")

        verb = "Would create" if dry_run else "Created"
        self.stdout.write(self.style.SUCCESS(f"{verb} {created} student account(s). Skipped {skipped} existing username(s)."))
        if errors:
            self.stdout.write(self.style.WARNING(f"{len(errors)} row(s) had problems:"))
            for e in errors:
                self.stdout.write(f"  - {e}")
        if generated_passwords and not dry_run:
            self.stdout.write(self.style.WARNING(
                "Generated temporary passwords (share securely, then have each student change it):"
            ))
            for username, pwd in generated_passwords.items():
                self.stdout.write(f"  {username}: {pwd}")
