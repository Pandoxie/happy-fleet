#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { loadEnvironment, readConfig, cliEnvironment } from '../config.mjs';
loadEnvironment();
// Require the same explicit server as the watcher, overriding the upstream default.
const config = readConfig();
const result = spawnSync(process.execPath, [config.agentBin, ...process.argv.slice(2)], {
  stdio: 'inherit', env: cliEnvironment(config),
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
