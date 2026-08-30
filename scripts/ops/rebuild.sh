#!/bin/bash
# scripts/ops/rebuild.sh — rebuild asterion and hand the new build to the service.
#
#   install deps → build app/ → restart asterion-server → verify both doors
#
# The default order is BUILD FIRST, RESTART AFTER: the old build keeps serving
# while the new one compiles, and the swap costs one restart. Use --stop-first
# if you would rather be down than briefly serve a half-swapped .next.
#
# Usage: ./scripts/ops/rebuild.sh [OPTIONS]
#   --pull           git pull --ff-only before building
#   --install        pnpm install before building (implied by --pull)
#   --packages       also build packages/asterion (tsc → dist/)
#   --no-restart     build only, leave the running service untouched
#   --stop-first     stop the service before building
#   --port N         local port (default 3336 / $ASTERION_PORT)
#
# Siblings: restart.sh (no build) · status.sh (where do we stand) · logs.sh

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

DO_PULL=0; DO_INSTALL=0; DO_PACKAGES=0; DO_RESTART=1; STOP_FIRST=0

while [[ $# -gt 0 ]]; do
  case $1 in
    --pull)       DO_PULL=1; DO_INSTALL=1; shift ;;
    --install)    DO_INSTALL=1; shift ;;
    --packages)   DO_PACKAGES=1; shift ;;
    --no-restart) DO_RESTART=0; shift ;;
    --stop-first) STOP_FIRST=1; shift ;;
    --port)       PORT="$2"; shift 2 ;;
    -h|--help)    sed -n '2,/^source/p' "$0" | grep '^#' | cut -c3-; exit 0 ;;
    *) die "Unknown option: $1" ;;
  esac
done

refuse_root
banner "Asterion rebuild"

PNPM=$(pnpm_bin) || die "pnpm not found — install it or add it to PATH"
BEFORE_BUILD_ID=$(cat "${APP_DIR}/.next/BUILD_ID" 2>/dev/null || echo "none")

if [ "$DO_PULL" = 1 ]; then
  step "git pull --ff-only"
  git -C "$ROOT_DIR" pull --ff-only
fi
say "HEAD $(git -C "$ROOT_DIR" rev-parse --short HEAD) on $(git -C "$ROOT_DIR" branch --show-current)"
[ -n "$(git -C "$ROOT_DIR" status --porcelain)" ] && warn "working tree is dirty — building what is on disk, not what is committed"

if [ "$DO_PACKAGES" = 1 ]; then
  step "build packages/asterion"
  (cd "$PKG_DIR" && npm run build)
  ok "packages/asterion → dist/"
fi

if [ "$STOP_FIRST" = 1 ] && unit_installed; then
  step "stop ${UNIT} (--stop-first)"
  sc stop "$UNIT" || true
fi

if [ "$DO_INSTALL" = 1 ]; then
  step "pnpm install"
  (cd "$APP_DIR" && "$PNPM" install)
fi

step "next build"
(cd "$APP_DIR" && "$PNPM" run build)
AFTER_BUILD_ID=$(cat "${APP_DIR}/.next/BUILD_ID" 2>/dev/null || echo "none")
ok "BUILD_ID ${BEFORE_BUILD_ID} → ${AFTER_BUILD_ID}"

if [ "$DO_RESTART" = 0 ]; then
  step "done — build only"
  warn "the service is still serving BUILD_ID ${BEFORE_BUILD_ID}; run ./scripts/ops/restart.sh to swap"
  exit 0
fi

require_unit
step "restart ${UNIT}"
sc restart "$UNIT"

APP_CODE=$(wait_http "http://127.0.0.1:${PORT}/" 30)
[ "$APP_CODE" = "200" ] || warn "local app answered ${APP_CODE} — see ./scripts/ops/logs.sh"

# The tailnet door needs no rebuild, but a serve registration that lapsed (host
# reboot, tailscaled restart) is worth catching here rather than in a browser.
if ! serve_registered; then
  warn "svc:asterion is not registered with tailscale — restarting ${TS_UNIT}"
  sc restart "$TS_UNIT" || warn "could not restart ${TS_UNIT}"
fi
SVC_CODE=$(wait_http "https://${DOMAIN}/" 15)

echo ""
printf '  app    127.0.0.1:%-6s →  %s\n' "$PORT" "$APP_CODE"
printf '  https  %-26s →  %s\n' "$DOMAIN" "$SVC_CODE"
echo ""
[ "$APP_CODE" = "200" ] && [ "$SVC_CODE" = "200" ] \
  && ok "asterion is serving BUILD_ID ${AFTER_BUILD_ID}" \
  || warn "rebuilt, but not both doors answer 200 — ./scripts/ops/status.sh reads the whole picture"
