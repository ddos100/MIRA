"""Initial migration for accounts app."""

import uuid
import django.contrib.auth.models
import django.contrib.auth.validators
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                ("password", models.CharField(max_length=128, verbose_name="password")),
                (
                    "last_login",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="last login"
                    ),
                ),
                ("is_superuser", models.BooleanField(default=False)),
                (
                    "first_name",
                    models.CharField(
                        blank=True, max_length=150, verbose_name="first name"
                    ),
                ),
                (
                    "last_name",
                    models.CharField(
                        blank=True, max_length=150, verbose_name="last name"
                    ),
                ),
                ("is_staff", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "date_joined",
                    models.DateTimeField(
                        default=django.utils.timezone.now, verbose_name="date joined"
                    ),
                ),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "email",
                    models.EmailField(
                        max_length=254, unique=True, verbose_name="email address"
                    ),
                ),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("admin", "Administrator"),
                            ("risk_manager", "Risk Manager"),
                            ("compliance_analyst", "Compliance Analyst"),
                            ("auditor", "Auditor"),
                            ("control_owner", "Control Owner"),
                            ("policy_owner", "Policy Owner"),
                            ("viewer", "Viewer"),
                        ],
                        db_index=True,
                        default="viewer",
                        max_length=30,
                    ),
                ),
                ("department", models.CharField(blank=True, max_length=150)),
                ("job_title", models.CharField(blank=True, max_length=150)),
                ("phone", models.CharField(blank=True, max_length=30)),
                (
                    "avatar",
                    models.ImageField(blank=True, null=True, upload_to="avatars/"),
                ),
                ("timezone", models.CharField(default="UTC", max_length=50)),
                ("bio", models.TextField(blank=True)),
                ("is_mfa_enabled", models.BooleanField(default=False)),
                ("mfa_enforced", models.BooleanField(default=False)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "groups",
                    models.ManyToManyField(
                        blank=True,
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.group",
                        verbose_name="groups",
                    ),
                ),
                (
                    "user_permissions",
                    models.ManyToManyField(
                        blank=True,
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.permission",
                        verbose_name="user permissions",
                    ),
                ),
            ],
            options={
                "verbose_name": "User",
                "verbose_name_plural": "Users",
                "ordering": ["first_name", "last_name"],
            },
            managers=[("objects", django.contrib.auth.models.UserManager())],
        ),
        migrations.CreateModel(
            name="APIKey",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("name", models.CharField(max_length=100)),
                ("key", models.CharField(db_index=True, max_length=64, unique=True)),
                ("is_active", models.BooleanField(default=True)),
                ("last_used_at", models.DateTimeField(blank=True, null=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="api_keys",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "API Key",
                "verbose_name_plural": "API Keys",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="UserInvitation",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("email", models.EmailField(unique=True)),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("admin", "Administrator"),
                            ("risk_manager", "Risk Manager"),
                            ("compliance_analyst", "Compliance Analyst"),
                            ("auditor", "Auditor"),
                            ("control_owner", "Control Owner"),
                            ("policy_owner", "Policy Owner"),
                            ("viewer", "Viewer"),
                        ],
                        default="viewer",
                        max_length=30,
                    ),
                ),
                ("token", models.CharField(max_length=64, unique=True)),
                ("is_accepted", models.BooleanField(default=False)),
                ("accepted_at", models.DateTimeField(blank=True, null=True)),
                ("expires_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "invited_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sent_invitations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "User Invitation",
                "verbose_name_plural": "User Invitations",
                "ordering": ["-created_at"],
            },
        ),
    ]
