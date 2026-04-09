from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_review"),
    ]

    operations = [
        migrations.AddField(
            model_name="review",
            name="sequence_number",
            field=models.PositiveIntegerField(
                default=1,
                help_text="Review iteration number for this object (1 = first review)",
            ),
        ),
        migrations.AddField(
            model_name="review",
            name="object_repr",
            field=models.CharField(
                blank=True,
                max_length=500,
                help_text="Snapshot of linked object name/title at review creation time",
            ),
        ),
    ]
