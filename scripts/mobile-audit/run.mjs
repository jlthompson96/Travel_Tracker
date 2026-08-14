import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Mobile audit runner.
 *
 * Boots `vite preview` against the current build, runs every check against real
 * WebKit, then tears the server down. Each check exits non-zero on failure, and
 * so does this runner, so it drops straight into CI.
 *
 * Usage:  npm run build && npm run audit:mobile
 *         BASE_URL=https://example.com npm run audit:mobile   (skips the server)
 */

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.AUDIT_PORT ?? 4173);
const BASE = process.env.BASE_URL ?? `http://localhost:${PORT}/`;
const external = Boolean(process.env.BASE_URL);

const CHECKS = [
  ['overflow', 'No horizontal scroll at 375/390/393/430, one nav landmark'],
  ['touch', 'Tap targets >=44pt, sheet anchoring, scroll lock, map gate'],
  ['focus', 'Focus trap, nested lightbox refcount, focus restore'],
  ['contrast', 'Every text node >= WCAG AA at 375px, both themes'],
  ['glass', 'Glass surfaces >= AA over page, map and photo backdrops'],
];

mkdirSync(join(here, 'artifacts'), { recursive: true });

const run = (cmd, args, opts = {}) =>
  new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts });
    p.on('exit', (code) => resolve(code ?? 1));
  });

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

let server;
if (!external) {
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT)], {
    cwd: join(here, '..', '..'),
    stdio: 'ignore',
  });
  if (!(await waitForServer(BASE))) {
    console.error(`could not reach ${BASE} — did you run \`npm run build\` first?`);
    server.kill();
    process.exit(1);
  }
}

const results = [];
for (const [name, description] of CHECKS) {
  console.log(`\n${'='.repeat(72)}\n  ${name} — ${description}\n${'='.repeat(72)}`);
  const code = await run(process.execPath, [join(here, `${name}.mjs`)], { env: { ...process.env, BASE_URL: BASE } });
  results.push([name, code === 0]);
}

server?.kill();

console.log(`\n${'='.repeat(72)}`);
for (const [name, ok] of results) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
const failed = results.filter(([, ok]) => !ok);
console.log('='.repeat(72));
if (failed.length) {
  console.log(`${failed.length} of ${results.length} checks failed`);
  process.exit(1);
}
console.log(`all ${results.length} checks passed`);
