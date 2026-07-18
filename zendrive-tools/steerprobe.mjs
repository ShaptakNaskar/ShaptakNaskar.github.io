// Steering-direction probe: drive straight, hold a steer key, and report
// which SCREEN side the car moved to (camera-relative), plus yaw response.
// Usage: node steerprobe.js <ArrowLeft|ArrowRight>
import puppeteer from 'puppeteer-core';

const key = process.argv[2] || 'ArrowRight';
const url = 'http://localhost:5173/games/zendrive?drive=1&turn=STRAIGHT&time=12';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox',
    '--autoplay-policy=no-user-gesture-required', '--window-size=800,450'],
});
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 450 });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(url, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 3000));

const snap = () => page.evaluate(() => {
  const d = window.__ZD_DEBUG;
  return { x: d.x, z: d.z, yaw: d.yaw, lateral: d.lateral, cam: d.cam, speed: d.speed };
});

// Get up to speed first.
await page.keyboard.down('KeyW');
await new Promise((r) => setTimeout(r, 4000));
const before = await snap();
await page.keyboard.down(key);
await new Promise((r) => setTimeout(r, 2500));
const after = await snap();
await page.keyboard.up(key);
await page.keyboard.up('KeyW');

// Screen-right axis at "before": forward = vehicle - camera (XZ), up = +Y.
// right = forward × up  → (fz*1 - 0, ..., 0 - fx*1) → (-?), do it properly:
const fx = before.x - before.cam[0];
const fz = before.z - before.cam[2];
const len = Math.hypot(fx, fz);
const f = { x: fx / len, z: fz / len };
// cross(f, up) with f=(fx,0,fz), up=(0,1,0): (0*0-fz*1, fz*0-fx*0, fx*1-0*0) = (-fz, 0, fx)
const right = { x: -f.z, z: f.x };
const dx = after.x - before.x;
const dz = after.z - before.z;
// Remove the forward component of the displacement; keep the lateral part.
const lat = dx * right.x + dz * right.z;

console.log(JSON.stringify({ key, before, after, screenLateral: +lat.toFixed(2),
  movedOnScreen: lat > 0.3 ? 'RIGHT' : lat < -0.3 ? 'LEFT' : 'none',
  yawDelta: +(after.yaw - before.yaw).toFixed(3),
  lateralDelta: +(after.lateral - before.lateral).toFixed(2) }, null, 1));
await browser.close();
