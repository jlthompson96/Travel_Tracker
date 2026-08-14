import { webkit, devices } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const TABS = ['Trips', 'Map', 'Passport', 'Miles', 'timeline', 'plan', 'compare'];

/** Runs in the page: composite each text node's colour over its real
 * background and report anything under the WCAG AA threshold for its size. */
const AUDIT = `(() => {
  const parse = (s) => { const m = (s||'').match(/-?[\\d.]+/g); return m ? [ +m[0], +m[1], +m[2], m[3] === undefined ? 1 : +m[3] ] : null; };
  const over = (fg, bg) => [0,1,2].map(i => Math.round(fg[i]*fg[3] + bg[i]*(1-fg[3])));
  const lin = (c) => { const v = c/255; return v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
  const lum = ([r,g,b]) => 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b);
  const ratio = (a,b) => { const l1 = lum(a), l2 = lum(b); const [hi,lo] = l1>l2?[l1,l2]:[l2,l1]; return (hi+0.05)/(lo+0.05); };

  // Effective background: walk ancestors compositing translucent layers, but
  // first check for an absolutely-positioned sibling fill covering this text.
  // The active tab and filter pills paint their highlight that way (a motion
  // span with layoutId), so it is a sibling of the label, never an ancestor.
  function coveringFill(el) {
    const r = el.getBoundingClientRect();
    for (let n = el.parentElement, hops = 0; n && hops < 3; n = n.parentElement, hops++) {
      for (const sib of n.children) {
        if (sib === el || sib.contains(el)) continue;
        const cs = getComputedStyle(sib);
        if (cs.position !== 'absolute' && cs.position !== 'fixed') continue;
        const c = parse(cs.backgroundColor);
        if (!c || c[3] === 0) continue;
        const b = sib.getBoundingClientRect();
        if (b.left <= r.left + 1 && b.right >= r.right - 1 && b.top <= r.top + 1 && b.bottom >= r.bottom - 1) return c;
      }
    }
    return null;
  }

  // Collect every painted layer from the element outwards, then composite
  // back-to-front. Compositing as we walk is wrong: two 5%-alpha layers would
  // blend into each other and be treated as opaque, hiding the page beneath.
  function bgOf(el) {
    const layers = [];
    const cover = coveringFill(el);
    if (cover) {
      if (cover[3] === 1) return cover.slice(0,3);
      layers.push(cover);
    }
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (!c || c[3] === 0) continue;
      layers.push(c);
      if (c[3] === 1) break;             // fully opaque: nothing below matters
    }
    let out = [255,255,255];
    for (let i = layers.length - 1; i >= 0; i--) out = over(layers[i], out);
    return out;
  }

  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim();
    if (!text) continue;
    const el = node.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    if (el.closest('.leaflet-container')) continue; // third-party map chrome
    // Lettering inside a graphic (the procedural passport stamps) is part of
    // the image, judged by WCAG 1.4.11 at 3:1 — not 1.4.3 body-text rules.
    if (el.closest('[role="img"], svg')) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = bgOf(el);
    const composited = over(fg, bg);
    const px = parseFloat(cs.fontSize);
    const bold = (parseInt(cs.fontWeight,10) || 400) >= 700;
    // WCAG: large text is >=24px, or >=18.66px bold.
    const threshold = (px >= 24 || (bold && px >= 18.66)) ? 3 : 4.5;
    const value = ratio(composited, bg);
    if (value < threshold) {
      out.push({
        text: text.slice(0, 26),
        cls: (el.getAttribute('class') || '').slice(0, 60),
        tag: el.tagName.toLowerCase(),
        color: cs.color, fontSize: px, ratio: +value.toFixed(2), threshold,
        bg: 'rgb(' + bg.join(',') + ')', fg: 'rgb(' + composited.join(',') + ')',
        bg: 'rgb(' + bg.join(',') + ')', fg: 'rgb(' + composited.join(',') + ')',
      });
    }
  }
  return out;
})()`;

const browser = await webkit.launch();
const all = new Map();

for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({
    ...devices['iPhone 13'], viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true,
  });
  await ctx.addInitScript((t) => localStorage.setItem('travel-tracker-theme', t), theme);
  const page = await ctx.newPage();
  await page.route('**://*.tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(BASE, { waitUntil: 'networkidle' });

  for (const tab of TABS) {
    const bar = page.locator('nav[aria-label="Main"] button', { hasText: new RegExp(`^${tab}$`, 'i') });
    if (await bar.count()) await bar.first().click();
    else {
      await page.locator('nav[aria-label="Main"] button', { hasText: /^More$/i }).click();
      await page.getByRole('dialog', { name: 'More sections' }).getByRole('button', { name: new RegExp(tab, 'i') }).first().click();
    }
    await page.waitForTimeout(900);
    for (const f of await page.evaluate(AUDIT)) {
      const key = `${theme}|${f.cls}|${f.ratio}`;
      if (!all.has(key)) all.set(key, { theme, tab, ...f });
    }
  }
  await ctx.close();
}
await browser.close();

const rows = [...all.values()].sort((a, b) => a.ratio - b.ratio);
console.log(`\n  ${rows.length} failing text elements at 375px\n`);
for (const r of rows) {
  console.log(`  [${r.theme}/${r.tab}] "${r.text}"  ${r.ratio}:1 (need ${r.threshold})`);
  console.log(`      fg=${r.fg}  bg=${r.bg}  size=${r.fontSize}px`);
  console.log(`      class="${r.cls}"`);
}
process.exit(rows.length ? 1 : 0);
