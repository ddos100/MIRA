import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("contenttypes", "0002_remove_content_type_name"),
        ("core", "0004_automatedaction"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Review",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("object_id", models.UUIDField(db_index=True)),
                ("review_type", models.CharField(choices=[("periodic", "Periodic Review"), ("triggered", "Triggered Review"), ("ad_hoc", "Ad Hoc"), ("audit", "Internal Audit"), ("management", "Management Review")], default="periodic", max_length=20)),
                ("review_date", models.DateField()),
                ("workflow_state", models.CharField(choices=[("draft", "Draft"), ("submitted", "Submitted for Approval"), ("approved", "Approved"), ("rejected", "Rejected — Needs Revision")], db_index=True, default="draft", max_length=20)),
                ("outcome", models.CharField(blank=True, choices=[("satisfactory", "Satisfactory"), ("needs_improvement", "Needs Improvement"), ("unsatisfactory", "Unsatisfactory"), ("critical", "Critical — Immediate Action Required")], max_length=30)),
                ("findings", models.TextField(blank=True)),
                ("recommendations", models.TextField(blank=True)),
                ("actions_required", models.TextField(blank=True)),
                ("evidence", models.TextField(blank=True)),
                ("next_review_date", models.DateField(blank=True, null=True)),
                ("submitted_at", models.DateTimeField(blank=True, null=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("rejection_reason", models.TextField(blank=True)),
                ("content_type", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reviews", to="contenttypes.contenttype")),
                ("reviewer", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="reviews_conducted", to=settings.AUTH_USER_MODEL)),
                ("approver", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reviews_approved", to=settings.AUTH_USER_MODEL)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(app_label)s_%(class)s_created", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(app_label)s_%(class)s_updated", to=settings.AUTH_USER_MODEL)),
            ],
            options={"verbose_name": "Review", "verbose_name_plural": "Reviews", "ordering": ["-review_date"]},
        ),
        migrations.AddIndex(
            model_name="review",
            index=models.Index(fields=["content_type", "object_id"], name="core_review_ct_obj_idx"),
        ),
    ]
