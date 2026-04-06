"""Load all initial fixture data for MIRA."""

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Load all initial fixture data (frameworks, categories, etc.)"

    def handle(self, *args, **options):
        fixtures = [
            "apps/compliance/fixtures/compliance_frameworks.json",
            "apps/risks/fixtures/risk_categories.json",
            "apps/incidents/fixtures/incident_categories.json",
            "apps/assets/fixtures/asset_categories.json",
        ]
        for fixture in fixtures:
            self.stdout.write(f"Loading {fixture}...")
            call_command("loaddata", fixture)
            self.stdout.write(self.style.SUCCESS(f"  \u2713 {fixture}"))
        self.stdout.write(self.style.SUCCESS("All initial data loaded successfully."))
