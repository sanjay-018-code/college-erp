from django.contrib import admin
from .models import FeeStructure, FeePayment


@admin.register(FeeStructure)
class FeeStructureAdmin(admin.ModelAdmin):
    list_display = ("department", "semester", "academic_year", "total")
    list_filter = ("department", "academic_year")


@admin.register(FeePayment)
class FeePaymentAdmin(admin.ModelAdmin):
    list_display = ("student", "fee_structure", "amount_paid", "status", "paid_at")
    list_filter = ("status", "fee_structure__academic_year")
    search_fields = ("student__roll_number", "student__user__first_name", "student__user__last_name", "remarks")
