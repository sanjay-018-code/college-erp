from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Department, Course, TimetableSlot, CourseMaterial
from .serializers import DepartmentSerializer, CourseSerializer, TimetableSlotSerializer, CourseMaterialSerializer
from apps.accounts.permissions import IsAdmin, IsAdminOrReadOnly
from apps.accounts.utils import get_staff_department_id


class DepartmentViewSet(viewsets.ModelViewSet):
    """Anyone signed in can read the department list. Only a Super Admin can
    create or delete a department; a Super Admin, or the department's own
    Department Admin / HOD, can edit it (assign a HOD, rename it, etc.)."""
    queryset = Department.objects.select_related("head_of_department__user", "dept_admin").all()
    serializer_class = DepartmentSerializer
    filter_backends = [SearchFilter]
    search_fields = ["name", "code"]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        if self.request.method == "POST" or self.action == "destroy":
            return [IsAdmin()]
        return [IsAdminOrReadOnly()]

    def perform_update(self, serializer):
        user = self.request.user
        if not user.is_admin and serializer.instance.id != get_staff_department_id(user):
            raise PermissionDenied("You can only update your own department.")
        serializer.save()


class CourseViewSet(viewsets.ModelViewSet):
    """Anyone signed in can browse the course catalogue. Department Admins/HODs
    can only create, edit, or delete courses that belong to their own department."""
    queryset = Course.objects.select_related("department", "faculty__user").all()
    serializer_class = CourseSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["department", "semester", "faculty"]
    search_fields = ["name", "code"]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrReadOnly()]

    def _check_department_scope(self, department_id):
        user = self.request.user
        if not user.is_admin and department_id != get_staff_department_id(user):
            raise PermissionDenied("You can only manage courses in your own department.")

    def perform_create(self, serializer):
        self._check_department_scope(serializer.validated_data["department"].id)
        serializer.save()

    def perform_update(self, serializer):
        department = serializer.validated_data.get("department", serializer.instance.department)
        self._check_department_scope(department.id)
        serializer.save()

    def perform_destroy(self, instance):
        self._check_department_scope(instance.department_id)
        instance.delete()


class TimetableSlotViewSet(viewsets.ModelViewSet):
    queryset = TimetableSlot.objects.select_related("course__department").all()
    serializer_class = TimetableSlotSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["course", "day"]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrReadOnly()]


class CourseMaterialViewSet(viewsets.ModelViewSet):
    """Course-level syllabus/notes/assignments/video links. Any signed-in user can
    view them; only the faculty member teaching the course (or an admin-level
    role) can upload or remove one."""
    queryset = CourseMaterial.objects.select_related("course", "uploaded_by__user").all()
    serializer_class = CourseMaterialSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["course", "material_type"]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def _check_course_scope(self, course):
        user = self.request.user
        if user.is_admin or user.can_manage_department:
            return
        faculty_profile = getattr(user, "faculty_profile", None)
        if not faculty_profile or course.faculty_id != faculty_profile.id:
            raise PermissionDenied("You can only manage materials for courses you teach.")

    def perform_create(self, serializer):
        self._check_course_scope(serializer.validated_data["course"])
        faculty_profile = getattr(self.request.user, "faculty_profile", None)
        serializer.save(uploaded_by=faculty_profile)

    def perform_update(self, serializer):
        self._check_course_scope(serializer.instance.course)
        serializer.save()

    def perform_destroy(self, instance):
        self._check_course_scope(instance.course)
        instance.delete()
