"""SSH connector via Paramiko."""
import asyncio
import io
import logging
from typing import Dict, List, Tuple

from .base_connector import BaseConnector

logger = logging.getLogger(__name__)


class SSHConnector(BaseConnector):
    def _make_client(self):
        import paramiko
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        kwargs = {
            "hostname": self.config.get("host"),
            "port": int(self.config.get("port", 22)),
            "username": self.config.get("username"),
            "timeout": 10,
        }
        if self.config.get("private_key"):
            pkey = paramiko.RSAKey.from_private_key(io.StringIO(self.config["private_key"]))
            kwargs["pkey"] = pkey
        elif self.config.get("password"):
            kwargs["password"] = self.config["password"]
        client.connect(**kwargs)
        return client

    async def test_connection(self) -> Tuple[bool, str]:
        try:
            client = await asyncio.to_thread(self._make_client)
            client.close()
            return True, "SSH connection successful"
        except Exception as exc:
            return False, str(exc)

    async def exec_command(self, command: str, timeout: int = 30) -> str:
        def _run():
            client = self._make_client()
            try:
                _, stdout, stderr = client.exec_command(command, timeout=timeout)
                out = stdout.read().decode(errors="replace")
                err = stderr.read().decode(errors="replace")
                return out if out else err
            finally:
                client.close()
        return await asyncio.to_thread(_run)

    async def collect(self) -> List[Dict]:
        commands = self.config.get("collect_commands", [])
        results = []
        for cmd in commands:
            try:
                output = await self.exec_command(cmd)
                results.append({"command": cmd, "output": output})
            except Exception as exc:
                logger.error("SSH collect command failed: %s", exc)
        return results
