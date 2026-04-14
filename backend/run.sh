#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

PORT="${PORT:-8000}"
UVICORN_BIN="${UVICORN_BIN:-./.venv/bin/uvicorn}"

if [ -x "$UVICORN_BIN" ]; then
  exec "$UVICORN_BIN" app.main:app --reload --host 0.0.0.0 --port "$PORT"
fi

exec uvicorn app.main:app --reload --host 0.0.0.0 --port "$PORT"
