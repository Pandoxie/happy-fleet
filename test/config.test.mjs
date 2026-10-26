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
