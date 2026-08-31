from django.conf import settings
from django.db import models


class Notice(models.Model):
    class Audience(models.TextChoices):
        ALL = "ALL", "Everyone"
        STUDENTS = "STUDENTS", "Students only"
        FACULTY = "FACULTY", "Faculty only"
        STAFF = "STAFF", "All staff (teaching & non-teaching)"
        PARENTS = "PARENTS", "Parents only"

    title = models.CharField(max_length=200)
    body = models.TextField()
    audience = models.CharField(max_length=10, choices=Audience.choices, default=Audience.ALL)
    posted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="notices_posted")
    attachment = models.FileField(upload_to="notices/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_urgent = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["audience", "-created_at"])]

    def __str__(self):
        return self.title
