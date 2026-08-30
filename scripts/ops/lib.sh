#!/bin/bash
# scripts/ops/lib.sh — shared ground for the asterion ops scripts.
# Sourced, never run. Every fact about where asterion lives is stated once here.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# scripts/ops/ → repo root. Walk up rather than counting ../.. so moving this
# directory again fails on the last line, loudly, instead of quietly building
# the wrong tree.
ROOT_DIR="$SCRIPT_DIR"
while [ "$ROOT_DIR" != "/" ] && [ ! -f "${ROOT_DIR}/app/package.json" ]; do
  ROOT_DIR="$(dirname "$ROOT_DIR")"
done
[ -f "${ROOT_DIR}/app/package.json" ] || { echo "⛔ cannot find the asterion repo root above ${SCRIPT_DIR}" >&2; exit 1; }
APP_DIR="${ROOT_DIR}/app"
PKG_DIR="${ROOT_DIR}/packages/asterion"

PORT="${ASTERION_PORT:-3336}"
DOMAIN="${ASTERION_DOMAIN:-asterion.tail3b11eb.ts.net}"
SERVICE_USER="${ASTERION_USER:-mia}"
UNIT="asterion-server.service"
TS_UNIT="asterion-tailscale.service"
CERT_TIMER="asterion-tailscale-cert.timer"
# The installer that laid down those units — quoted in errors so the fix is nearby.
INSTALLER="/opt/gaia/linux_migration/22-asterion-tailscale-autostart.sh"

say()  { printf '  %s\n' "$*"; }
step() { printf '\n▸ %s\n' "$*"; }
ok()   { printf '  ✓ %s\n' "$*"; }
warn() { printf '  ⚠ %s\n' "$*"; }
die()  { printf '  ⛔ %s\n' "$*" >&2; exit 1; }

banner() {
  echo "═══════════════════════════════════════════════════════"
  printf '  %s\n' "$1"
  printf '  %s → 127.0.0.1:%s → https://%s\n' "$ROOT_DIR" "$PORT" "$DOMAIN"
  echo "═══════════════════════════════════════════════════════"
}

# Builds must never run as root — root-owned .next and node_modules is a whole
# evening of chown, and the unit runs as ${SERVICE_USER}.
refuse_root() {
  [ "$(id -u)" = "0" ] && die "run this as ${SERVICE_USER}, not root — build artefacts would end up root-owned"
  return 0
}

# systemctl --user against ${SERVICE_USER}'s manager, from wherever we are.
sc() {
  if [ "$(id -un)" = "$SERVICE_USER" ]; then
    systemctl --user "$@"
  else
    sudo -u "$SERVICE_USER" XDG_RUNTIME_DIR="/run/user/$(id -u "$SERVICE_USER")" systemctl --user "$@"
  fi
}

unit_installed() { sc cat "$UNIT" >/dev/null 2>&1; }

require_unit() {
  unit_installed || die "${UNIT} is not installed — run ${INSTALLER} first"
}

pnpm_bin() {
  command -v pnpm 2>/dev/null && return 0
  [ -x "$HOME/.local/share/pnpm/pnpm" ] && { echo "$HOME/.local/share/pnpm/pnpm"; return 0; }
  return 1
}

# curl already prints 000 via -w when it cannot connect, so the fallback must
# REPLACE that output, never append to it — `|| echo 000` yields "000000",
# which is not "000" and silently satisfies every wait loop.
http_code() {
  local code
  code=$(curl -sS -m "${2:-5}" -o /dev/null -w '%{http_code}' "$1" 2>/dev/null) || code=""
  echo "${code:-000}"
}

# next needs a breath after a restart — booting is not broken.
wait_http() { # wait_http <url> <tries>
  local code=000
  for _ in $(seq 1 "${2:-30}"); do
    code=$(http_code "$1" 3)
    [ "$code" = "000" ] || break
    sleep 1
  done
  echo "$code"
}

serve_registered() { tailscale serve status 2>/dev/null | grep -q "svc:asterion"; }
