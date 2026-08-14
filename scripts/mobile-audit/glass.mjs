import { webkit, devices } from 'playwright';
import { decodePng, contrast, parseRgb } from './png.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const OUT = process.env.AUDIT_OUT ?? new URL('./artifacts/', import.meta.url).pathname;
const AA = 4.5;
const rows = [];
const fail = [];

/**
 * Measures the *composited* colour of a glass surface by sampling screenshot
 * pixels that no text or icon covers. The rendered result of backdrop-filter
 * can't be read from the DOM, so this is the only honest way to check it.
 */
async function measure(page, surfaceSel, tag) {
  const info = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    // Leaf text nodes only — a wrapper span reports the same string as the
    // label inside it and would double every row.
    const texts = [...el.querySelectorAll('span, p, h2')]
      .filter((n) => n.textContent.trim() && n.offsetWidth > 0 && !n.querySelector('span, p, h2'))
      .map((n) => {
        const b = n.getBoundingClientRect();
        return {
          text: n.textContent.trim().slice(0, 14),
          color: getComputedStyle(n).color,
          box: { x: b.left, y: b.top, w: b.width, h: b.height },
        };
      });
    return { texts };
  }, surfaceSel);
  if (!info) { fail.push(`${tag}: surface ${surfaceSel} not found`); return; }

  const shot = await page.screenshot();
  const png = decodePng(shot);
  const dpr = png.width / page.viewportSize().width;
  const px = (x, y) => {
    const sx = Math.round(x * dpr), sy = Math.round(y * dpr);
    if (sx < 0 || sy < 0 || sx >= png.width || sy >= png.height) return null;
    return png.at(sx, sy);
  };

  for (const t of info.texts) {
    // Sample immediately around this label, so an active tab is measured
    // against its own navy pill rather than the surrounding glass.
    const { x, y, w, h } = t.box;
    const cy = y + h / 2;
    const samples = [];
    for (const d of [3, 5, 7, 9]) {
      for (const p of [px(x - d, cy), px(x + w + d, cy), px(x + w / 2, y - d), px(x + w / 2, y + h + d)]) {
        if (p) samples.push(p);
      }
    }
    if (samples.length < 4) { fail.push(`${tag} "${t.text}": too few background samples`); continue; }
    const bg = [0, 1, 2].map((c) => {
      const v = samples.map((s) => s[c]).sort((a, b) => a - b);
      return v[Math.floor(v.length / 2)];
    });

    const fg = parseRgb(t.color);
    const ratio = contrast(fg, bg);
    const pass = ratio >= AA;
    rows.push({ tag, text: t.text, ratio, pass, bg });
    if (!pass) fail.push(`${tag} "${t.text}": ${ratio.toFixed(2)}:1 on rgb(${bg}) (need ${AA})`);
  }
}

const browser = await webkit.launch();

async function scenario(theme, backdrop) {
  const ctx = await browser.newContext({
    ...devices['iPhone 13'],
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
  });
  await ctx.addInitScript((t) => localStorage.setItem('travel-tracker-theme', t), theme);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });

  if (backdrop === 'map') {
    await page.locator('nav[aria-label="Main"] button', { hasText: /^Map$/i }).click();
    await page.waitForTimeout(3500); // let real OSM tiles paint under the bar
  } else if (backdrop === 'photo') {
    const cards = page.locator('[data-trip-card]');
    for (let i = 0; i < 12; i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(700);
      if (await page.getByRole('dialog').locator('button:has(img)').count()) break;
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
    // Scroll the photo grid up under the sticky header.
    await page.getByRole('dialog').locator('.overflow-y-auto').first().evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(900);
  } else {
    await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'instant' }));
    await page.waitForTimeout(600);
  }

  const label = `${theme}/${backdrop}`;
  if (backdrop === 'photo') {
    await measure(page, '[role="dialog"] [class*="sticky"]', `sheet-header ${label}`);
    await page.screenshot({ path: `${OUT}glass-sheet-${theme}.png` });
  } else {
    await measure(page, 'nav[aria-label="Main"]', `tab-bar ${label}`);
    await page.screenshot({ path: `${OUT}glass-bar-${theme}-${backdrop}.png` });
  }
  await ctx.close();
}

for (const theme of ['light', 'dark']) {
  for (const backdrop of ['page', 'map', 'photo']) {
    await scenario(theme, backdrop);
  }
}
await browser.close();

console.log('\n  surface / theme / backdrop        label            bg           ratio');
console.log('  ' + '-'.repeat(74));
for (const r of rows) {
  console.log(
    `  ${r.tag.padEnd(32)} ${r.text.padEnd(15)} rgb(${r.bg.join(',').padEnd(11)}) ${r.ratio.toFixed(2).padStart(6)}:1 ${r.pass ? 'PASS' : 'FAIL'}`,
  );
}
const worst = rows.reduce((m, r) => (r.ratio < m.ratio ? r : m), rows[0]);
console.log(`\n  worst: ${worst.tag} "${worst.text}" = ${worst.ratio.toFixed(2)}:1`);
console.log('  ' + '='.repeat(74));
if (fail.length) { console.log(`  ${fail.length} FAILURES`); fail.forEach((f) => console.log('   x ' + f)); process.exit(1); }
console.log('  ALL GLASS CONTRAST CHECKS PASS (AA 4.5:1)');
