"""SSH connector via Paramiko — collect configs and logs from remote hosts."""
import io
from typing import Any, Dict, List, Optional
import paramiko
from app.integrations.base_connector import BaseConnector


class SSHConnector(BaseConnector):
    """
    config keys: host, port (default 22), username
    credentials keys: password OR private_key (PEM text)
    """

    def _get_client(self) -> paramiko.SSHClient:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        host = self.config.get("host")
        port = int(self.config.get("port", 22))
        username = self.config.get("username") or self.get_cred("username")

        private_key_pem = self.get_cred("private_key")
        password = self.get_cred("password")

        if private_key_pem:
            key_file = io.StringIO(private_key_pem)
            pkey = paramiko.RSAKey.from_private_key(key_file)
            client.connect(hostname=host, port=port, username=username, pkey=pkey, timeout=15)
        else:
            client.connect(hostname=host, port=port, username=username, password=password, timeout=15)

        return client

    async def test_connection(self) -> tuple[bool, str]:
        try:
            client = self._get_client()
            _, stdout, _ = client.exec_command("echo OK")
            result = stdout.read().decode().strip()
            client.close()
            if result == "OK":
                return True, "SSH connection successful"
            return False, f"Unexpected response: {result}"
        except Exception as exc:
            return False, str(exc)

    async def collect(
        self, query: Optional[str] = None, **kwargs
    ) -> List[Dict[str, Any]]:
        if not query:
            return []
        return await self.exec_command(query)

    async def exec_command(self, command: str) -> List[Dict[str, Any]]:
        client = self._get_client()
        try:
            _, stdout, stderr = client.exec_command(command, timeout=60)
            out = stdout.read().decode(errors="replace")
            err = stderr.read().decode(errors="replace")
            exit_code = stdout.channel.recv_exit_status()
            return [{
                "command": command,
                "stdout": out,
                "stderr": err,
                "exit_code": exit_code,
                "host": self.config.get("host"),
            }]
        finally:
            client.close()

    async def get_file(self, remote_path: str, local_path: str) -> None:
        client = self._get_client()
        try:
            sftp = client.open_sftp()
            sftp.get(remote_path, local_path)
            sftp.close()
        finally:
            client.close()
