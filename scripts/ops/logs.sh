#!/bin/bash
# scripts/ops/logs.sh — read what the service has been saying.
#
# Usage: ./scripts/ops/logs.sh [-f] [-n LINES] [--tailscale]
#   -f            follow
#   -n LINES      how many lines back (default 80)
#   --tailscale   read asterion-tailscale.service instead of the app

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

LINES=80; FOLLOW=""; TARGET="$UNIT"
while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--follow) FOLLOW="-f"; shift ;;
    -n)          LINES="$2"; shift 2 ;;
    --tailscale) TARGET="$TS_UNIT"; shift ;;
    -h|--help)   sed -n '2,/^source/p' "$0" | grep '^#' | cut -c3-; exit 0 ;;
    *) die "Unknown option: $1" ;;
  esac
done

if [ "$(id -un)" = "$SERVICE_USER" ]; then
  exec journalctl --user -u "$TARGET" -n "$LINES" $FOLLOW --no-pager
else
  exec sudo -u "$SERVICE_USER" XDG_RUNTIME_DIR="/run/user/$(id -u "$SERVICE_USER")" \
    journalctl --user -u "$TARGET" -n "$LINES" $FOLLOW --no-pager
fi
