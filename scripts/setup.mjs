// Offline installation of the exact prebuilt workstation package.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT } from '../config.mjs';

const archive = join(ROOT, 'vendor/happy-agent-0.1.0.tgz');
const expected = readFileSync(`${archive}.sha256`, 'utf8').trim().split(/\s+/)[0];
if (createHash('sha256').update(readFileSync(archive)).digest('hex') !== expected) {
  throw new Error('Bundled happy-agent archive checksum mismatch');
}
if (!existsSync(join(ROOT, 'vendor/happy-agent'))) {
  execFileSync('tar', ['-xzf', archive, '-C', join(ROOT, 'vendor')], { stdio: 'inherit' });
}
if (!existsSync(join(ROOT, '.env'))) {
  writeFileSync(join(ROOT, '.env'), readFileSync(join(ROOT, '.env.example')), { mode: 0o600 });
}
// systemd uses its own quoting and expands percent specifiers and dollar variables.
const quote = s => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/%/g, '%%').replace(/\$/g, '$$') + '"';
const unit = readFileSync(join(ROOT, 'deploy/fleet-watch.service.example'), 'utf8')
  .replace('@NODE@', quote(process.execPath)).replace('@WATCHER@', quote(join(ROOT, 'fleet-watch.mjs')));
writeFileSync(join(ROOT, 'deploy/fleet-watch.service'), unit);
console.log('Bundled agent ready. Edit .env, then run: node fleet-watch.mjs --check-config');
console.log('Generated deploy/fleet-watch.service; no service was installed or started.');
