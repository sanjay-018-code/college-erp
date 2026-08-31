from rest_framework import serializers
from .models import Department, Course, TimetableSlot, CourseMaterial


class DepartmentSerializer(serializers.ModelSerializer):
    hod_name = serializers.CharField(source="head_of_department.user.get_full_name", read_only=True, default=None)
    dept_admin_name = serializers.CharField(source="dept_admin.get_full_name", read_only=True, default=None)
    student_count = serializers.IntegerField(source="students.count", read_only=True)
    faculty_count = serializers.IntegerField(source="faculty_members.count", read_only=True)
    course_count = serializers.IntegerField(source="courses.count", read_only=True)

    class Meta:
        model = Department
        fields = "__all__"

    def validate_head_of_department(self, value):
        if value is not None and value.user.role != "HOD":
            raise serializers.ValidationError(
                "Head of department must be a staff account with the Head of Department role."
            )
        return value

    def validate_dept_admin(self, value):
        if value is not None and value.role != "DEPT_ADMIN":
            raise serializers.ValidationError(
                "This field must be a staff account with the Department Admin role."
            )
        return value


class CourseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    faculty_name = serializers.CharField(source="faculty.user.get_full_name", read_only=True, default=None)

    class Meta:
        model = Course
        fields = "__all__"


class TimetableSlotSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source="course.code", read_only=True)

    class Meta:
        model = TimetableSlot
        fields = "__all__"


class CourseMaterialSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source="course.code", read_only=True)
    uploaded_by_name = serializers.CharField(source="uploaded_by.user.get_full_name", read_only=True, default=None)

    class Meta:
        model = CourseMaterial
        fields = "__all__"
        read_only_fields = ["uploaded_by"]
