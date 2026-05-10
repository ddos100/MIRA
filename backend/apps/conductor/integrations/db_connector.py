"""Database connector — read-only SQL queries via SQLAlchemy."""
import asyncio
import logging
from typing import Dict, List, Tuple

from .base_connector import BaseConnector

logger = logging.getLogger(__name__)

ALLOWED_DIALECTS = {"postgresql", "mysql", "mssql", "sqlite", "oracle"}
BLOCKED_KEYWORDS = {"drop", "delete", "truncate", "update", "insert", "alter", "create", "exec", "execute"}


def _is_safe_query(sql: str) -> bool:
    lower = sql.lower().strip()
    if not lower.startswith("select"):
        return False
    return not any(kw in lower for kw in BLOCKED_KEYWORDS)


class DBConnector(BaseConnector):
    def _build_url(self) -> str:
        dialect = self.config.get("dialect", "postgresql")
        host = self.config.get("host", "localhost")
        port = self.config.get("port", 5432)
        database = self.config.get("database", "")
        username = self.config.get("username", "")
        password = self.config.get("password", "")
        return f"{dialect}+pymysql://{username}:{password}@{host}:{port}/{database}" if dialect == "mysql" else \
               f"{dialect}://{username}:{password}@{host}:{port}/{database}"

    async def test_connection(self) -> Tuple[bool, str]:
        return await asyncio.to_thread(self._sync_test)

    def _sync_test(self) -> Tuple[bool, str]:
        try:
            from sqlalchemy import create_engine, text
            url = self._build_url()
            engine = create_engine(url, connect_args={"connect_timeout": 10}, pool_pre_ping=True)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True, "Connection successful"
        except Exception as exc:
            return False, str(exc)

    async def run_query(self, sql: str) -> List[dict]:
        if not _is_safe_query(sql):
            raise ValueError(f"Query blocked by safety check. Only SELECT statements are allowed.")
        return await asyncio.to_thread(self._sync_query, sql)

    def _sync_query(self, sql: str) -> List[dict]:
        from sqlalchemy import create_engine, text
        url = self._build_url()
        engine = create_engine(url, connect_args={"connect_timeout": 30})
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            cols = list(result.keys())
            return [dict(zip(cols, row)) for row in result.fetchall()]

    async def collect(self) -> List[Dict]:
        queries = self.config.get("collect_queries", [])
        results = []
        for q in queries:
            try:
                rows = await self.run_query(q)
                results.append({"query": q, "rows": rows, "count": len(rows)})
            except Exception as exc:
                logger.error("DB collect query failed: %s", exc)
        return results
