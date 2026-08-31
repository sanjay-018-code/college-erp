import pytest
from conftest import auth

pytestmark = pytest.mark.django_db


def test_anyone_authenticated_can_list_departments(api_client, student, department):
    client = auth(api_client, student)
    resp = client.get("/api/academics/departments/")
    assert resp.status_code == 200
    assert resp.data["count"] >= 1


def test_only_super_admin_can_create_department(api_client, dept_admin, super_admin):
    client = auth(api_client, dept_admin)
    resp = client.post("/api/academics/departments/", {"name": "New Dept", "code": "NEW"}, format="json")
    assert resp.status_code == 403

    client = auth(api_client, super_admin)
    resp = client.post("/api/academics/departments/", {"name": "New Dept", "code": "NEW"}, format="json")
    assert resp.status_code == 201


def test_dept_admin_can_edit_own_department_but_not_others(api_client, dept_admin, department, other_department):
    client = auth(api_client, dept_admin)
    resp = client.patch(f"/api/academics/departments/{department.id}/", {"description": "Updated"}, format="json")
    assert resp.status_code == 200

    resp = client.patch(f"/api/academics/departments/{other_department.id}/", {"description": "Hijacked"}, format="json")
    assert resp.status_code == 403


def test_head_of_department_must_actually_hold_hod_role(api_client, super_admin, department, faculty):
    client = auth(api_client, super_admin)
    # `faculty` fixture has role FACULTY, not HOD - should be rejected.
    resp = client.patch(
        f"/api/academics/departments/{department.id}/",
        {"head_of_department": faculty.faculty_profile.id}, format="json",
    )
    assert resp.status_code == 400


def test_department_serializer_reports_counts(api_client, super_admin, department, student, faculty):
    client = auth(api_client, super_admin)
    resp = client.get(f"/api/academics/departments/{department.id}/")
    assert resp.data["student_count"] == 1
    assert resp.data["faculty_count"] == 1


def test_dept_admin_cannot_create_course_in_other_department(api_client, dept_admin, other_department):
    client = auth(api_client, dept_admin)
    resp = client.post("/api/academics/courses/", {
        "department": other_department.id, "name": "Thermodynamics", "code": "MECH101",
        "credits": 3, "semester": 2,
    }, format="json")
    assert resp.status_code == 403
