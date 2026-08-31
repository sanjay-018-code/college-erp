"""
Shared pytest fixtures. Every fixture here builds real DB rows (not mocks) so
the tests exercise the actual ORM constraints and serializer validation, not
just view logic in isolation.
"""
import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.academics.models import Department, Course
from apps.faculty.models import FacultyProfile
from apps.students.models import StudentProfile


@pytest.fixture
def api_client():
    return APIClient()


def _make_user(role, username, **extra):
    return User.objects.create_user(
        username=username, password="TestPass123!", email=f"{username}@test.edu",
        role=role, first_name=username.capitalize(), last_name="Test", **extra,
    )


@pytest.fixture
def department(db):
    return Department.objects.create(name="Computer Science", code="CSE")


@pytest.fixture
def other_department(db):
    return Department.objects.create(name="Mechanical Engineering", code="MECH")


@pytest.fixture
def super_admin(db):
    return _make_user(User.Role.SUPER_ADMIN, "superadmin", is_staff=True, is_superuser=True)


@pytest.fixture
def dept_admin(db, department):
    user = _make_user(User.Role.DEPT_ADMIN, "deptadmin")
    FacultyProfile.objects.create(user=user, employee_id="DA001", department=department, designation="Dept Admin")
    department.dept_admin = user
    department.save(update_fields=["dept_admin"])
    return user


@pytest.fixture
def other_dept_admin(db, other_department):
    user = _make_user(User.Role.DEPT_ADMIN, "otherdeptadmin")
    FacultyProfile.objects.create(user=user, employee_id="DA002", department=other_department, designation="Dept Admin")
    other_department.dept_admin = user
    other_department.save(update_fields=["dept_admin"])
    return user


@pytest.fixture
def hod(db, department):
    user = _make_user(User.Role.HOD, "hoduser")
    profile = FacultyProfile.objects.create(user=user, employee_id="HOD01", department=department, designation="Professor & HOD")
    department.head_of_department = profile
    department.save(update_fields=["head_of_department"])
    return user


@pytest.fixture
def advisor(db, department):
    user = _make_user(User.Role.ADVISOR, "advisoruser")
    FacultyProfile.objects.create(user=user, employee_id="ADV01", department=department, designation="Associate Professor")
    return user


@pytest.fixture
def faculty(db, department):
    user = _make_user(User.Role.FACULTY, "facultyuser")
    FacultyProfile.objects.create(user=user, employee_id="FAC01", department=department, designation="Assistant Professor")
    return user


@pytest.fixture
def non_teaching(db, department):
    user = _make_user(User.Role.NON_TEACHING, "staffuser")
    FacultyProfile.objects.create(user=user, employee_id="NT01", department=department, designation="Office Assistant")
    return user


@pytest.fixture
def student(db, department):
    user = _make_user(User.Role.STUDENT, "studentuser")
    StudentProfile.objects.create(user=user, roll_number="CSE2026001", department=department, semester=3, admission_year=2026)
    return user


@pytest.fixture
def other_student(db, other_department):
    user = _make_user(User.Role.STUDENT, "otherstudentuser")
    StudentProfile.objects.create(user=user, roll_number="MECH2026001", department=other_department, semester=3, admission_year=2026)
    return user


@pytest.fixture
def parent(db, student):
    from apps.accounts.models import ParentStudentLink
    user = _make_user(User.Role.PARENT, "parentuser")
    ParentStudentLink.objects.create(parent=user, student=student)
    return user


@pytest.fixture
def course(db, department, faculty):
    faculty_profile = faculty.faculty_profile
    return Course.objects.create(department=department, name="Data Structures", code="CSE201",
                                  credits=4, semester=3, faculty=faculty_profile)


def auth(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client
