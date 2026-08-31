from rest_framework.routers import DefaultRouter
from .views import (
    StudentProfileViewSet, CourseEnrollmentViewSet,
    AdvisorAssignmentViewSet, BonafideRequestViewSet,
)

router = DefaultRouter()
router.register("profiles", StudentProfileViewSet)
router.register("enrollments", CourseEnrollmentViewSet)
router.register("advisor-assignments", AdvisorAssignmentViewSet)
router.register("bonafide-requests", BonafideRequestViewSet)

urlpatterns = router.urls
