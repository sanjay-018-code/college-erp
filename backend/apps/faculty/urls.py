from rest_framework.routers import DefaultRouter
from .views import FacultyProfileViewSet

router = DefaultRouter()
router.register("profiles", FacultyProfileViewSet)

urlpatterns = router.urls
