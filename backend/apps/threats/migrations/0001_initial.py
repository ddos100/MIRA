import uuid

import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Threat",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(db_index=True, max_length=255)),
                ("description", models.TextField(blank=True)),
                ("threat_type", models.CharField(choices=[("cyber", "Cyber Attack"), ("information_security", "Information Security"), ("physical", "Physical / Environmental"), ("insider", "Insider Threat"), ("environmental", "Environmental / Natural Disaster"), ("supply_chain", "Supply Chain / Third Party"), ("compliance", "Compliance / Regulatory"), ("operational", "Operational")], db_index=True, max_length=30)),
                ("asset_types", models.JSONField(blank=True, default=list)),
                ("likelihood", models.PositiveSmallIntegerField(default=3, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("severity", models.PositiveSmallIntegerField(default=3, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("source", models.CharField(choices=[("external", "External"), ("internal", "Internal"), ("both", "Both")], default="external", max_length=20)),
                ("iso27001_clause", models.CharField(blank=True, max_length=200)),
                ("mitre_attack_id", models.CharField(blank=True, max_length=50)),
                ("is_system_default", models.BooleanField(db_index=True, default=False)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(app_label)s_%(class)s_created", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(app_label)s_%(class)s_updated", to=settings.AUTH_USER_MODEL)),
            ],
            options={"verbose_name": "Threat", "verbose_name_plural": "Threats", "ordering": ["-severity", "-likelihood", "name"]},
        ),
        migrations.CreateModel(
            name="Vulnerability",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(db_index=True, max_length=255)),
                ("description", models.TextField(blank=True)),
                ("vulnerability_type", models.CharField(choices=[("software", "Software / Application"), ("hardware", "Hardware / Device"), ("network", "Network / Infrastructure"), ("process", "Process / Procedure Gap"), ("human", "Human / Behavioural"), ("physical", "Physical / Environmental"), ("configuration", "Configuration / Setup"), ("data", "Data / Information Handling")], db_index=True, max_length=30)),
                ("asset_types", models.JSONField(blank=True, default=list)),
                ("severity", models.PositiveSmallIntegerField(default=3, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("cvss_score", models.FloatField(blank=True, null=True)),
                ("cve_id", models.CharField(blank=True, max_length=50)),
                ("remediation", models.TextField(blank=True)),
                ("iso27001_clause", models.CharField(blank=True, max_length=200)),
                ("is_system_default", models.BooleanField(db_index=True, default=False)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(app_label)s_%(class)s_created", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(app_label)s_%(class)s_updated", to=settings.AUTH_USER_MODEL)),
            ],
            options={"verbose_name": "Vulnerability", "verbose_name_plural": "Vulnerabilities", "ordering": ["-severity", "name"]},
        ),
        migrations.CreateModel(
            name="ThreatVulnerabilityLink",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("threat", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="vulnerability_links", to="threats.threat")),
                ("vulnerability", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="threat_links", to="threats.vulnerability")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(app_label)s_%(class)s_created", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(app_label)s_%(class)s_updated", to=settings.AUTH_USER_MODEL)),
            ],
            options={"verbose_name": "Threat-Vulnerability Link", "ordering": ["threat__name"], "unique_together": {("threat", "vulnerability")}},
        ),
    ]
