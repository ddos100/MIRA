import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("organizations", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="GoalCategory",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=150, unique=True)),
                ("description", models.TextField(blank=True)),
                ("color", models.CharField(default="#3B82F6", max_length=7)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(app_label)s_%(class)s_created", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(app_label)s_%(class)s_updated", to=settings.AUTH_USER_MODEL)),
            ],
            options={"verbose_name": "Goal Category", "verbose_name_plural": "Goal Categories", "ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Goal",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(db_index=True, max_length=255)),
                ("description", models.TextField(blank=True)),
                ("objective", models.TextField(blank=True)),
                ("measurable_target", models.CharField(blank=True, max_length=255)),
                ("unit", models.CharField(blank=True, max_length=50)),
                ("baseline_value", models.FloatField(blank=True, null=True)),
                ("target_value", models.FloatField(blank=True, null=True)),
                ("current_value", models.FloatField(blank=True, null=True)),
                ("start_date", models.DateField(blank=True, null=True)),
                ("target_date", models.DateField(blank=True, null=True)),
                ("status", models.CharField(choices=[("draft", "Draft"), ("active", "Active"), ("on_track", "On Track"), ("at_risk", "At Risk"), ("behind", "Behind Schedule"), ("completed", "Completed"), ("cancelled", "Cancelled")], db_index=True, default="draft", max_length=20)),
                ("iso27001_clause", models.CharField(blank=True, max_length=100)),
                ("review_frequency", models.CharField(choices=[("monthly", "Monthly"), ("quarterly", "Quarterly"), ("biannual", "Bi-Annual"), ("annual", "Annual"), ("ad_hoc", "Ad Hoc")], default="quarterly", max_length=20)),
                ("next_review_date", models.DateField(blank=True, null=True)),
                ("last_review_date", models.DateField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                ("category", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="goals", to="goals.goalcategory")),
                ("owner", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="owned_goals", to=settings.AUTH_USER_MODEL)),
                ("business_unit", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="goals", to="organizations.businessunit")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(app_label)s_%(class)s_created", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(app_label)s_%(class)s_updated", to=settings.AUTH_USER_MODEL)),
            ],
            options={"verbose_name": "Goal", "verbose_name_plural": "Goals", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="GoalReview",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("review_date", models.DateField()),
                ("workflow_state", models.CharField(choices=[("draft", "Draft"), ("submitted", "Submitted for Approval"), ("approved", "Approved"), ("rejected", "Rejected — Needs Revision")], db_index=True, default="draft", max_length=20)),
                ("outcome", models.CharField(choices=[("on_track", "On Track"), ("at_risk", "At Risk"), ("behind", "Behind Schedule"), ("completed", "Completed"), ("cancelled", "Cancelled")], default="on_track", max_length=20)),
                ("current_value", models.FloatField(blank=True, null=True)),
                ("findings", models.TextField(blank=True)),
                ("recommendations", models.TextField(blank=True)),
                ("actions_required", models.TextField(blank=True)),
                ("next_review_date", models.DateField(blank=True, null=True)),
                ("submitted_at", models.DateTimeField(blank=True, null=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("rejection_reason", models.TextField(blank=True)),
                ("goal", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reviews", to="goals.goal")),
                ("reviewer", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="goal_reviews_made", to=settings.AUTH_USER_MODEL)),
                ("approver", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="goal_reviews_approved", to=settings.AUTH_USER_MODEL)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(app_label)s_%(class)s_created", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(app_label)s_%(class)s_updated", to=settings.AUTH_USER_MODEL)),
            ],
            options={"verbose_name": "Goal Review", "verbose_name_plural": "Goal Reviews", "ordering": ["-review_date"]},
        ),
        migrations.CreateModel(
            name="GoalAuditSchedule",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("frequency", models.CharField(choices=[("monthly", "Monthly"), ("quarterly", "Quarterly"), ("biannual", "Bi-Annual"), ("annual", "Annual"), ("ad_hoc", "Ad Hoc / On Demand")], default="quarterly", max_length=20)),
                ("next_audit_date", models.DateField(blank=True, null=True)),
                ("last_audit_date", models.DateField(blank=True, null=True)),
                ("audit_criteria", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("goal", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="audit_schedule", to="goals.goal")),
                ("assigned_auditor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_goal_audits", to=settings.AUTH_USER_MODEL)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(app_label)s_%(class)s_created", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(app_label)s_%(class)s_updated", to=settings.AUTH_USER_MODEL)),
            ],
            options={"verbose_name": "Goal Audit Schedule"},
        ),
    ]
