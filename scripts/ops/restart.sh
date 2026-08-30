#!/bin/bash
# scripts/ops/restart.sh — restart the running build. No compile, no install.
#
# For when the code did not change but the process should start over: a stuck
# connection pool, a changed .env.local (next reads it at boot, not per request),
# a lapsed tailscale serve registration.
#
# Usage: ./scripts/ops/restart.sh [--tailscale] [--port N]
#   --tailscale   also re-run the serve/cert wrapper (asterion-tailscale.service)

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

DO_TS=0
while [[ $# -gt 0 ]]; do
  case $1 in
    --tailscale) DO_TS=1; shift ;;
    --port)      PORT="$2"; shift 2 ;;
    -h|--help)   sed -n '2,/^source/p' "$0" | grep '^#' | cut -c3-; exit 0 ;;
    *) die "Unknown option: $1" ;;
  esac
done

banner "Asterion restart"
require_unit

step "restart ${UNIT}"
sc restart "$UNIT"
APP_CODE=$(wait_http "http://127.0.0.1:${PORT}/" 30)

if [ "$DO_TS" = 1 ] || ! serve_registered; then
  step "restart ${TS_UNIT} (cert + serve + advertise)"
  sc restart "$TS_UNIT" || warn "could not restart ${TS_UNIT}"
fi
SVC_CODE=$(wait_http "https://${DOMAIN}/" 15)

echo ""
printf '  app    127.0.0.1:%-6s →  %s   (BUILD_ID %s)\n' "$PORT" "$APP_CODE" "$(cat "${APP_DIR}/.next/BUILD_ID" 2>/dev/null || echo none)"
printf '  https  %-26s →  %s\n' "$DOMAIN" "$SVC_CODE"
echo ""
[ "$APP_CODE" = "200" ] || warn "local app answered ${APP_CODE} — ./scripts/ops/logs.sh"
