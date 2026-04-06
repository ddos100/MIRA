from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.core.permissions import IsAdminUser

from .models import APIKey, UserGroup, UserInvitation
from .serializers import (
    APIKeySerializer,
    ChangePasswordSerializer,
    MIRATokenObtainPairSerializer,
    UserCreateSerializer,
    UserGroupMemberSerializer,
    UserGroupSerializer,
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
        return Response(
            {"old_password": "Incorrect password."}, status=status.HTTP_400_BAD_REQUEST
        )
    user.set_password(serializer.validated_data["new_password"])
    user.save(update_fields=["password"])
    return Response({"detail": "Password changed successfully."})


class UserListCreateView(generics.ListCreateAPIView):
    """List all users or create a new user. Admin only."""

    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["email", "first_name", "last_name", "department"]
    filterset_fields = ["role", "is_active"]
    ordering_fields = ["first_name", "last_name", "created_at"]

    def get_queryset(self):
        return User.objects.filter(is_deleted=False).prefetch_related(
            "business_units", "groups"
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserSerializer


# Keep backward-compat alias
UserListView = UserListCreateView


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve / update / deactivate a user. Admin only."""

    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]
    queryset = User.objects.filter(is_deleted=False).prefetch_related(
        "business_units", "groups"
    )

    def destroy(self, request, *args, **kwargs):
        from django.utils import timezone

        user = self.get_object()
        user.is_deleted = True
        user.is_active = False
        user.deleted_at = timezone.now()
        user.save(update_fields=["is_deleted", "is_active", "deleted_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── User Groups ───────────────────────────────────────────────────────────────


class UserGroupViewSet(viewsets.ModelViewSet):
    """CRUD for User Groups with member management."""

    queryset = UserGroup.objects.select_related("group").prefetch_related(
        "business_units", "group__user_set"
    )
    serializer_class = UserGroupSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["group__name", "description"]
    filterset_fields = ["default_role"]
    ordering_fields = ["group__name", "created_at"]

    @action(detail=True, methods=["post"], url_path="add-members")
    def add_members(self, request, pk=None):
        """Add users to this group."""
        user_group = self.get_object()
        serializer = UserGroupMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        users = User.objects.filter(id__in=serializer.validated_data["user_ids"])
        user_group.group.user_set.add(*users)
        return Response({"added": users.count()})

    @action(detail=True, methods=["post"], url_path="remove-members")
    def remove_members(self, request, pk=None):
        """Remove users from this group."""
        user_group = self.get_object()
        serializer = UserGroupMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        users = User.objects.filter(id__in=serializer.validated_data["user_ids"])
        user_group.group.user_set.remove(*users)
        return Response({"removed": users.count()})

    @action(detail=True, methods=["get"], url_path="members")
    def members(self, request, pk=None):
        """List members of this group."""
        user_group = self.get_object()
        members = user_group.group.user_set.filter(is_deleted=False)
        serializer = UserSerializer(members, many=True)
        return Response(serializer.data)


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
