"""
Bulk-import staff accounts (Faculty, HOD, Advisor, Non-Teaching, Department
Admin) from a CSV file.

Usage:
    python manage.py import_staff staff.csv
    python manage.py import_staff staff.csv --dry-run

Expected CSV columns (header row required):
    username, email, first_name, last_name, password,
    role (one of FACULTY, HOD, ADVISOR, NON_TEACHING, DEPT_ADMIN),
    employee_id, department_code, designation, qualification (optional),
    date_joined (optional, YYYY-MM-DD)

Same rules as import_students: existing usernames are skipped (safe to
re-run), and a blank password generates a random temporary one that's
printed at the end.
"""
import csv
import secrets

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.academics.models import Department
from apps.faculty.models import FacultyProfile

User = get_user_model()

VALID_ROLES = {"FACULTY", "HOD", "ADVISOR", "NON_TEACHING", "DEPT_ADMIN"}
REQUIRED_COLUMNS = {
    "username", "email", "first_name", "last_name", "role",
    "employee_id", "department_code", "designation",
}


class Command(BaseCommand):
    help = "Bulk-import staff accounts + profiles from a CSV file."

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

        for i, row in enumerate(rows, start=2):
            username = (row.get("username") or "").strip()
            if not username:
                errors.append(f"Row {i}: missing username, skipped.")
                continue
            if User.objects.filter(username=username).exists():
                skipped += 1
                continue

            role = (row.get("role") or "").strip().upper()
            if role not in VALID_ROLES:
                errors.append(f"Row {i} ({username}): role must be one of {sorted(VALID_ROLES)}, got '{role}'.")
                continue

            dept_code = (row.get("department_code") or "").strip()
            department = dept_cache.get(dept_code)
            if not department:
                errors.append(f"Row {i} ({username}): unknown department_code '{dept_code}', skipped.")
                continue

            password = (row.get("password") or "").strip() or secrets.token_urlsafe(9)
            if not row.get("password"):
                generated_passwords[username] = password

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
                        role=role,
                    )
                    FacultyProfile.objects.create(
                        user=user,
                        employee_id=(row.get("employee_id") or "").strip(),
                        department=department,
                        designation=(row.get("designation") or "").strip(),
                        qualification=(row.get("qualification") or "").strip(),
                        date_joined=(row.get("date_joined") or "").strip() or None,
                    )
                created += 1
            except Exception as exc:
                errors.append(f"Row {i} ({username}): {exc}")

        verb = "Would create" if dry_run else "Created"
        self.stdout.write(self.style.SUCCESS(f"{verb} {created} staff account(s). Skipped {skipped} existing username(s)."))
        if errors:
            self.stdout.write(self.style.WARNING(f"{len(errors)} row(s) had problems:"))
            for e in errors:
                self.stdout.write(f"  - {e}")
        if generated_passwords and not dry_run:
            self.stdout.write(self.style.WARNING(
                "Generated temporary passwords (share securely, then have each person change it):"
            ))
            for username, pwd in generated_passwords.items():
                self.stdout.write(f"  {username}: {pwd}")
