#!/bin/sh
# Container entrypoint for the IHP Next.js frontends (shell, enterprise-admin, platform-admin).
# Validates configuration, then replaces itself with the Next.js standalone server so the
# server is the container's main process and receives stop signals directly.
set -eu

: "${APP_NAME:?APP_NAME must be set to shell, enterprise-admin or platform-admin}"

case "$APP_NAME" in
  shell) default_port=3000 ;;
  enterprise-admin) default_port=3001 ;;
  platform-admin) default_port=3002 ;;
  *)
    echo "[entrypoint] Unknown APP_NAME '$APP_NAME'. Expected shell, enterprise-admin or platform-admin." >&2
    exit 64
    ;;
esac

PORT="${PORT:-$default_port}"
export PORT
# Docker injects the container ID as HOSTNAME; the standalone server needs an explicit bind address.
HOSTNAME=0.0.0.0
export HOSTNAME

# Fails with a names-only message (exit 1) when mandatory configuration is missing or malformed.
node --no-warnings /app/scripts/docker/check-env.mjs runtime "$APP_NAME"

exec node "/app/apps/${APP_NAME}/server.js"
