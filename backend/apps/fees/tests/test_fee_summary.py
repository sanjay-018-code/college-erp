import pytest
from decimal import Decimal
from conftest import auth
from apps.fees.models import FeeStructure, FeePayment

pytestmark = pytest.mark.django_db


@pytest.fixture
def fee_structure(department):
    return FeeStructure.objects.create(
        department=department, semester=3, academic_year="2026-2027",
        tuition_fee=Decimal("40000.00"), hostel_fee=Decimal("15000.00"), other_fee=Decimal("5000.00"),
    )


def test_fee_structure_total_is_sum_of_parts(fee_structure):
    assert fee_structure.total == Decimal("60000.00")


def test_summary_with_no_payments_shows_full_balance(api_client, student, fee_structure):
    client = auth(api_client, student)
    resp = client.get("/api/fees/summary/")
    assert resp.status_code == 200
    assert resp.data["total_due"] == "60000.00"
    assert resp.data["total_paid"] == "0.00"
    assert resp.data["balance"] == "60000.00"


def test_summary_reflects_partial_payment(api_client, student, fee_structure):
    FeePayment.objects.create(
        student=student.student_profile, fee_structure=fee_structure,
        amount_paid=Decimal("25000.00"), status=FeePayment.Status.SUCCESS,
    )
    client = auth(api_client, student)
    resp = client.get("/api/fees/summary/")
    assert resp.data["total_paid"] == "25000.00"
    assert resp.data["balance"] == "35000.00"


def test_failed_payment_does_not_count_toward_balance(api_client, student, fee_structure):
    FeePayment.objects.create(
        student=student.student_profile, fee_structure=fee_structure,
        amount_paid=Decimal("60000.00"), status=FeePayment.Status.FAILED,
    )
    client = auth(api_client, student)
    resp = client.get("/api/fees/summary/")
    assert resp.data["total_paid"] == "0.00"
    assert resp.data["balance"] == "60000.00"


def test_student_cannot_view_another_students_summary(api_client, student, other_student, fee_structure):
    client = auth(api_client, student)
    resp = client.get(f"/api/fees/summary/?student={other_student.student_profile.id}")
    # A plain student has no override for ?student=, they only ever see their own -
    # the view's staff-role branch is what would apply here, and this account
    # isn't staff, so it falls through to "own profile only" behaviour.
    assert resp.data["student_id"] == student.student_profile.id


def test_parent_can_view_own_childs_summary_but_not_others(api_client, parent, student, other_student, fee_structure):
    client = auth(api_client, parent)
    resp = client.get(f"/api/fees/summary/?student={student.student_profile.id}")
    assert resp.status_code == 200

    resp = client.get(f"/api/fees/summary/?student={other_student.student_profile.id}")
    assert resp.status_code == 403


def test_dept_admin_can_view_summary_for_own_department_student_only(api_client, dept_admin, student, other_student, fee_structure):
    client = auth(api_client, dept_admin)
    resp = client.get(f"/api/fees/summary/?student={student.student_profile.id}")
    assert resp.status_code == 200

    resp = client.get(f"/api/fees/summary/?student={other_student.student_profile.id}")
    assert resp.status_code == 403


def test_non_teaching_staff_cannot_record_payments(api_client, non_teaching, student, fee_structure):
    client = auth(api_client, non_teaching)
    resp = client.post("/api/fees/payments/", {
        "student": student.student_profile.id, "fee_structure": fee_structure.id,
        "amount_paid": "1000.00", "status": "SUCCESS",
    }, format="json")
    assert resp.status_code == 403
