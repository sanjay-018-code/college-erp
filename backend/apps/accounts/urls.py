from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomTokenObtainPairView, MeView, ChangePasswordView, UserListCreateView, UserDetailView,
    ParentStudentLinkViewSet, MyChildrenView,
)

router = DefaultRouter()
router.register("parent-links", ParentStudentLinkViewSet)

urlpatterns = [
    path("login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("me/", MeView.as_view(), name="me"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("users/", UserListCreateView.as_view(), name="user-list"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
    path("my-children/", MyChildrenView.as_view(), name="my-children"),
    path("", include(router.urls)),
]
