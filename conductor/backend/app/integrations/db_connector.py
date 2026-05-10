"""Database connector — supports PostgreSQL, MySQL, MSSQL, SQLite via SQLAlchemy."""
from typing import Any, Dict, List, Optional
import sqlalchemy as sa
from app.integrations.base_connector import BaseConnector


DIALECT_DRIVERS = {
    "postgresql": "postgresql+psycopg2",
    "mysql": "mysql+pymysql",
    "mssql": "mssql+pyodbc",
    "sqlite": "sqlite",
    "oracle": "oracle+cx_oracle",
}


class DBConnector(BaseConnector):
    """
    config keys: dialect, host, port, database, schema (optional)
    credentials keys: username, password
    """

    def _build_url(self) -> str:
        dialect = self.config.get("dialect", "postgresql")
        driver = DIALECT_DRIVERS.get(dialect, dialect)
        user = self.get_cred("username")
        password = self.get_cred("password")
        host = self.config.get("host", "localhost")
        port = self.config.get("port", 5432)
        database = self.config.get("database", "")

        if dialect == "sqlite":
            return f"sqlite:///{database}"
        return f"{driver}://{user}:{password}@{host}:{port}/{database}"

    def _engine(self):
        url = self._build_url()
        return sa.create_engine(url, pool_pre_ping=True, pool_size=2, max_overflow=3)

    async def test_connection(self) -> tuple[bool, str]:
        try:
            engine = self._engine()
            with engine.connect() as conn:
                conn.execute(sa.text("SELECT 1"))
            engine.dispose()
            return True, "Connection successful"
        except Exception as exc:
            return False, str(exc)

    async def collect(
        self, query: Optional[str] = None, **kwargs
    ) -> List[Dict[str, Any]]:
        if not query:
            return []
        engine = self._engine()
        try:
            with engine.connect() as conn:
                result = conn.execute(sa.text(query))
                keys = list(result.keys())
                rows = [dict(zip(keys, row)) for row in result.fetchall()]
            return rows
        finally:
            engine.dispose()

    async def run_query(self, sql: str) -> List[Dict[str, Any]]:
        return await self.collect(query=sql)
