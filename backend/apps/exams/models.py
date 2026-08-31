from django.db import models


class Exam(models.Model):
    class ExamType(models.TextChoices):
        MIDTERM = "MIDTERM", "Midterm"
        FINAL = "FINAL", "Final"
        QUIZ = "QUIZ", "Quiz"
        ASSIGNMENT = "ASSIGNMENT", "Assignment"

    course = models.ForeignKey("academics.Course", on_delete=models.CASCADE, related_name="exams")
    name = models.CharField(max_length=100)
    exam_type = models.CharField(max_length=20, choices=ExamType.choices, default=ExamType.MIDTERM)
    date = models.DateField()
    max_marks = models.DecimalField(max_digits=6, decimal_places=2, default=100)
    weightage_percent = models.DecimalField(max_digits=5, decimal_places=2, default=100,
                                             help_text="Contribution of this exam to final grade")

    def __str__(self):
        return f"{self.course.code} - {self.name}"


class Grade(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="grades")
    student = models.ForeignKey("students.StudentProfile", on_delete=models.CASCADE, related_name="grades")
    marks_obtained = models.DecimalField(max_digits=6, decimal_places=2)
    remarks = models.CharField(max_length=255, blank=True)
    graded_by = models.ForeignKey("faculty.FacultyProfile", on_delete=models.SET_NULL, null=True, related_name="grades_given")
    graded_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("exam", "student")
        ordering = ["-graded_at"]
        indexes = [models.Index(fields=["student", "exam"])]

    def __str__(self):
        return f"{self.student.roll_number} - {self.exam} - {self.marks_obtained}"
