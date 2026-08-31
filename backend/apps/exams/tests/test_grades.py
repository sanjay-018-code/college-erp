import pytest
from decimal import Decimal
from conftest import auth
from apps.exams.models import Exam

pytestmark = pytest.mark.django_db


@pytest.fixture
def exam(course):
    return Exam.objects.create(course=course, name="Midterm", exam_type="MIDTERM", date="2026-09-01", max_marks=Decimal("50.00"))


def test_faculty_can_grade_within_max_marks(api_client, faculty, exam, student):
    client = auth(api_client, faculty)
    resp = client.post("/api/exams/grades/", {
        "exam": exam.id, "student": student.student_profile.id, "marks_obtained": "45.00",
    }, format="json")
    assert resp.status_code == 201


def test_marks_cannot_exceed_exam_max_marks(api_client, faculty, exam, student):
    client = auth(api_client, faculty)
    resp = client.post("/api/exams/grades/", {
        "exam": exam.id, "student": student.student_profile.id, "marks_obtained": "999.00",
    }, format="json")
    assert resp.status_code == 400
    assert "marks_obtained" in resp.data


def test_marks_cannot_be_negative(api_client, faculty, exam, student):
    client = auth(api_client, faculty)
    resp = client.post("/api/exams/grades/", {
        "exam": exam.id, "student": student.student_profile.id, "marks_obtained": "-5.00",
    }, format="json")
    assert resp.status_code == 400


def test_student_sees_only_their_own_grades(api_client, faculty, exam, student, other_student):
    client = auth(api_client, faculty)
    client.post("/api/exams/grades/", {"exam": exam.id, "student": student.student_profile.id, "marks_obtained": "40.00"}, format="json")
    client.post("/api/exams/grades/", {"exam": exam.id, "student": other_student.student_profile.id, "marks_obtained": "30.00"}, format="json")

    client = auth(api_client, student)
    resp = client.get("/api/exams/grades/")
    assert resp.data["count"] == 1
    assert resp.data["results"][0]["roll_number"] == "CSE2026001"


def test_non_teaching_staff_cannot_create_exams(api_client, non_teaching, course):
    client = auth(api_client, non_teaching)
    resp = client.post("/api/exams/exams/", {
        "course": course.id, "name": "Surprise Quiz", "exam_type": "QUIZ", "date": "2026-09-15", "max_marks": "20.00",
    }, format="json")
    assert resp.status_code == 403
