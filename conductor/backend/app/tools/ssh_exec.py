"""SSH exec tool — runs a command on a remote host via a configured SSH connector."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.agents.base_agent import Tool
from app.models.integration import Connector
from app.services.connector_factory import build_connector


class SSHExecTool(Tool):
    def __init__(self, db: AsyncSession):
        super().__init__(
            name="ssh_exec",
            description="Run a command on a remote host via SSH connector. Args: connector_name (str), command (str)",
        )
        self.db = db

    async def run(self, connector_name: str, command: str, **kwargs) -> list:
        result = await self.db.execute(
            select(Connector).where(Connector.name == connector_name, Connector.connector_type == "ssh")
        )
        connector = result.scalar_one_or_none()
        if not connector:
            return [{"error": f"No SSH connector named '{connector_name}'"}]
        conn = await build_connector(connector, self.db)
        return await conn.exec_command(command)
