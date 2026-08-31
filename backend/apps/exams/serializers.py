from rest_framework import serializers
from .models import Exam, Grade


class ExamSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source="course.code", read_only=True)

    class Meta:
        model = Exam
        fields = "__all__"


class GradeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    roll_number = serializers.CharField(source="student.roll_number", read_only=True)
    exam_name = serializers.CharField(source="exam.name", read_only=True)
    max_marks = serializers.DecimalField(source="exam.max_marks", max_digits=6, decimal_places=2, read_only=True)

    class Meta:
        model = Grade
        fields = "__all__"
        read_only_fields = ["graded_by"]

    def validate(self, attrs):
        exam = attrs.get("exam") or getattr(self.instance, "exam", None)
        marks = attrs.get("marks_obtained", getattr(self.instance, "marks_obtained", None))
        if exam is not None and marks is not None:
            if marks < 0:
                raise serializers.ValidationError({"marks_obtained": "Marks cannot be negative."})
            if marks > exam.max_marks:
                raise serializers.ValidationError(
                    {"marks_obtained": f"Marks cannot exceed this exam's maximum of {exam.max_marks}."}
                )
        return attrs
