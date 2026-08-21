import { webkit, devices } from 'playwright';
import { seedUnlocked } from './unlock.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const OUT = process.env.AUDIT_OUT ?? new URL('./artifacts/', import.meta.url).pathname;
const fail = [];

// Controls that legitimately aren't 44pt: Leaflet's attribution links are
// third-party fine print, and the map scrim is a full-bleed overlay.
const ALLOW = [
  '.leaflet-control-attribution',
  '.leaflet-attribution-flag',
  // Markers carry their 44pt hit area on a ::after pseudo-element, which
  // getBoundingClientRect() cannot see. Measured separately by markerHitArea().
  '.tt-marker',
];

async function tapTargets(page, where) {
  const bad = await page.evaluate((allow) => {
    const sel = 'button, a[href], [role="button"], input:not([type="hidden"])';
    return [...document.querySelectorAll(sel)]
      .filter((el) => {
        if (allow.some((a) => el.matches(a) || el.closest(a))) return false;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return false; // not rendered
        return r.width < 44 || r.height < 44;
      })
      .slice(0, 8)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return `${el.tagName.toLowerCase()}[${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}] ${Math.round(r.width)}x${Math.round(r.height)}`;
      });
  }, ALLOW);
  if (bad.length) fail.push(`${where}: ${bad.length} undersized\n      ${bad.join('\n      ')}`);
  else console.log(`  ok  ${where}`);
}

const browser = await webkit.launch();
const ctx = await browser.newContext({
  ...devices['iPhone 13'],
  viewport: { width: 375, height: 667 },
  isMobile: true,
  hasTouch: true,
});
await seedUnlocked(ctx);
const page = await ctx.newPage();
page.on('pageerror', (e) => fail.push(`PAGE ERROR: ${e.message}`));
await page.route('**://*.tile.openstreetmap.org/**', (r) => r.abort());
await page.goto(BASE, { waitUntil: 'networkidle' });

const go = async (label) => {
  const bar = page.locator('nav[aria-label="Main"] :is(a,button)', { hasText: new RegExp(`^${label}$`, 'i') });
  if (await bar.count()) { await bar.first().click(); }
  else {
    await page.locator('nav[aria-label="Main"] :is(a,button)', { hasText: /^More$/i }).click();
    await page.getByRole('dialog', { name: 'More sections' }).getByRole('link', { name: new RegExp(label, 'i') }).first().click();
  }
  await page.waitForTimeout(700);
};

for (const t of ['Trips', 'Map', 'Passport', 'Miles', 'timeline', 'plan', 'compare']) {
  await go(t);
  await tapTargets(page, `tab:${t}`);
}

// --- Trip sheet: tap targets, scroll lock, drag handle ---
await go('Trips');
await page.waitForTimeout(400);
await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
await page.waitForTimeout(500);

await page.locator('[data-trip-card]').first().click();
await page.waitForTimeout(900);
const dialog = page.getByRole('dialog');
if (await dialog.count()) {
  console.log('  trip sheet opened');
  await tapTargets(page, 'trip sheet');

  // Playwright scrolls the card into view before clicking, so the offset at
  // lock time is whatever body.style.top recorded — not the pre-click value.
  const scrollBefore = await page.evaluate(() => Math.abs(parseInt(document.body.style.top, 10)) || 0);
  console.log('  locked at scrollY ' + scrollBefore);

  const bodyFixed = await page.evaluate(() => getComputedStyle(document.body).position);
  if (bodyFixed !== 'fixed') fail.push(`scroll lock: body position is "${bodyFixed}", expected "fixed"`);
  else console.log('  ok  body pinned while sheet open');

  const sheetBox = await dialog.first().locator('> div').first().boundingBox().catch(() => null);
  const vp = page.viewportSize();
  if (sheetBox && Math.abs(sheetBox.y + sheetBox.height - vp.height) > 2) {
    fail.push(`sheet is not bottom-anchored: bottom=${Math.round(sheetBox.y + sheetBox.height)} viewport=${vp.height}`);
  } else console.log('  ok  sheet anchored to bottom edge');

  await page.screenshot({ path: `${OUT}trip-sheet-375.png` });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  const restored = await page.evaluate(() => window.scrollY);
  if (Math.abs(restored - scrollBefore) > 4) fail.push(`scroll position not restored: was ${scrollBefore}, now ${restored}`);
  else console.log(`  ok  scroll restored to ${restored}`);

  const bodyAfter = await page.evaluate(() => getComputedStyle(document.body).position);
  if (bodyAfter === 'fixed') fail.push('scroll lock not released after close');
} else {
  fail.push('could not open a trip sheet');
}

// --- Map touch gate, then marker hit area (order matters: dismissing the
//     gate is one-way, and the map does not remount on re-navigation) ---
await go('Map');
await page.waitForTimeout(1200);
const gate = page.locator('button', { hasText: /tap to explore/i });
if (await gate.count()) { console.log('  ok  map touch gate present on coarse pointer'); await gate.click(); await page.waitForTimeout(400); }
else fail.push('map touch gate missing on mobile');
const markerHit = await page.evaluate(() => {
  const m = document.querySelector('.tt-marker');
  if (!m) return 'no marker';
  const r = m.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const probe = document.elementFromPoint(cx + 18, cy);
  return probe && probe.closest('.tt-marker') ? 'hit' : 'miss';
});
if (markerHit !== 'hit') fail.push('marker hit area: tap 18px off-centre => ' + markerHit);
else console.log('  ok  marker hit area extends past the visible dot');

await ctx.close();

// --- Desktop must NOT get the gate, and drag must stay ---
const dctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const dpage = await dctx.newPage();
await dpage.route('**://*.tile.openstreetmap.org/**', (r) => r.abort());
await dpage.goto(BASE, { waitUntil: 'networkidle' });
await dpage.getByRole('link', { name: /^Map$/i }).first().click();
await dpage.waitForTimeout(1200);
if (await dpage.locator('button', { hasText: /tap to explore/i }).count()) fail.push('[desktop] map touch gate leaked onto desktop');
else console.log('  ok  no touch gate on desktop');
await dpage.getByRole('link', { name: /^Plan$/i }).first().click();
await dpage.waitForTimeout(700);
const grips = await dpage.locator('button[aria-label^="Reorder"]').count();
const arrows = await dpage.locator('button[aria-label*="Move "]').first().isVisible().catch(() => false);
if (grips === 0) fail.push('[desktop] drag grips disappeared from Plan');
else console.log(`  ok  ${grips} drag grips still on desktop Plan`);
if (arrows) fail.push('[desktop] mobile move buttons are visible on desktop');
else console.log('  ok  move buttons hidden on desktop');
await dctx.close();

await browser.close();
console.log('\n' + '='.repeat(60));
if (fail.length) { console.log(`FAILURES (${fail.length}):`); fail.forEach((f) => console.log('  x ' + f)); process.exit(1); }
console.log('TOUCH/SHEET CHECKS PASSED');
