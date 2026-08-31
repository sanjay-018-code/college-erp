def get_linked_student_profile_ids(user):
    """
    For a PARENT user, return the StudentProfile ids of their linked children.
    Import is local to avoid a circular import between accounts and students apps.
    """
    from apps.students.models import StudentProfile

    return list(
        StudentProfile.objects.filter(user__linked_parents__parent=user).values_list("id", flat=True)
    )


def get_staff_department_id(user):
    """
    For any staff-role user (Faculty, HOD, Advisor, Department Admin, Non-Teaching),
    return the department id from their FacultyProfile, or None if they don't have
    one yet. Import is local to avoid a circular import with the faculty app.
    """
    profile = getattr(user, "faculty_profile", None)
    return profile.department_id if profile else None


def scope_queryset_to_department(qs, user, department_field="department_id"):
    """
    Helper for viewsets: Super Admins see everything, Department Admins/HODs see
    only rows belonging to their own department, everyone else sees nothing
    (the caller should apply its own rules for students/parents/faculty first).
    """
    if user.is_admin:
        return qs
    if user.can_manage_department:
        dept_id = get_staff_department_id(user)
        if not dept_id:
            return qs.none()
        return qs.filter(**{department_field: dept_id})
    return qs.none()
