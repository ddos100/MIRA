"""
Periodic task schedule for MIRA.
Register this in Django settings or via django-celery-beat admin.
"""
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    "risk-review-reminders": {
        "task": "apps.risks.tasks.send_risk_review_reminders",
        "schedule": crontab(hour=8, minute=0),  # daily at 8am
    },
    "treatment-plan-reminders": {
        "task": "apps.risks.tasks.send_treatment_plan_reminders",
        "schedule": crontab(hour=8, minute=15),
    },
    "compliance-review-reminders": {
        "task": "apps.compliance.tasks.send_compliance_review_reminders",
        "schedule": crontab(hour=8, minute=30),
    },
    "gdpr-breach-check": {
        "task": "apps.incidents.tasks.check_gdpr_breach_notifications",
        "schedule": crontab(minute="*/30"),  # every 30 min
    },
    "incident-sla-check": {
        "task": "apps.incidents.tasks.update_overdue_incident_slas",
        "schedule": crontab(minute="*/60"),  # hourly
    },
    "scheduled-reports": {
        "task": "apps.reports.tasks.run_scheduled_reports",
        "schedule": crontab(minute=0),  # hourly
    },
}
