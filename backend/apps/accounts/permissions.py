from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Super Admin only - full, system-wide access."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)


class IsSuperAdminOrDeptManager(permissions.BasePermission):
    """Super Admin (all departments) or Department Admin / HOD (their own department,
    enforced via queryset scoping in the view)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_admin or user.can_manage_department))


class IsFaculty(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_faculty)


class IsAdvisor(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_advisor)


class IsStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_student)


class IsAdminOrFaculty(permissions.BasePermission):
    """True for Super Admin, Department Admin, HOD, Advisor, and plain Faculty -
    i.e. anyone with staff-level teaching or department-management rights."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated
            and (user.is_admin or user.is_faculty or user.can_manage_department)
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    """Anyone authenticated can read; only admin-level roles (Super Admin,
    Department Admin, HOD) can write."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        user = request.user
        return bool(user and user.is_authenticated and (user.is_admin or user.can_manage_department))


class IsOwnerOrAdminOrFaculty(permissions.BasePermission):
    """Object-level: owner, admin-level roles, or faculty can access; others denied."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_admin or user.is_faculty or user.can_manage_department:
            return True
        owner_field = getattr(obj, "user", None) or getattr(obj, "student", None)
        return owner_field == user
