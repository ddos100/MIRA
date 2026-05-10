"""DB query tool — executes read-only SQL via a configured connector."""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.agents.base_agent import Tool
from app.models.integration import Connector
from app.services.connector_factory import build_connector


class DBQueryTool(Tool):
    def __init__(self, db: AsyncSession):
        super().__init__(
            name="db_query",
            description="Run a SQL query on a configured database connector. Args: connector_name (str), sql (str)",
        )
        self.db = db

    async def run(self, connector_name: str, sql: str, **kwargs) -> list:
        result = await self.db.execute(
            select(Connector).where(Connector.name == connector_name, Connector.connector_type == "db")
        )
        connector = result.scalar_one_or_none()
        if not connector:
            return [{"error": f"No DB connector named '{connector_name}'"}]
        conn = await build_connector(connector, self.db)
        return await conn.run_query(sql)
