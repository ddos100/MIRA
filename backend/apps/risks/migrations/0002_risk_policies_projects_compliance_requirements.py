"""
Migration: add policies and compliance_requirements M2M to Risk.
(projects already provided via Project.risks reverse relation)
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("risks", "0001_initial"),
        ("policies", "0001_initial"),
        ("compliance", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="risk",
            name="policies",
            field=models.ManyToManyField(
                blank=True,
                related_name="risks",
                to="policies.policy",
            ),
        ),
        migrations.AddField(
            model_name="risk",
            name="compliance_requirements",
            field=models.ManyToManyField(
                blank=True,
                related_name="risks",
                to="compliance.requirement",
            ),
        ),
    ]
