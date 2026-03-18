"""
Migration: add business_unit FK to Assessment.
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("assessments", "0001_initial"),
        ("organizations", "0002_create_businessunit_businessprocess"),
    ]

    operations = [
        migrations.AddField(
            model_name="assessment",
            name="business_unit",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assessments",
                to="organizations.businessunit",
            ),
        ),
    ]
