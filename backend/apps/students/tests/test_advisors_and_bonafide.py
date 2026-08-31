import pytest
from conftest import auth
from apps.students.models import AdvisorAssignment, BonafideRequest

pytestmark = pytest.mark.django_db


def test_hod_can_assign_advisor_to_student_in_own_department(api_client, hod, advisor, student):
    client = auth(api_client, hod)
    resp = client.post("/api/students/advisor-assignments/", {
        "advisor": advisor.faculty_profile.id, "student": student.student_profile.id,
        "academic_year": 2026,
    }, format="json")
    assert resp.status_code == 201


def test_cannot_assign_a_non_advisor_as_advisor(api_client, hod, faculty, student):
    client = auth(api_client, hod)
    resp = client.post("/api/students/advisor-assignments/", {
        "advisor": faculty.faculty_profile.id, "student": student.student_profile.id,
        "academic_year": 2026,
    }, format="json")
    assert resp.status_code == 400


def test_advisor_sees_only_their_own_advisees(api_client, advisor, student, other_student, hod):
    AdvisorAssignment.objects.create(
        advisor=advisor.faculty_profile, student=student.student_profile, academic_year=2026,
    )
    client = auth(api_client, advisor)
    resp = client.get("/api/students/profiles/")
    rolls = {s["roll_number"] for s in resp.data["results"]}
    assert rolls == {"CSE2026001"}


def test_student_can_submit_bonafide_request(api_client, student):
    client = auth(api_client, student)
    resp = client.post("/api/students/bonafide-requests/", {"purpose": "Bank loan"}, format="json")
    assert resp.status_code == 201
    assert resp.data["status"] == "PENDING"


def test_student_cannot_approve_own_bonafide_request(api_client, student):
    req = BonafideRequest.objects.create(student=student.student_profile, purpose="Passport")
    client = auth(api_client, student)
    resp = client.post(f"/api/students/bonafide-requests/{req.id}/approve/", {}, format="json")
    assert resp.status_code == 403
    req.refresh_from_db()
    assert req.status == "PENDING"


def test_hod_can_approve_bonafide_request_in_own_department(api_client, hod, student):
    req = BonafideRequest.objects.create(student=student.student_profile, purpose="Passport")
    client = auth(api_client, hod)
    resp = client.post(f"/api/students/bonafide-requests/{req.id}/approve/", {}, format="json")
    assert resp.status_code == 200
    req.refresh_from_db()
    assert req.status == "APPROVED"
    assert req.processed_by == hod


def test_hod_cannot_see_bonafide_requests_from_another_department(api_client, hod, other_student):
    BonafideRequest.objects.create(student=other_student.student_profile, purpose="Bus pass")
    client = auth(api_client, hod)
    resp = client.get("/api/students/bonafide-requests/")
    assert resp.data["count"] == 0


def test_parent_sees_only_linked_childs_bonafide_requests(api_client, parent, student, other_student):
    BonafideRequest.objects.create(student=student.student_profile, purpose="Bank loan")
    BonafideRequest.objects.create(student=other_student.student_profile, purpose="Bus pass")
    client = auth(api_client, parent)
    resp = client.get("/api/students/bonafide-requests/")
    assert resp.data["count"] == 1
    assert resp.data["results"][0]["roll_number"] == "CSE2026001"
