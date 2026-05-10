"""REST API connector via httpx."""
import asyncio
import logging
from typing import Dict, List, Tuple

import httpx

from .base_connector import BaseConnector

logger = logging.getLogger(__name__)


class APIConnector(BaseConnector):
    def _headers(self) -> dict:
        auth_type = self.config.get("auth_type", "none")
        headers = dict(self.config.get("headers", {}))
        if auth_type == "bearer":
            headers["Authorization"] = f"Bearer {self.config.get('token', '')}"
        elif auth_type == "api_key":
            key_name = self.config.get("api_key_header", "X-API-Key")
            headers[key_name] = self.config.get("api_key", "")
        return headers

    def _auth(self):
        auth_type = self.config.get("auth_type", "none")
        if auth_type == "basic":
            return (self.config.get("username", ""), self.config.get("password", ""))
        return None

    async def test_connection(self) -> Tuple[bool, str]:
        try:
            base_url = self.config.get("base_url", "")
            test_endpoint = self.config.get("test_endpoint", "/")
            async with httpx.AsyncClient(timeout=10.0) as c:
                r = await c.get(f"{base_url}{test_endpoint}", headers=self._headers(), auth=self._auth())
                return r.status_code < 400, f"HTTP {r.status_code}"
        except Exception as exc:
            return False, str(exc)

    async def get(self, endpoint: str, params: dict = None) -> dict:
        base_url = self.config.get("base_url", "")
        async with httpx.AsyncClient(timeout=30.0) as c:
            r = await c.get(f"{base_url}{endpoint}", params=params or {}, headers=self._headers(), auth=self._auth())
            r.raise_for_status()
            try:
                return r.json()
            except Exception:
                return {"raw": r.text}

    async def post(self, endpoint: str, body: dict = None) -> dict:
        base_url = self.config.get("base_url", "")
        async with httpx.AsyncClient(timeout=30.0) as c:
            r = await c.post(f"{base_url}{endpoint}", json=body or {}, headers=self._headers(), auth=self._auth())
            r.raise_for_status()
            try:
                return r.json()
            except Exception:
                return {"raw": r.text}

    async def collect(self) -> List[Dict]:
        endpoints = self.config.get("collect_endpoints", [])
        results = []
        for ep in endpoints:
            try:
                data = await self.get(ep)
                results.append({"endpoint": ep, "data": data})
            except Exception as exc:
                logger.error("API collect failed for %s: %s", ep, exc)
        return results
