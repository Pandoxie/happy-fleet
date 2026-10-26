# Fleet Watch

A Happy session watcher that routes worker mentions to a Commander and sends shared rules to bots. Workers need no extra installation.

## Requirements

- Node.js 24 and `tar` (tested on Linux).
- A compatible Original Happy server and your own authenticated Happy account.

The workstation's prebuilt happy-agent 0.1.0 and its runtime dependencies are included in `vendor/happy-agent-0.1.0.tgz`. No compilation, npm install or global happy-agent installation is required. See [vendor/README.md](vendor/README.md) for provenance and checksum. Compatibility with other server/client protocols has not been verified.

## Setup

Clone the repository and initialize the offline runtime:

```bash
git clone https://github.com/Pandoxie/happy-fleet.git
cd happy-fleet
node scripts/setup.mjs
```

This verifies and extracts the bundled runtime, creates `.env` from `.env.example` if absent, and generates `deploy/fleet-watch.service` for your current project and Node location. Existing `.env` and extracted runtime are preserved. It does not install or start a service. After moving the project or changing Node installations, run it again to regenerate the service.

Edit `.env` and set `HAPPY_SERVER_URL` to your actual server URL. If you already have `~/.happy/agent.key` for that server, it will be used; otherwise authenticate using the bundled CLI:

```bash
node bin/happy-agent.mjs auth --help
node bin/happy-agent.mjs auth login
node fleet-watch.mjs --check-config
```

`--check-config` checks configuration, runtime dependencies and the briefing file without reading credentials, connecting or sending messages. It does not validate authentication.

Name the coordinating session `commander` by default, or use the title configured by `FLEET_COMMANDER_TITLE`. Give workers distinct titles containing the word `bot`, such as `builder-bot`. Review `CLAUDE.md` and `bot.md` before enabling briefings. Give the Commander `CLAUDE.md`; copy `ledger.example.md` to `ledger.md` for private working notes. CLI examples in the Commander instructions use `happy-agent`; with this bundle, use `node bin/happy-agent.mjs` instead, from this project directory.

Preview (connects and reads sessions, writes separate state, but sends nothing):

```bash
node fleet-watch.mjs --stdout --no-brief --state .fleet-watch-preview.json
```

Stop preview before running normally:

```bash
node fleet-watch.mjs
```

Normal mode automatically sends briefings and mention notifications. Editing the configured briefing file re-briefs online workers.

## Configuration

The project root `.env` loads automatically regardless of the working directory. Set `FLEET_ENV_FILE` in the launching environment to load another file instead; an explicitly selected missing file is an error. Exported environment variables override values in that file; CLI options override the corresponding settings. All relative paths resolve against the project root, including CLI paths and `FLEET_ENV_FILE`. `~/` paths are expanded. File syntax follows Node's dotenv parser, without shell variable substitution.

| Variable | Default / purpose |
| --- | --- |
| `HAPPY_SERVER_URL` | Required HTTP(S) server URL, no embedded credentials/query/fragment |
| `HAPPY_HOME_DIR` | `~/.happy`; contains your `agent.key` |
| `HAPPY_AGENT_DIR` | `vendor/happy-agent`; runtime package and dependencies |
| `HAPPY_AGENT_BIN` | `bin/happy-agent.mjs` inside the selected package |
| `FLEET_BOT_MD` | `bot.md`; override with `--bot-md` |
| `FLEET_STATE_FILE` | `.fleet-watch-state.json`; override with `--state` |
| `FLEET_BOT_TITLE` | `\bbot\b`; case-insensitive enrollment regex, `--bot-title` |
| `FLEET_ONLY` | Unset (all bots); comma-separated handles, `--only` |
| `FLEET_NO_BRIEF` | `false`; `--no-brief` enables it |
| `FLEET_STDOUT` | `false`; `--stdout` enables it |

The Commander session title can be changed with `FLEET_COMMANDER_TITLE` (default `commander`; case and whitespace normalize like bot handles). Its routing handle stays `#commander`, so existing worker briefings still work. If you customize the title, give the Commander the matching title instead of the default in `CLAUDE.md`.

Runtime tuning (optional; defaults preserve previous behavior):

| Variable | Default | Purpose |
| --- | --- | --- |
| `FLEET_MAX_SEGMENT` | `8000` | Maximum characters per relayed segment |
| `FLEET_RATE_MAX` | `10` | Maximum mentions per pair per window |
| `FLEET_RATE_WINDOW_MS` | `300000` | Pair rate-limit window (ms) |
| `FLEET_IDLE_FLUSH_MS` | `30000` | Quiet time before ending an open turn (ms) |
| `FLEET_REPLAY_MARGIN` | `300` | Sequence replay tolerance |
| `FLEET_SEEN_LIMIT` | `2000` | Persisted message IDs per session |
| `FLEET_OFFLINE_AFTER_MS` | `120000` | Heartbeat expiry (ms) |
| `FLEET_IDLE_WAIT_MS` | `1800000` | Maximum local thinking wait (ms) |
| `FLEET_CLI_WAIT_TIMEOUT_S` | `1800` | CLI idle wait timeout (seconds) |
| `FLEET_RETRY_MS` | `30000` | Outbound retry delay (ms) |
| `FLEET_REFRESH_COOLDOWN_MS` | `5000` | Session refresh cooldown (ms) |
| `FLEET_RECONNECT_DELAY_MS` | `1000` | Socket initial reconnect delay (ms) |
| `FLEET_RECONNECT_DELAY_MAX_MS` | `5000` | Socket maximum reconnect delay (ms) |
| `FLEET_OFFLINE_CHECK_MS` | `30000` | Heartbeat expiry check interval (ms) |
| `FLEET_IDLE_CHECK_MS` | `5000` | Open-turn idle check interval (ms) |
| `FLEET_BRIEF_DEBOUNCE_MS` | `2000` | Briefing file reload debounce (ms) |
| `FLEET_HTTP_TIMEOUT_MS` | `0` | REST request timeout (ms; 0 preserves unlimited wait) |

Numeric settings reject invalid, negative, fractional and overflowing values at startup. Only replay margin and HTTP timeout accept zero. Timer values are milliseconds except `CLI_WAIT_TIMEOUT_S`, which is seconds. The maximum reconnect delay must be at least the initial delay. Restart after changing environment settings. Custom rate limits also need to be communicated to the Commander if its instructions quote the default 10 mentions / 5 minutes.

Authentication tokens and encryption secrets continue to come from `agent.key` under `HAPPY_HOME_DIR`, shared with the bundled CLI; they are not separate environment variables. Wire protocol paths, event names and the `#commander` routing handle are protocol conventions, not deployment settings.

Booleans accept `true`, `false`, `1`, `0`. The watcher and bundled CLI wrapper use the same normalized server and credential directory. Use the wrapper rather than invoking the vendor entry point directly: upstream contains its own default server, which this project intentionally does not use. Credentials, local configuration and runtime state must not be committed.

## Optional systemd user service

On Linux with systemd, after setup and a successful preview, stop any foreground watcher with Ctrl+C before installing the generated unit. Run these commands as the user who owns the Happy credentials, from the project directory:

```bash
mkdir -p ~/.config/systemd/user
cp deploy/fleet-watch.service ~/.config/systemd/user/fleet-watch.service
systemctl --user daemon-reload
systemctl --user enable --now fleet-watch.service
```

The generated unit uses the current Node executable and project location, and loads the same project `.env` through the watcher. No hand-written machine paths or shell profile are required. Restart the service after editing `.env`. To use an external environment file, add `Environment="FLEET_ENV_FILE=/your/config/file"` to your unit; `deploy/fleet-watch.env.example` provides the same settings as `.env.example`.

Check status, follow logs, and restart after configuration changes:

```bash
systemctl --user status fleet-watch
journalctl --user -u fleet-watch -f
systemctl --user restart fleet-watch
```

`enable --now` starts the service immediately and enables it for the user's service manager. To run after logout and start at boot without an interactive login, have an administrator enable lingering for the service account (when running as that account):

```bash
sudo loginctl enable-linger "$USER"
```

If you move the project or change the Node installation, regenerate and reinstall the unit, then restart:

```bash
node scripts/setup.mjs
cp deploy/fleet-watch.service ~/.config/systemd/user/fleet-watch.service
systemctl --user daemon-reload
systemctl --user restart fleet-watch
```

To stop the service and disable automatic startup:

```bash
systemctl --user disable --now fleet-watch
```

See [fleet-watch.md](fleet-watch.md) for behavior and known limitations.

## Validation

```bash
node --test --test-isolation=none test/config.test.mjs
node --check fleet-watch.mjs
node fleet-watch.mjs --check-config
node bin/happy-agent.mjs --help
```

## Distribution

Commit the runtime archive and its checksum, not the extracted `vendor/happy-agent/`, `.env`, credentials, ledger or state. The bundle preserves upstream and dependency licenses; this project's own license has not been selected. No live credentials or server configuration are bundled.
