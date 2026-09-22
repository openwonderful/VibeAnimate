#!/usr/bin/env bash
# Run the live AI render server in the foreground (the studio's ✦ live toggle
# starts it on demand too; this is for watching the log / picking a model).
#   npm run live -- --model sdxl-turbo
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$here/../.."
py="$root/.venv-live/bin/python"
[ -x "$py" ] || { echo "no venv — run: bash scripts/live-render/setup.sh" >&2; exit 1; }
exec "$py" -u "$here/server.py" "$@"
