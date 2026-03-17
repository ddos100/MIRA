from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class Project(BaseModel):
    class ProjectStatus(models.TextChoices):
        PLANNED = "planned", _("Planned")
        ACTIVE = "active", _("Active")
        ON_HOLD = "on_hold", _("On Hold")
        COMPLETED = "completed", _("Completed")
        CANCELLED = "cancelled", _("Cancelled")

    title = models.CharField(max_length=255)
    description = models.TextField()
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="owned_projects",
    )
    status = models.CharField(
        max_length=15, choices=ProjectStatus.choices, default=ProjectStatus.PLANNED
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    # GRC links
    risks = models.ManyToManyField("risks.Risk", blank=True, related_name="projects")
    controls = models.ManyToManyField("controls.Control", blank=True, related_name="projects")
    compliance_programs = models.ManyToManyField(
        "compliance.ComplianceProgram", blank=True, related_name="projects"
    )

    class Meta:
        verbose_name = _("Project")
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ProjectTask(BaseModel):
    class TaskStatus(models.TextChoices):
        TODO = "todo", _("To Do")
        IN_PROGRESS = "in_progress", _("In Progress")
        DONE = "done", _("Done")
        BLOCKED = "blocked", _("Blocked")

    class Priority(models.TextChoices):
        LOW = "low", _("Low")
        MEDIUM = "medium", _("Medium")
        HIGH = "high", _("High")
        CRITICAL = "critical", _("Critical")

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="project_tasks",
    )
    status = models.CharField(
        max_length=15, choices=TaskStatus.choices, default=TaskStatus.TODO
    )
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.MEDIUM
    )
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("Project Task")
        ordering = ["due_date", "priority"]

    def __str__(self):
        return f"{self.project.title} – {self.title}"
