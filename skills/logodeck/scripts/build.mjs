#!/usr/bin/env node
/**
 * logodeck build — one manifest plus two tight SVG masters, one complete deck.
 *
 * Output: themed and fixed SVG variants, mono variants, dark variants, favicon,
 * app icons, a typed React component, tokens, palette CSS and a standalone preview.
 *
 * No dependency. Playwright is imported only when --png or --ico is requested.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  applyOverrides,
  contrastReport,
  getPalette,
  paletteVars,
  resolveTokens,
  themeCss,
  validatePalette,
} from "./palette.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = resolve(HERE, "..");
const DEFAULT_PALETTES = resolve(SKILL_ROOT, "assets/palettes.json");

const DEFAULTS = {
  symbolHeight: 1,
  wordmarkHeight: 0.44,
  gap: 0.3,
  padding: 0.08,
  stackedGap: 0.22,
  appIconScale: 0.62,
  appIconRadius: 0.225,
  faviconScale: 0.68,
  maskableScale: 0.5,
};

function usage() {
  return `logodeck build

  node build.mjs <logo.json> [options]

Options
  --out <dir>              output directory (default: manifest.out or ./dist)
  --palette <name>         palette from assets/palettes.json
  --palettes <file>        alternative palettes file
  --theme key=#hex         override one token (repeatable); e.g. brand=#0F6B5C
  --allow-low-contrast     write the deck even if a palette pair fails
  --png 16,32,192,512      also render PNGs (needs playwright + chromium)
  --ico                    also write favicon.ico (implies --png 16,32,48)
  --quiet                  only print the output directory
  --help                   show this help
`;
}

function parseArgs(argv) {
  const args = { theme: {}, _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      args._.push(arg);
      continue;
    }
    const [key, inline] = arg.slice(2).split("=");
    if (key === "theme") {
      const pair = inline ?? argv[++i];
      if (!pair || !pair.includes("=")) throw new Error("--theme expects key=#hex");
      const [name, value] = pair.split("=");
      args.theme[name] = value;
      continue;
    }
    if (["help", "ico", "allow-low-contrast", "quiet"].includes(key)) {
      args[key] = true;
      continue;
    }
    if (inline !== undefined) {
      args[key] = inline;
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
      args[key] = argv[++i];
    } else {
      args[key] = true;
    }
  }
  return args;
}

function fmt(value) {
  const n = Math.round(value * 1000) / 1000;
  return String(Object.is(n, -0) ? 0 : n);
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`cannot read JSON ${file}: ${error.message}`);
  }
}

function readMaster(file) {
  if (!existsSync(file)) throw new Error(`master not found: ${file}`);
  const raw = readFileSync(file, "utf8");
  const match = raw.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/i);
  if (!match) throw new Error(`not an SVG document: ${file}`);
  const attrs = match[1];
  const viewBoxMatch = attrs.match(/viewBox\s*=\s*"([^"]+)"/i);
  if (!viewBoxMatch) throw new Error(`master has no viewBox: ${file}`);
  const viewBox = viewBoxMatch[1]
    .trim()
    .replace(/,/g, " ")
    .split(/\s+/)
    .map(Number);
  if (viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value))) {
    throw new Error(`invalid viewBox in ${file}`);
  }
  let inner = match[2]
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<title\b[\s\S]*?<\/title>/gi, "")
    .replace(/<desc\b[\s\S]*?<\/desc>/gi, "")
    .trim();
  const rootFill = attrs.match(/\bfill\s*=\s*"([^"]+)"/i)?.[1];
  if (rootFill && rootFill.toLowerCase() !== "none" && !/<g\b/i.test(inner.slice(0, 40))) {
    inner = `<g fill="${rootFill}">${inner}</g>`;
  }
  return {
    file,
    raw,
    inner,
    viewBox: { x: viewBox[0], y: viewBox[1], w: viewBox[2], h: viewBox[3] },
  };
}

const VAR_RE = /var\(\s*--ld-([a-z0-9-]+)\s*(?:,\s*([^)]+?))?\s*\)/g;

function freezeColors(fragment, tokens, where) {
  return fragment.replace(VAR_RE, (_match, key, fallback) => {
    if (Object.hasOwn(tokens, key)) return tokens[key];
    if (fallback && !fallback.includes("var(")) return fallback.trim();
    throw new Error(`${where}: token --ld-${key} has no palette value and no fallback`);
  });
}

function monoColors(fragment) {
  return fragment.replace(
    /\bfill\s*=\s*"(?!none\b|currentColor\b|url\()([^"]*)"/g,
    'fill="currentColor"',
  );
}

function prefixIds(fragment, prefix) {
  const ids = new Set();
  let out = fragment.replace(/\bid\s*=\s*"([^"]+)"/g, (_match, id) => {
    ids.add(id);
    return `id="${prefix}-${id}"`;
  });
  for (const id of ids) {
    out = out
      .replaceAll(`url(#${id})`, `url(#${prefix}-${id})`)
      .replaceAll(`href="#${id}"`, `href="#${prefix}-${id}"`);
  }
  return out;
}

function nested(viewBox, x, y, width, height, inner) {
  return `<svg x="${fmt(x)}" y="${fmt(y)}" width="${fmt(width)}" height="${fmt(height)}" viewBox="${fmt(
    viewBox.x,
  )} ${fmt(viewBox.y)} ${fmt(viewBox.w)} ${fmt(viewBox.h)}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
}

function doc(viewBox, inner, title, extra = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(viewBox.x)} ${fmt(
    viewBox.y,
  )} ${fmt(viewBox.w)} ${fmt(viewBox.h)}" role="img"${extra}>\n<title>${escapeXml(
    title,
  )}</title>\n${inner}\n</svg>\n`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function symbolBox(symbol, height) {
  const width = (height * symbol.viewBox.w) / symbol.viewBox.h;
  return { width, height };
}

function composeHorizontal(symbol, wordmark, geometry) {
  const sym = symbolBox(symbol, geometry.symbolHeight);
  const wmH = geometry.wordmarkHeight * geometry.symbolHeight;
  const wmW = (wmH * wordmark.viewBox.w) / wordmark.viewBox.h;
  const pad = geometry.padding * geometry.symbolHeight;
  const gap = geometry.gap * geometry.symbolHeight;
  const contentH = Math.max(sym.height, wmH);
  const width = pad * 2 + sym.width + gap + wmW;
  const height = pad * 2 + contentH;
  return {
    viewBox: { x: 0, y: 0, w: width, h: height },
    symbol: { x: pad, y: pad + (contentH - sym.height) / 2, w: sym.width, h: sym.height },
    wordmark: { x: pad + sym.width + gap, y: pad + (contentH - wmH) / 2, w: wmW, h: wmH },
  };
}

function composeStacked(symbol, wordmark, geometry) {
  const sym = symbolBox(symbol, geometry.symbolHeight);
  const wmH = geometry.wordmarkHeight * geometry.symbolHeight;
  const wmW = (wmH * wordmark.viewBox.w) / wordmark.viewBox.h;
  const pad = geometry.padding * geometry.symbolHeight;
  const stackedGap = geometry.stackedGap * geometry.symbolHeight;
  const contentW = Math.max(sym.width, wmW);
  const width = pad * 2 + contentW;
  const height = pad * 2 + sym.height + stackedGap + wmH;
  return {
    viewBox: { x: 0, y: 0, w: width, h: height },
    symbol: { x: pad + (contentW - sym.width) / 2, y: pad, w: sym.width, h: sym.height },
    wordmark: {
      x: pad + (contentW - wmW) / 2,
      y: pad + sym.height + stackedGap,
      w: wmW,
      h: wmH,
    },
  };
}

function makeComposition(kind, symbol, wordmark, geometry, symbolInner, wordmarkInner) {
  const layout =
    kind === "horizontal"
      ? composeHorizontal(symbol, wordmark, geometry)
      : composeStacked(symbol, wordmark, geometry);
  const inner = [
    nested(symbol.viewBox, layout.symbol.x, layout.symbol.y, layout.symbol.w, layout.symbol.h, symbolInner),
    nested(
      wordmark.viewBox,
      layout.wordmark.x,
      layout.wordmark.y,
      layout.wordmark.w,
      layout.wordmark.h,
      wordmarkInner,
    ),
  ].join("\n  ");
  return { layout, inner };
}

/* --------------------------------------------------------------- JSX */

const ATTR_MAP = {
  "fill-rule": "fillRule",
  "clip-rule": "clipRule",
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-miterlimit": "strokeMiterlimit",
  "stroke-dasharray": "strokeDasharray",
  "stroke-dashoffset": "strokeDashoffset",
  "fill-opacity": "fillOpacity",
  "stroke-opacity": "strokeOpacity",
  "stop-color": "stopColor",
  "stop-opacity": "stopOpacity",
  class: "className",
  "xlink:href": "href",
  "xml:space": "xmlSpace",
};

function styleToObject(style) {
  const entries = style
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf(":");
      const key = part
        .slice(0, index)
        .trim()
        .replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
      const value = part.slice(index + 1).trim();
      return `${JSON.stringify(key)}: ${JSON.stringify(value)}`;
    });
  return `{ ${entries.join(", ")} }`;
}

function toJsx(fragment) {
  return fragment
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g, (_match, tag, rawAttrs, selfClose) => {
      const attrs = rawAttrs.replace(
        /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g,
        (_attrMatch, name, value) => {
          if (name === "xmlns" || name.startsWith("xmlns:")) return "";
          if (name === "style") return ` style=${styleToObject(value)}`;
          const jsxName = ATTR_MAP[name] ?? name;
          return ` ${jsxName}="${value}"`;
        },
      );
      return `<${tag}${attrs}${selfClose ? " />" : ">"}`;
    })
    .replace(/<\/([a-zA-Z][\w:-]*)>/g, "</$1>")
    .trim();
}

function jsxConstant(name, fragment) {
  return `const ${name} = (\n  <>\n    ${toJsx(fragment).replace(/\n/g, "\n    ")}\n  </>\n);\n`;
}

/* --------------------------------------------------------------- TSX */

function makeTsx(context) {
  const { manifest, palette, variants, boxes } = context;
  const component = manifest.component || `${pascal(manifest.name)}Logo`;
  const light = palette.light;
  const dark = palette.dark;
  const boxLiteral = JSON.stringify(boxes, null, 2).replace(/"([^"]+)":/g, "$1:");
  const constants = [
    jsxConstant("IconColor", variants.icon.color),
    jsxConstant("IconMono", variants.icon.mono),
    jsxConstant("WordmarkColor", variants.wordmark.color),
    jsxConstant("WordmarkMono", variants.wordmark.mono),
    jsxConstant("HorizontalColor", variants.horizontal.color),
    jsxConstant("HorizontalMono", variants.horizontal.mono),
    jsxConstant("StackedColor", variants.stacked.color),
    jsxConstant("StackedMono", variants.stacked.mono),
  ].join("\n");

  return `/**
 * ${component} — generated by logodeck from ${manifest.slug}/logo.json.
 * Do not edit this file by hand: change the manifest or the masters and rebuild.
 * Palette: ${palette.name}. Theme tokens: --ld-bg, --ld-ink, --ld-brand, --ld-accent.
 * Requires react only. No Tailwind, no CSS import, no runtime dependency.
 */
import { useSyncExternalStore } from "react";
import type { CSSProperties, SVGProps } from "react";

const LIGHT = {
  bg: "${light.bg}",
  ink: "${light.ink}",
  brand: "${light.brand}",
  accent: "${light.accent}",
} as const;

const DARK = {
  bg: "${dark.bg}",
  ink: "${dark.ink}",
  brand: "${dark.brand}",
  accent: "${dark.accent}",
} as const;

type ${component}Style = CSSProperties & {
  [key: \`--ld-\${string}\`]: string | number | undefined;
};

const BOX = ${boxLiteral} as const;

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const observer = new MutationObserver(onChange);
  const targets = [document.documentElement, document.body].filter(
    (node): node is HTMLElement => Boolean(node),
  );
  for (const target of targets) {
    observer.observe(target, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
  }
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

function readTheme(node: Element | null) {
  if (!node) return null;
  const theme = (node as HTMLElement).dataset.theme;
  if (theme === "dark" || node.classList.contains("dark")) return "dark";
  if (theme === "light") return "light";
  return null;
}

function getSnapshot() {
  if (typeof window === "undefined") return false;
  const explicit = readTheme(document.documentElement) ?? readTheme(document.body);
  if (explicit) return explicit === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getServerSnapshot() {
  return false;
}

${constants}
const COLOR = {
  icon: IconColor,
  wordmark: WordmarkColor,
  horizontal: HorizontalColor,
  stacked: StackedColor,
};

const MONO = {
  icon: IconMono,
  wordmark: WordmarkMono,
  horizontal: HorizontalMono,
  stacked: StackedMono,
};

export type ${component}Props = Omit<SVGProps<SVGSVGElement>, "type" | "style"> & {
  variant?: "color" | "mono";
  type?: "icon" | "wordmark" | "horizontal" | "stacked";
  mode?: "auto" | "light" | "dark";
  title?: string;
  style?: ${component}Style;
};

export function ${component}({
  variant = "color",
  type = "horizontal",
  mode = "auto",
  title,
  height,
  width,
  style,
  className,
  ...props
}: ${component}Props) {
  const systemDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const dark = mode === "dark" || (mode === "auto" && systemDark);
  const palette = dark ? DARK : LIGHT;
  const content = variant === "mono" ? MONO[type] : COLOR[type];
  const box = BOX[type];
  const ratio = box.w / box.h;
  const decorative = !title;
  const theme: ${component}Style | undefined =
    variant === "mono"
      ? undefined
      : {
          "--ld-bg": palette.bg,
          "--ld-ink": palette.ink,
          "--ld-brand": palette.brand,
          "--ld-accent": palette.accent,
        };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={\`\${box.x} \${box.y} \${box.w} \${box.h}\`}
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      height={height ?? "1em"}
      width={width ?? \`\${Math.round(ratio * 1000) / 1000}em\`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ ...theme, ...style }}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {content}
    </svg>
  );
}

export default ${component};
`;
}

function pascal(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/* --------------------------------------------------------------- preview */

function previewHtml(context) {
  const { manifest, palette, files, boxes } = context;
  const inline = (name) => files[name];
  const scaled = (name, height) =>
    inline(name).replace("<svg ", `<svg style="height:${height}px;width:auto;max-width:100%" `);
  const rows = contrastReport(palette)
    .map(
      (row) =>
        `<tr><td>${row.mode}</td><td>${row.pair}</td><td>${row.ratio}:1</td><td>${
          row.pass ? "pass" : "fail"
        }</td></tr>`,
    )
    .join("");
  const fileList = context.written
    .map((file) => `<li><code>${escapeXml(file)}</code></li>`)
    .join("");
  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeXml(manifest.title)} — logodeck preview</title>
<style>
  :root {
${Object.entries(paletteVars(palette))
  .map(([key, value]) => `    ${key}: ${value};`)
  .join("\n")}
    --ld-surface: #ffffff;
    --ld-line: rgba(20, 20, 20, 0.12);
    --ld-muted: rgba(20, 20, 20, 0.62);
    color-scheme: light;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  }
  html[data-theme="dark"] {
    --ld-bg: var(--ld-bg-dark);
    --ld-ink: var(--ld-ink-dark);
    --ld-brand: var(--ld-brand-dark);
    --ld-accent: var(--ld-accent-dark);
    --ld-surface: #1b2220;
    --ld-line: rgba(255, 255, 255, 0.14);
    --ld-muted: rgba(255, 255, 255, 0.64);
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--ld-bg);
    color: var(--ld-ink);
    transition: background 160ms ease, color 160ms ease;
  }
  .wrap { width: min(1180px, calc(100% - 40px)); margin: 0 auto; padding: 40px 0 72px; }
  header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
  .brandline { min-height: 72px; }
  .tagline { margin: 12px 0 0; color: var(--ld-muted); max-width: 46ch; }
  .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  button, input[type="color"] { font: inherit; }
  button {
    border: 1px solid var(--ld-line); background: var(--ld-surface); color: var(--ld-ink);
    border-radius: 999px; padding: 8px 14px; cursor: pointer;
  }
  .grid { display: grid; gap: 16px; }
  .cards { grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
  .card {
    border: 1px solid var(--ld-line); border-radius: 20px; background: var(--ld-surface);
    padding: 20px; display: flex; flex-direction: column; gap: 18px; min-height: 190px;
  }
  .card h3 { margin: 0; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ld-muted); }
  .center { flex: 1; display: grid; place-items: center; }
  .card svg, .brandline svg { display: block; max-width: 100%; }
  .darkcard { background: #101a16; color: #eaf2ec; border-color: transparent; }
  html[data-theme="dark"] .darkcard { background: #0b1210; }
  .size-row { display: flex; align-items: flex-end; gap: 22px; flex-wrap: wrap; }
  .size-row figure { margin: 0; text-align: center; color: var(--ld-muted); font-size: 12px; }
  .size-row svg { display: block; margin: 0 auto 6px; }
  .swatches { display: flex; gap: 10px; flex-wrap: wrap; }
  .swatch { border: 1px solid var(--ld-line); border-radius: 14px; overflow: hidden; min-width: 112px; }
  .chip { height: 58px; }
  .swatch span { display: block; padding: 8px 10px; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  h2 { margin: 40px 0 14px; font-size: 18px; }
  .split { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 16px; }
  @media (max-width: 820px) { .split { grid-template-columns: 1fr; } header { flex-direction: column; } }
  .code {
    margin: 0; padding: 18px; border-radius: 16px; background: #101a16; color: #eaf2ec;
    overflow: auto; font: 12px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--ld-line); }
  th { color: var(--ld-muted); font-weight: 600; }
  .files { columns: 2; gap: 24px; font-size: 13px; }
  .files li { margin: 0 0 6px; break-inside: avoid; }
  .tab { display: flex; align-items: center; gap: 10px; border: 1px solid var(--ld-line); border-radius: 12px 12px 0 0; padding: 10px 14px; background: var(--ld-surface); width: max-content; }
  .tab .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ld-brand); }
  .muted { color: var(--ld-muted); }
  footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid var(--ld-line); color: var(--ld-muted); font-size: 13px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div>
      <div class="brandline">${scaled("lockup-horizontal", 76)}</div>
      <p class="tagline">${escapeXml(manifest.title)}. One manifest, one geometry, every file.</p>
    </div>
    <div class="toolbar">
      <button type="button" id="theme">Toggle dark</button>
      <button type="button" id="reset">Reset colours</button>
    </div>
  </header>

  <h2>Palette</h2>
  <div class="split">
    <div class="card">
      <div class="swatches">
        <label class="swatch"><div class="chip" style="background:${palette.light.brand}"></div><span>brand ${palette.light.brand}</span></label>
        <label class="swatch"><div class="chip" style="background:${palette.light.accent}"></div><span>accent ${palette.light.accent}</span></label>
        <label class="swatch"><div class="chip" style="background:${palette.light.ink}"></div><span>ink ${palette.light.ink}</span></label>
        <label class="swatch"><div class="chip" style="background:${palette.light.bg}; border-bottom:1px solid var(--ld-line)"></div><span>bg ${palette.light.bg}</span></label>
      </div>
      <div class="toolbar">
        <label>Brand <input type="color" id="c-brand" value="${palette.light.brand}" /></label>
        <label>Accent <input type="color" id="c-accent" value="${palette.light.accent}" /></label>
        <label>Ink <input type="color" id="c-ink" value="${palette.light.ink}" /></label>
        <label>Background <input type="color" id="c-bg" value="${palette.light.bg}" /></label>
      </div>
      <p class="muted">The colour inputs rewrite the CSS custom properties on <code>:root</code>. Every themed SVG and the React component follow.</p>
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Mode</th><th>Pair</th><th>Ratio</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>

  <h2>Family</h2>
  <div class="grid cards">
    <div class="card"><h3>Symbol</h3><div class="center">${scaled("symbol", 104)}</div></div>
    <div class="card"><h3>Symbol mono</h3><div class="center">${scaled("symbol-mono", 104)}</div></div>
    <div class="card darkcard"><h3 style="color:rgba(255,255,255,.62)">Symbol dark</h3><div class="center">${scaled("symbol-dark", 104)}</div></div>
    <div class="card"><h3>Wordmark</h3><div class="center">${scaled("wordmark", 56)}</div></div>
    <div class="card darkcard"><h3 style="color:rgba(255,255,255,.62)">Wordmark dark</h3><div class="center">${scaled("wordmark-dark", 56)}</div></div>
    <div class="card"><h3>Lockup horizontal</h3><div class="center">${scaled("lockup-horizontal", 72)}</div></div>
    <div class="card"><h3>Lockup stacked</h3><div class="center">${scaled("lockup-stacked", 78)}</div></div>
    <div class="card"><h3>Favicon</h3><div class="center">${scaled("favicon", 64)}</div></div>
    <div class="card"><h3>App icon</h3><div class="center">${scaled("app-icon", 96)}</div></div>
    <div class="card"><h3>Maskable</h3><div class="center">${scaled("app-icon-maskable", 96)}</div></div>
  </div>

  <h2>Small sizes</h2>
  <div class="card">
    <div class="size-row">
      ${[64, 40, 24, 16]
        .map((size) => {
          const scaled = inline("symbol").replace(
            /<svg /,
            `<svg style="width:${size}px;height:${size}px" `,
          );
          return `<figure>${scaled}<figcaption>${size}px</figcaption></figure>`;
        })
        .join("\n      ")}
      <div class="tab"><span class="dot"></span><span>${escapeXml(manifest.name)}</span></div>
    </div>
  </div>

  <h2>One line</h2>
  <div class="split">
    <div class="card">
      <pre class="code">&lt;svg style="--ld-brand: ${palette.light.brand}; --ld-accent: ${palette.light.accent}"&gt;
  …
&lt;/svg&gt;

&lt;${manifest.component || pascal(manifest.name) + "Logo"} type="horizontal" /&gt;</pre>
    </div>
    <div class="card">
      <div class="center">${scaled("lockup-stacked", 78)}</div>
      <div class="center">${scaled("app-icon", 96)}</div>
    </div>
  </div>

  <h2>Files</h2>
  <ul class="files">${fileList}</ul>

  <footer>
    Built by logodeck from one manifest and two masters. ${boxes.horizontal.w} × ${boxes.horizontal.h}
    horizontal ratio. No raster, no filter, no <code>&lt;text&gt;</code> in any logo file.
  </footer>
</div>
<script>
  const root = document.documentElement;
  const keys = ["brand", "accent", "ink", "bg"];
  const state = {
    light: {
      brand: ${JSON.stringify(palette.light.brand)},
      accent: ${JSON.stringify(palette.light.accent)},
      ink: ${JSON.stringify(palette.light.ink)},
      bg: ${JSON.stringify(palette.light.bg)},
    },
    dark: {
      brand: ${JSON.stringify(palette.dark.brand)},
      accent: ${JSON.stringify(palette.dark.accent)},
      ink: ${JSON.stringify(palette.dark.ink)},
      bg: ${JSON.stringify(palette.dark.bg)},
    },
  };
  function activeMode() {
    return root.dataset.theme === "dark" ? "dark" : "light";
  }
  function varName(key, mode) {
    return mode === "dark" ? "--ld-" + key + "-dark" : "--ld-" + key;
  }
  function syncInputs() {
    const mode = activeMode();
    for (const key of keys) {
      const input = document.getElementById("c-" + key);
      if (input) input.value = state[mode][key];
    }
  }
  function apply(key, value) {
    const mode = activeMode();
    state[mode][key] = value;
    root.style.setProperty(varName(key, mode), value);
  }
  for (const key of keys) {
    document.getElementById("c-" + key).addEventListener("input", (event) => {
      apply(key, event.target.value);
    });
  }
  document.getElementById("theme").addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    syncInputs();
  });
  document.getElementById("reset").addEventListener("click", () => {
    for (const mode of ["light", "dark"]) {
      for (const key of keys) root.style.removeProperty(varName(key, mode));
    }
    state.light = {
      brand: ${JSON.stringify(palette.light.brand)},
      accent: ${JSON.stringify(palette.light.accent)},
      ink: ${JSON.stringify(palette.light.ink)},
      bg: ${JSON.stringify(palette.light.bg)},
    };
    state.dark = {
      brand: ${JSON.stringify(palette.dark.brand)},
      accent: ${JSON.stringify(palette.dark.accent)},
      ink: ${JSON.stringify(palette.dark.ink)},
      bg: ${JSON.stringify(palette.dark.bg)},
    };
    syncInputs();
  });
</script>
</body>
</html>
`;
}

/* --------------------------------------------------------------- raster */

function icoFromPngs(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const entries = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  pngs.forEach(({ size, data }, index) => {
    const at = index * 16;
    entries.writeUInt8(size >= 256 ? 0 : size, at);
    entries.writeUInt8(size >= 256 ? 0 : size, at + 1);
    entries.writeUInt8(0, at + 2);
    entries.writeUInt8(0, at + 3);
    entries.writeUInt16LE(1, at + 4);
    entries.writeUInt16LE(32, at + 6);
    entries.writeUInt32LE(data.length, at + 8);
    entries.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, entries, ...pngs.map((entry) => entry.data)]);
}

async function renderRaster(outDir, slug, sizes) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error(
      "PNG export needs playwright. Install it and a Chromium build, then rerun with --png.",
    );
  }
  const written = [];
  const browser = await chromium.launch();
  try {
    for (const [name, file] of [
      ["symbol", `${slug}-symbol.svg`],
      ["favicon", `${slug}-favicon.svg`],
      ["app-icon", `${slug}-app-icon.svg`],
    ]) {
      for (const size of sizes) {
        const page = await browser.newPage({
          viewport: { width: size, height: size },
          deviceScaleFactor: 1,
        });
        await page.goto(pathToFileURL(resolve(outDir, file)).href);
        await page.screenshot({
          path: join(outDir, `${slug}-${name}-${size}.png`),
          omitBackground: true,
        });
        written.push(`${slug}-${name}-${size}.png`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  return written;
}

/* --------------------------------------------------------------- main */

export async function build(manifestFile, options = {}) {
  const manifestPath = resolve(manifestFile);
  const manifestDir = dirname(manifestPath);
  const manifest = readJson(manifestPath);
  for (const key of ["name", "slug"]) {
    if (!manifest[key]) throw new Error(`manifest is missing "${key}"`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.slug)) {
    throw new Error(`slug must be lowercase letters, digits and hyphens: "${manifest.slug}"`);
  }

  const palettesFile = resolve(options.palettes ?? DEFAULT_PALETTES);
  const paletteName = options.palette ?? manifest.palette;
  if (!paletteName) throw new Error("choose a palette in the manifest or with --palette");
  let palette = getPalette(paletteName, palettesFile);
  if (options.theme && Object.keys(options.theme).length) {
    palette = applyOverrides(palette, options.theme);
  }
  const paletteResult = validatePalette(palette);
  if (paletteResult.errors.length && !options.allowLowContrast) {
    throw new Error(
      `palette ${palette.name} fails the contrast floor:\n  ${paletteResult.errors.join("\n  ")}`,
    );
  }

  const geometry = { ...DEFAULTS, ...(manifest.geometry ?? {}) };
  for (const [key, value] of Object.entries(geometry)) {
    const numeric = Number(value);
    const floor = key === "appIconRadius" ? 0 : 0.01;
    if (!Number.isFinite(numeric) || numeric < floor) {
      throw new Error(`geometry.${key} must be a number >= ${floor} (got ${value})`);
    }
  }
  const files = manifest.files ?? {};
  const symbol = readMaster(resolve(manifestDir, files.symbol ?? "symbol.svg"));
  const wordmark = readMaster(resolve(manifestDir, files.wordmark ?? "wordmark.svg"));
  const symbolSmall = files.symbolSmall
    ? readMaster(resolve(manifestDir, files.symbolSmall))
    : symbol;

  const combination = manifest.slug;
  const titleOf = (label) => `${manifest.title ?? manifest.name} — ${label}`;
  const lightTokens = resolveTokens(palette, "light");
  const freeze = (fragment, mode) =>
    freezeColors(fragment, resolveTokens(palette, mode), `${manifest.slug} (${mode})`);
  const setFallbacks = (fragment) =>
    fragment.replace(VAR_RE, (_match, key) => {
      if (!Object.hasOwn(lightTokens, key)) {
        throw new Error(`${manifest.slug}: unknown token --ld-${key}`);
      }
      return `var(--ld-${key}, ${lightTokens[key]})`;
    });
  const prepare = (fragment, mode, prefix) => {
    let out = fragment;
    if (mode === "dark") out = freeze(out, "dark");
    else if (mode === "themed") out = setFallbacks(out);
    return prefixIds(out, prefix);
  };

  const horizontal = makeComposition(
    "horizontal",
    symbol,
    wordmark,
    geometry,
    symbol.inner,
    wordmark.inner,
  );
  const stacked = makeComposition(
    "stacked",
    symbol,
    wordmark,
    geometry,
    symbol.inner,
    wordmark.inner,
  );

  const themed = {
    symbol: symbol.inner,
    wordmark: wordmark.inner,
    horizontal: horizontal.inner,
    stacked: stacked.inner,
  };

  const variants = {
    icon: { color: themed.symbol, mono: monoColors(symbol.inner) },
    wordmark: { color: themed.wordmark, mono: monoColors(wordmark.inner) },
    horizontal: { color: themed.horizontal, mono: monoColors(horizontal.inner) },
    stacked: { color: themed.stacked, mono: monoColors(stacked.inner) },
  };

  const roundBox = (box) => ({
    x: Number(fmt(box.x)),
    y: Number(fmt(box.y)),
    w: Number(fmt(box.w)),
    h: Number(fmt(box.h)),
  });
  const boxes = {
    icon: roundBox(symbol.viewBox),
    wordmark: roundBox(wordmark.viewBox),
    horizontal: roundBox(horizontal.layout.viewBox),
    stacked: roundBox(stacked.layout.viewBox),
  };

  const svg = {};
  const add = (key, viewBox, inner, title) => {
    svg[key] = doc(viewBox, inner, title, ` data-ld="${combination}-${key}"`);
  };

  add("symbol", symbol.viewBox, prepare(symbol.inner, "themed", `${combination}-symbol`), titleOf("symbol"));
  add(
    "symbol-mono",
    symbol.viewBox,
    prepare(monoColors(symbol.inner), "themed", `${combination}-symbol-mono`),
    titleOf("mono symbol"),
  );
  add(
    "symbol-dark",
    symbol.viewBox,
    prepare(symbol.inner, "dark", `${combination}-symbol-dark`),
    titleOf("symbol, dark background"),
  );
  add("wordmark", wordmark.viewBox, prepare(wordmark.inner, "themed", `${combination}-wordmark`), titleOf("wordmark"));
  add(
    "wordmark-mono",
    wordmark.viewBox,
    prepare(monoColors(wordmark.inner), "themed", `${combination}-wordmark-mono`),
    titleOf("mono wordmark"),
  );
  add(
    "wordmark-dark",
    wordmark.viewBox,
    prepare(wordmark.inner, "dark", `${combination}-wordmark-dark`),
    titleOf("wordmark, dark background"),
  );
  add(
    "lockup-horizontal",
    horizontal.layout.viewBox,
    prepare(horizontal.inner, "themed", `${combination}-lockup-horizontal`),
    titleOf("horizontal lockup"),
  );
  add(
    "lockup-horizontal-mono",
    horizontal.layout.viewBox,
    prepare(monoColors(horizontal.inner), "themed", `${combination}-lockup-horizontal-mono`),
    titleOf("mono horizontal lockup"),
  );
  add(
    "lockup-horizontal-dark",
    horizontal.layout.viewBox,
    prepare(horizontal.inner, "dark", `${combination}-lockup-horizontal-dark`),
    titleOf("horizontal lockup, dark background"),
  );
  add(
    "lockup-stacked",
    stacked.layout.viewBox,
    prepare(stacked.inner, "themed", `${combination}-lockup-stacked`),
    titleOf("stacked lockup"),
  );
  add(
    "lockup-stacked-mono",
    stacked.layout.viewBox,
    prepare(monoColors(stacked.inner), "themed", `${combination}-lockup-stacked-mono`),
    titleOf("mono stacked lockup"),
  );
  add(
    "lockup-stacked-dark",
    stacked.layout.viewBox,
    prepare(stacked.inner, "dark", `${combination}-lockup-stacked-dark`),
    titleOf("stacked lockup, dark background"),
  );

  const iconTile = (master, size, radius, markScale, markTokens, file) => {
    const scale = size * markScale;
    const ratio = master.viewBox.w / master.viewBox.h;
    const width = scale * ratio;
    const x = (size - width) / 2;
    const y = (size - scale) / 2;
    const tileFill = markTokens.tile;
    const markInner = freezeColors(
      master.inner,
      { ...markTokens.mark },
      `${manifest.slug} (${file})`,
    );
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" data-ld="${combination}-${file}">\n<title>${escapeXml(
      titleOf(file),
    )}</title>\n<rect width="${size}" height="${size}" rx="${fmt(radius)}" fill="${tileFill}"/>\n${nested(
      master.viewBox,
      x,
      y,
      width,
      scale,
      markInner,
    )}\n</svg>\n`;
  };

  const tileMark = {
    brand: lightTokens.bg,
    accent: lightTokens.bg,
    ink: lightTokens.bg,
    bg: lightTokens.bg,
  };
  svg.favicon = iconTile(
    symbolSmall,
    64,
    64 * geometry.appIconRadius,
    geometry.faviconScale,
    { tile: lightTokens.brand, mark: tileMark },
    "favicon",
  );
  svg["app-icon"] = iconTile(
    symbol,
    512,
    512 * geometry.appIconRadius,
    geometry.appIconScale,
    { tile: lightTokens.brand, mark: tileMark },
    "app-icon",
  );
  svg["app-icon-maskable"] = iconTile(
    symbol,
    512,
    0,
    geometry.maskableScale,
    { tile: lightTokens.brand, mark: tileMark },
    "app-icon-maskable",
  );

  const outDir = options.out
    ? resolve(options.out)
    : manifest.out
      ? resolve(manifestDir, manifest.out)
      : resolve(manifestDir, "dist");
  mkdirSync(outDir, { recursive: true });

  const written = [];
  for (const [key, content] of Object.entries(svg)) {
    const file = `${manifest.slug}-${key}.svg`;
    writeFileSync(join(outDir, file), content, "utf8");
    written.push(file);
  }

  const tsx = makeTsx({ manifest, palette, variants, boxes });
  writeFileSync(join(outDir, `${manifest.slug}.tsx`), tsx, "utf8");
  written.push(`${manifest.slug}.tsx`);

  const tokens = {
    name: palette.name,
    label: palette.label,
    note: palette.note,
    light: palette.light,
    dark: palette.dark,
    contrast: contrastReport(palette),
    generatedBy: "logodeck",
  };
  writeFileSync(join(outDir, `${manifest.slug}-tokens.json`), `${JSON.stringify(tokens, null, 2)}\n`, "utf8");
  written.push(`${manifest.slug}-tokens.json`);

  writeFileSync(join(outDir, `${manifest.slug}-palette.css`), themeCss(palette), "utf8");
  written.push(`${manifest.slug}-palette.css`);

  const preview = previewHtml({
    manifest,
    palette,
    boxes,
    files: svg,
    written,
  });
  writeFileSync(join(outDir, `${manifest.slug}-preview.html`), preview, "utf8");
  written.push(`${manifest.slug}-preview.html`);

  if (options.png || options.ico) {
    const defaultSizes = options.ico ? "16,32,48" : "16,32,192,512";
    const raw =
      options.png === true ? defaultSizes : options.png ? String(options.png) : defaultSizes;
    const requested = raw
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);
    const sizes = options.ico && !requested.includes(48) ? [...requested, 48] : requested;
    written.push(...(await renderRaster(outDir, manifest.slug, sizes)));
    if (options.ico) {
      const iconSizes = [16, 32, 48].filter((size) => sizes.includes(size));
      const pngs = iconSizes.map((size) => ({
        size,
        data: readFileSync(join(outDir, `${manifest.slug}-favicon-${size}.png`)),
      }));
      if (pngs.length) {
        writeFileSync(join(outDir, "favicon.ico"), icoFromPngs(pngs));
        written.push("favicon.ico");
      }
    }
  }

  return {
    manifest,
    palette,
    paletteResult,
    outDir,
    written,
    svg,
    geometry,
    boxes,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length === 0) {
    process.stdout.write(usage());
    process.exitCode = args.help ? 0 : 2;
    return;
  }
  const result = await build(args._[0], {
    out: args.out,
    palette: args.palette,
    palettes: args.palettes,
    theme: args.theme,
    allowLowContrast: args["allow-low-contrast"],
    png: args.png,
    ico: args.ico,
  });
  if (!args.quiet) {
    console.log(`\n${result.manifest.name} — ${result.palette.name}`);
    for (const file of result.written) console.log(`  ${file}`);
    const rows = contrastReport(result.palette);
    const lowest = rows.reduce((min, row) => (row.ratio < min.ratio ? row : min), rows[0]);
    console.log(
      `\n  ${result.written.length} files · lowest contrast ${lowest.ratio}:1 (${lowest.mode} ${lowest.pair})`,
    );
    for (const warning of result.paletteResult.warnings) console.warn(`  warning: ${warning}`);
  }
  console.log(`\n  → ${result.outDir}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`logodeck build: ${error.message}`);
    process.exit(1);
  });
}
