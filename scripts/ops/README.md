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

## The coaia-narrative sync — installed on gaia 2026-09-28

`app/scripts/coaia-sync.mjs sync` projects every registered coaia-narrative
project into Asterion: a git file is read from its ref after a fetch, never
through a working tree, and a project whose files have not changed is skipped.
Two unit files make it run every five minutes. They are installed on gaia and
enabled; `systemctl --user disable --now asterion-coaia-sync.timer` stops it.
To lay them down again (a rebuilt host, a moved checkout):

```bash
cp scripts/ops/units/asterion-coaia-sync.{service,timer} ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user start asterion-coaia-sync.service      # one pass, now; read its output below
journalctl --user -u asterion-coaia-sync.service -n 30
systemctl --user enable --now asterion-coaia-sync.timer
```

Before enabling the timer, the one-shot pass must show every project as
`unchanged` or as a projection, never `cannot read`: a git source whose remote
is reached over ssh needs a key the user session can use without an agent.

Without the timer, the same pass by hand is `cd app && node scripts/coaia-sync.mjs sync`.
