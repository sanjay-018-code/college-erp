from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.db import connections
from django.db.utils import OperationalError
from django.http import JsonResponse
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView


def health_check(request):
    """Liveness/readiness probe: verifies the process is up and the DB is reachable."""
    db_ok = True
    try:
        connections["default"].cursor()
    except OperationalError:
        db_ok = False
    status_code = 200 if db_ok else 503
    return JsonResponse({"status": "ok" if db_ok else "unhealthy", "database": db_ok}, status=status_code)


urlpatterns = [
    path("api/health/", health_check, name="health-check"),
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/students/", include("apps.students.urls")),
    path("api/faculty/", include("apps.faculty.urls")),
    path("api/academics/", include("apps.academics.urls")),
    path("api/attendance/", include("apps.attendance.urls")),
    path("api/exams/", include("apps.exams.urls")),
    path("api/fees/", include("apps.fees.urls")),
    path("api/notices/", include("apps.notices.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
