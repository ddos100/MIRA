"""Build a connector instance from an AiConnector model, decrypting credentials."""
import logging
from typing import Optional

from apps.conductor.integrations.base_connector import BaseConnector
from apps.conductor.services.crypto_service import decrypt

logger = logging.getLogger(__name__)


def build_connector(connector) -> Optional[BaseConnector]:
    """
    Instantiate the correct connector class for an AiConnector model instance.
    Returns None if the type is unknown.
    """
    creds = {c.credential_key: decrypt(c.encrypted_value) for c in connector.credentials.all()}
    config = {**connector.config, **creds}
    ct = connector.connector_type

    if ct == "db":
        from apps.conductor.integrations.db_connector import DBConnector
        return DBConnector(config)
    elif ct == "rest_api":
        from apps.conductor.integrations.api_connector import APIConnector
        return APIConnector(config)
    elif ct == "ssh":
        from apps.conductor.integrations.ssh_connector import SSHConnector
        return SSHConnector(config)
    elif ct == "mira_api":
        from apps.conductor.integrations.api_connector import APIConnector
        return APIConnector(config)
    else:
        logger.warning("Unknown connector type: %s", ct)
        return None
