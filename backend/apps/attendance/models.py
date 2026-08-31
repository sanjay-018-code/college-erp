from django.db import models


class AttendanceRecord(models.Model):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        ABSENT = "ABSENT", "Absent"
        LATE = "LATE", "Late"
        EXCUSED = "EXCUSED", "Excused"

    student = models.ForeignKey("students.StudentProfile", on_delete=models.CASCADE, related_name="attendance_records")
    course = models.ForeignKey("academics.Course", on_delete=models.CASCADE, related_name="attendance_records")
    date = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PRESENT)
    marked_by = models.ForeignKey("faculty.FacultyProfile", on_delete=models.SET_NULL, null=True, related_name="marked_attendance")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("student", "course", "date")
        indexes = [
            models.Index(fields=["student", "course", "date"]),
            models.Index(fields=["course", "date"]),
        ]
        ordering = ["-date"]

    def __str__(self):
        return f"{self.student.roll_number} - {self.course.code} - {self.date} - {self.status}"
