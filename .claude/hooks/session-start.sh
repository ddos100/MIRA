#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (remote) sessions.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

echo "[session-start] Installing backend Python dependencies..."
cd "$REPO_ROOT/backend"
python3 -m pip install --quiet --upgrade pip
python3 -m pip install --quiet -r requirements/development.txt

echo "[session-start] Installing frontend Node dependencies..."
cd "$REPO_ROOT/frontend"
npm install --no-audit --no-fund --loglevel=error

# Persist env vars the agent needs in subsequent tool calls.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export DJANGO_SETTINGS_MODULE="config.settings.development"' >> "$CLAUDE_ENV_FILE"
  echo 'export SECRET_KEY="dev-session-secret-key"' >> "$CLAUDE_ENV_FILE"
fi

echo "[session-start] Done."
