"""API fetch tool — calls a configured REST API connector."""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.agents.base_agent import Tool
from app.models.integration import Connector
from app.services.connector_factory import build_connector


class APIFetchTool(Tool):
    def __init__(self, db: AsyncSession):
        super().__init__(
            name="api_fetch",
            description="Fetch data from a REST API connector. Args: connector_name (str), path (str), method (str, default GET), params (dict optional)",
        )
        self.db = db

    async def run(self, connector_name: str, path: str = "/", method: str = "GET", params: Optional[dict] = None, **kwargs):
        result = await self.db.execute(
            select(Connector).where(Connector.name == connector_name, Connector.connector_type == "rest_api")
        )
        connector = result.scalar_one_or_none()
        if not connector:
            return {"error": f"No API connector named '{connector_name}'"}
        conn = await build_connector(connector, self.db)
        return await conn.get(path, params=params)
