"""Migration: add CIA triad ratings to Asset model."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("assets", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="asset",
            name="confidentiality",
            field=models.CharField(
                choices=[
                    ("low", "Low"),
                    ("medium", "Medium"),
                    ("high", "High"),
                    ("critical", "Critical"),
                ],
                db_index=True,
                default="medium",
                help_text="Confidentiality impact if this asset is compromised",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="asset",
            name="integrity",
            field=models.CharField(
                choices=[
                    ("low", "Low"),
                    ("medium", "Medium"),
                    ("high", "High"),
                    ("critical", "Critical"),
                ],
                db_index=True,
                default="medium",
                help_text="Integrity impact if this asset is tampered with",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="asset",
            name="availability",
            field=models.CharField(
                choices=[
                    ("low", "Low"),
                    ("medium", "Medium"),
                    ("high", "High"),
                    ("critical", "Critical"),
                ],
                db_index=True,
                default="medium",
                help_text="Availability impact if this asset is unavailable",
                max_length=10,
            ),
        ),
    ]
