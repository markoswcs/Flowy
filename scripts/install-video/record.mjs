// Renders install.html frame by frame into public/videos/instalar-<os>.mp4
// (720x1280, 30 fps) plus a poster image. Needs ffmpeg on the PATH.
//   node scripts/install-video/record.mjs            both
//   node scripts/install-video/record.mjs iphone     one
//   node scripts/install-video/record.mjs iphone 5,15,30   only stills (checking)
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../public/videos");
const FPS = 30;
const [only, stills] = process.argv.slice(2);
const systems = only ? [only] : ["iphone", "android"];
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const os of systems) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  await page.goto(`${pathToFileURL(resolve(here, "install.html")).href}?os=${os}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const duration = await page.evaluate(() => window.DURATION);

  if (stills) {
    for (const t of stills.split(",").map(Number)) {
      await page.evaluate((s) => window.render(s), t);
      writeFileSync(resolve(here, `still-${os}-${t}.png`), await page.screenshot());
    }
    continue;
  }

  const file = resolve(out, `instalar-${os}.mp4`);
  const ffmpeg = spawn("ffmpeg", [
    "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", file,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const frames = Math.round(duration * FPS);
  for (let frame = 0; frame <= frames; frame++) {
    await page.evaluate((s) => window.render(s), frame / FPS);
    const shot = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!ffmpeg.stdin.write(shot)) await new Promise((done) => ffmpeg.stdin.once("drain", done));
  }
  ffmpeg.stdin.end();
  await new Promise((done, fail) => ffmpeg.on("close", (code) => (code === 0 ? done() : fail(new Error(`ffmpeg ${code}`)))));

  // Poster: the moment the reminder arrives, which is what the video promises.
  await page.evaluate((s) => window.render(s), 2.2);
  writeFileSync(resolve(out, `instalar-${os}.jpg`), await page.screenshot({ type: "jpeg", quality: 85 }));
  console.log(`${os}: ${frames} frames → ${file}`);
  await page.close();
}
await browser.close();
