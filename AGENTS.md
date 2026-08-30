# AGENTS.md

`app/` is the Next app, `packages/asterion` the types it stands on. Vercel serves
the public deployments; on gaia the same app runs as a systemd user service —
`127.0.0.1:3336`, published to the tailnet as `https://asterion.tail3b11eb.ts.net`.

**Never `next build`, `pnpm start`, or `systemctl` the gaia instance by hand.**
Four verbs own it, and they verify what they did:

```bash
./scripts/ops/status.sh      # source · units · tailnet · both doors, one screen
./scripts/ops/rebuild.sh     # build, then hand the new build to the service
./scripts/ops/restart.sh     # restart the running build, no compile
./scripts/ops/logs.sh -f     # what the service is saying
```

Read `scripts/ops/README.md` before changing how any of it runs — it holds the
unit names, the flags, and why the default order is build-then-restart. The units
themselves come from `/opt/gaia/linux_migration/22-asterion-tailscale-autostart.sh`,
which is idempotent.

`app/.env.local` carries the Neon/Redis credentials, is read by `next` at boot
(not per request), and never leaves the machine.
