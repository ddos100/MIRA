"""Abstract base connector."""
from abc import ABC, abstractmethod
from typing import Dict, List, Tuple


class BaseConnector(ABC):
    def __init__(self, config: dict):
        self.config = config

    @abstractmethod
    async def test_connection(self) -> Tuple[bool, str]:
        """Returns (success, message)."""

    @abstractmethod
    async def collect(self) -> List[Dict]:
        """Returns list of evidence dicts."""
