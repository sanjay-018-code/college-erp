from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, ParentStudentLink


class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "first_name", "last_name", "role", "is_active_account", "is_staff")
    list_filter = ("role", "is_active_account", "is_staff")
    fieldsets = BaseUserAdmin.fieldsets + (
        ("ERP Info", {"fields": ("role", "phone_number", "profile_picture", "is_active_account")}),
    )


admin.site.register(User, UserAdmin)
admin.site.register(ParentStudentLink)
