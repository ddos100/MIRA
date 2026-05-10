"""Abstract base connector interface."""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseConnector(ABC):
    def __init__(self, config: Dict, credentials: Dict[str, str]):
        self.config = config
        self.credentials = credentials  # already decrypted

    @abstractmethod
    async def test_connection(self) -> tuple[bool, str]:
        """Returns (success, message)."""
        ...

    @abstractmethod
    async def collect(self, query: Optional[str] = None, **kwargs) -> List[Dict[str, Any]]:
        """Fetch records from the data source."""
        ...

    def get_cred(self, key: str, default: str = "") -> str:
        return self.credentials.get(key, default)
