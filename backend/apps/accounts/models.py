from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
        DEPT_ADMIN = "DEPT_ADMIN", "Department Admin"
        HOD = "HOD", "Head of Department"
        ADVISOR = "ADVISOR", "Advisor / Mentor"
        FACULTY = "FACULTY", "Faculty"
        NON_TEACHING = "NON_TEACHING", "Non-Teaching Staff"
        STUDENT = "STUDENT", "Student"
        PARENT = "PARENT", "Parent"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)

    # Roles that get a staff/faculty profile (apps.faculty.FacultyProfile) with an
    # employee id, department, and designation - i.e. everyone who works at the
    # college rather than studies there or is related to a student.
    STAFF_ROLES = (Role.HOD, Role.ADVISOR, Role.FACULTY, Role.NON_TEACHING, Role.DEPT_ADMIN)
    # Roles that manage a single department's records (students, faculty, courses,
    # fee structures, bonafide requests, ...) scoped to that department only.
    DEPARTMENT_MANAGER_ROLES = (Role.DEPT_ADMIN, Role.HOD)
    # Roles that carry teaching responsibilities and therefore mark attendance /
    # enter grades / upload course material, in addition to plain FACULTY.
    TEACHING_ROLES = (Role.FACULTY, Role.HOD, Role.ADVISOR)
    phone_number = models.CharField(max_length=15, blank=True)
    profile_picture = models.ImageField(upload_to="profiles/", blank=True, null=True)
    is_active_account = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    # --- role checks -----------------------------------------------------
    @property
    def is_super_admin(self):
        return self.role == self.Role.SUPER_ADMIN

    @property
    def is_dept_admin(self):
        return self.role == self.Role.DEPT_ADMIN

    @property
    def is_hod(self):
        return self.role == self.Role.HOD

    @property
    def is_advisor(self):
        return self.role == self.Role.ADVISOR

    @property
    def is_non_teaching(self):
        return self.role == self.Role.NON_TEACHING

    @property
    def is_admin(self):
        """Full, system-wide administrative rights (kept for backwards compatibility
        with existing permission checks - historically this was the only admin role)."""
        return self.role == self.Role.SUPER_ADMIN

    @property
    def is_faculty(self):
        """Anyone with teaching responsibilities: plain faculty, HODs, and advisors."""
        return self.role in self.TEACHING_ROLES

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT

    @property
    def is_parent(self):
        return self.role == self.Role.PARENT

    @property
    def can_manage_department(self):
        """Department-scoped admin rights: department admins and HODs can manage
        their own department's students, faculty, courses, and fee structures."""
        return self.role in self.DEPARTMENT_MANAGER_ROLES

    @property
    def is_staff_role(self):
        """Any kind of employee account (teaching or not), used for staff directory
        listings and the STAFF notice audience."""
        return self.role in self.STAFF_ROLES


class ParentStudentLink(models.Model):
    """Links a parent account to one or more student accounts."""
    parent = models.ForeignKey(User, related_name="linked_students", on_delete=models.CASCADE,
                                limit_choices_to={"role": User.Role.PARENT})
    student = models.ForeignKey(User, related_name="linked_parents", on_delete=models.CASCADE,
                                 limit_choices_to={"role": User.Role.STUDENT})

    class Meta:
        unique_together = ("parent", "student")

    def __str__(self):
        return f"{self.parent} -> {self.student}"
