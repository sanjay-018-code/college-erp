"""
Seeds the database with a small set of demo data covering every role so you can
log in as each one and click around immediately after first deploy. Safe to run
multiple times (uses get_or_create). Remove or don't run this in a real
production rollout with real student data.

Usage: python manage.py seed_demo_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.academics.models import Department, Course
from apps.students.models import StudentProfile, AdvisorAssignment
from apps.faculty.models import FacultyProfile

User = get_user_model()
PASSWORD = "ChangeMe123!"


class Command(BaseCommand):
    help = "Seed demo data: one user per role, one department/course, one advisor assignment"

    def _user(self, username, role, first_name, last_name, **extra):
        defaults = {"email": f"{username}@college.edu", "role": role,
                    "first_name": first_name, "last_name": last_name, **extra}
        user, created = User.objects.get_or_create(username=username, defaults=defaults)
        if created:
            user.set_password(PASSWORD)
            user.save()
        return user, created

    def handle(self, *args, **options):
        super_admin, created = self._user(
            "admin", User.Role.SUPER_ADMIN, "System", "Administrator",
            is_staff=True, is_superuser=True,
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created Super Admin (username=admin, password={PASSWORD})"))

        dept, _ = Department.objects.get_or_create(
            code="CSE", defaults={"name": "Computer Science & Engineering"}
        )

        # Department Admin
        dept_admin_user, _ = self._user("deptadmin1", User.Role.DEPT_ADMIN, "Priya", "Menon")
        FacultyProfile.objects.get_or_create(
            user=dept_admin_user, defaults={"employee_id": "EMP100", "department": dept, "designation": "Department Admin"}
        )
        dept.dept_admin = dept_admin_user
        dept.save(update_fields=["dept_admin"])

        # HOD
        hod_user, _ = self._user("hod1", User.Role.HOD, "Suresh", "Iyer")
        hod_profile, _ = FacultyProfile.objects.get_or_create(
            user=hod_user, defaults={"employee_id": "EMP101", "department": dept, "designation": "Professor & HOD"}
        )
        dept.head_of_department = hod_profile
        dept.save(update_fields=["head_of_department"])

        # Faculty
        faculty_user, _ = self._user("faculty1", User.Role.FACULTY, "Anita", "Rao")
        faculty_profile, _ = FacultyProfile.objects.get_or_create(
            user=faculty_user, defaults={"employee_id": "EMP001", "department": dept, "designation": "Assistant Professor"}
        )

        # Advisor
        advisor_user, _ = self._user("advisor1", User.Role.ADVISOR, "Kavitha", "Nair")
        advisor_profile, _ = FacultyProfile.objects.get_or_create(
            user=advisor_user, defaults={"employee_id": "EMP102", "department": dept, "designation": "Associate Professor"}
        )

        # Non-teaching staff
        staff_user, _ = self._user("staff1", User.Role.NON_TEACHING, "Ramesh", "Pillai")
        FacultyProfile.objects.get_or_create(
            user=staff_user, defaults={"employee_id": "EMP103", "department": dept, "designation": "Office Assistant"}
        )

        course, _ = Course.objects.get_or_create(
            code="CSE301", defaults={"name": "Database Systems", "department": dept, "credits": 4,
                                      "semester": 3, "faculty": faculty_profile}
        )

        # Student
        student_user, _ = self._user("student1", User.Role.STUDENT, "Ravi", "Kumar")
        student_profile, _ = StudentProfile.objects.get_or_create(
            user=student_user, defaults={"roll_number": "CSE2024001", "department": dept,
                                          "semester": 3, "admission_year": 2024}
        )

        AdvisorAssignment.objects.get_or_create(
            student=student_profile, academic_year=2026, defaults={"advisor": advisor_profile}
        )

        # Parent
        parent_user, _ = self._user("parent1", User.Role.PARENT, "Meena", "Kumar")
        from apps.accounts.models import ParentStudentLink
        ParentStudentLink.objects.get_or_create(parent=parent_user, student=student_user)

        self.stdout.write(self.style.SUCCESS(
            "Demo data ready. Logins (all password ChangeMe123!): "
            "admin (Super Admin), deptadmin1 (Dept Admin), hod1 (HOD), "
            "faculty1 (Faculty), advisor1 (Advisor), staff1 (Non-Teaching), "
            "student1 (Student), parent1 (Parent)."
        ))
