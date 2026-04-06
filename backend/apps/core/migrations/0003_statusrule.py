import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("contenttypes", "0002_remove_content_type_name"),
        ("core", "0002_customfieldvalue_webhook_webhookdelivery_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="StatusRule",
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
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                (
                    "conditions",
                    models.JSONField(
                        default=list,
                        help_text="List of condition objects [{field, operator, value}].",
                    ),
                ),
                (
                    "target_status",
                    models.CharField(
                        help_text="Value to set on the object's 'status' field when all conditions match.",
                        max_length=50,
                    ),
                ),
                (
                    "rule_status",
                    models.CharField(
                        choices=[("active", "Active"), ("inactive", "Inactive")],
                        db_index=True,
                        default="active",
                        max_length=10,
                    ),
                ),
                ("last_run_at", models.DateTimeField(blank=True, null=True)),
                ("last_affected_count", models.PositiveIntegerField(default=0)),
                (
                    "content_type",
                    models.ForeignKey(
                        help_text="The model this rule applies to.",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="status_rules",
                        to="contenttypes.contenttype",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="core_statusrule_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="core_statusrule_updated",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Status Rule",
                "verbose_name_plural": "Status Rules",
                "ordering": ["name"],
            },
        ),
    ]
