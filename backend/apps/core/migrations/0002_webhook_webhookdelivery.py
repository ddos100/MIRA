from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Webhook",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="core_webhook_created",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("updated_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="core_webhook_updated",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("name", models.CharField(max_length=200)),
                ("url", models.URLField(max_length=500)),
                ("events", models.JSONField(default=list)),
                ("secret", models.CharField(
                    blank=True,
                    help_text="Optional HMAC-SHA256 secret. Sent as X-MIRA-Signature header.",
                    max_length=64,
                )),
                ("is_active", models.BooleanField(default=True)),
                ("last_delivery_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "verbose_name": "Webhook",
                "verbose_name_plural": "Webhooks",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="WebhookDelivery",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("webhook", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="deliveries",
                    to="core.webhook",
                )),
                ("event", models.CharField(max_length=100)),
                ("payload", models.JSONField()),
                ("status", models.CharField(
                    choices=[
                        ("success", "Success"),
                        ("failed", "Failed"),
                        ("pending", "Pending"),
                    ],
                    default="pending",
                    max_length=10,
                )),
                ("response_status", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("response_body", models.TextField(blank=True)),
                ("error_message", models.TextField(blank=True)),
                ("attempted_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name": "Webhook Delivery",
                "verbose_name_plural": "Webhook Deliveries",
                "ordering": ["-attempted_at"],
            },
        ),
    ]
