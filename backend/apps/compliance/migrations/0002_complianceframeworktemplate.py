"""
Migration: add ComplianceFrameworkTemplate model.
"""
import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("compliance", "0001_initial"),
        ("accounts", "0002_extend_roles_business_units_usergroup"),
    ]

    operations = [
        migrations.CreateModel(
            name="ComplianceFrameworkTemplate",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="compliance_complianceframeworktemplate_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="compliance_complianceframeworktemplate_updated",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("name", models.CharField(max_length=200)),
                (
                    "template_type",
                    models.CharField(
                        choices=[
                            ("iso_27001", "ISO/IEC 27001:2022"),
                            ("nist_csf", "NIST Cybersecurity Framework"),
                            ("nist_800_53", "NIST SP 800-53"),
                            ("soc2", "SOC 2 (Trust Services Criteria)"),
                            ("hipaa", "HIPAA Security Rule"),
                            ("gdpr", "GDPR"),
                            ("pci_dss", "PCI DSS v4.0"),
                            ("iso_31000", "ISO 31000 Risk Management"),
                            ("iso_22301", "ISO 22301 Business Continuity"),
                            ("custom", "Custom Template"),
                        ],
                        max_length=30,
                        unique=True,
                    ),
                ),
                ("short_name", models.CharField(max_length=50)),
                ("version", models.CharField(blank=True, max_length=50)),
                ("issuing_body", models.CharField(blank=True, max_length=200)),
                ("description", models.TextField(blank=True)),
                ("structure", models.JSONField(default=list, help_text="Hierarchical requirement structure")),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "verbose_name": "Compliance Framework Template",
                "verbose_name_plural": "Compliance Framework Templates",
                "ordering": ["name"],
            },
        ),
    ]
