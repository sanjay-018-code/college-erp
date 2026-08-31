from django.contrib import admin
from .models import Department, Course, TimetableSlot, CourseMaterial

admin.site.register(Department)
admin.site.register(Course)
admin.site.register(TimetableSlot)
admin.site.register(CourseMaterial)
