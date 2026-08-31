from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import generics, permissions, status, filters, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django_filters.rest_framework import DjangoFilterBackend

from .models import ParentStudentLink
from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer, UserCreateSerializer,
    ChangePasswordSerializer, ParentStudentLinkSerializer,
)
from .permissions import IsSuperAdminOrDeptManager
from .utils import get_staff_department_id

User = get_user_model()

# Roles a Department Admin / HOD is allowed to create or manage within their own
# department. They can never create another admin-level account - only a Super
# Admin can do that.
DEPT_MANAGEABLE_ROLES = [
    User.Role.FACULTY, User.Role.ADVISOR, User.Role.NON_TEACHING,
    User.Role.STUDENT, User.Role.PARENT,
]


class CustomTokenObtainPairView(TokenObtainPairView):
    """Login endpoint - returns access/refresh tokens plus role and name."""
    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response({"detail": "Old password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"detail": "Password updated successfully."})


class UserListCreateView(generics.ListCreateAPIView):
    """Super Admin: full access to every account.
    Department Admin / HOD: can list and create accounts (faculty, advisors,
    non-teaching staff, students, parents) that belong to their own department -
    they can never create another admin-level account."""
    queryset = User.objects.all().order_by("-date_joined")
    permission_classes = [IsSuperAdminOrDeptManager]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["role", "is_active_account"]
    search_fields = ["username", "first_name", "last_name", "email"]

    def get_serializer_class(self):
        return UserCreateSerializer if self.request.method == "POST" else UserSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_admin:
            return qs
        dept_id = get_staff_department_id(user)
        if not dept_id:
            return qs.none()
        return qs.filter(
            Q(faculty_profile__department_id=dept_id) | Q(student_profile__department_id=dept_id)
        )

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_admin and serializer.validated_data.get("role") not in DEPT_MANAGEABLE_ROLES:
            raise PermissionDenied(
                "Department Admins and HODs can only create faculty, advisor, "
                "non-teaching, student, or parent accounts."
            )
        serializer.save()


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsSuperAdminOrDeptManager]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_admin:
            return qs
        dept_id = get_staff_department_id(user)
        if not dept_id:
            return qs.none()
        return qs.filter(
            Q(faculty_profile__department_id=dept_id) | Q(student_profile__department_id=dept_id)
        )


class ParentStudentLinkViewSet(viewsets.ModelViewSet):
    """Admin-level management of which parent accounts see which student's data."""
    queryset = ParentStudentLink.objects.select_related("parent", "student", "student__student_profile").all()
    serializer_class = ParentStudentLinkSerializer
    permission_classes = [IsSuperAdminOrDeptManager]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["parent", "student"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_admin:
            return qs
        dept_id = get_staff_department_id(user)
        if not dept_id:
            return qs.none()
        return qs.filter(student__student_profile__department_id=dept_id)


class MyChildrenView(APIView):
    """For a logged-in PARENT: list the student accounts linked to them."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_parent:
            return Response({"detail": "Only parent accounts have linked children."}, status=status.HTTP_403_FORBIDDEN)
        links = ParentStudentLink.objects.filter(parent=request.user).select_related(
            "student", "student__student_profile", "student__student_profile__department"
        )
        data = []
        for link in links:
            profile = getattr(link.student, "student_profile", None)
            data.append({
                "student_user_id": link.student.id,
                "student_profile_id": profile.id if profile else None,
                "full_name": link.student.get_full_name(),
                "roll_number": profile.roll_number if profile else None,
                "department_name": profile.department.name if profile and profile.department else None,
                "semester": profile.semester if profile else None,
            })
        return Response(data)
