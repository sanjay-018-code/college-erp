from rest_framework.routers import DefaultRouter
from .views import DepartmentViewSet, CourseViewSet, TimetableSlotViewSet, CourseMaterialViewSet

router = DefaultRouter()
router.register("departments", DepartmentViewSet)
router.register("courses", CourseViewSet)
router.register("timetable", TimetableSlotViewSet)
router.register("materials", CourseMaterialViewSet)

urlpatterns = router.urls
