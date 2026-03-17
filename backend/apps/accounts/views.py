from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.core.permissions import IsAdminUser

from .models import APIKey, UserInvitation
from .serializers import (
    APIKeySerializer,
    ChangePasswordSerializer,
    MIRATokenObtainPairSerializer,
    UserCreateSerializer,
    UserInvitationSerializer,
    UserSerializer,
)

User = get_user_model()


class MIRATokenObtainPairView(TokenObtainPairView):
    """Login endpoint – returns JWT pair + user info."""
    serializer_class = MIRATokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    """Self-registration (can be disabled in production)."""
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    """Current authenticated user."""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = request.user
    if not user.check_password(serializer.validated_data["old_password"]):
        return Response({"old_password": "Incorrect password."}, status=status.HTTP_400_BAD_REQUEST)
    user.set_password(serializer.validated_data["new_password"])
    user.save(update_fields=["password"])
    return Response({"detail": "Password changed successfully."})


class UserListView(generics.ListAPIView):
    """List all active users. Admin only."""
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]
    queryset = User.objects.filter(is_deleted=False, is_active=True)
    search_fields = ["email", "first_name", "last_name", "department"]
    filterset_fields = ["role", "is_active"]
    ordering_fields = ["first_name", "last_name", "created_at"]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve / update / deactivate a user. Admin only."""
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]
    queryset = User.objects.filter(is_deleted=False)

    def destroy(self, request, *args, **kwargs):
        from django.utils import timezone
        user = self.get_object()
        user.is_deleted = True
        user.is_active = False
        user.deleted_at = timezone.now()
        user.save(update_fields=["is_deleted", "is_active", "deleted_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── API Keys ──────────────────────────────────────────────────────────────────

class APIKeyListCreateView(generics.ListCreateAPIView):
    serializer_class = APIKeySerializer

    def get_queryset(self):
        return APIKey.objects.filter(user=self.request.user)


class APIKeyDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = APIKeySerializer

    def get_queryset(self):
        return APIKey.objects.filter(user=self.request.user)


# ── Invitations ───────────────────────────────────────────────────────────────

class InvitationListCreateView(generics.ListCreateAPIView):
    serializer_class = UserInvitationSerializer
    permission_classes = [IsAdminUser]
    queryset = UserInvitation.objects.all()
    ordering_fields = ["created_at"]
