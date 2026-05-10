"""MIRA GRC platform connector — pushes findings and pulls frameworks via MIRA REST API."""
from typing import Any, Dict, List, Optional
import httpx
from app.config import get_settings

settings = get_settings()


class MIRAConnector:
    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None):
        self.base_url = (base_url or settings.mira_api_url).rstrip("/")
        self.api_key = api_key or settings.mira_api_key

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            timeout=30,
        )

    async def health(self) -> bool:
        if not self.base_url:
            return False
        try:
            async with self._client() as client:
                r = await client.get("/api/v1/")
                return r.status_code < 400
        except Exception:
            return False

    # ── Frameworks ──────────────────────────────────────────────────────────
    async def list_frameworks(self) -> List[Dict]:
        async with self._client() as client:
            r = await client.get("/api/v1/compliance/frameworks/")
            r.raise_for_status()
            return r.json().get("results", r.json())

    async def get_framework_controls(self, framework_id: str) -> List[Dict]:
        async with self._client() as client:
            r = await client.get(f"/api/v1/compliance/frameworks/{framework_id}/controls/")
            r.raise_for_status()
            return r.json().get("results", r.json())

    # ── Push Findings ────────────────────────────────────────────────────────
    async def push_finding(self, finding: Dict) -> Dict:
        """Push an AgentFinding to MIRA as a ControlIssue."""
        payload = {
            "title": finding["title"],
            "description": finding["description"],
            "severity": finding.get("severity", "medium"),
            "remediation": finding.get("remediation", ""),
            "source": "MIRA-Conductor",
            "control_ref": finding.get("control_ref"),
        }
        async with self._client() as client:
            r = await client.post("/api/v1/controls/issues/", json=payload)
            r.raise_for_status()
            return r.json()

    async def push_findings_batch(self, findings: List[Dict]) -> List[Dict]:
        return [await self.push_finding(f) for f in findings]

    # ── Push Report ──────────────────────────────────────────────────────────
    async def push_report_summary(self, report: Dict) -> Dict:
        payload = {
            "title": report["title"],
            "report_type": report.get("report_type", "audit"),
            "compliance_score": report.get("compliance_score"),
            "summary": report.get("summary", ""),
            "source": "MIRA-Conductor",
        }
        async with self._client() as client:
            r = await client.post("/api/v1/reports/", json=payload)
            r.raise_for_status()
            return r.json()

    # ── Pull Evidence ────────────────────────────────────────────────────────
    async def list_evidence(self, framework_id: Optional[str] = None) -> List[Dict]:
        params = {}
        if framework_id:
            params["framework"] = framework_id
        async with self._client() as client:
            r = await client.get("/api/v1/compliance/evidence/", params=params)
            r.raise_for_status()
            return r.json().get("results", r.json())
