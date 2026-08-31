from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import ParentStudentLink

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds role and name info directly into the JWT payload/response."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["full_name"] = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["role"] = self.user.role
        data["username"] = self.user.username
        data["full_name"] = self.user.get_full_name()
        data["user_id"] = self.user.id
        return data


class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "role_display", "phone_number", "profile_picture", "is_active_account",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined"]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role", "phone_number", "password"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)


class ParentStudentLinkSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.get_full_name", read_only=True)
    student_name = serializers.CharField(source="student.get_full_name", read_only=True)
    student_roll_number = serializers.CharField(source="student.student_profile.roll_number", read_only=True, default=None)

    class Meta:
        model = ParentStudentLink
        fields = ["id", "parent", "student", "parent_name", "student_name", "student_roll_number"]

    def validate_parent(self, value):
        if value.role != User.Role.PARENT:
            raise serializers.ValidationError("Selected user is not a parent account.")
        return value

    def validate_student(self, value):
        if value.role != User.Role.STUDENT:
            raise serializers.ValidationError("Selected user is not a student account.")
        return value
