"""
Migration: extend Role choices, add User.business_units M2M,
add UserGroup model.
"""
import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
        ("organizations", "0001_initial"),
        ("auth", "0001_initial"),
    ]

    operations = [
        # 1. Alter the role field to include all new choices
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                db_index=True,
                choices=[
                    ("admin", "Administrator"),
                    ("risk_manager", "Risk Manager"),
                    ("risk_reviewer", "Risk Reviewer"),
                    ("asset_reviewer", "Asset Reviewer"),
                    ("compliance_analyst", "Compliance Analyst"),
                    ("auditor", "Auditor"),
                    ("audit_owner", "Audit Owner"),
                    ("control_owner", "Control Owner"),
                    ("evidence_owner", "Evidence Owner"),
                    ("policy_owner", "Policy Owner"),
                    ("policy_approver", "Policy Approver"),
                    ("viewer", "Viewer"),
                ],
                default="viewer",
                max_length=30,
            ),
        ),
        # 2. Add business_units M2M to User
        migrations.AddField(
            model_name="user",
            name="business_units",
            field=models.ManyToManyField(
                blank=True,
                related_name="members",
                to="organizations.businessunit",
                verbose_name="Business Units",
            ),
        ),
        # 3. Create UserGroup
        migrations.CreateModel(
            name="UserGroup",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("description", models.TextField(blank=True)),
                (
                    "default_role",
                    models.CharField(
                        choices=[
                            ("admin", "Administrator"),
                            ("risk_manager", "Risk Manager"),
                            ("risk_reviewer", "Risk Reviewer"),
                            ("asset_reviewer", "Asset Reviewer"),
                            ("compliance_analyst", "Compliance Analyst"),
                            ("auditor", "Auditor"),
                            ("audit_owner", "Audit Owner"),
                            ("control_owner", "Control Owner"),
                            ("evidence_owner", "Evidence Owner"),
                            ("policy_owner", "Policy Owner"),
                            ("policy_approver", "Policy Approver"),
                            ("viewer", "Viewer"),
                        ],
                        default="viewer",
                        max_length=30,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "group",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="user_group_profile",
                        to="auth.group",
                    ),
                ),
                (
                    "business_units",
                    models.ManyToManyField(
                        blank=True,
                        related_name="user_groups",
                        to="organizations.businessunit",
                        verbose_name="Business Units",
                    ),
                ),
            ],
            options={
                "verbose_name": "User Group",
                "verbose_name_plural": "User Groups",
                "ordering": ["group__name"],
            },
        ),
    ]
