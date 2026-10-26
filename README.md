# Fleet Watch

A Happy session watcher that routes worker mentions to a Commander and sends shared rules to bots. The Commander reviews and relays messages between workers. Workers need no extra installation.

## Requirements

- A compatible Original Happy server and authenticated `happy-agent` CLI from [slopus/happy](https://github.com/slopus/happy).
- Node.js with ES modules and top-level await support. The source deployment used Node.js 24; other versions have not been verified here.
- An installed `happy-agent` package containing `socket.io-client`, `tweetnacl` and `axios` dependencies. This script loads those dependencies from that package.

This implementation follows the happy-agent 0.1.0 protocol. Compatibility with other server/client versions must be checked before use.

## Setup

1. Name the coordinating session exactly `commander`. Give workers distinct titles containing the word `bot`, for example `builder-bot` and `reviewer-bot`.
2. Review `CLAUDE.md` and `bot.md` before enabling automatic briefings. Give the Commander the instructions in `CLAUDE.md`; copy `ledger.example.md` to `ledger.md` for private working notes.
3. Configure the same Happy account and server used by the CLI. Credentials stay in `~/.happy/agent.key`, or the directory selected by `HAPPY_HOME_DIR`.
4. Set the following environment variables with your own values:

```bash
export HAPPY_SERVER_URL='https://happy.example.com'
export HAPPY_AGENT_DIR='/absolute/path/to/node_modules/happy-agent'
```

`HAPPY_SERVER_URL` is required; there is no default server. Use your trusted server URL, normally HTTPS. `HAPPY_AGENT_DIR` is the package directory containing `package.json`, dependencies and `bin/happy-agent.mjs`. Optional `HAPPY_AGENT_BIN` overrides that CLI entry point. The CLI subprocess inherits these environment variables.

First check without sending messages or briefings:

```bash
node --check fleet-watch.mjs
node fleet-watch.mjs --stdout --no-brief --state /tmp/fleet-watch-preview.json
```

Preview still connects to your server, reads account sessions and writes the specified state file. Its console output can contain message excerpts. Stop preview before starting normal mode:

```bash
node fleet-watch.mjs
```

Normal mode sends briefings automatically and mention notifications to the Commander. Editing `bot.md` re-briefs online workers.

## Optional systemd user service

Customize `deploy/fleet-watch.service.example` and `deploy/fleet-watch.env.example`. Place the environment file at `~/.config/fleet-watch/fleet-watch.env` and the unit at `~/.config/systemd/user/fleet-watch.service`. Set absolute executable paths in the unit; a user service does not inherit your interactive shell setup. Then reload user units and enable/start `fleet-watch.service`.

See [fleet-watch.md](fleet-watch.md) for message formats, behavior and known limitations.

## Contents

- `fleet-watch.mjs`: watcher and outbound queue.
- `CLAUDE.md`: Commander operating instructions.
- `bot.md`: worker briefing template.
- `ledger.example.md`: empty private-ledger template.
- `deploy/`: local configuration templates.

## Publishing this export

This directory is a source export, with no Git history or runtime data. Copy only its contents, including `.gitignore`, into a new directory outside the original working repository before initializing a new Git repository. Running Git inside this directory without initializing a separate repository would act on its parent repository.

Use the privacy email supplied by your GitHub account as the new repository's local `user.email` before the first commit. Select a public author name as well. Inspect the staged files before committing; do not copy the parent `.git`, working ledger, credentials, runtime state or logs.

The private build/deployment journal and personal tool permission settings are not part of this export. No license has been selected for this export; the original source attribution for adapted Happy code remains in the script. Review licensing before distributing it under a chosen license.
