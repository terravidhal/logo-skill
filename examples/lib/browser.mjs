/**
 * A very small Chromium driver over the DevTools protocol.
 *
 * The README captures and the demo GIF need a browser, but the skill itself must not
 * depend on Playwright. This module launches the Chromium build that Playwright already
 * downloaded (or CHROME_BIN), then drives it with the WebSocket client built into Node.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const CANDIDATES = [
  process.env.CHROME_BIN,
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/opt/google/chrome/chrome",
].filter(Boolean);

function findInPlaywrightCache() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), ".cache", "ms-playwright");
  if (!existsSync(base)) return null;
  const folders = readdirSync(base)
    .filter((name) => name.startsWith("chromium-"))
    .sort()
    .reverse();
  for (const folder of folders) {
    for (const relative of [
      "chrome-linux64/chrome",
      "chrome-linux/chrome",
      "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
    ]) {
      const file = join(base, folder, relative);
      if (existsSync(file)) return file;
    }
  }
  return null;
}

export function findChrome() {
  const found = CANDIDATES.find((file) => existsSync(file)) ?? findInPlaywrightCache();
  if (!found) {
    throw new Error("no Chromium found. Set CHROME_BIN or install Chrome.");
  }
  return found;
}

class Connection {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.closed = false;
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", () => resolve());
      this.ws.addEventListener("error", (event) => reject(new Error(String(event.message ?? event))));
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`${message.error.message}`));
        else resolve(message.result);
      }
    });
    this.ws.addEventListener("close", () => {
      this.closed = true;
      for (const { reject } of this.pending.values()) reject(new Error("connection closed"));
      this.pending.clear();
    });
  }

  send(method, params = {}, sessionId) {
    if (this.closed) return Promise.reject(new Error("connection closed"));
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // already closed
    }
  }
}

async function waitForEndpoint(port, child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Chromium exited with ${child.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return response.json();
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error("Chromium did not expose the DevTools endpoint");
}

export async function launch() {
  const chrome = findChrome();
  const profile = mkdtempSync(join(tmpdir(), "logodeck-chrome-"));
  const port = 9400 + Math.floor(Math.random() * 400);
  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--allow-file-access-from-files",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let version;
  try {
    version = await waitForEndpoint(port, child);
  } catch (error) {
    child.kill("SIGKILL");
    rmSync(profile, { recursive: true, force: true });
    throw error;
  }

  const connection = new Connection(version.webSocketDebuggerUrl);
  await connection.ready;
  const { targetId } = await connection.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await connection.send("Target.attachToTarget", { targetId, flatten: true });
  await connection.send("Page.enable", {}, sessionId);
  await connection.send("Runtime.enable", {}, sessionId);

  async function evaluate(expression) {
    const result = await connection.send(
      "Runtime.evaluate",
      { expression, awaitPromise: true, returnByValue: true },
      sessionId,
    );
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text ?? "page evaluation failed");
    }
    return result.result?.value;
  }

  async function prepare({ width, height, theme = "light", mobile }) {
    await connection.send(
      "Emulation.setDeviceMetricsOverride",
      {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: mobile ?? width < 500,
        screenWidth: width,
        screenHeight: height,
      },
      sessionId,
    );
    await connection.send(
      "Emulation.setEmulatedMedia",
      { features: [{ name: "prefers-color-scheme", value: theme }] },
      sessionId,
    );
  }

  async function open(url, options) {
    await prepare(options);
    await connection.send("Page.navigate", { url }, sessionId);
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const state = await evaluate("document.readyState");
      if (state === "complete") break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await evaluate("document.fonts.ready.then(() => true)");
    if (options.theme) {
      await evaluate(`document.documentElement.dataset.theme = ${JSON.stringify(options.theme)}; true`);
    }
    if (options.script) await evaluate(options.script);
    await new Promise((resolve) => setTimeout(resolve, options.settle ?? 180));
  }

  async function screenshot({ fullPage = true, format = "png", quality } = {}) {
    let clip;
    if (fullPage) {
      const metrics = await connection.send("Page.getLayoutMetrics", {}, sessionId);
      const size = metrics.cssContentSize ?? metrics.contentSize;
      clip = { x: 0, y: 0, width: Math.ceil(size.width), height: Math.ceil(size.height), scale: 1 };
    }
    const result = await connection.send(
      "Page.captureScreenshot",
      {
        format,
        ...(format === "jpeg" && quality ? { quality } : {}),
        fromSurface: true,
        captureBeyondViewport: fullPage,
        ...(clip ? { clip } : {}),
      },
      sessionId,
    );
    return Buffer.from(result.data, "base64");
  }

  async function close() {
    connection.close();
    child.kill("SIGKILL");
    rmSync(profile, { recursive: true, force: true });
  }

  return { open, prepare, evaluate, screenshot, close, chrome };
}

export function readPng(file) {
  return readFileSync(file);
}
