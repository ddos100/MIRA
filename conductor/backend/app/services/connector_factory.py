"""Build a concrete connector instance from a DB Connector record."""
from typing import Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.integration import Connector, ConnectorCredential
from app.services.crypto_service import decrypt
from app.integrations.db_connector import DBConnector
from app.integrations.api_connector import APIConnector
from app.integrations.ssh_connector import SSHConnector
from app.integrations.mira_connector import MIRAConnector


async def get_credentials(connector_id: str, db: AsyncSession) -> Dict[str, str]:
    result = await db.execute(
        select(ConnectorCredential).where(ConnectorCredential.connector_id == connector_id)
    )
    creds = {}
    for row in result.scalars():
        try:
            creds[row.credential_key] = decrypt(row.encrypted_value)
        except Exception:
            creds[row.credential_key] = ""
    return creds


async def build_connector(connector: Connector, db: AsyncSession):
    creds = await get_credentials(connector.id, db)
    config = connector.config or {}

    if connector.connector_type == "db":
        return DBConnector(config, creds)
    elif connector.connector_type == "rest_api":
        return APIConnector(config, creds)
    elif connector.connector_type == "ssh":
        return SSHConnector(config, creds)
    elif connector.connector_type == "mira":
        return MIRAConnector(
            base_url=config.get("base_url"),
            api_key=creds.get("api_key"),
        )
    else:
        raise ValueError(f"Unknown connector type: {connector.connector_type}")
