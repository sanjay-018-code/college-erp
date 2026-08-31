from django.db.models import Q
from rest_framework import viewsets, permissions
from .models import Notice
from .serializers import NoticeSerializer
from apps.accounts.permissions import IsAdminOrFaculty


class NoticeViewSet(viewsets.ModelViewSet):
    serializer_class = NoticeSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrFaculty()]

    def get_queryset(self):
        user = self.request.user
        audiences = Q(audience="ALL")
        if user.is_student:
            audiences |= Q(audience="STUDENTS")
        if user.is_parent:
            audiences |= Q(audience="PARENTS")
        if user.is_faculty:
            audiences |= Q(audience="FACULTY")
        if user.is_staff_role:
            audiences |= Q(audience="STAFF")
        return Notice.objects.filter(audiences)

    def perform_create(self, serializer):
        serializer.save(posted_by=self.request.user)
