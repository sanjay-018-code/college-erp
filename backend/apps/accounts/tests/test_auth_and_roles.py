import pytest
from conftest import auth

pytestmark = pytest.mark.django_db


def test_login_returns_jwt_and_role(api_client, student):
    resp = api_client.post("/api/auth/login/", {"username": "studentuser", "password": "TestPass123!"}, format="json")
    assert resp.status_code == 200
    assert "access" in resp.data and "refresh" in resp.data


def test_login_wrong_password_rejected(api_client, student):
    resp = api_client.post("/api/auth/login/", {"username": "studentuser", "password": "wrong"}, format="json")
    assert resp.status_code == 401


def test_role_properties():
    from apps.accounts.models import User
    u = User(role=User.Role.HOD)
    assert u.is_faculty is True          # HODs also count as teaching staff
    assert u.can_manage_department is True
    assert u.is_admin is False           # is_admin is Super Admin only

    dept_admin = User(role=User.Role.DEPT_ADMIN)
    assert dept_admin.can_manage_department is True
    assert dept_admin.is_faculty is False  # purely administrative, not teaching

    non_teaching = User(role=User.Role.NON_TEACHING)
    assert non_teaching.is_faculty is False
    assert non_teaching.can_manage_department is False
    assert non_teaching.is_staff_role is True


def test_dept_admin_cannot_create_another_admin_account(api_client, dept_admin, department):
    client = auth(api_client, dept_admin)
    resp = client.post("/api/auth/users/", {
        "username": "sneaky_admin", "email": "x@test.edu", "password": "Whatever123!",
        "first_name": "Sneaky", "last_name": "Admin", "role": "SUPER_ADMIN",
    }, format="json")
    assert resp.status_code == 403


def test_dept_admin_can_create_faculty_account(api_client, dept_admin, department):
    client = auth(api_client, dept_admin)
    resp = client.post("/api/auth/users/", {
        "username": "newfaculty", "email": "nf@test.edu", "password": "Whatever123!",
        "first_name": "New", "last_name": "Faculty", "role": "FACULTY",
    }, format="json")
    assert resp.status_code == 201


def test_non_teaching_staff_cannot_create_accounts(api_client, non_teaching):
    client = auth(api_client, non_teaching)
    resp = client.post("/api/auth/users/", {
        "username": "x", "email": "x@test.edu", "password": "Whatever123!",
        "first_name": "X", "last_name": "Y", "role": "STUDENT",
    }, format="json")
    assert resp.status_code == 403


def test_dept_admin_user_list_scoped_to_own_department(api_client, dept_admin, other_dept_admin, student, other_student):
    client = auth(api_client, dept_admin)
    resp = client.get("/api/auth/users/")
    usernames = {u["username"] for u in resp.data["results"]}
    assert "studentuser" in usernames
    assert "otherstudentuser" not in usernames


def test_super_admin_sees_all_users(api_client, super_admin, student, other_student):
    client = auth(api_client, super_admin)
    resp = client.get("/api/auth/users/")
    usernames = {u["username"] for u in resp.data["results"]}
    assert "studentuser" in usernames
    assert "otherstudentuser" in usernames
