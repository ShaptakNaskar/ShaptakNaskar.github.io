// Screenshot harness: node shot.mjs <url> <out.png> [waitMs] [keys "KeyW:3000,KeyD:800"] [evalJs]
import puppeteer from 'puppeteer-core';

const [url, out, waitMs = '4000', keysSpec = '', evalJs = ''] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox',
    '--autoplay-policy=no-user-gesture-required', '--window-size=800,450'],
});
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 450 });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await page.goto(url, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, +waitMs));
for (const part of keysSpec ? keysSpec.split(',') : []) {
  const [code, ms] = part.split(':');
  await page.keyboard.down(code);
  await new Promise((r) => setTimeout(r, +ms));
  await page.keyboard.up(code);
}
if (evalJs) console.log(JSON.stringify(await page.evaluate(evalJs)));
await page.screenshot({ path: out });
await browser.close();
