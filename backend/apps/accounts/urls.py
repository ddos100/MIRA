from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import (
    APIKeyDetailView,
    APIKeyListCreateView,
    InvitationListCreateView,
    MIRATokenObtainPairView,
    MeView,
    RegisterView,
    UserDetailView,
    UserListView,
    change_password,
)

urlpatterns = [
    # JWT
    path("login/", MIRATokenObtainPairView.as_view(), name="token-obtain-pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token-verify"),
    # Registration / Profile
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("me/change-password/", change_password, name="change-password"),
    # User management
    path("users/", UserListView.as_view(), name="user-list"),
    path("users/<uuid:pk>/", UserDetailView.as_view(), name="user-detail"),
    # API Keys
    path("api-keys/", APIKeyListCreateView.as_view(), name="api-key-list"),
    path("api-keys/<uuid:pk>/", APIKeyDetailView.as_view(), name="api-key-detail"),
    # Invitations
    path("invitations/", InvitationListCreateView.as_view(), name="invitation-list"),
]
