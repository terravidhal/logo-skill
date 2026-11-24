#!/usr/bin/env node
/**
 * Capture the deck with Playwright/Chromium.
 *
 *   npm install --no-save playwright
 *   npx playwright install chromium
 *   npm run capture
 *
 * Writes PNGs into assets/readme/. The captures are proof for the README; they are never
 * part of the skill runtime and the build works without them.
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets/readme");

const targets = [
  {
    name: "deck",
    file: join(ROOT, "examples/loam/dist/loam-preview.html"),
  },
  {
    name: "site",
    file: join(ROOT, "examples/site/index.html"),
  },
];

const viewports = [
  { label: "1440", width: 1440, height: 1000 },
  { label: "390", width: 390, height: 900 },
];

const themes = ["light", "dark"];

async function main() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error(
      "capture: playwright is not installed.\n" +
        "  npm install --no-save playwright\n" +
        "  npx playwright install chromium",
    );
    process.exit(1);
  }

  for (const target of targets) {
    if (!existsSync(target.file)) {
      console.error(`capture: missing ${target.file}. Run npm run build:example first.`);
      process.exit(1);
    }
  }

  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const target of targets) {
      for (const viewport of viewports) {
        for (const theme of themes) {
          const page = await browser.newPage({
            viewport: { width: viewport.width, height: viewport.height },
            deviceScaleFactor: 1,
            colorScheme: theme,
          });
          await page.goto(pathToFileURL(target.file).href, { waitUntil: "load" });
          await page.evaluate((nextTheme) => {
            document.documentElement.dataset.theme = nextTheme;
          }, theme);
          await page.waitForTimeout(120);
          const file = join(OUT, `${target.name}-${viewport.label}-${theme}.png`);
          await page.screenshot({ path: file, fullPage: true });
          console.log(`  ${file}`);
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`\nCaptures written to ${OUT}`);
}

main().catch((error) => {
  console.error(`capture: ${error.message}`);
  process.exit(1);
});
