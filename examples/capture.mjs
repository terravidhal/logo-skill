#!/usr/bin/env node
/**
 * Capture the proof images used by the README.
 *
 *   npm run capture
 *
 * Chromium is found automatically (CHROME_BIN, the Playwright cache, or a system
 * install). No npm package is required. This file needs Node 22+ for the built-in
 * WebSocket client; the skill build itself still runs on Node 20. The demo GIF is
 * assembled with a system ffmpeg; without one the PNG captures are still written.
 *
 * Output:
 *   assets/readme/<slug>-1440-light.png   1440 px, light
 *   assets/readme/<slug>-1440-dark.png    1440 px, dark
 *   assets/readme/<slug>-390-light.png    390 px, light
 *   assets/readme/<slug>-390-dark.png     390 px, dark
 *   assets/readme/gallery-*.png           the same four for the gallery
 *   assets/readme/before-after.png         the comparison plate
 *   assets/demo.gif                       a short tour
 */
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launch } from "./lib/browser.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const OUT = join(ROOT, "assets/readme");
const FRAMES = join(ROOT, "assets/readme/.frames");

const FFMPEG_CANDIDATES = [
  process.env.FFMPEG_BIN,
  "/usr/bin/ffmpeg",
  "/usr/local/bin/ffmpeg",
  "/opt/homebrew/bin/ffmpeg",
].filter(Boolean);

const boards = readdirSync(HERE, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => existsSync(join(HERE, name, "board.html")))
  .sort();

const targets = [
  { name: "gallery", file: join(HERE, "site/index.html") },
  ...boards.map((slug) => ({ name: slug, file: join(HERE, slug, "board.html") })),
];

const viewports = [
  { label: "1440", width: 1440, height: 1000 },
  { label: "390", width: 390, height: 900 },
];

const themes = ["light", "dark"];

const url = (file) => pathToFileURL(file).href;

const demoFrames = [
  { file: join(HERE, "site/index.html"), theme: "light", scroll: 0 },
  { file: join(HERE, "site/index.html"), theme: "light", scroll: 520 },
  { file: join(HERE, "site/index.html"), theme: "light", scroll: 1120 },
  { file: join(HERE, "site/index.html"), theme: "dark", scroll: 0 },
  { file: join(HERE, "site/index.html"), theme: "dark", scroll: 980 },
  { file: join(HERE, "loam/board.html"), theme: "light", scroll: 0 },
  { file: join(HERE, "loam/board.html"), theme: "light", scroll: 760 },
  { file: join(HERE, "loam/board.html"), theme: "dark", scroll: 0 },
  { file: join(HERE, "cindral/board.html"), theme: "light", scroll: 0 },
  { file: join(HERE, "cindral/board.html"), theme: "light", scroll: 1420 },
  { file: join(HERE, "tessaro/board.html"), theme: "light", scroll: 1450 },
  { file: join(HERE, "velluma/board.html"), theme: "dark", scroll: 0 },
];

function findFfmpeg() {
  return FFMPEG_CANDIDATES.find((file) => existsSync(file)) ?? null;
}

async function main() {
  if (typeof WebSocket === "undefined") {
    console.error("capture: Node 22+ is required for the built-in WebSocket client.");
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  console.log(`chromium ${browser.chrome}`);
  try {
    for (const target of targets) {
      for (const viewport of viewports) {
        for (const theme of themes) {
          await browser.open(url(target.file), {
            width: viewport.width,
            height: viewport.height,
            theme,
            mobile: viewport.width < 500,
          });
          const png = await browser.screenshot({ fullPage: true });
          const file = join(OUT, `${target.name}-${viewport.label}-${theme}.png`);
          writeFileSync(file, png);
          console.log(`  ${file.slice(ROOT.length + 1)}  ${Math.round(png.length / 1024)} KB`);
        }
      }
    }

    await browser.open(url(join(HERE, "site/before-after.html")), {
      width: 1600,
      height: 1040,
      theme: "light",
      mobile: false,
    });
    const proof = await browser.screenshot({ fullPage: true });
    writeFileSync(join(OUT, "before-after.png"), proof);
    console.log(`  assets/readme/before-after.png  ${Math.round(proof.length / 1024)} KB`);

    rmSync(FRAMES, { recursive: true, force: true });
    mkdirSync(FRAMES, { recursive: true });
    let index = 0;
    for (const frame of demoFrames) {
      index += 1;
      await browser.open(url(frame.file), {
        width: 1200,
        height: 800,
        theme: frame.theme,
        mobile: false,
        script: `window.scrollTo(0, ${frame.scroll}); true`,
      });
      const jpeg = await browser.screenshot({ fullPage: false, format: "jpeg", quality: 88 });
      writeFileSync(join(FRAMES, `${String(index).padStart(2, "0")}.jpg`), jpeg);
    }

    const ffmpeg = findFfmpeg();
    if (!ffmpeg) {
      console.error("capture: ffmpeg not found; the PNGs are written but demo.gif is not.");
    } else {
      const gif = join(ROOT, "assets/demo.gif");
      const result = spawnSync(
        ffmpeg,
        [
          "-y",
          "-hide_banner",
          "-loglevel",
          "error",
          "-framerate",
          "2",
          "-i",
          join(FRAMES, "%02d.jpg"),
          "-vf",
          "scale=1000:-1:flags=lanczos",
          "-loop",
          "0",
          gif,
        ],
        { encoding: "utf8" },
      );
      if (result.status !== 0) {
        console.error(`capture: ffmpeg failed: ${(result.stderr || "").trim()}`);
      } else {
        console.log(`  assets/demo.gif  ${Math.round(statSync(gif).size / 1024)} KB`);
      }
    }
    rmSync(FRAMES, { recursive: true, force: true });
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`capture: ${error.message}`);
  process.exit(1);
});
