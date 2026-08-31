from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AttendanceRecordViewSet, BulkAttendanceView

router = DefaultRouter()
router.register("records", AttendanceRecordViewSet)

urlpatterns = router.urls + [
    path("bulk-mark/", BulkAttendanceView.as_view(), name="bulk-attendance"),
]
