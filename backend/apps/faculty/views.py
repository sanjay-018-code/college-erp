from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from .models import FacultyProfile
from .serializers import FacultyProfileSerializer
from apps.accounts.permissions import IsAdminOrReadOnly
from apps.accounts.utils import get_staff_department_id


class FacultyProfileViewSet(viewsets.ModelViewSet):
    """Doubles as the staff directory: filter by ?user__role=NON_TEACHING (or
    HOD / ADVISOR / DEPT_ADMIN / FACULTY) to list a particular kind of staff."""
    queryset = FacultyProfile.objects.select_related("user", "department").all()
    serializer_class = FacultyProfileSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["department", "user__role"]
    search_fields = ["employee_id", "user__first_name", "user__last_name"]

    def perform_create(self, serializer):
        user = self.request.user
        department = serializer.validated_data.get("department")
        if not user.is_admin and (not department or department.id != get_staff_department_id(user)):
            raise PermissionDenied("You can only add staff to your own department.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        department = serializer.validated_data.get("department", serializer.instance.department)
        if not user.is_admin and (not department or department.id != get_staff_department_id(user)):
            raise PermissionDenied("You can only manage staff in your own department.")
        serializer.save()
