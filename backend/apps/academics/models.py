from django.conf import settings
from django.db import models


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)
    description = models.TextField(blank=True)
    head_of_department = models.ForeignKey(
        "faculty.FacultyProfile", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="headed_department",
        limit_choices_to={"user__role": "HOD"},
        help_text="Must be a staff member whose account role is Head of Department.",
    )
    dept_admin = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="administered_departments",
        limit_choices_to={"role": "DEPT_ADMIN"},
        help_text="Account with the Department Admin role that manages this department's records.",
    )

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class Course(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="courses")
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=20, unique=True)
    credits = models.PositiveSmallIntegerField(default=3)
    semester = models.PositiveSmallIntegerField()
    description = models.TextField(blank=True)
    faculty = models.ForeignKey(
        "faculty.FacultyProfile", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="courses_taught"
    )

    class Meta:
        ordering = ["semester", "code"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class TimetableSlot(models.Model):
    class Day(models.TextChoices):
        MON = "MON", "Monday"
        TUE = "TUE", "Tuesday"
        WED = "WED", "Wednesday"
        THU = "THU", "Thursday"
        FRI = "FRI", "Friday"
        SAT = "SAT", "Saturday"

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="timetable_slots")
    day = models.CharField(max_length=3, choices=Day.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ["day", "start_time"]
        indexes = [models.Index(fields=["day", "start_time"])]

    def __str__(self):
        return f"{self.course.code} {self.day} {self.start_time}-{self.end_time}"


class CourseMaterial(models.Model):
    """Syllabus, notes, assignments, or video links a faculty member shares with
    everyone enrolled in one of their courses."""

    class MaterialType(models.TextChoices):
        SYLLABUS = "SYLLABUS", "Syllabus"
        NOTES = "NOTES", "Notes"
        ASSIGNMENT = "ASSIGNMENT", "Assignment"
        VIDEO = "VIDEO", "Video link"
        OTHER = "OTHER", "Other"

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="materials")
    title = models.CharField(max_length=200)
    material_type = models.CharField(max_length=20, choices=MaterialType.choices, default=MaterialType.NOTES)
    file = models.FileField(upload_to="course_materials/", blank=True, null=True)
    external_link = models.URLField(blank=True)
    uploaded_by = models.ForeignKey(
        "faculty.FacultyProfile", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="uploaded_materials"
    )
    uploaded_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_on"]

    def __str__(self):
        return f"{self.course.code} - {self.title}"
