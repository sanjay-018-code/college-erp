from rest_framework.routers import DefaultRouter
from .views import ExamViewSet, GradeViewSet

router = DefaultRouter()
router.register("exams", ExamViewSet)
router.register("grades", GradeViewSet)

urlpatterns = router.urls
