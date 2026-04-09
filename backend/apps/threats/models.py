"""
Threats & Vulnerabilities — ISO 27001:2022 Annex A controls and risk treatment.
Pre-populated with cyber and information security threats/vulnerabilities by asset type.
"""

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class Threat(BaseModel):
    """
    A threat that could exploit a vulnerability and cause harm to assets.
    System-default threats are pre-populated; organizations can add custom ones.
    Aligned to ISO 27001:2022 Annex A and MITRE ATT&CK.
    """

    class ThreatType(models.TextChoices):
        CYBER = "cyber", _("Cyber Attack")
        INFORMATION_SECURITY = "information_security", _("Information Security")
        PHYSICAL = "physical", _("Physical / Environmental")
        INSIDER = "insider", _("Insider Threat")
        ENVIRONMENTAL = "environmental", _("Environmental / Natural Disaster")
        SUPPLY_CHAIN = "supply_chain", _("Supply Chain / Third Party")
        COMPLIANCE = "compliance", _("Compliance / Regulatory")
        OPERATIONAL = "operational", _("Operational")

    class Source(models.TextChoices):
        EXTERNAL = "external", _("External")
        INTERNAL = "internal", _("Internal")
        BOTH = "both", _("Both")

    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    threat_type = models.CharField(
        max_length=30, choices=ThreatType.choices, db_index=True
    )
    # Which asset types this threat applies to (list of strings like "server", "endpoint")
    asset_types = models.JSONField(
        default=list,
        blank=True,
        help_text="Asset types this threat applies to, e.g. ['server', 'endpoint', 'cloud']",
    )
    likelihood = models.PositiveSmallIntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1 (Rare) to 5 (Almost Certain)",
    )
    severity = models.PositiveSmallIntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1 (Negligible) to 5 (Critical)",
    )
    source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.EXTERNAL
    )
    iso27001_clause = models.CharField(max_length=200, blank=True)
    mitre_attack_id = models.CharField(
        max_length=50, blank=True, help_text="MITRE ATT&CK technique ID, e.g. T1566"
    )
    # System defaults are read-only templates; custom ones are org-specific
    is_system_default = models.BooleanField(default=False, db_index=True)

    class Meta:
        verbose_name = _("Threat")
        verbose_name_plural = _("Threats")
        ordering = ["-severity", "-likelihood", "name"]

    def __str__(self):
        return self.name

    @property
    def risk_score(self):
        return self.likelihood * self.severity


class Vulnerability(BaseModel):
    """
    A weakness that could be exploited by a threat.
    Pre-populated with common information security vulnerabilities.
    Aligned to ISO 27001:2022 Annex A controls.
    """

    class VulnerabilityType(models.TextChoices):
        SOFTWARE = "software", _("Software / Application")
        HARDWARE = "hardware", _("Hardware / Device")
        NETWORK = "network", _("Network / Infrastructure")
        PROCESS = "process", _("Process / Procedure Gap")
        HUMAN = "human", _("Human / Behavioural")
        PHYSICAL = "physical", _("Physical / Environmental")
        CONFIGURATION = "configuration", _("Configuration / Setup")
        DATA = "data", _("Data / Information Handling")

    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    vulnerability_type = models.CharField(
        max_length=30, choices=VulnerabilityType.choices, db_index=True
    )
    asset_types = models.JSONField(
        default=list,
        blank=True,
        help_text="Asset types affected by this vulnerability",
    )
    severity = models.PositiveSmallIntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1 (Low) to 5 (Critical)",
    )
    cvss_score = models.FloatField(
        null=True, blank=True, help_text="CVSS v3 base score (0.0–10.0)"
    )
    cve_id = models.CharField(
        max_length=50, blank=True, help_text="CVE identifier if applicable"
    )
    remediation = models.TextField(blank=True, help_text="Recommended remediation steps")
    iso27001_clause = models.CharField(max_length=200, blank=True)
    is_system_default = models.BooleanField(default=False, db_index=True)

    class Meta:
        verbose_name = _("Vulnerability")
        verbose_name_plural = _("Vulnerabilities")
        ordering = ["-severity", "name"]

    def __str__(self):
        return self.name


class ThreatVulnerabilityLink(BaseModel):
    """
    Maps threats to the vulnerabilities they commonly exploit.
    Provides a threat-vulnerability matrix for risk assessment.
    """

    threat = models.ForeignKey(
        Threat,
        on_delete=models.CASCADE,
        related_name="vulnerability_links",
    )
    vulnerability = models.ForeignKey(
        Vulnerability,
        on_delete=models.CASCADE,
        related_name="threat_links",
    )

    class Meta:
        verbose_name = _("Threat-Vulnerability Link")
        unique_together = ("threat", "vulnerability")
        ordering = ["threat__name"]

    def __str__(self):
        return f"{self.threat.name} → {self.vulnerability.name}"
