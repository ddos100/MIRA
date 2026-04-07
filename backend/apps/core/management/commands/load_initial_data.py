"""Load all initial fixture data for MIRA."""

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import IntegrityError


class Command(BaseCommand):
    help = "Load all initial fixture data (frameworks, categories, etc.)"

    # Order matters: dependencies must come before dependents
    FIXTURES = [
        # Compliance: frameworks must be loaded before requirements (FK dependency)
        "apps/compliance/fixtures/compliance_frameworks.json",
        "apps/compliance/fixtures/compliance_requirements.json",
        # Other categories (no inter-dependencies)
        "apps/risks/fixtures/risk_categories.json",
        "apps/incidents/fixtures/incident_categories.json",
        "apps/assets/fixtures/asset_categories.json",
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-existing",
            action="store_true",
            default=True,
            help="Skip fixtures that fail due to existing data (default: True)",
        )

    def handle(self, *args, **options):
        skip_existing = options.get("skip_existing", True)
        success = 0
        skipped = 0

        for fixture in self.FIXTURES:
            self.stdout.write(f"Loading {fixture}...")
            try:
                call_command("loaddata", fixture, verbosity=0)
                self.stdout.write(self.style.SUCCESS(f"  \u2713 Loaded {fixture}"))
                success += 1
            except IntegrityError as e:
                if skip_existing:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  \u25b7 Skipped {fixture} (already loaded)"
                        )
                    )
                    skipped += 1
                else:
                    self.stdout.write(
                        self.style.ERROR(f"  \u2717 Failed {fixture}: {e}")
                    )
                    raise
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  \u2717 Failed {fixture}: {e}"))
                raise

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. {success} fixture(s) loaded, {skipped} skipped."
            )
        )
