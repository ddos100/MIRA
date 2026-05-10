"""
Management command: send_policy_reminders

Creates in-app Notification records for every active user who has not yet
acknowledged a policy where acknowledgement_required=True (ISO 27001 A.5.1).

Usage:
    python manage.py send_policy_reminders
    python manage.py send_policy_reminders --dry-run

Schedule via Celery beat or cron (e.g. daily at 08:00).
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.core.models import Notification
from apps.policies.models import Policy, PolicyAcknowledgement

User = get_user_model()


class Command(BaseCommand):
    help = "Send policy acknowledgement reminders to users with pending policies"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be sent without creating notifications",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        required_policies = Policy.objects.filter(
            status="approved",
            acknowledgement_required=True,
        )
        if not required_policies.exists():
            self.stdout.write("No policies require acknowledgement.")
            return

        active_users = User.objects.filter(is_active=True, is_deleted=False)
        sent = 0

        for user in active_users:
            acked_ids = set(
                PolicyAcknowledgement.objects.filter(user=user)
                .values_list("policy_id", flat=True)
            )
            pending = required_policies.exclude(pk__in=acked_ids)
            for policy in pending:
                # Skip if an unread reminder already exists for this policy + user
                exists = Notification.objects.filter(
                    recipient=user,
                    title__startswith="Policy acknowledgement required:",
                    body__contains=str(policy.id),
                    is_read=False,
                ).exists()
                if exists:
                    continue

                if dry_run:
                    self.stdout.write(
                        f"[dry-run] Would notify {user.email} → '{policy.title}'"
                    )
                else:
                    Notification.objects.create(
                        recipient=user,
                        notification_type=Notification.NotificationType.WARNING,
                        title=f"Policy acknowledgement required: {policy.title}",
                        body=(
                            f"Please read and acknowledge the policy '{policy.title}' "
                            f"(v{policy.version}). This is required by your organisation."
                        ),
                    )
                sent += 1

        action = "Would send" if dry_run else "Sent"
        self.stdout.write(self.style.SUCCESS(f"{action} {sent} reminder(s)."))
