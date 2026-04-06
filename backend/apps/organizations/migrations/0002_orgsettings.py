from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="OrgSettings",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("org_name", models.CharField(default="MIRA GRC", max_length=255)),
                ("description", models.TextField(blank=True)),
                ("timezone", models.CharField(default="UTC", max_length=100)),
                ("primary_contact_email", models.EmailField(blank=True)),
                (
                    "logo",
                    models.ImageField(blank=True, null=True, upload_to="org/logos/"),
                ),
                (
                    "max_risk_score",
                    models.PositiveSmallIntegerField(
                        default=25,
                        help_text="Maximum possible risk score (likelihood × impact). Used for heatmap scaling.",
                    ),
                ),
                (
                    "risk_review_days",
                    models.PositiveSmallIntegerField(
                        default=90,
                        help_text="Default number of days before a risk review is due.",
                    ),
                ),
                (
                    "policy_review_days",
                    models.PositiveSmallIntegerField(
                        default=365,
                        help_text="Default number of days before a policy review is due.",
                    ),
                ),
                (
                    "enable_2fa_required",
                    models.BooleanField(
                        default=False,
                        help_text="Require all users to enrol in two-factor authentication.",
                    ),
                ),
            ],
            options={
                "verbose_name": "Organisation Settings",
                "verbose_name_plural": "Organisation Settings",
            },
        ),
    ]
