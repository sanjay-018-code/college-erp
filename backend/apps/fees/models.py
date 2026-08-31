from django.db import models


class FeeStructure(models.Model):
    department = models.ForeignKey("academics.Department", on_delete=models.CASCADE, related_name="fee_structures")
    semester = models.PositiveSmallIntegerField()
    academic_year = models.CharField(max_length=9, help_text="e.g. 2026-2027")
    tuition_fee = models.DecimalField(max_digits=10, decimal_places=2)
    hostel_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        unique_together = ("department", "semester", "academic_year")

    @property
    def total(self):
        return self.tuition_fee + self.hostel_fee + self.other_fee

    def __str__(self):
        return f"{self.department.code} Sem{self.semester} {self.academic_year}"


class FeePayment(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    student = models.ForeignKey("students.StudentProfile", on_delete=models.CASCADE, related_name="fee_payments")
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.PROTECT, related_name="payments")
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SUCCESS)
    # Payments are recorded manually by admin/staff (e.g. after cash/bank-transfer
    # receipt), not via an online payment gateway.
    remarks = models.CharField(max_length=255, blank=True, help_text="e.g. receipt number, mode of payment")
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["student", "status"])]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.student.roll_number} - {self.amount_paid} - {self.status}"
