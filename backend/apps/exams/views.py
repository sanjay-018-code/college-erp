from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import Exam, Grade
from .serializers import ExamSerializer, GradeSerializer
from apps.accounts.permissions import IsAdminOrFaculty
from apps.accounts.utils import get_linked_student_profile_ids, get_staff_department_id


class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.select_related("course").all()
    serializer_class = ExamSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["course", "exam_type"]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrFaculty()]


class GradeViewSet(viewsets.ModelViewSet):
    queryset = Grade.objects.select_related("student__user", "exam__course").all()
    serializer_class = GradeSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "exam", "exam__course"]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrFaculty()]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.is_admin or user.is_faculty:
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
        faculty_profile = getattr(self.request.user, "faculty_profile", None)
        serializer.save(graded_by=faculty_profile)
