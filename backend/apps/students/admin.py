from django.contrib import admin
from .models import StudentProfile, CourseEnrollment, AdvisorAssignment, BonafideRequest

admin.site.register(StudentProfile)
admin.site.register(CourseEnrollment)
admin.site.register(AdvisorAssignment)
admin.site.register(BonafideRequest)
