from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from .models import StudentProfile, CourseEnrollment, AdvisorAssignment, BonafideRequest
from .serializers import (
    StudentProfileSerializer, CourseEnrollmentSerializer,
    AdvisorAssignmentSerializer, BonafideRequestSerializer,
)
from apps.accounts.permissions import IsAdminOrFaculty
from apps.accounts.utils import get_linked_student_profile_ids, get_staff_department_id


class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.select_related("user", "department").all()
    serializer_class = StudentProfileSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["department", "semester", "admission_year"]
    search_fields = ["roll_number", "user__first_name", "user__last_name"]

    def get_permissions(self):
        # Anyone authenticated can read (filtered to what's relevant to them below);
        # only admin-level roles or faculty can create, update, or delete student records.
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrFaculty()]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.is_admin:
            return qs
        if user.can_manage_department:
            dept_id = get_staff_department_id(user)
            return qs.filter(department_id=dept_id) if dept_id else qs.none()
        if user.is_advisor:
            faculty_profile = getattr(user, "faculty_profile", None)
            if not faculty_profile:
                return qs.none()
            return qs.filter(advisor_assignments__advisor=faculty_profile).distinct()
        if user.is_faculty:
            return qs
        if user.is_student:
            return qs.filter(user=user)
        if user.is_parent:
            return qs.filter(id__in=get_linked_student_profile_ids(user))
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        department = serializer.validated_data.get("department")
        if user.can_manage_department and not user.is_admin:
            dept_id = get_staff_department_id(user)
            if not department or department.id != dept_id:
                raise PermissionDenied("You can only add students to your own department.")
        serializer.save()


class CourseEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = CourseEnrollment.objects.select_related("student__user", "course").all()
    serializer_class = CourseEnrollmentSerializer
    permission_classes = [IsAdminOrFaculty]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "course"]


class AdvisorAssignmentViewSet(viewsets.ModelViewSet):
    """Assigning advisors to students is a department-management action; advisors
    and students can only view their own assignments."""
    queryset = AdvisorAssignment.objects.select_related("advisor__user", "student__user").all()
    serializer_class = AdvisorAssignmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["advisor", "student", "academic_year"]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrFaculty()]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.is_admin:
            return qs
        if user.can_manage_department:
            dept_id = get_staff_department_id(user)
            return qs.filter(student__department_id=dept_id) if dept_id else qs.none()
        if user.is_advisor:
            faculty_profile = getattr(user, "faculty_profile", None)
            return qs.filter(advisor=faculty_profile) if faculty_profile else qs.none()
        if user.is_student:
            return qs.filter(student__user=user)
        if user.is_parent:
            return qs.filter(student_id__in=get_linked_student_profile_ids(user))
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.can_manage_department and not user.is_admin:
            dept_id = get_staff_department_id(user)
            student = serializer.validated_data["student"]
            if student.department_id != dept_id:
                raise PermissionDenied("You can only assign advisors within your own department.")
        serializer.save()


class BonafideRequestViewSet(viewsets.ModelViewSet):
    """Students raise a bonafide certificate request; their department's HOD,
    Department Admin, or a Super Admin approves or rejects it."""
    queryset = BonafideRequest.objects.select_related("student__user", "student__department", "processed_by").all()
    serializer_class = BonafideRequestSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "student"]

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.is_admin:
            return qs
        if user.can_manage_department:
            dept_id = get_staff_department_id(user)
            return qs.filter(student__department_id=dept_id) if dept_id else qs.none()
        if user.is_student:
            return qs.filter(student__user=user)
        if user.is_parent:
            return qs.filter(student_id__in=get_linked_student_profile_ids(user))
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        profile = getattr(user, "student_profile", None)
        if not profile:
            raise PermissionDenied("Only students can raise a bonafide request.")
        serializer.save(student=profile)

    def _set_status(self, request, new_status):
        user = request.user
        if not (user.is_admin or user.can_manage_department):
            raise PermissionDenied("Only a Department Admin, HOD, or Super Admin can process bonafide requests.")
        bonafide = self.get_object()
        bonafide.status = new_status
        bonafide.processed_by = user
        bonafide.processed_on = timezone.now()
        bonafide.remarks = request.data.get("remarks", bonafide.remarks)
        bonafide.save()
        return Response(BonafideRequestSerializer(bonafide).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._set_status(request, BonafideRequest.Status.APPROVED)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._set_status(request, BonafideRequest.Status.REJECTED)
