# scripts/ops/ — running asterion on gaia

Asterion serves from `app/` on **127.0.0.1:3336**, published to the tailnet as
**`svc:asterion` → https://asterion.tail3b11eb.ts.net** (VIP `100.93.93.150`, tcp:443).

Three user units carry it, all `enabled` so they survive reboot:

| unit | what it does |
|---|---|
| `asterion-server.service` | `next start -p 3336` in `app/`, `Restart=on-failure` |
| `asterion-tailscale.service` | oneshot: TLS cert → `serve --service=svc:asterion` → `advertise`; `serve clear` on stop |
| `asterion-tailscale-cert.timer` | weekly cert renewal |

They were laid down by `/opt/gaia/linux_migration/22-asterion-tailscale-autostart.sh`,
which is idempotent — re-run it after moving the app, changing the port, or
rebuilding the host. These scripts assume it has run at least once.

## The four verbs

```bash
./scripts/ops/status.sh              # where do we stand — source, units, tailnet, both doors
./scripts/ops/rebuild.sh             # next build, then hand the new build to the service
./scripts/ops/restart.sh             # restart the running build, no compile
./scripts/ops/logs.sh -f             # what the service is saying
```

### rebuild.sh

```bash
./scripts/ops/rebuild.sh                      # build + restart + verify
./scripts/ops/rebuild.sh --pull               # git pull --ff-only, pnpm install, build, restart
./scripts/ops/rebuild.sh --packages           # also build packages/asterion (tsc → dist/)
./scripts/ops/rebuild.sh --no-restart         # build only; the old build keeps serving
./scripts/ops/rebuild.sh --stop-first         # down during the build instead of after
```

Default order is **build, then restart** — the old build serves while the new one
compiles, so the swap costs one restart instead of a whole build's worth of
downtime. `--stop-first` inverts that if you would rather be plainly down than
briefly serve a `.next` mid-swap.

It prints the `BUILD_ID` before and after, so "did my change actually ship" is a
readable question, and it re-registers `svc:asterion` if the serve registration
lapsed (host reboot, `tailscaled` restart).

### Environment

`app/.env.local` holds the Neon/Redis credentials and is read by `next` itself at
boot from `WorkingDirectory` — not by systemd, and **not per request**. Change it
and the service is still running on the old values until `./scripts/ops/restart.sh`.

### Overrides

`ASTERION_PORT`, `ASTERION_DOMAIN`, `ASTERION_USER` override the defaults in
`lib.sh` for every script; `--port` does the same for one invocation.

🌸: Four small verbs, so the question "is it up, and is it *my* version that's
up?" always has an answer you can read in one screen.
