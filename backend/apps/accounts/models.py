"""
Custom User model and role/permission infrastructure for MIRA.
"""

import uuid

from django.contrib.auth.models import AbstractUser, BaseUserManager, Group
from django.db import models
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """Custom manager for email-based authentication (no username field)."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class Role(models.TextChoices):
    # Administrative
    ADMIN = "admin", _("Administrator")
    # Risk roles
    RISK_MANAGER = "risk_manager", _("Risk Manager")
    RISK_REVIEWER = "risk_reviewer", _("Risk Reviewer")
    # Asset roles
    ASSET_REVIEWER = "asset_reviewer", _("Asset Reviewer")
    # Compliance / audit roles
    COMPLIANCE_ANALYST = "compliance_analyst", _("Compliance Analyst")
    AUDITOR = "auditor", _("Auditor")
    AUDIT_OWNER = "audit_owner", _("Audit Owner")
    # Control / evidence roles
    CONTROL_OWNER = "control_owner", _("Control Owner")
    EVIDENCE_OWNER = "evidence_owner", _("Evidence Owner")
    # Policy roles
    POLICY_OWNER = "policy_owner", _("Policy Owner")
    POLICY_APPROVER = "policy_approver", _("Policy Approver")
    # Generic viewer
    VIEWER = "viewer", _("Viewer")


class User(AbstractUser):
    """
    Extended user model.
    - UUID primary key
    - Email as username
    - Department / phone / avatar
    - Role-based access via a simple role field (plus Django groups for granular perms)
    - MFA enforcement flag
    """

    objects = UserManager()

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Use email instead of username
    username = None
    email = models.EmailField(_("email address"), unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.VIEWER,
        db_index=True,
    )
    department = models.CharField(max_length=150, blank=True)
    job_title = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    timezone = models.CharField(max_length=50, default="UTC")
    bio = models.TextField(blank=True)

    # Business unit memberships (a user can belong to multiple units)
    business_units = models.ManyToManyField(
        "organizations.BusinessUnit",
        blank=True,
        related_name="members",
        verbose_name=_("Business Units"),
    )

    # Group memberships handled via Django's built-in groups (from AbstractUser)

    is_mfa_enabled = models.BooleanField(default=False)
    mfa_enforced = models.BooleanField(default=False)

    # Soft delete
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        ordering = ["first_name", "last_name"]

    def __str__(self):
        return f"{self.get_full_name()} <{self.email}>"

    def has_role(self, *roles: str) -> bool:
        """Check if user has one of the specified roles."""
        if self.is_superuser:
            return True
        return self.role in roles

    def get_full_name(self) -> str:
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name or self.email

    @property
    def display_name(self) -> str:
        return self.get_full_name()


class APIKey(models.Model):
    """Per-user API keys for programmatic access."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="api_keys")
    name = models.CharField(max_length=100)
    key = models.CharField(max_length=64, unique=True, db_index=True)
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("API Key")
        verbose_name_plural = _("API Keys")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.user.email})"


class UserInvitation(models.Model):
    """Track pending user invitations."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=30, choices=Role.choices, default=Role.VIEWER)
    invited_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="sent_invitations"
    )
    token = models.CharField(max_length=64, unique=True)
    is_accepted = models.BooleanField(default=False)
    accepted_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("User Invitation")
        verbose_name_plural = _("User Invitations")
        ordering = ["-created_at"]

    def __str__(self):
        return f"Invitation for {self.email}"


class UserGroup(models.Model):
    """
    Named group of users with an assigned default role.
    Wraps Django's built-in Group and adds metadata
    (description, default role, business unit scope).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.OneToOneField(
        Group,
        on_delete=models.CASCADE,
        related_name="user_group_profile",
    )
    description = models.TextField(blank=True)
    default_role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.VIEWER,
    )
    business_units = models.ManyToManyField(
        "organizations.BusinessUnit",
        blank=True,
        related_name="user_groups",
        verbose_name=_("Business Units"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("User Group")
        verbose_name_plural = _("User Groups")
        ordering = ["group__name"]

    def __str__(self):
        return self.group.name

    @property
    def name(self):
        return self.group.name

    @property
    def members(self):
        return self.group.user_set.all()
