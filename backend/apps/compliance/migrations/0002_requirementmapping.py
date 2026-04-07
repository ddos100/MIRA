"""Migration: add RequirementMapping model."""

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("compliance", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="RequirementMapping",
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
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "relationship",
                    models.CharField(
                        choices=[
                            ("equivalent", "Equivalent"),
                            ("subset", "Subset of"),
                            ("superset", "Superset of"),
                            ("related", "Related"),
                        ],
                        default="related",
                        max_length=20,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                (
                    "source",
                    models.ForeignKey(
                        help_text="The originating requirement",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="mappings_as_source",
                        to="compliance.requirement",
                    ),
                ),
                (
                    "target",
                    models.ForeignKey(
                        help_text="The mapped-to requirement in another framework",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="mappings_as_target",
                        to="compliance.requirement",
                    ),
                ),
            ],
            options={
                "verbose_name": "Requirement Mapping",
                "verbose_name_plural": "Requirement Mappings",
                "ordering": ["source__ref_code"],
            },
        ),
        migrations.AddConstraint(
            model_name="requirementmapping",
            constraint=models.UniqueConstraint(
                fields=["source", "target"],
                name="unique_requirement_mapping",
            ),
        ),
    ]
