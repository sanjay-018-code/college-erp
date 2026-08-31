from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import FeeStructureViewSet, FeePaymentViewSet, FeeSummaryView

router = DefaultRouter()
router.register("structures", FeeStructureViewSet)
router.register("payments", FeePaymentViewSet)

urlpatterns = [
    path("summary/", FeeSummaryView.as_view(), name="fee-summary"),
] + router.urls
