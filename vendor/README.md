# Bundled happy-agent

`happy-agent-0.1.0.tgz` is a snapshot of the user's existing compiled happy-agent 0.1.0 installation on workstation, copied on 2026-10-26. It includes `bin/`, `dist/`, package metadata, README, MIT LICENSE and the installed runtime `node_modules/` with their own licenses. No build was performed or dependency version re-resolved.

The original package identifies `slopus/happy`, `packages/happy-agent`, version 0.1.0 as its source. The installed artifact does not identify a source commit; this snapshot is not claimed to be a reproducible upstream build. The compressed archive is about 2.4 MB (about 16 MB extracted). Node.js itself is not bundled. Linux with Node.js 24 was checked; other platforms have not been tested.

The adjacent `.sha256` records the artifact SHA-256, checked by `node scripts/setup.mjs` before extraction. To update the snapshot, copy a reviewed installed package with its runtime dependencies into a new archive and regenerate its checksum; update provenance here. The checksum detects accidental changes, not authenticity against an attacker able to replace both files.

The installed runtime is ignored by Git. The setup script preserves an existing extracted runtime; for upgrades, move that directory aside before setup to extract the replacement archive.
