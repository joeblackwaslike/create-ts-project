#!/usr/bin/env bash
# Auto-installs the create-ts-project CLI via npm link if it isn't already on PATH.
# Runs as a SessionStart hook — must exit cleanly and output valid JSON.

set -euo pipefail

PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"

# Nothing to do if the CLI is already reachable
if command -v create-ts-project &>/dev/null; then
  echo '{"continue":true,"suppressOutput":true}'
  exit 0
fi

cd "$PLUGIN_DIR"

# Build dist/ if it doesn't exist yet
if [[ ! -f "dist/index.js" ]]; then
  if ! command -v pnpm &>/dev/null; then
    echo '{"continue":true,"suppressOutput":true}'
    exit 0
  fi
  pnpm install --frozen-lockfile --silent 2>/dev/null || true
  pnpm build --silent 2>/dev/null || true
fi

# Link — suppress noise, don't fail the session if this errors
npm link --silent 2>/dev/null || true

if command -v create-ts-project &>/dev/null; then
  echo '{"continue":true,"suppressOutput":false,"status":"create-ts-project CLI installed via npm link"}'
else
  echo '{"continue":true,"suppressOutput":true}'
fi
