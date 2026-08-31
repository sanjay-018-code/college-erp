from decimal import Decimal
from django.db.models import Sum
from rest_framework import viewsets, permissions, views
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import FeeStructure, FeePayment
from .serializers import FeeStructureSerializer, FeePaymentSerializer
from apps.accounts.permissions import IsSuperAdminOrDeptManager, IsAdminOrReadOnly
from apps.accounts.utils import get_linked_student_profile_ids, get_staff_department_id
from apps.students.models import StudentProfile


class FeeStructureViewSet(viewsets.ModelViewSet):
    queryset = FeeStructure.objects.select_related("department").all()
    serializer_class = FeeStructureSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["department", "semester", "academic_year"]

    def perform_create(self, serializer):
        user = self.request.user
        department = serializer.validated_data.get("department")
        if not user.is_admin and (not department or department.id != get_staff_department_id(user)):
            raise PermissionDenied("You can only set up fee structures for your own department.")
        serializer.save()


class FeePaymentViewSet(viewsets.ModelViewSet):
    queryset = FeePayment.objects.select_related("student__user", "fee_structure").all()
    serializer_class = FeePaymentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "status", "fee_structure"]

    def get_permissions(self):
        # Payments are recorded manually by staff (no online gateway): a Super
        # Admin or a Department Admin/HOD (scoped to their own department) can
        # create/update/delete; students and parents can only view their own.
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsSuperAdminOrDeptManager()]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.is_admin:
            return qs
        if user.can_manage_department:
            dept_id = get_staff_department_id(user)
            return qs.filter(student__department_id=dept_id) if dept_id else qs.none()
        if user.is_faculty:
            return qs
        if user.is_student:
            return qs.filter(student__user=user)
        if user.is_parent:
            return qs.filter(student_id__in=get_linked_student_profile_ids(user))
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        student = serializer.validated_data["student"]
        if not user.is_admin and student.department_id != get_staff_department_id(user):
            raise PermissionDenied("You can only record payments for students in your own department.")
        serializer.save()


def _fee_summary_for(student):
    """Every fee structure that applies to the student's department, how much
    they've successfully paid against each, and the outstanding balance."""
    structures = FeeStructure.objects.filter(department_id=student.department_id).order_by("semester")
    successful_payments = FeePayment.objects.filter(student=student, status=FeePayment.Status.SUCCESS)

    total_due = sum((s.total for s in structures), Decimal("0.00"))
    total_paid = successful_payments.aggregate(total=Sum("amount_paid"))["total"] or Decimal("0.00")

    breakdown = []
    for structure in structures:
        paid = successful_payments.filter(fee_structure=structure).aggregate(
            total=Sum("amount_paid")
        )["total"] or Decimal("0.00")
        breakdown.append({
            "fee_structure_id": structure.id,
            "semester": structure.semester,
            "academic_year": structure.academic_year,
            "total": str(structure.total),
            "paid": str(paid),
            "balance": str(structure.total - paid),
        })

    return {
        "student_id": student.id,
        "roll_number": student.roll_number,
        "student_name": student.user.get_full_name(),
        "total_due": str(total_due),
        "total_paid": str(total_paid),
        "balance": str(total_due - total_paid),
        "breakdown": breakdown,
    }


class FeeSummaryView(views.APIView):
    """
    GET /api/fees/summary/            - a student sees their own summary
    GET /api/fees/summary/?student=ID - staff/dept-manager (own dept) or a
                                          parent (their own linked child) sees
                                          a specific student's summary
    GET /api/fees/summary/            - a parent with no ?student= gets a list,
                                          one summary per linked child
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        student_id = request.query_params.get("student")

        if user.is_student:
            profile = getattr(user, "student_profile", None)
            if not profile:
                raise NotFound("No student profile is attached to this account.")
            return Response(_fee_summary_for(profile))

        if user.is_parent:
            allowed_ids = get_linked_student_profile_ids(user)
            if student_id:
                if int(student_id) not in allowed_ids:
                    raise PermissionDenied("You can only view fee summaries for your own linked children.")
                profile = StudentProfile.objects.select_related("user", "department").get(id=student_id)
                return Response(_fee_summary_for(profile))
            profiles = StudentProfile.objects.select_related("user", "department").filter(id__in=allowed_ids)
            return Response([_fee_summary_for(p) for p in profiles])

        # Staff / admin-level roles need an explicit student id.
        if not student_id:
            raise NotFound("Pass ?student=<id> to look up a specific student's fee summary.")
        try:
            profile = StudentProfile.objects.select_related("user", "department").get(id=student_id)
        except StudentProfile.DoesNotExist:
            raise NotFound("Student not found.")
        if not user.is_admin and not user.is_faculty and profile.department_id != get_staff_department_id(user):
            raise PermissionDenied("You can only view fee summaries for students in your own department.")
        return Response(_fee_summary_for(profile))
