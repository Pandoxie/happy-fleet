import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = dirname(fileURLToPath(import.meta.url));
export function localPath(value, root = ROOT) {
  if (value === '~') return homedir();
  if (value.startsWith('~/')) return join(homedir(), value.slice(2));
  return resolve(root, value);
}
export function loadEnvironment() {
  const explicit = process.env.FLEET_ENV_FILE;
  const file = localPath(explicit || '.env');
  if (explicit || existsSync(file)) process.loadEnvFile(file);
}
export function readConfig(env = process.env, args = []) {
  const values = new Map();
  const switches = new Set(['--stdout', '--no-brief', '--check-config']);
  const options = new Set(['--only', '--bot-md', '--state', '--bot-title']);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (switches.has(arg)) values.set(arg, true);
    else if (options.has(arg) && args[i + 1] && !args[i + 1].startsWith('--')) values.set(arg, args[++i]);
    else throw new Error(`Unknown option or missing value: ${arg}`);
  }
  const server = env.HAPPY_SERVER_URL?.trim();
  if (!server) throw new Error('HAPPY_SERVER_URL is required');
  let endpoint;
  try { endpoint = new URL(server); } catch { throw new Error('HAPPY_SERVER_URL must be a valid HTTP(S) URL'); }
  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error('HAPPY_SERVER_URL must be an HTTP(S) URL without credentials, query or fragment');
  }
  const bool = (name) => {
    const value = env[name]?.trim().toLowerCase();
    if (!value || value === 'false' || value === '0') return false;
    if (value === 'true' || value === '1') return true;
    throw new Error(`${name} must be true, false, 1 or 0`);
  };
  const integer = (name, fallback, min = 1) => {
    const raw = env[name]?.trim();
    if (!raw) return fallback;
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < min || value > 2147483647) {
      throw new Error(`${name} must be an integer from ${min} to 2147483647`);
    }
    return value;
  };
  const commanderTitle = (env.FLEET_COMMANDER_TITLE ?? 'commander').trim().toLowerCase().replace(/\s+/g, '-');
  if (!commanderTitle) throw new Error('FLEET_COMMANDER_TITLE must not be blank');
  const tuning = {
    maxSegment: integer('FLEET_MAX_SEGMENT', 8000, 1),
    rateMax: integer('FLEET_RATE_MAX', 10, 1),
    rateWindowMs: integer('FLEET_RATE_WINDOW_MS', 300000, 1),
    idleFlushMs: integer('FLEET_IDLE_FLUSH_MS', 30000, 1),
    replayMargin: integer('FLEET_REPLAY_MARGIN', 300, 0),
    seenLimit: integer('FLEET_SEEN_LIMIT', 2000, 1),
    offlineAfterMs: integer('FLEET_OFFLINE_AFTER_MS', 120000, 1),
    idleWaitMs: integer('FLEET_IDLE_WAIT_MS', 1800000, 1),
    cliWaitTimeoutS: integer('FLEET_CLI_WAIT_TIMEOUT_S', 1800, 1),
    retryMs: integer('FLEET_RETRY_MS', 30000, 1),
    refreshCooldownMs: integer('FLEET_REFRESH_COOLDOWN_MS', 5000, 1),
    reconnectDelayMs: integer('FLEET_RECONNECT_DELAY_MS', 1000, 1),
    reconnectDelayMaxMs: integer('FLEET_RECONNECT_DELAY_MAX_MS', 5000, 1),
    offlineCheckMs: integer('FLEET_OFFLINE_CHECK_MS', 30000, 1),
    idleCheckMs: integer('FLEET_IDLE_CHECK_MS', 5000, 1),
    briefDebounceMs: integer('FLEET_BRIEF_DEBOUNCE_MS', 2000, 1),
    httpTimeoutMs: integer('FLEET_HTTP_TIMEOUT_MS', 0, 0),
  };
  if (tuning.reconnectDelayMaxMs < tuning.reconnectDelayMs) {
    throw new Error('FLEET_RECONNECT_DELAY_MAX_MS must be >= FLEET_RECONNECT_DELAY_MS');
  }
  const agentDir = localPath(env.HAPPY_AGENT_DIR || 'vendor/happy-agent');
  return {
    ...tuning, commanderTitle,
    serverUrl: server.replace(/\/+$/, ''), agentDir,
    agentBin: localPath(env.HAPPY_AGENT_BIN || join(agentDir, 'bin/happy-agent.mjs')),
    happyHome: localPath(env.HAPPY_HOME_DIR || '~/.happy'),
    botMd: localPath(values.get('--bot-md') || env.FLEET_BOT_MD || 'bot.md'),
    stateFile: localPath(values.get('--state') || env.FLEET_STATE_FILE || '.fleet-watch-state.json'),
    botTitle: new RegExp(values.get('--bot-title') || env.FLEET_BOT_TITLE || '\\bbot\\b', 'i'),
    only: (values.get('--only') || env.FLEET_ONLY)?.split(',').map(s => s.trim()).filter(Boolean),
    stdout: values.has('--stdout') || bool('FLEET_STDOUT'),
    noBrief: values.has('--no-brief') || bool('FLEET_NO_BRIEF'),
    check: values.has('--check-config'),
  };
}
export function cliEnvironment(config) {
  return { ...process.env, HAPPY_SERVER_URL: config.serverUrl, HAPPY_HOME_DIR: config.happyHome };
}
