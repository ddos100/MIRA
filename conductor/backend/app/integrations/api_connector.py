"""Generic REST API connector with multiple auth modes."""
from typing import Any, Dict, List, Optional
import httpx
from app.integrations.base_connector import BaseConnector


class APIConnector(BaseConnector):
    """
    config keys: base_url, auth_type (bearer|basic|api_key|none),
                 api_key_header (for api_key type), pagination_type (none|offset|cursor),
                 page_size, verify_ssl
    credentials keys: token (bearer), username+password (basic), api_key (api_key)
    """

    def _build_headers(self) -> Dict[str, str]:
        auth_type = self.config.get("auth_type", "none")
        headers = dict(self.config.get("default_headers", {}))

        if auth_type == "bearer":
            headers["Authorization"] = f"Bearer {self.get_cred('token')}"
        elif auth_type == "api_key":
            key_header = self.config.get("api_key_header", "X-API-Key")
            headers[key_header] = self.get_cred("api_key")

        return headers

    def _auth(self) -> Optional[httpx.BasicAuth]:
        if self.config.get("auth_type") == "basic":
            return httpx.BasicAuth(
                self.get_cred("username"), self.get_cred("password")
            )
        return None

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self.config.get("base_url", ""),
            headers=self._build_headers(),
            auth=self._auth(),
            timeout=30,
            verify=self.config.get("verify_ssl", True),
        )

    async def test_connection(self) -> tuple[bool, str]:
        test_path = self.config.get("health_path", "/")
        try:
            async with self._client() as client:
                r = await client.get(test_path)
                if r.status_code < 400:
                    return True, f"HTTP {r.status_code}"
                return False, f"HTTP {r.status_code}: {r.text[:200]}"
        except Exception as exc:
            return False, str(exc)

    async def collect(
        self,
        query: Optional[str] = None,
        method: str = "GET",
        path: str = "/",
        params: Optional[Dict] = None,
        body: Optional[Dict] = None,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        async with self._client() as client:
            r = await client.request(method, path, params=params, json=body)
            r.raise_for_status()
            data = r.json()
            if isinstance(data, list):
                return data
            # Try common wrapper keys
            for key in ("data", "items", "results", "records", "value"):
                if isinstance(data.get(key), list):
                    return data[key]
            return [data]

    async def get(self, path: str, params: Optional[Dict] = None) -> Any:
        async with self._client() as client:
            r = await client.get(path, params=params)
            r.raise_for_status()
            return r.json()

    async def post(self, path: str, body: Dict) -> Any:
        async with self._client() as client:
            r = await client.post(path, json=body)
            r.raise_for_status()
            return r.json()
