#!/usr/bin/env node
// Renders the demo video by driving the built app in headless Chromium.
// No screen recording: every frame is a screenshot taken after stepping a
// fake clock by 1/30 s. The sequence of states is the same on every run;
// the files are not byte-identical, because CSS-driven effects are read a
// few real milliseconds after they are set to the frame's time.
//
//   npm run demo:video               shipped build, verified snapshot -> docs/demo.mp4, docs/demo.gif
//   npm run demo:video -- --fixture  fictional fixture build -> .demo-work/fixture/ (never written to docs/)
//   npm run demo:video -- --frames-only   capture frames and key frames, skip encoding
//
// Needs ffmpeg on PATH and the Chromium that Playwright installs
// (npx playwright install chromium).

import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, renameSync, copyFileSync, writeFileSync, statSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = new Set(process.argv.slice(2));
const FIXTURE = args.has('--fixture');
const FRAMES_ONLY = args.has('--frames-only');

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 30;
const PORT = FIXTURE ? 4186 : 4185;
const BASE = `http://localhost:${PORT}`;
const FRAME_MS = [33, 33, 34]; // 100 ms every three frames = exactly 30 fps
const X264 = ['-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p'];
const GIF_LIMIT = 8_000_000; // 8 MB, decimal

const work = join(root, '.demo-work', FIXTURE ? 'fixture' : 'snapshot');
const keyframeDir = join(work, 'keyframes');
const outDir = FIXTURE ? work : join(root, 'docs');
const viteBin = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const modeArgs = FIXTURE ? ['--mode', 'fixture'] : [];

function run(command, commandArgs, label) {
  const result = spawnSync(command, commandArgs, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`${label} failed (${result.error?.message ?? `exit ${result.status}`})\n${(result.stderr || '').split('\n').slice(-15).join('\n')}`);
  }
  return result;
}

function ffmpeg(ffArgs, target) {
  // Encode to a temporary name that still ends in the real extension; rename only on success.
  const tmp = target.replace(/(\.[a-z0-9]+)$/i, '.tmp$1');
  run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...ffArgs, tmp], `ffmpeg -> ${target}`);
  renameSync(tmp, target);
}

// Runs in the page before each screenshot. The fake clock steps timers,
// requestAnimationFrame and performance.now (so JS-driven animation follows
// it), but CSS animations/transitions and Web Animations run on the
// compositor's real clock. This puts each of them at the virtual time too.
function syncAnimations(dt) {
  window.__demoTime = (window.__demoTime ?? 0) + dt;
  const starts = (window.__demoStarts ??= new WeakMap());
  for (const animation of document.getAnimations()) {
    if (!starts.has(animation)) starts.set(animation, window.__demoTime - dt);
    try {
      if (animation.playState !== 'finished') animation.currentTime = window.__demoTime - starts.get(animation);
    } catch { /* an animation that was cancelled between the two lines */ }
  }
}

async function main() {
  if (spawnSync('ffmpeg', ['-version']).status !== 0 && !FRAMES_ONLY) throw new Error('ffmpeg was not found on PATH');
  rmSync(work, { recursive: true, force: true });
  mkdirSync(keyframeDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  console.log(`building (${FIXTURE ? 'fixture' : 'snapshot'}) ...`);
  run(process.execPath, [viteBin, 'build', ...modeArgs], 'vite build');

  const server = spawn(process.execPath, [viteBin, 'preview', ...modeArgs, '--port', String(PORT), '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let browser;
  try {
    await new Promise((ready, fail) => {
      const timer = setTimeout(() => fail(new Error('vite preview did not start')), 30_000);
      server.stdout.on('data', (chunk) => { if (String(chunk).includes('http')) { clearTimeout(timer); ready(); } });
      server.on('exit', (code) => fail(new Error(`vite preview exited (${code})`)));
    });

    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('request', (request) => {
      if (!request.url().startsWith(BASE) && !request.url().startsWith('data:')) pageErrors.push(`request left the page: ${request.url()}`);
    });

    await page.clock.install({ time: new Date('2026-11-10T15:00:00') });
    await page.goto(BASE);
    await page.clock.pauseAt(new Date('2026-11-10T15:00:01'));

    // What the page says about its own data, used for the label and the caption.
    const isFixtureBuild = (await page.getByTestId('fixture-banner').count()) > 0;
    if (isFixtureBuild !== FIXTURE) throw new Error('the build does not match the requested data source');

    // ---- frame capture -------------------------------------------------
    const scenes = [];
    let scene = null;
    let total = 0;
    const cursor = { x: WIDTH / 2, y: HEIGHT + 40 };

    const beginScene = (name) => {
      scene = { name, dir: join(work, `scene-${String(scenes.length + 1).padStart(2, '0')}-${name}`), frames: 0 };
      mkdirSync(scene.dir, { recursive: true });
      scenes.push(scene);
    };
    const tick = async () => {
      const dt = FRAME_MS[total % FRAME_MS.length];
      await page.clock.runFor(dt);
      await page.evaluate(syncAnimations, dt);
      await page.evaluate(({ x, y }) => {
        const el = document.getElementById('demo-cursor');
        if (el) el.style.transform = `translate(${x}px, ${y}px)`;
      }, cursor);
      scene.frames += 1;
      total += 1;
      await page.screenshot({ path: join(scene.dir, `f${String(scene.frames).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    };
    const hold = async (seconds) => { for (let i = 0; i < Math.round(seconds * FPS); i += 1) await tick(); };
    const keyframe = (name) => copyFileSync(join(scene.dir, `f${String(scene.frames).padStart(5, '0')}.jpg`), join(keyframeDir, `${String(scenes.length).padStart(2, '0')}-${name}.jpg`));
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);

    // The pointer aims at the right-hand part of a control (or just left of a
    // link) so it does not sit on top of the words the viewer should read.
    const moveCursor = async (locator, seconds = 0.5, aim = 'control') => {
      const box = await locator.boundingBox();
      if (!box) throw new Error('cursor target is not visible');
      const from = { ...cursor };
      const to = aim === 'beside'
        ? { x: box.x - 14, y: box.y + 9 }
        : box.width < 60
          ? { x: box.x + box.width - 3, y: box.y + box.height - 3 } // small chip or icon: its lower right corner
          : { x: box.x + Math.min(box.width * 0.82, box.width - 8), y: box.y + box.height / 2 };
      const n = Math.max(1, Math.round(seconds * FPS));
      for (let i = 1; i <= n; i += 1) {
        cursor.x = from.x + (to.x - from.x) * ease(i / n);
        cursor.y = from.y + (to.y - from.y) * ease(i / n);
        await tick();
      }
    };
    const click = async (locator, { move = 0.5 } = {}) => {
      await moveCursor(locator, move);
      await page.evaluate(() => document.getElementById('demo-cursor')?.classList.add('down'));
      await hold(0.1);
      await locator.dispatchEvent('click');
      await page.evaluate(() => document.getElementById('demo-cursor')?.classList.remove('down'));
    };
    const scrollTo = async (targetY, seconds = 0.7) => {
      const startY = await page.evaluate(() => window.scrollY);
      const n = Math.max(1, Math.round(seconds * FPS));
      for (let i = 1; i <= n; i += 1) {
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), startY + (targetY - startY) * ease(i / n));
        await tick();
      }
    };
    /** Scroll so that `locator` sits `offset` px below the top of the window. */
    const scrollToElement = async (locator, offset, seconds) => {
      const top = await locator.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
      const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      await scrollTo(Math.max(0, Math.min(max, top - offset)), seconds);
    };

    // Overlays that exist only in the video: a pointer, and a label saying what data is shown.
    await page.addStyleTag({
      content: `
        #demo-cursor { position: fixed; left: -9px; top: -9px; width: 18px; height: 18px; border-radius: 50%; z-index: 10000; pointer-events: none;
          border: 2px solid rgba(255,255,255,0.95); background: rgba(56,189,248,0.18); box-shadow: 0 0 0 1px rgba(11,17,32,0.6), 0 2px 10px rgba(0,0,0,0.5); }
        #demo-cursor.down { background: rgba(56,189,248,0.75); }
        /* In the free space of the sidebar, so it never sits on card text or the footer. */
        #demo-label { position: fixed; left: 16px; bottom: 84px; width: 227px; z-index: 9999; pointer-events: none; padding: 8px 12px; border-radius: 10px;
          font: 600 11px/1.45 'IBM Plex Mono', monospace; color: #34d399; background: rgba(11,17,32,0.92); border: 1px solid rgba(52,211,153,0.45); }
        #demo-end { position: fixed; inset: 0; z-index: 10001; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px;
          background: #0b1120; opacity: 0; text-align: center; padding: 0 120px; }
        #demo-end .l1 { font: 700 44px/1.2 'Chakra Petch', sans-serif; color: #f1f5f9; }
        #demo-end .l2 { font: 500 22px/1.4 'IBM Plex Mono', monospace; color: #94a3b8; }
        #demo-end .l3 { font: 500 14px/1.4 'IBM Plex Mono', monospace; color: #64748b; margin-top: 10px; }
      `,
    });
    await page.evaluate(() => {
      const el = document.createElement('div');
      el.id = 'demo-cursor';
      document.body.appendChild(el);
    });

    // ---- scene 1: landing page -----------------------------------------
    beginScene('landing');
    await hold(4.0); // typing effect, counters, pills
    keyframe('landing');

    // ---- scene 2: into the dashboard ------------------------------------
    beginScene('dashboard');
    await click(page.getByRole('button', { name: 'Initialize Dashboard' }), { move: 0.7 });
    await hold(0.9);
    await page.getByRole('heading', { name: 'Competitors', level: 1 }).waitFor({ timeout: 5000 });
    const dateText = await page.getByTestId('snapshot-date').innerText();
    if (!FIXTURE) {
      await page.evaluate((text) => {
        const el = document.createElement('div');
        el.id = 'demo-label';
        el.textContent = `Demo data: verified ${text.replace(' · ', ' of ').toLowerCase()}`;
        document.body.appendChild(el);
      }, dateText);
    }
    await hold(1.8); // stat tiles and cards animate in
    keyframe('grid');
    const grid = page.locator('.grid').getByTestId('competitor-card');
    const card = grid.and(page.locator('[data-has-data="true"]')).filter({ has: page.getByRole('button', { name: /to opportunities$/ }) }).first();
    await scrollToElement(card, 110, 0.9);
    await hold(0.8);
    keyframe('grid-scrolled');

    // ---- scene 3: one competitor, its facts and sources -----------------
    beginScene('competitor');
    await click(card.getByRole('button', { name: /Facts & Analysis/ }));
    await hold(0.6);
    await scrollToElement(card, 110, 0.5);
    await hold(2.3); // name, "Verified snapshot" badge, positioning with its sources
    keyframe('badge-and-source');
    const firstFact = card.getByTestId('fact').first();
    await scrollToElement(firstFact, 150, 0.9);
    await moveCursor(firstFact.getByTestId('source-link').first(), 0.6, 'beside');
    await hold(2.6); // a fact, its source link, the excerpt; analysis on the right
    keyframe('fact-and-source');

    // ---- scene 4: an analysis item and the facts it rests on ------------
    beginScene('analysis');
    const item = card.getByTestId('analysis-item').first();
    await click(item.getByRole('button').first(), { move: 0.7 });
    await hold(2.6);
    keyframe('analysis-based-on');

    // ---- scene 5: trends -------------------------------------------------
    beginScene('trends');
    await click(page.locator('.sidebar-item', { hasText: 'Trends' }), { move: 0.6 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await hold(1.2);
    const trend = page.getByTestId('trend-card').first();
    await scrollToElement(trend, 110, 0.6);
    await click(trend.getByRole('button', { name: 'Examples & Analysis' }));
    await hold(2.6);
    keyframe('trend');

    // ---- scene 6: save an insight, find it under Opportunities ----------
    beginScene('opportunities');
    await click(trend.getByRole('button', { name: /to opportunities$/ }), { move: 0.6 });
    await hold(0.9);
    keyframe('saved');
    await click(page.locator('.sidebar-item', { hasText: 'Opportunities' }), { move: 0.6 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await hold(2.2);
    keyframe('opportunities');

    // ---- scene 7: the report, with its disclaimer line ------------------
    beginScene('report');
    await click(page.locator('.sidebar-item', { hasText: 'Report' }), { move: 0.6 });
    await hold(0.9);
    await click(page.getByRole('button', { name: 'Generate Report' }), { move: 0.6 });
    await hold(0.5);
    await scrollToElement(page.getByTestId('report-text'), 120, 0.6);
    cursor.y = HEIGHT + 60; // out of the way of the text
    await hold(3.0);
    keyframe('report');

    // ---- scene 8: closing card (fades in inside this scene) -------------
    beginScene('closing');
    await page.evaluate((fixture) => {
      const el = document.createElement('div');
      el.id = 'demo-end';
      el.innerHTML = '<div class="l1">Every fact links to a public source.</div><div class="l2">Analysis is labelled and points at the facts it rests on.</div><div class="l2">Independent project, not affiliated with UPMC.</div>'
        + `<div class="l3">${fixture ? 'This run used fictional fixture data.' : 'Rendered by scripts/make-demo-video.mjs from the shipped build.'}</div>`;
      document.body.appendChild(el);
    }, FIXTURE);
    const fadeFrames = 12;
    for (let i = 1; i <= fadeFrames; i += 1) {
      await page.evaluate((o) => { document.getElementById('demo-end').style.opacity = String(o); }, i / fadeFrames);
      await tick();
    }
    await hold(2.0);
    keyframe('closing');

    if (pageErrors.length) throw new Error(`the page reported problems:\n${pageErrors.join('\n')}`);
    const seconds = total / FPS;
    console.log(`captured ${total} frames (${seconds.toFixed(1)} s) in ${scenes.length} scenes; key frames in ${keyframeDir}`);
    if (seconds < 25 || seconds > 45) throw new Error(`video length ${seconds.toFixed(1)} s is outside 25-45 s`);
    if (FRAMES_ONLY) return;

    // ---- encode: one mp4 per scene, identical settings, then concat -----
    const sceneFiles = [];
    for (const s of scenes) {
      const target = join(work, `${s.dir.split(/[\\/]/).pop()}.mp4`);
      ffmpeg(['-framerate', String(FPS), '-i', join(s.dir, 'f%05d.jpg'), '-vf', 'format=yuv420p', '-r', String(FPS), ...X264, '-an'], target);
      sceneFiles.push(target);
    }
    const list = join(work, 'concat.txt');
    writeFileSync(list, sceneFiles.map((f) => `file '${f.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n') + '\n');
    const mp4 = join(outDir, 'demo.mp4');
    ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart'], mp4);

    // ---- README preview GIF: two-pass palette, 960 px wide ---------------
    const gif = join(outDir, 'demo.gif');
    const palette = join(work, 'palette.png');
    let made = false;
    // Keep the palette as large as possible (accent colours die first): give up frame rate, then width, then colours.
    for (const [width, fps, colors] of [[960, 12, 128], [960, 10, 128], [960, 8, 128], [880, 8, 128], [880, 8, 96], [880, 8, 80], [880, 8, 64], [880, 8, 48], [880, 8, 32]]) {
      const scale = `fps=${fps},scale=${width}:-2:flags=lanczos`;
      ffmpeg(['-i', mp4, '-vf', `${scale},palettegen=max_colors=${colors}:stats_mode=diff`], palette);
      ffmpeg(['-i', mp4, '-i', palette, '-lavfi', `${scale}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`], gif);
      if (statSync(gif).size < GIF_LIMIT) { made = true; console.log(`gif: ${width} px, ${fps} fps, ${colors} colours, ${(statSync(gif).size / 1e6).toFixed(2)} MB`); break; }
    }
    if (!made) throw new Error('could not get the GIF under 8 MB');
    console.log(`wrote ${mp4} (${(statSync(mp4).size / 1e6).toFixed(2)} MB) and ${gif}`);
  } finally {
    await browser?.close();
    server.kill();
  }
}

main().then(() => {
  // Frames are large; keep only key frames and the encoded scenes.
  if (existsSync(work)) {
    for (const name of readdirSync(work)) {
      if (name.startsWith('scene-') && !name.endsWith('.mp4') && !FRAMES_ONLY) rmSync(join(work, name), { recursive: true, force: true });
    }
  }
  process.exit(0);
}).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
