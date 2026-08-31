from django.conf import settings
from django.db import models


class FacultyProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="faculty_profile")
    employee_id = models.CharField(max_length=30, unique=True)
    department = models.ForeignKey("academics.Department", on_delete=models.SET_NULL, null=True, related_name="faculty_members")
    designation = models.CharField(max_length=100, blank=True)
    date_joined = models.DateField(null=True, blank=True)
    qualification = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["employee_id"]
        indexes = [models.Index(fields=["employee_id"])]

    def __str__(self):
        return f"{self.employee_id} - {self.user.get_full_name()}"
