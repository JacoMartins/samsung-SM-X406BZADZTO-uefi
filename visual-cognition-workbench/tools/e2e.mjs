// End-to-end smoke test: drives a full "quick" session in headless Chromium
// with an automated respondent, then opens the results dashboard.
// Usage: node tools/serve.js 8123 &  node tools/e2e.mjs <screenshot-dir> [baseUrl]
// Requires Playwright (not a project dependency).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const OUT = process.argv[2] || 'e2e-shots';
const BASE = process.argv[3] || 'http://localhost:8123/';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });

await page.goto(BASE);
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/01-home.png` });
await page.goto(`${BASE}#/setup`);
await page.waitForTimeout(300);
await page.click('text=Quick (~12 min)');
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/02-setup.png`, fullPage: true });
await page.click('text=Start session');
await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/03-intro.png` });
await page.keyboard.press('Space');

let qShots = 0; let stageShots = 0; let loops = 0; let answered = 0;
const deadline = Date.now() + 15 * 60 * 1000;
while (Date.now() < deadline && loops++ < 100000) {
  await page.waitForTimeout(100);
  if (page.url().includes('#/results/')) break;
  if (await page.$('.qwrap')) {
    if (qShots < 8) await page.screenshot({ path: `${OUT}/q-${qShots++}.png` });
    const opts = await page.$$('.option'); if (opts.length) await opts[0].click();
    const ta = await page.$('textarea'); if (ta) await ta.fill('a cat on a bed near a lamp, a person, a car; the grey text has low contrast');
    const num = await page.$('.counter input'); if (num) await num.fill('2');
    const cells = await page.$$('.gridpick button'); if (cells.length) await cells[4].click();
    const scale = await page.$$('.scale button'); if (scale.length) await scale[3].click();
    for (const row of await page.$$('.judg-row')) { const bs = await row.$$('button'); await bs[0].click(); }
    const conf = await page.$$('.confidence .seg button'); if (conf.length) await conf[3].click();
    await page.click('.qactions .btn.primary');
    answered++;
    continue;
  }
  if (await page.$('.stage-msg button')) { await page.keyboard.press('Space'); continue; }
  if (await page.$('canvas.stage-canvas') && stageShots < 3) { await page.screenshot({ path: `${OUT}/stage-${stageShots++}.png` }); }
}
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/10-results.png`, fullPage: true });
console.log(`final url: ${page.url()}\nquestions answered: ${answered}\nproblems: ${problems.length}`);
problems.slice(0, 20).forEach((p) => console.log(`  ${p}`));
await browser.close();
process.exit(page.url().includes('#/results/') && !problems.length ? 0 : 1);
