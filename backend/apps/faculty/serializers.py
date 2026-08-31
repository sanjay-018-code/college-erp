from rest_framework import serializers
from .models import FacultyProfile


class FacultyProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)
    role_display = serializers.CharField(source="user.get_role_display", read_only=True)

    class Meta:
        model = FacultyProfile
        fields = "__all__"
