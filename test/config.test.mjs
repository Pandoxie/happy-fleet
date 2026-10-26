import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, readConfig, cliEnvironment } from '../config.mjs';
const base = { HAPPY_SERVER_URL: 'https://example.com/' };
test('portable defaults and CLI precedence', () => {
  const c = readConfig({ ...base, FLEET_STATE_FILE: 'env.json', FLEET_NO_BRIEF: 'true' }, ['--state', 'cli.json']);
  assert.equal(c.agentDir, join(ROOT, 'vendor/happy-agent'));
  assert.equal(c.stateFile, join(ROOT, 'cli.json'));
  assert.equal(c.serverUrl, 'https://example.com');
  assert.equal(c.noBrief, true);
  assert(c.botTitle.test('builder-bot'));
  assert.equal(cliEnvironment(c).HAPPY_HOME_DIR, c.happyHome);
});
test('reject invalid configuration before any connection', () => {
  for (const server of ['', 'foo', 'ftp://example.com', 'https://user:pass@example.com', 'https://example.com/?token=x']) {
    assert.throws(() => readConfig({ HAPPY_SERVER_URL: server }));
  }
  assert.throws(() => readConfig({ ...base, FLEET_STDOUT: 'maybe' }));
  assert.throws(() => readConfig(base, ['--state']));
  assert.throws(() => readConfig(base, ['--typo']));
  assert.throws(() => readConfig({ ...base, FLEET_BOT_TITLE: '[' }));
});
test('env file loads from another cwd; exported environment takes priority', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fleet-config-'));
  const file = join(dir, 'test.env');
  writeFileSync(file, 'HAPPY_SERVER_URL=https://file.example\nFLEET_BOT_MD=rules.md\n');
  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    `import { loadEnvironment, readConfig } from ${JSON.stringify(new URL('../config.mjs', import.meta.url).href)}; loadEnvironment(); const { writeFileSync } = await import('node:fs'); writeFileSync('result.json', JSON.stringify(readConfig()));`],
  { cwd: dir, env: { PATH: process.env.PATH, FLEET_ENV_FILE: file, HAPPY_SERVER_URL: 'https://export.example' }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const c = JSON.parse(readFileSync(join(dir, 'result.json'), 'utf8'));
  assert.equal(c.serverUrl, 'https://export.example');
  assert.equal(c.botMd, join(ROOT, 'rules.md'));
});
test('runtime tuning handles units, zero exceptions and normalized Commander title', () => {
  const c = readConfig({ ...base, FLEET_COMMANDER_TITLE: ' Fleet Leader ',
    FLEET_RATE_MAX: '25', FLEET_RATE_WINDOW_MS: '60000', FLEET_CLI_WAIT_TIMEOUT_S: '45',
    FLEET_HTTP_TIMEOUT_MS: '15000', FLEET_REPLAY_MARGIN: '0', FLEET_NO_BRIEF: '0' });
  assert.equal(c.commanderTitle, 'fleet-leader');
  assert.equal(c.rateMax, 25);
  assert.equal(c.rateWindowMs, 60000);
  assert.equal(c.cliWaitTimeoutS, 45);
  assert.equal(c.httpTimeoutMs, 15000);
  assert.equal(c.replayMargin, 0);
  assert.equal(c.noBrief, false);
  assert.equal(readConfig(base).httpTimeoutMs, 0);
});
test('bad timer and limit values fail before runtime; reconnect bounds are consistent', () => {
  for (const value of ['-1', '0', '0.5', 'NaN', 'Infinity', '2147483648', '1e3']) {
    assert.throws(() => readConfig({ ...base, FLEET_RETRY_MS: value }), /FLEET_RETRY_MS/);
  }
  assert.throws(() => readConfig({ ...base, FLEET_RATE_MAX: '0' }), /FLEET_RATE_MAX/);
  assert.throws(() => readConfig({ ...base, FLEET_COMMANDER_TITLE: ' ' }), /FLEET_COMMANDER_TITLE/);
  assert.throws(() => readConfig({ ...base, FLEET_RECONNECT_DELAY_MS: '6000' }), /FLEET_RECONNECT_DELAY_MAX_MS/);
});
