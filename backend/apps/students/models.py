from django.conf import settings
from django.db import models


class StudentProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="student_profile")
    roll_number = models.CharField(max_length=30, unique=True)
    department = models.ForeignKey("academics.Department", on_delete=models.SET_NULL, null=True, related_name="students")
    semester = models.PositiveSmallIntegerField(default=1)
    admission_year = models.PositiveSmallIntegerField()
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    guardian_name = models.CharField(max_length=100, blank=True)
    guardian_phone = models.CharField(max_length=15, blank=True)
    is_hostel_resident = models.BooleanField(default=False)

    class Meta:
        ordering = ["roll_number"]
        indexes = [models.Index(fields=["roll_number"]), models.Index(fields=["department", "semester"])]

    def __str__(self):
        return f"{self.roll_number} - {self.user.get_full_name()}"


class CourseEnrollment(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey("academics.Course", on_delete=models.CASCADE, related_name="enrollments")
    enrolled_on = models.DateField(auto_now_add=True)

    class Meta:
        unique_together = ("student", "course")

    def __str__(self):
        return f"{self.student.roll_number} -> {self.course.code}"


class AdvisorAssignment(models.Model):
    """Assigns a faculty member with the Advisor/Mentor role to look after a
    student for a given academic year - the advisor system used for mentoring,
    progress check-ins, and being the first point of contact for that student."""

    advisor = models.ForeignKey(
        "faculty.FacultyProfile", on_delete=models.CASCADE, related_name="advisees",
        limit_choices_to={"user__role": "ADVISOR"},
    )
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="advisor_assignments")
    academic_year = models.PositiveSmallIntegerField()
    remarks = models.TextField(blank=True)
    assigned_on = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ["-academic_year"]
        unique_together = ("student", "academic_year")

    def __str__(self):
        return f"{self.student.roll_number} -> {self.advisor.employee_id} ({self.academic_year})"


class BonafideRequest(models.Model):
    """A student's request for a bonafide/enrollment certificate, reviewed and
    approved (or rejected) by their department's HOD or Department Admin."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="bonafide_requests")
    purpose = models.CharField(max_length=200, help_text="e.g. Bank loan, passport application, bus pass")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    requested_on = models.DateTimeField(auto_now_add=True)
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="processed_bonafides",
    )
    processed_on = models.DateTimeField(null=True, blank=True)
    remarks = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["-requested_on"]

    def __str__(self):
        return f"{self.student.roll_number} - {self.purpose} ({self.status})"
