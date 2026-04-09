import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_statusrule"),
    ]

    operations = [
        migrations.CreateModel(
            name="AutomatedAction",
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
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=200)),
                (
                    "action_type",
                    models.CharField(
                        choices=[
                            ("send_email", "Send Email"),
                            ("call_webhook", "Call API / Webhook"),
                            ("create_notification", "In-App Notification"),
                        ],
                        max_length=30,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("config", models.JSONField(default=dict)),
                (
                    "last_triggered_at",
                    models.DateTimeField(blank=True, null=True),
                ),
                ("trigger_count", models.PositiveIntegerField(default=0)),
                (
                    "status_rule",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="automated_actions",
                        to="core.statusrule",
                    ),
                ),
            ],
            options={
                "verbose_name": "Automated Action",
                "verbose_name_plural": "Automated Actions",
                "ordering": ["name"],
            },
        ),
    ]
