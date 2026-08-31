from rest_framework import serializers
from .models import AttendanceRecord


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    roll_number = serializers.CharField(source="student.roll_number", read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = "__all__"
        read_only_fields = ["marked_by"]


class BulkAttendanceSerializer(serializers.Serializer):
    """Mark attendance for a whole class in one request - typical faculty workflow."""
    course = serializers.IntegerField()
    date = serializers.DateField()
    records = serializers.ListField(
        child=serializers.DictField(), allow_empty=False,
        help_text="[{'student': id, 'status': 'PRESENT'}, ...]"
    )
