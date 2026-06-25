/**
 * money-app2 Playwright smoke driver
 *
 * Usage:
 *   node .claude/skills/run-money-app/driver.mjs [outDir]
 *
 * Prerequisites:
 *   - Expo dev server running on http://localhost:8081
 *     (cd money-app2 && npx expo start)
 *   - Playwright installed: npm install (it's already in devDependencies)
 *
 * Output:
 *   Screenshots saved to outDir (default: C:/Users/<you>/AppData/Local/Temp/money-app-ss)
 *   Exits 1 if JS errors were detected.
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const OUT = process.argv[2] ?? 'C:/Users/user/AppData/Local/Temp/money-app-ss';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') jsErrors.push(m.text()); });

const ss = async (name) => {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path });
  console.log(`  screenshot -> ${path}`);
  return path;
};

// Click an element by its exact visible text
const clickText = async (text) => {
  await page.evaluate((t) => {
    const el = [...document.querySelectorAll('*')]
      .find(e => e.childNodes.length === 1 && e.childNodes[0].nodeType === 3 && e.textContent.trim() === t);
    if (el) el.click();
    else console.warn(`clickText: "${t}" not found`);
  }, text);
};

// ── 1. Load app ──────────────────────────────────────────────────────────────
// First load triggers Metro bundling — can take up to 30s on a cold server.
console.log('Loading app (first load may take up to 30s)...');
await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 35000 });
await page.waitForTimeout(2000);

// Language picker appears on first load when no language is stored in AsyncStorage.
// Detect it by looking for "Bahasa Malaysia" (unique to that screen).
// document.body.textContent doesn't include RN Web text nodes reliably; use element scan.
const hasLangPicker = await page.evaluate(() =>
  [...document.querySelectorAll('*')].some(el =>
    el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 && el.textContent.trim() === 'Bahasa Malaysia'
  )
);
if (hasLangPicker) {
  console.log('Language picker shown — selecting English...');
  await clickText('English');
  await page.waitForTimeout(2000);
}
console.log('App loaded.');

// ── 2. Home tab ──────────────────────────────────────────────────────────────
console.log('\n[Home]');
await ss('01-home');
const homeText = await page.evaluate(() => document.body.innerText ?? '');
console.log('  Has greeting:', homeText.includes('Good'));
console.log('  Has "LEFT OVER":', homeText.includes('LEFT OVER'));
console.log('  Has "Savings history":', homeText.includes('Savings history'));

// ── 3. Expenses tab ──────────────────────────────────────────────────────────
console.log('\n[Expenses]');
await clickText('Expenses');
await page.waitForTimeout(1200);
await ss('02-expenses');
const expText = await page.evaluate(() => document.body.innerText ?? '');
console.log('  Has "TOTAL SPENT":', expText.includes('TOTAL SPENT'));
console.log('  Has "All expenses":', expText.includes('All expenses'));

// ── 4. Invest tab ────────────────────────────────────────────────────────────
console.log('\n[Invest]');
await clickText('Invest');
await page.waitForTimeout(1200);
await ss('03-invest');
const invText = await page.evaluate(() => document.body.innerText ?? '');
console.log('  Has "Goals":', invText.includes('Goals') || invText.includes('GOALS'));

// ── 5. Coach tab ─────────────────────────────────────────────────────────────
console.log('\n[Coach]');
await clickText('Coach');
await page.waitForTimeout(1200);
await ss('04-coach');
const coachText = await page.evaluate(() => document.body.innerText ?? '');
console.log('  Has "QUESTION":', coachText.includes('QUESTION'));

// ── 6. Profile tab ───────────────────────────────────────────────────────────
console.log('\n[Profile]');
await clickText('Profile');
await page.waitForTimeout(1200);
await ss('05-profile');
const profText = await page.evaluate(() => document.body.innerText ?? '');
console.log('  Has "Income streams":', profText.includes('Income streams'));
console.log('  Has "Language":', profText.includes('Language'));

// ── 7. Summary ───────────────────────────────────────────────────────────────
await browser.close();
console.log('\n──────────────────────────────');
console.log(`Screenshots saved to: ${OUT}`);
if (jsErrors.length) {
  console.error(`\nJS errors (${jsErrors.length}):`);
  jsErrors.slice(0, 5).forEach(e => console.error(' ', e));
  process.exit(1);
} else {
  console.log('JS errors: none');
}
