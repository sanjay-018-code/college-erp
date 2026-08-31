from django.db import transaction
from rest_framework import viewsets, views, permissions, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import AttendanceRecord
from .serializers import AttendanceRecordSerializer, BulkAttendanceSerializer
from apps.accounts.permissions import IsAdminOrFaculty
from apps.accounts.utils import get_linked_student_profile_ids, get_staff_department_id
from apps.students.models import StudentProfile
from apps.academics.models import Course


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.select_related("student__user", "course").all()
    serializer_class = AttendanceRecordSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "course", "date", "status"]

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
        serializer.save(marked_by=faculty_profile)


class BulkAttendanceView(views.APIView):
    """POST a whole class's attendance for a given course+date at once."""
    permission_classes = [IsAdminOrFaculty]

    @transaction.atomic
    def post(self, request):
        serializer = BulkAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        course = Course.objects.get(pk=data["course"])
        faculty_profile = getattr(request.user, "faculty_profile", None)
        created, updated = 0, 0
        for row in data["records"]:
            obj, was_created = AttendanceRecord.objects.update_or_create(
                student_id=row["student"], course=course, date=data["date"],
                defaults={"status": row["status"], "marked_by": faculty_profile},
            )
            created += int(was_created)
            updated += int(not was_created)
        return Response(
            {"detail": f"{created} created, {updated} updated."},
            status=status.HTTP_201_CREATED,
        )
