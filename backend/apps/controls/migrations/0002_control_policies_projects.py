"""
No new fields needed for controls: Policy.controls and Project.controls M2M
already provide bidirectional access. This migration is intentionally empty
but retained to avoid gap in migration numbering.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("controls", "0001_initial"),
    ]

    operations = []
