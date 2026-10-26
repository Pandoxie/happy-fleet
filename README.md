# Fleet Watch

A Happy session watcher that routes worker mentions to a Commander and sends shared rules to bots. Workers need no extra installation.

## Requirements

- Node.js 24 and `tar` (tested on Linux).
- A compatible Original Happy server and your own authenticated Happy account.

The workstation's prebuilt happy-agent 0.1.0 and its runtime dependencies are included in `vendor/happy-agent-0.1.0.tgz`. No compilation, npm install or global happy-agent installation is required. See [vendor/README.md](vendor/README.md) for provenance and checksum. Compatibility with other server/client protocols has not been verified.

## Setup

From the project directory:

```bash
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

Name the coordinating session exactly `commander`. Give workers distinct titles containing the word `bot`, such as `builder-bot`. Review `CLAUDE.md` and `bot.md` before enabling briefings. Give the Commander `CLAUDE.md`; copy `ledger.example.md` to `ledger.md` for private working notes. CLI examples in the Commander instructions use `happy-agent`; with this bundle, use `node bin/happy-agent.mjs` instead, from this project directory.

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

Booleans accept `true`, `false`, `1`, `0`. The watcher and bundled CLI wrapper use the same normalized server and credential directory. Use the wrapper rather than invoking the vendor entry point directly: upstream contains its own default server, which this project intentionally does not use. Credentials, local configuration and runtime state must not be committed.

## Optional systemd user service

After setup and a successful preview, install the generated unit:

```bash
mkdir -p ~/.config/systemd/user
cp deploy/fleet-watch.service ~/.config/systemd/user/fleet-watch.service
systemctl --user daemon-reload
systemctl --user enable --now fleet-watch.service
```

The generated unit uses the current Node executable and project location, and loads the same project `.env` through the watcher. No hand-written machine paths or shell profile are required. Restart the service after editing `.env`. To use an external environment file, add `Environment="FLEET_ENV_FILE=/your/config/file"` to your unit; `deploy/fleet-watch.env.example` provides the same settings as `.env.example`.

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
