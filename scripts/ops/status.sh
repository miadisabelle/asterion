#!/bin/bash
# scripts/ops/status.sh — where does asterion stand, in one screen.
#
# Reads: git HEAD · built BUILD_ID vs served process · the three systemd units ·
# the local port · the tailscale service registration · the TLS cert expiry ·
# both doors.
#
# Usage: ./scripts/ops/status.sh [--port N]

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

while [[ $# -gt 0 ]]; do
  case $1 in
    --port)    PORT="$2"; shift 2 ;;
    -h|--help) sed -n '2,/^source/p' "$0" | grep '^#' | cut -c3-; exit 0 ;;
    *) die "Unknown option: $1" ;;
  esac
done

banner "Asterion status"

step "source"
say "HEAD      $(git -C "$ROOT_DIR" rev-parse --short HEAD) on $(git -C "$ROOT_DIR" branch --show-current)"
DIRTY=$(git -C "$ROOT_DIR" status --porcelain | wc -l)
say "worktree  $([ "$DIRTY" = 0 ] && echo clean || echo "${DIRTY} file(s) changed")"
say "BUILD_ID  $(cat "${APP_DIR}/.next/BUILD_ID" 2>/dev/null || echo 'none — never built')"

step "units (user: ${SERVICE_USER})"
for u in "$UNIT" "$TS_UNIT" "$CERT_TIMER"; do
  if sc cat "$u" >/dev/null 2>&1; then
    printf '  %-34s %-10s %s\n' "$u" "$(sc is-enabled "$u" 2>/dev/null || echo '?')" "$(sc is-active "$u" 2>/dev/null || echo '?')"
  else
    printf '  %-34s %s\n' "$u" "not installed — see ${INSTALLER}"
  fi
done
MAINPID=$(sc show "$UNIT" -p MainPID --value 2>/dev/null || echo 0)
[ "${MAINPID:-0}" != "0" ] && say "pid ${MAINPID}, up $(ps -o etime= -p "$MAINPID" 2>/dev/null | tr -d ' ')"

step "tailnet"
if serve_registered; then
  tailscale serve status 2>/dev/null | grep -A1 'svc:asterion' | sed 's/^/  /'
else
  warn "svc:asterion is not registered — ./scripts/ops/restart.sh --tailscale"
fi
CERT="/etc/jgwill/asterion/${DOMAIN}.crt"
if [ -r "$CERT" ]; then
  say "cert      expires $(openssl x509 -enddate -noout -in "$CERT" 2>/dev/null | cut -d= -f2)"
else
  warn "no readable cert at ${CERT}"
fi

step "doors"
printf '  app    127.0.0.1:%-6s →  %s\n' "$PORT" "$(http_code "http://127.0.0.1:${PORT}/" 5)"
printf '  https  %-26s →  %s\n' "$DOMAIN" "$(http_code "https://${DOMAIN}/" 10)"
echo ""
