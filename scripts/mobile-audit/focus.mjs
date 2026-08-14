import { webkit, devices } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const fail=[];
const b = await webkit.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], viewport:{width:375,height:667}, isMobile:true, hasTouch:true });
const page = await ctx.newPage();
await page.route('**://*.tile.openstreetmap.org/**', r=>r.abort());
await page.goto(BASE,{waitUntil:'networkidle'});

// Find a card whose sheet actually has photos (needed for the nested lightbox).
const cards = page.locator('[data-trip-card]');
const n = await cards.count();
let opened = -1;
for (let i=0;i<Math.min(n,12);i++){
  await cards.nth(i).click();
  await page.waitForTimeout(800);
  const imgs = await page.getByRole('dialog').locator('button:has(img)').count();
  if (imgs>0){ opened=i; break; }
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
}
if (opened<0) { console.log('  (no trip with photos found; skipping nested test)'); }
else console.log(`  opened card #${opened} with photos`);

// --- focus trap: Tab many times, focus must stay inside the sheet ---
const dlg = page.getByRole('dialog').first();
let escaped = 0;
for (let i=0;i<25;i++){
  await page.keyboard.press('Tab');
  const inside = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return !!(d && document.activeElement && d.contains(document.activeElement));
  });
  if (!inside) escaped++;
}
if (escaped>0) fail.push(`focus escaped the sheet on ${escaped}/25 tabs`);
else console.log('  ok  focus stayed inside the sheet for 25 tabs');

// --- nested lightbox: refcounted scroll lock ---
if (opened>=0) {
  const before = await page.evaluate(()=>document.body.style.top);
  await dlg.locator('button:has(img)').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await dlg.locator('button:has(img)').first().click();
  await page.waitForTimeout(700);
  const dialogs = await page.getByRole('dialog').count();
  if (dialogs<2) fail.push(`lightbox did not open (dialog count ${dialogs})`);
  else console.log('  ok  lightbox opened over the sheet');

  await page.keyboard.press('Escape'); // closes lightbox only
  await page.waitForTimeout(700);
  const stillLocked = await page.evaluate(()=>getComputedStyle(document.body).position);
  const topNow = await page.evaluate(()=>document.body.style.top);
  if (stillLocked!=='fixed') fail.push('scroll lock released when only the lightbox closed (refcount bug)');
  else console.log(`  ok  page still locked after lightbox close (top ${topNow}, was ${before})`);

  await page.keyboard.press('Escape'); // closes sheet
  await page.waitForTimeout(700);
  const released = await page.evaluate(()=>getComputedStyle(document.body).position);
  if (released==='fixed') fail.push('scroll lock never released after sheet close');
  else console.log('  ok  lock fully released after sheet close');
}

// --- focus returns to the opener ---
const active = await page.evaluate(()=>document.activeElement?.hasAttribute('data-trip-card')
  ? 'trip-card' : (document.activeElement?.tagName ?? 'none'));
if (active !== 'trip-card') fail.push(`focus not restored to the card, got ${active}`);
else console.log(`  ok  focus restored to opener (${active})`);

await b.close();
console.log('');
if (fail.length){ fail.forEach(f=>console.log('  x '+f)); process.exit(1); }
console.log('FOCUS/NESTING CHECKS PASSED');
