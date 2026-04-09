"""
Seed data migration: Pre-populate ISO 27001:2022-aligned Threats and Vulnerabilities.
These are system defaults covering Cyber and Information Security threats by asset type.
"""
import uuid

from django.db import migrations

THREATS = [
    # ── Cyber Attacks ─────────────────────────────────────────────────────────
    {
        "name": "Ransomware Attack",
        "description": "Malicious software that encrypts files and demands payment for decryption keys, causing operational disruption and potential data loss.",
        "threat_type": "cyber",
        "asset_types": ["server", "endpoint", "database", "cloud", "storage"],
        "likelihood": 4, "severity": 5, "source": "external",
        "iso27001_clause": "A.8.7, A.8.8", "mitre_attack_id": "T1486",
    },
    {
        "name": "Phishing / Spear Phishing",
        "description": "Deceptive emails targeting users to reveal credentials or install malware. Spear phishing is targeted at specific individuals or roles.",
        "threat_type": "cyber",
        "asset_types": ["endpoint", "email", "human"],
        "likelihood": 5, "severity": 4, "source": "external",
        "iso27001_clause": "A.6.3, A.8.7", "mitre_attack_id": "T1566",
    },
    {
        "name": "Distributed Denial of Service (DDoS)",
        "description": "Overwhelming systems or network with traffic to make them unavailable to legitimate users.",
        "threat_type": "cyber",
        "asset_types": ["server", "network", "cloud", "application"],
        "likelihood": 3, "severity": 4, "source": "external",
        "iso27001_clause": "A.8.6", "mitre_attack_id": "T1498",
    },
    {
        "name": "SQL Injection",
        "description": "Insertion of malicious SQL code into input fields to manipulate or extract database content.",
        "threat_type": "cyber",
        "asset_types": ["application", "database"],
        "likelihood": 3, "severity": 5, "source": "external",
        "iso27001_clause": "A.8.25, A.8.28", "mitre_attack_id": "T1190",
    },
    {
        "name": "Credential Theft / Brute Force",
        "description": "Automated attempts to steal user credentials through brute force, credential stuffing, or keylogging.",
        "threat_type": "cyber",
        "asset_types": ["application", "server", "cloud", "endpoint"],
        "likelihood": 4, "severity": 4, "source": "external",
        "iso27001_clause": "A.8.5", "mitre_attack_id": "T1110",
    },
    {
        "name": "Man-in-the-Middle (MitM) Attack",
        "description": "Intercepting communications between two parties to eavesdrop or alter data in transit.",
        "threat_type": "cyber",
        "asset_types": ["network", "application", "endpoint"],
        "likelihood": 2, "severity": 4, "source": "external",
        "iso27001_clause": "A.8.24", "mitre_attack_id": "T1557",
    },
    {
        "name": "Zero-Day Exploit",
        "description": "Exploitation of unknown or unpatched software vulnerabilities before the vendor releases a fix.",
        "threat_type": "cyber",
        "asset_types": ["server", "application", "endpoint", "network"],
        "likelihood": 2, "severity": 5, "source": "external",
        "iso27001_clause": "A.8.8", "mitre_attack_id": "T1203",
    },
    {
        "name": "Malware / Trojan / Spyware",
        "description": "Malicious software that creates backdoors, steals data, or disrupts operations.",
        "threat_type": "cyber",
        "asset_types": ["endpoint", "server", "application"],
        "likelihood": 4, "severity": 4, "source": "external",
        "iso27001_clause": "A.8.7", "mitre_attack_id": "T1204",
    },
    {
        "name": "API Security Attack",
        "description": "Exploitation of poorly secured APIs including broken authentication, excessive data exposure, and lack of rate limiting.",
        "threat_type": "cyber",
        "asset_types": ["application", "cloud"],
        "likelihood": 3, "severity": 4, "source": "external",
        "iso27001_clause": "A.8.28", "mitre_attack_id": "T1190",
    },
    {
        "name": "Cloud Misconfiguration Exploitation",
        "description": "Attackers exploiting improperly configured cloud resources (open buckets, over-permissive IAM roles).",
        "threat_type": "cyber",
        "asset_types": ["cloud", "storage", "database"],
        "likelihood": 3, "severity": 4, "source": "external",
        "iso27001_clause": "A.8.9, A.5.23", "mitre_attack_id": "T1580",
    },
    {
        "name": "Supply Chain / Third-Party Attack",
        "description": "Compromise through the supply chain including malicious code in updates or third-party libraries.",
        "threat_type": "supply_chain",
        "asset_types": ["application", "server", "cloud", "software"],
        "likelihood": 2, "severity": 5, "source": "external",
        "iso27001_clause": "A.5.19, A.5.20, A.5.21", "mitre_attack_id": "T1195",
    },
    # ── Information Security ──────────────────────────────────────────────────
    {
        "name": "Unauthorised Data Access",
        "description": "Internal or external actors accessing data without authorization due to excessive permissions or privilege abuse.",
        "threat_type": "information_security",
        "asset_types": ["database", "storage", "application", "cloud"],
        "likelihood": 3, "severity": 4, "source": "both",
        "iso27001_clause": "A.5.15, A.8.3", "mitre_attack_id": "T1078",
    },
    {
        "name": "Data Exfiltration",
        "description": "Unauthorised transfer of sensitive data outside the organisation by insiders or external attackers.",
        "threat_type": "information_security",
        "asset_types": ["database", "storage", "cloud", "endpoint"],
        "likelihood": 3, "severity": 5, "source": "both",
        "iso27001_clause": "A.8.12", "mitre_attack_id": "T1048",
    },
    {
        "name": "Insider Threat",
        "description": "Malicious or negligent actions by current or former employees, contractors, or partners.",
        "threat_type": "insider",
        "asset_types": ["database", "endpoint", "application", "physical", "storage"],
        "likelihood": 3, "severity": 4, "source": "internal",
        "iso27001_clause": "A.6.1, A.6.5, A.5.10", "mitre_attack_id": "T1078",
    },
    {
        "name": "Social Engineering",
        "description": "Psychological manipulation of people into performing security-compromising actions or divulging confidential information.",
        "threat_type": "information_security",
        "asset_types": ["human", "endpoint"],
        "likelihood": 4, "severity": 4, "source": "external",
        "iso27001_clause": "A.6.3", "mitre_attack_id": "T1056",
    },
    {
        "name": "Accidental Data Loss / Deletion",
        "description": "Unintentional loss of data due to human error, hardware failure, or software bugs without adequate backup.",
        "threat_type": "operational",
        "asset_types": ["database", "storage", "endpoint"],
        "likelihood": 4, "severity": 3, "source": "internal",
        "iso27001_clause": "A.8.13", "mitre_attack_id": "",
    },
    {
        "name": "Privilege Escalation",
        "description": "An attacker or insider gains higher privileges than intended, enabling access to restricted systems and data.",
        "threat_type": "cyber",
        "asset_types": ["server", "application", "cloud", "database"],
        "likelihood": 3, "severity": 5, "source": "both",
        "iso27001_clause": "A.8.2, A.5.15", "mitre_attack_id": "T1068",
    },
    # ── Physical / Environmental ──────────────────────────────────────────────
    {
        "name": "Physical Intrusion / Theft",
        "description": "Unauthorized physical access resulting in theft or damage of hardware, documents, or sensitive information.",
        "threat_type": "physical",
        "asset_types": ["physical", "server", "endpoint", "storage"],
        "likelihood": 2, "severity": 4, "source": "external",
        "iso27001_clause": "A.7.1, A.7.3", "mitre_attack_id": "",
    },
    {
        "name": "Natural Disaster / Environmental Event",
        "description": "Floods, fires, earthquakes, or severe weather causing damage to physical infrastructure.",
        "threat_type": "environmental",
        "asset_types": ["physical", "server", "network", "storage"],
        "likelihood": 1, "severity": 5, "source": "external",
        "iso27001_clause": "A.7.5", "mitre_attack_id": "",
    },
    {
        "name": "Power Failure / Utility Outage",
        "description": "Loss of electrical power or other utilities causing system downtime and potential data corruption.",
        "threat_type": "environmental",
        "asset_types": ["server", "network", "physical"],
        "likelihood": 2, "severity": 3, "source": "external",
        "iso27001_clause": "A.7.11", "mitre_attack_id": "",
    },
    # ── Compliance ────────────────────────────────────────────────────────────
    {
        "name": "Regulatory Non-Compliance",
        "description": "Failure to comply with applicable laws, regulations, or standards (GDPR, ISO 27001, PCI DSS) resulting in fines or penalties.",
        "threat_type": "compliance",
        "asset_types": ["data", "process", "application"],
        "likelihood": 2, "severity": 4, "source": "internal",
        "iso27001_clause": "A.5.31, A.5.36", "mitre_attack_id": "",
    },
]

VULNERABILITIES = [
    {
        "name": "Unpatched Software / Missing Security Updates",
        "description": "Systems running outdated software with known security vulnerabilities that have not been patched.",
        "vulnerability_type": "software",
        "asset_types": ["server", "endpoint", "application", "network"],
        "severity": 4, "cvss_score": 7.5, "cve_id": "",
        "iso27001_clause": "A.8.8",
        "remediation": "Implement a patch management process with SLAs by severity: critical patches within 24h, high within 7 days, medium within 30 days.",
    },
    {
        "name": "Default or Weak Credentials",
        "description": "Systems or applications using default manufacturer passwords or easily guessable credentials.",
        "vulnerability_type": "configuration",
        "asset_types": ["server", "network", "application", "cloud"],
        "severity": 5, "cvss_score": 9.8, "cve_id": "",
        "iso27001_clause": "A.8.5",
        "remediation": "Enforce strong password policies, change all default credentials, implement password managers, require MFA for privileged accounts.",
    },
    {
        "name": "Missing Multi-Factor Authentication (MFA)",
        "description": "Critical systems and applications accessible with single-factor authentication only.",
        "vulnerability_type": "configuration",
        "asset_types": ["application", "cloud", "server", "endpoint"],
        "severity": 4, "cvss_score": 7.0, "cve_id": "",
        "iso27001_clause": "A.8.5",
        "remediation": "Implement MFA for all users accessing critical systems, especially privileged users and remote access solutions.",
    },
    {
        "name": "Excessive User Privileges / Lack of Least Privilege",
        "description": "Users have more access rights than required for their job functions, increasing the impact of credential compromise.",
        "vulnerability_type": "configuration",
        "asset_types": ["application", "database", "server", "cloud"],
        "severity": 4, "cvss_score": 6.5, "cve_id": "",
        "iso27001_clause": "A.5.15, A.8.2",
        "remediation": "Conduct regular access reviews, implement role-based access control (RBAC), and remove unnecessary privileges.",
    },
    {
        "name": "Unencrypted Sensitive Data at Rest",
        "description": "Sensitive data stored without encryption, making it accessible if physical or logical access is obtained.",
        "vulnerability_type": "data",
        "asset_types": ["database", "storage", "server", "endpoint"],
        "severity": 4, "cvss_score": 7.4, "cve_id": "",
        "iso27001_clause": "A.8.24",
        "remediation": "Implement AES-256 encryption at rest for all sensitive data. Use encrypted containers for endpoint storage.",
    },
    {
        "name": "Unencrypted Data in Transit",
        "description": "Data transmitted over networks without encryption (HTTP instead of HTTPS, FTP instead of SFTP).",
        "vulnerability_type": "network",
        "asset_types": ["network", "application", "endpoint"],
        "severity": 4, "cvss_score": 7.5, "cve_id": "",
        "iso27001_clause": "A.8.24",
        "remediation": "Enforce TLS 1.2+ for all communications. Disable legacy protocols. Use HSTS headers for web applications.",
    },
    {
        "name": "Inadequate Network Segmentation",
        "description": "Flat network architecture where compromise of one system enables lateral movement across the entire network.",
        "vulnerability_type": "network",
        "asset_types": ["network", "server"],
        "severity": 3, "cvss_score": 6.0, "cve_id": "",
        "iso27001_clause": "A.8.22",
        "remediation": "Implement VLANs, firewalls, and DMZs. Separate critical systems and apply zero-trust network principles.",
    },
    {
        "name": "Insufficient Logging and Monitoring",
        "description": "Lack of comprehensive logging, monitoring, or alerting, making it difficult to detect security incidents.",
        "vulnerability_type": "configuration",
        "asset_types": ["server", "application", "network", "cloud"],
        "severity": 3, "cvss_score": 5.3, "cve_id": "",
        "iso27001_clause": "A.8.15, A.8.16",
        "remediation": "Implement centralized SIEM, define logging standards, set up security event alerting, conduct regular log reviews.",
    },
    {
        "name": "Insecure API Configuration",
        "description": "APIs lacking proper authentication, authorization, rate limiting, or input validation.",
        "vulnerability_type": "software",
        "asset_types": ["application", "cloud"],
        "severity": 4, "cvss_score": 7.5, "cve_id": "",
        "iso27001_clause": "A.8.28",
        "remediation": "Implement OAuth 2.0/JWT authentication, rate limiting, input validation, and API gateway with WAF.",
    },
    {
        "name": "No Data Classification Policy",
        "description": "Absence of formal data classification leading to inconsistent protection of sensitive information.",
        "vulnerability_type": "process",
        "asset_types": ["data", "application", "database", "storage"],
        "severity": 3, "cvss_score": None, "cve_id": "",
        "iso27001_clause": "A.5.12, A.5.13",
        "remediation": "Develop and implement a data classification framework with clear handling requirements for each classification level.",
    },
    {
        "name": "Lack of Security Awareness Training",
        "description": "Employees unaware of security threats, phishing tactics, and security policies, increasing human error risks.",
        "vulnerability_type": "human",
        "asset_types": ["human", "endpoint"],
        "severity": 3, "cvss_score": None, "cve_id": "",
        "iso27001_clause": "A.6.3",
        "remediation": "Implement regular security awareness training, phishing simulations, and ongoing security culture programmes.",
    },
    {
        "name": "Outdated or Misconfigured Firewall Rules",
        "description": "Firewall rules that are outdated, overly permissive, or poorly managed.",
        "vulnerability_type": "network",
        "asset_types": ["network"],
        "severity": 4, "cvss_score": 7.0, "cve_id": "",
        "iso27001_clause": "A.8.20, A.8.21",
        "remediation": "Conduct regular firewall rule reviews, apply change management, adopt deny-by-default approach.",
    },
    {
        "name": "Inadequate Backup and Recovery Procedures",
        "description": "Insufficient backup frequency, untested recovery procedures, or backups stored in the same location as primary data.",
        "vulnerability_type": "process",
        "asset_types": ["server", "database", "storage"],
        "severity": 4, "cvss_score": None, "cve_id": "",
        "iso27001_clause": "A.8.13",
        "remediation": "Implement 3-2-1 backup strategy, test restoration procedures regularly, and maintain off-site/cloud backups.",
    },
    {
        "name": "Unsecured Remote Access",
        "description": "Remote access solutions (VPN, RDP, SSH) inadequately secured, exposing internal systems.",
        "vulnerability_type": "network",
        "asset_types": ["server", "network", "endpoint"],
        "severity": 4, "cvss_score": 7.8, "cve_id": "",
        "iso27001_clause": "A.8.20, A.5.14",
        "remediation": "Secure with MFA, certificate-based VPN, limit exposed ports, use privileged access workstations.",
    },
    {
        "name": "Third-Party / Vendor Access Without Controls",
        "description": "External vendors or contractors with excessive or unmonitored access to systems and data.",
        "vulnerability_type": "process",
        "asset_types": ["application", "server", "database"],
        "severity": 3, "cvss_score": None, "cve_id": "",
        "iso27001_clause": "A.5.19, A.5.22",
        "remediation": "Implement vendor access management, just-in-time access, vendor risk assessments, and periodic reviews.",
    },
    {
        "name": "Physical Security Gaps",
        "description": "Inadequate physical security controls: lack of CCTV, access control systems, or clean desk policies.",
        "vulnerability_type": "physical",
        "asset_types": ["physical", "server", "endpoint"],
        "severity": 3, "cvss_score": None, "cve_id": "",
        "iso27001_clause": "A.7.1, A.7.2, A.7.4",
        "remediation": "Implement physical access controls, CCTV, visitor management, and clean desk/clear screen policies.",
    },
    {
        "name": "Absence of Incident Response Plan",
        "description": "No documented or tested incident response procedures, leading to delayed and ineffective responses.",
        "vulnerability_type": "process",
        "asset_types": ["process"],
        "severity": 4, "cvss_score": None, "cve_id": "",
        "iso27001_clause": "A.5.24, A.5.26",
        "remediation": "Develop and test an incident response plan covering detection, containment, eradication, and recovery.",
    },
    {
        "name": "Hardcoded Secrets / Credentials in Code",
        "description": "API keys, passwords, or cryptographic keys embedded directly in source code or configuration files.",
        "vulnerability_type": "software",
        "asset_types": ["application"],
        "severity": 5, "cvss_score": 9.0, "cve_id": "",
        "iso27001_clause": "A.8.25, A.8.10",
        "remediation": "Use secrets management solutions, scan code for secrets in CI/CD, rotate any exposed credentials immediately.",
    },
    {
        "name": "Privileged Account Mismanagement",
        "description": "Shared admin accounts, lack of PAM solutions, or insufficient controls over privileged access.",
        "vulnerability_type": "configuration",
        "asset_types": ["server", "database", "cloud", "application"],
        "severity": 4, "cvss_score": 7.8, "cve_id": "",
        "iso27001_clause": "A.8.2",
        "remediation": "Implement Privileged Access Management (PAM), eliminate shared accounts, enforce just-in-time privileged access.",
    },
    {
        "name": "Lack of Security in SDLC",
        "description": "Applications developed without security testing, code reviews, or secure development practices.",
        "vulnerability_type": "software",
        "asset_types": ["application", "software"],
        "severity": 3, "cvss_score": None, "cve_id": "",
        "iso27001_clause": "A.8.25, A.8.29",
        "remediation": "Implement SAST/DAST in CI/CD pipeline, conduct security code reviews, adopt a Secure SDLC framework.",
    },
    {
        "name": "No Business Continuity / Disaster Recovery Plan",
        "description": "Absence of BCP/DRP leaving the organisation unable to recover effectively from major incidents.",
        "vulnerability_type": "process",
        "asset_types": ["process", "server", "physical"],
        "severity": 4, "cvss_score": None, "cve_id": "",
        "iso27001_clause": "A.5.29, A.5.30",
        "remediation": "Develop, test, and maintain Business Continuity and Disaster Recovery Plans with defined RTOs and RPOs.",
    },
]

# Threat → Vulnerability links
LINKS = {
    "Ransomware Attack": [
        "Unpatched Software / Missing Security Updates",
        "Missing Multi-Factor Authentication (MFA)",
        "Lack of Security Awareness Training",
        "Inadequate Backup and Recovery Procedures",
        "Unsecured Remote Access",
    ],
    "Phishing / Spear Phishing": [
        "Lack of Security Awareness Training",
        "Missing Multi-Factor Authentication (MFA)",
    ],
    "SQL Injection": [
        "Insecure API Configuration",
        "Lack of Security in SDLC",
        "Insufficient Logging and Monitoring",
    ],
    "Credential Theft / Brute Force": [
        "Default or Weak Credentials",
        "Missing Multi-Factor Authentication (MFA)",
        "Insufficient Logging and Monitoring",
    ],
    "Unauthorised Data Access": [
        "Excessive User Privileges / Lack of Least Privilege",
        "Missing Multi-Factor Authentication (MFA)",
        "Insufficient Logging and Monitoring",
    ],
    "Data Exfiltration": [
        "Unencrypted Sensitive Data at Rest",
        "Unencrypted Data in Transit",
        "No Data Classification Policy",
        "Insufficient Logging and Monitoring",
    ],
    "Insider Threat": [
        "Excessive User Privileges / Lack of Least Privilege",
        "Insufficient Logging and Monitoring",
        "No Data Classification Policy",
        "Third-Party / Vendor Access Without Controls",
    ],
    "Cloud Misconfiguration Exploitation": [
        "Excessive User Privileges / Lack of Least Privilege",
        "Insufficient Logging and Monitoring",
        "Privileged Account Mismanagement",
    ],
    "Supply Chain / Third-Party Attack": [
        "Third-Party / Vendor Access Without Controls",
        "Lack of Security in SDLC",
        "Hardcoded Secrets / Credentials in Code",
    ],
    "Zero-Day Exploit": [
        "Unpatched Software / Missing Security Updates",
        "Insufficient Logging and Monitoring",
        "No Business Continuity / Disaster Recovery Plan",
    ],
    "Physical Intrusion / Theft": [
        "Physical Security Gaps",
    ],
    "Natural Disaster / Environmental Event": [
        "Inadequate Backup and Recovery Procedures",
        "No Business Continuity / Disaster Recovery Plan",
        "Physical Security Gaps",
    ],
}


def seed_threats(apps, schema_editor):
    Threat = apps.get_model("threats", "Threat")
    Vulnerability = apps.get_model("threats", "Vulnerability")
    ThreatVulnerabilityLink = apps.get_model("threats", "ThreatVulnerabilityLink")

    threat_objs = {}
    for t in THREATS:
        obj = Threat.objects.create(
            id=uuid.uuid4(),
            is_system_default=True,
            **t,
        )
        threat_objs[t["name"]] = obj

    vuln_objs = {}
    for v in VULNERABILITIES:
        obj = Vulnerability.objects.create(
            id=uuid.uuid4(),
            is_system_default=True,
            **v,
        )
        vuln_objs[v["name"]] = obj

    for threat_name, vuln_names in LINKS.items():
        threat = threat_objs.get(threat_name)
        if not threat:
            continue
        for vuln_name in vuln_names:
            vuln = vuln_objs.get(vuln_name)
            if vuln:
                ThreatVulnerabilityLink.objects.create(
                    id=uuid.uuid4(),
                    threat=threat,
                    vulnerability=vuln,
                )


def unseed_threats(apps, schema_editor):
    Threat = apps.get_model("threats", "Threat")
    Vulnerability = apps.get_model("threats", "Vulnerability")
    Threat.objects.filter(is_system_default=True).delete()
    Vulnerability.objects.filter(is_system_default=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("threats", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_threats, unseed_threats),
    ]
