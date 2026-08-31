from django.utils import timezone
from rest_framework import serializers
from .models import StudentProfile, CourseEnrollment, AdvisorAssignment, BonafideRequest


class StudentProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    advisor_name = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = "__all__"

    def get_advisor_name(self, obj):
        current_year = timezone.now().year
        assignment = obj.advisor_assignments.filter(academic_year=current_year).select_related("advisor__user").first()
        return assignment.advisor.user.get_full_name() if assignment else None


class CourseEnrollmentSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source="course.name", read_only=True)
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    roll_number = serializers.CharField(source="student.roll_number", read_only=True)

    class Meta:
        model = CourseEnrollment
        fields = "__all__"


class AdvisorAssignmentSerializer(serializers.ModelSerializer):
    advisor_name = serializers.CharField(source="advisor.user.get_full_name", read_only=True)
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    roll_number = serializers.CharField(source="student.roll_number", read_only=True)

    class Meta:
        model = AdvisorAssignment
        fields = "__all__"

    def validate_advisor(self, value):
        if value.user.role != "ADVISOR":
            raise serializers.ValidationError("Selected staff member does not have the Advisor role.")
        return value


class BonafideRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    roll_number = serializers.CharField(source="student.roll_number", read_only=True)
    department_name = serializers.CharField(source="student.department.name", read_only=True)
    processed_by_name = serializers.CharField(source="processed_by.get_full_name", read_only=True, default=None)

    class Meta:
        model = BonafideRequest
        fields = "__all__"
        read_only_fields = ["status", "processed_by", "processed_on", "student"]
