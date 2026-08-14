import { webkit, devices } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const WIDTHS = [375, 390, 393, 430];
const TABS = ['dashboard', 'map', 'timeline', 'passport', 'miles', 'plan', 'compare'];
// Mobile shows 4 primary + More; the other three live in the sheet.
const BAR_LABELS = ['Trips', 'Map', 'Passport', 'Miles', 'More'];

const fail = [];
const note = (m) => console.log(m);

/** Click a tab by name, whether it lives on the bar or behind "More". */
async function goToTab(page, tab, mobile) {
  const label = { dashboard: 'Trips', miles: 'Miles' }[tab] ?? tab;
  if (!mobile) {
    const full = { dashboard: 'Dashboard', miles: 'Miles Traveled' }[tab] ?? tab;
    await page.getByRole('button', { name: new RegExp(`^${full}$`, 'i') }).first().click();
  } else if (BAR_LABELS.some((l) => l.toLowerCase() === label.toLowerCase())) {
    await page.locator('nav[aria-label="Main"] button', { hasText: new RegExp(`^${label}$`, 'i') }).first().click();
  } else {
    await page.locator('nav[aria-label="Main"] button', { hasText: /^More$/i }).click();
    await page.getByRole('dialog', { name: 'More sections' }).getByRole('button', { name: new RegExp(tab, 'i') }).first().click();
  }
  await page.waitForTimeout(450);
}

const browser = await webkit.launch();

for (const width of WIDTHS) {
  const ctx = await browser.newContext({
    ...devices['iPhone 13'],
    viewport: { width, height: 800 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fail.push(`[${width}] PAGE ERROR: ${e.message}`));
  await page.goto(BASE, { waitUntil: 'networkidle' });

  // Bottom bar present with exactly the 5 expected items?
  const barButtons = await page.locator('nav[aria-label="Main"] button').allInnerTexts();
  const got = barButtons.map((t) => t.trim()).filter(Boolean);
  if (got.length !== 5) fail.push(`[${width}] bottom bar has ${got.length} items, expected 5: ${JSON.stringify(got)}`);
  else note(`[${width}] bottom bar: ${got.join(' · ')}`);

  // Exactly one nav landmark (no duplicate desktop nav in the a11y tree).
  const navCount = await page.locator('nav').count();
  if (navCount !== 1) fail.push(`[${width}] expected 1 <nav>, found ${navCount}`);

  for (const tab of TABS) {
    await goToTab(page, tab, true);

    const scroll = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }));
    if (scroll.sw > scroll.cw) {
      const culprits = await page.evaluate(() => {
        const vw = window.innerWidth;
        return [...document.querySelectorAll('*')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.right <= vw + 1) return false;
            return !el.closest('[data-allow-x-scroll]');
          })
          .slice(0, 5)
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(el.getBoundingClientRect().right)}`);
      });
      fail.push(`[${width}/${tab}] H-SCROLL ${scroll.sw}>${scroll.cw}\n      ${culprits.join('\n      ')}`);
    }
  }
  await ctx.close();
}

// Desktop: all 7 tabs still in the top pill row, no bottom bar.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fail.push(`[desktop] PAGE ERROR: ${e.message}`));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  // innerText is CSS-transformed (the pills are `uppercase`), so compare case-insensitively.
  const labels = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().toUpperCase()).filter(Boolean);
  const expected = ['Dashboard', 'Map', 'Timeline', 'Passport', 'Miles Traveled', 'Plan', 'Compare'].map((s) => s.toUpperCase());
  if (JSON.stringify(labels) !== JSON.stringify(expected)) {
    fail.push(`[desktop] nav mismatch\n   expected ${JSON.stringify(expected)}\n   got      ${JSON.stringify(labels)}`);
  } else note(`[desktop] nav: ${labels.join(' · ')}`);
  const fixed = await page.locator('nav[aria-label="Main"]').count();
  if (fixed !== 0) fail.push(`[desktop] bottom tab bar leaked onto desktop`);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (sw) fail.push('[desktop] horizontal scroll');
  await ctx.close();
}

await browser.close();

console.log('\n' + '='.repeat(60));
if (fail.length) {
  console.log(`FAILURES (${fail.length}):`);
  fail.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('ALL CHECKS PASSED');
