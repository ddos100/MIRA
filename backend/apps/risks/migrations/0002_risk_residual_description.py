from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("risks", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="risk",
            name="residual_description",
            field=models.TextField(
                blank=True,
                help_text="Describe the residual risk after controls are applied",
            ),
        ),
    ]
