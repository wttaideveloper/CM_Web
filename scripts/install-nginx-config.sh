#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
timestamp="$(date +%Y%m%d-%H%M%S)"
available_target="/etc/nginx/sites-available/cm-web"
enabled_target="/etc/nginx/sites-enabled/13.207.85.164.conf"
available_backup="${available_target}.backup.${timestamp}"
enabled_backup="${enabled_target}.backup.${timestamp}"

if [[ ! -f "${repo_root}/deploy/nginx/cm-web.conf.template" ]]; then
  echo "Missing deploy/nginx/cm-web.conf.template" >&2
  exit 1
fi

if [[ ! -f "${repo_root}/deploy/nginx/13.207.85.164.conf.template" ]]; then
  echo "Missing deploy/nginx/13.207.85.164.conf.template" >&2
  exit 1
fi

sudo cp -a "${available_target}" "${available_backup}"
sudo cp -a "${enabled_target}" "${enabled_backup}"

rollback() {
  sudo cp -a "${available_backup}" "${available_target}"
  sudo cp -a "${enabled_backup}" "${enabled_target}"
}

trap rollback ERR

sudo cp "${repo_root}/deploy/nginx/cm-web.conf.template" "${available_target}"
sudo cp "${repo_root}/deploy/nginx/13.207.85.164.conf.template" "${enabled_target}"
sudo nginx -t
sudo systemctl reload nginx

trap - ERR
echo "Nginx configuration installed and reloaded."
echo "Backups: ${available_backup} ${enabled_backup}"
