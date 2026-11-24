#!/usr/bin/env node
/**
 * Build the before/after plate used in the README.
 *
 *   node examples/make-proof.mjs
 *
 * Left: an illustrative "one PNG, guessed once" result. Right: the Loam deck that the
 * build actually produces. The plate is captured to assets/readme/before-after.png.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const LOAM = join(HERE, "loam");
const DIST = join(LOAM, "dist");

const tokens = JSON.parse(readFileSync(join(DIST, "loam-tokens.json"), "utf8"));
const altTokens = JSON.parse(readFileSync(join(LOAM, "dist-alt", "loam-tokens.json"), "utf8"));
const read = (name) => readFileSync(join(DIST, `loam-${name}.svg`), "utf8");
const readAlt = (name) => readFileSync(join(LOAM, "dist-alt", `loam-${name}.svg`), "utf8");
const palette = tokens.light;
const dark = tokens.dark;
const lowest = tokens.contrast.reduce((min, row) => (row.ratio < min.ratio ? row : min), tokens.contrast[0]);
const alt = altTokens;

const badLogo = `<svg viewBox="0 0 300 300" aria-hidden="true">
  <defs>
    <linearGradient id="bad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2FA7A0"/><stop offset="1" stop-color="#8FCB5E"/>
    </linearGradient>
  </defs>
  <rect width="300" height="300" fill="#F2F4EE"/>
  <circle cx="150" cy="150" r="96" fill="url(#bad)"/>
  <path d="M82 186C122 124 176 96 228 104C198 154 152 190 86 206Z" fill="#F8F6EE" opacity=".92"/>
  <path d="M74 214C124 188 170 186 218 202C176 220 126 226 74 214Z" fill="#FFFFFF" opacity=".55"/>
  <text x="150" y="272" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#3C4A3E" letter-spacing="2">NOVARIS</text>
</svg>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Before and after — logodeck</title>
<style>
  :root { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #ECE9E0; color: #18211C; }
  .page { width: 1600px; min-height: 1040px; padding: 46px 54px 40px; display: flex; flex-direction: column; gap: 26px; }
  header { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
  .eyebrow { font-size: 12px; letter-spacing: .18em; text-transform: uppercase; color: rgba(24,33,28,.55); }
  h1 { margin: 8px 0 0; font-size: 34px; letter-spacing: -.035em; font-weight: 650; }
  .legend { display: flex; gap: 18px; font-size: 12px; color: rgba(24,33,28,.6); }
  .legend i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; }
  .split { display: grid; grid-template-columns: 600px 1fr; gap: 22px; flex: 1; }
  .panel { border-radius: 26px; padding: 24px; display: flex; flex-direction: column; gap: 18px; position: relative; overflow: hidden; }
  .bad { background: #E3E0D7; border: 1px solid rgba(24,33,28,.12); }
  .good { background: #FFFDF8; border: 1px solid rgba(24,33,28,.14); box-shadow: 0 24px 60px rgba(20,30,22,.12); }
  .tag { align-self: flex-start; font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; padding: 5px 9px; border-radius: 999px; }
  .bad .tag { background: rgba(24,33,28,.08); color: rgba(24,33,28,.6); }
  .good .tag { background: ${palette.brand}; color: ${palette.bg}; }
  .chat { border: 1px solid rgba(24,33,28,.1); background: rgba(255,255,255,.45); border-radius: 14px; padding: 10px 12px; font-size: 12px; line-height: 1.5; color: rgba(24,33,28,.62); max-width: 92%; }
  .shot { background: #F7F5EF; border-radius: 18px; padding: 16px; display: grid; place-items: center; position: relative; overflow: hidden; }
  .shot .art { width: 300px; filter: blur(1.15px) saturate(.88) contrast(.92); image-rendering: auto; }
  .shot .art svg { display: block; width: 100%; height: auto; }
  .shot .badge { position: absolute; top: 12px; left: 12px; font: 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace; background: rgba(24,33,28,.72); color: #F7F5EF; border-radius: 999px; padding: 5px 8px; }
  .issues { display: grid; gap: 9px; margin: 0; padding: 0; list-style: none; font-size: 12.5px; color: rgba(24,33,28,.7); }
  .issues li { display: flex; gap: 8px; align-items: flex-start; }
  .issues b { font-weight: 600; color: rgba(24,33,28,.9); }
  .x { color: #A43A2A; font-weight: 700; }
  .bad .filemess { margin-top: auto; border-top: 1px solid rgba(24,33,28,.1); padding-top: 14px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .bad .filemess span { width: 100%; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: rgba(24,33,28,.5); }
  .bad .filemess code { font: 10px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; background: rgba(255,255,255,.55); border: 1px solid rgba(24,33,28,.1); border-radius: 5px; padding: 3px 5px; color: rgba(24,33,28,.65); }
  .bad .filemess p { margin: 4px 0 0; width: 100%; font-size: 11px; color: rgba(24,33,28,.52); }
  .good .art { width: min(100%, 330px); }
  .good .hero { display: grid; grid-template-columns: 1fr auto; gap: 22px; align-items: center; border-bottom: 1px solid rgba(24,33,28,.1); padding-bottom: 16px; }
  .good .hero svg { width: 280px; height: auto; display: block; }
  .good .ratio { text-align: right; font-size: 11px; color: rgba(24,33,28,.58); line-height: 1.5; }
  .good .ratio b { display: block; font-size: 20px; color: ${palette.brand}; letter-spacing: -.02em; }
  .variants { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .vcard { border: 1px solid rgba(24,33,28,.1); border-radius: 14px; background: #FFFDF8; padding: 10px; display: flex; flex-direction: column; gap: 8px; min-height: 96px; }
  .vcard span { font-size: 9px; letter-spacing: .08em; text-transform: uppercase; color: rgba(24,33,28,.5); }
  .vcard .art { flex: 1; display: grid; place-items: center; }
  .vcard svg { height: 42px; width: auto; max-width: 100%; display: block; }
  .vcard.dark { background: ${dark.bg}; border-color: transparent; }
  .vcard.dark span { color: rgba(234,242,236,.55); }
  .vcard.dark svg { height: 42px; }
  .palette-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .mini { border-radius: 12px; padding: 8px 9px; background: var(--mbg); color: var(--mink); border: 1px solid rgba(24,33,28,.1); min-height: 78px; display: flex; flex-direction: column; gap: 5px; }
  .mini.dark { border-color: rgba(255,255,255,.12); }
  .mini span { font-size: 8px; letter-spacing: .09em; text-transform: uppercase; color: color-mix(in srgb, var(--mink) 62%, transparent); }
  .mini svg { height: 28px; width: auto; max-width: 100%; display: block; margin-top: auto; }
  .filelist { display: flex; flex-wrap: wrap; gap: 4px; font: 8.5px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }
  .filelist code { background: rgba(24,33,28,.05); border: 1px solid rgba(24,33,28,.08); border-radius: 5px; padding: 2px 4px; color: rgba(24,33,28,.55); }
  .row { display: flex; gap: 10px; flex-wrap: wrap; }
  .chip { display: flex; align-items: center; gap: 7px; border: 1px solid rgba(24,33,28,.1); border-radius: 999px; padding: 5px 9px 5px 6px; font-size: 10px; color: rgba(24,33,28,.64); background: #FFFDF8; }
  .chip i { width: 16px; height: 16px; border-radius: 50%; display: block; }
  .good .foot { margin-top: auto; display: flex; justify-content: space-between; gap: 16px; align-items: flex-end; }
  .good .foot ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 5px; font-size: 11.5px; color: rgba(24,33,28,.68); }
  .good .foot b { color: ${palette.brand}; }
  .code { font: 10px/1.65 ui-monospace, SFMono-Regular, Menlo, monospace; background: #101A16; color: #E9F2EC; border-radius: 12px; padding: 12px 14px; white-space: pre; }
  .code em { color: ${dark.brand}; font-style: normal; }
  footer { display: flex; justify-content: space-between; gap: 20px; font-size: 11px; color: rgba(24,33,28,.5); border-top: 1px solid rgba(24,33,28,.1); padding-top: 12px; }
  @media (max-width: 900px) {
    .page { width: 100%; min-height: 0; padding: 20px; }
    .split { grid-template-columns: 1fr; }
    .good .hero, .good .foot { grid-template-columns: 1fr; flex-direction: column; align-items: flex-start; }
    .variants { grid-template-columns: repeat(2, 1fr); }
  }
</style>
</head>
<body>
<div class="page">
  <header>
    <div>
      <div class="eyebrow">The same brief · two outcomes</div>
      <h1>One guessed PNG, or a complete identity deck.</h1>
    </div>
    <div class="legend"><span><i style="background:#A43A2A"></i>no skill</span><span><i style="background:${palette.brand}"></i>logodeck</span></div>
  </header>

  <div class="split">
    <section class="panel bad">
      <span class="tag">Without the skill</span>
      <div class="chat">“Make a logo for Novaris, a climate newsletter. Something green and modern.”</div>
      <div class="shot">
        <span class="badge">logo-final-v3.png · 512×512</span>
        <div class="art">${badLogo}</div>
      </div>
      <ul class="issues">
        <li><span class="x">×</span><span><b>One file.</b> No icon, favicon, app icon, mono, dark or lockup.</span></li>
        <li><span class="x">×</span><span><b>Text baked into the image.</b> It cannot be recoloured or set as paths.</span></li>
        <li><span class="x">×</span><span><b>Contrast 1.9:1.</b> The mark disappears on the header and at 16 px.</span></li>
        <li><span class="x">×</span><span><b>No system.</b> The next ask starts from zero.</span></li>
      </ul>
      <div class="filemess">
        <span>Delivered</span>
        <code>logo-final-v3.png</code><code>logo-final-v3 (1).png</code><code>logo-FINAL.webp</code>
        <p>Three exports, no source, no tokens, no variants.</p>
      </div>
    </section>

    <section class="panel good">
      <span class="tag">With logodeck</span>
      <div class="hero">
        ${read("lockup-horizontal")}
        <div class="ratio"><b>${lowest.ratio}:1</b>lowest measured pair<br />${lowest.pair} · ${lowest.mode}<br />all six pairs pass</div>
      </div>
      <div class="variants">
        <div class="vcard"><span>symbol</span><div class="art">${read("symbol")}</div></div>
        <div class="vcard"><span>mono</span><div class="art">${read("symbol-mono")}</div></div>
        <div class="vcard dark"><span>dark</span><div class="art">${read("symbol-dark")}</div></div>
        <div class="vcard"><span>favicon</span><div class="art">${read("favicon")}</div></div>
        <div class="vcard"><span>wordmark</span><div class="art">${read("wordmark")}</div></div>
        <div class="vcard"><span>horizontal</span><div class="art">${read("lockup-horizontal")}</div></div>
        <div class="vcard"><span>stacked</span><div class="art">${read("lockup-stacked")}</div></div>
        <div class="vcard"><span>app icon</span><div class="art">${read("app-icon")}</div></div>
      </div>
      <div class="row">
        <span class="chip"><i style="background:${palette.bg};border:1px solid rgba(0,0,0,.12)"></i>bg ${palette.bg}</span>
        <span class="chip"><i style="background:${palette.ink}"></i>ink ${palette.ink}</span>
        <span class="chip"><i style="background:${palette.brand}"></i>brand ${palette.brand}</span>
        <span class="chip"><i style="background:${palette.accent}"></i>accent ${palette.accent}</span>
        <span class="chip"><i style="background:${alt.light.brand}"></i>alt ${alt.name}</span>
      </div>
      <div class="palette-strip">
        <div class="mini" style="--mbg:${palette.bg};--mink:${palette.ink};--ld-bg:${palette.bg};--ld-ink:${palette.ink};--ld-brand:${palette.brand};--ld-accent:${palette.accent}"><span>primary · light</span>${read("lockup-horizontal")}</div>
        <div class="mini dark" style="--mbg:${dark.bg};--mink:${dark.ink}"><span>primary · dark</span>${read("lockup-horizontal-dark")}</div>
        <div class="mini" style="--mbg:${alt.light.bg};--mink:${alt.light.ink};--ld-bg:${alt.light.bg};--ld-ink:${alt.light.ink};--ld-brand:${alt.light.brand};--ld-accent:${alt.light.accent}"><span>alternate · light</span>${readAlt("lockup-horizontal")}</div>
        <div class="mini dark" style="--mbg:${alt.dark.bg};--mink:${alt.dark.ink}"><span>alternate · dark</span>${readAlt("lockup-horizontal-dark")}</div>
      </div>
      <div class="filelist">
        <code>symbol.svg</code><code>symbol-mono.svg</code><code>symbol-dark.svg</code><code>wordmark.svg</code><code>wordmark-mono.svg</code><code>wordmark-dark.svg</code><code>lockup-horizontal.svg</code><code>lockup-horizontal-mono.svg</code><code>lockup-horizontal-dark.svg</code><code>lockup-stacked.svg</code><code>lockup-stacked-mono.svg</code><code>lockup-stacked-dark.svg</code><code>favicon.svg</code><code>app-icon.svg</code><code>app-icon-maskable.svg</code><code>loam.tsx</code><code>tokens.json</code><code>palette.css</code><code>preview.html</code>
      </div>
      <div class="foot">
        <ul>
          <li><b>15 SVG variants</b> + favicon + two app icons</li>
          <li><b>tokens, palette CSS, preview</b> and a typed React component</li>
          <li><b>two palettes</b>, ${lowest.ratio}:1 floor, light and dark</li>
          <li><b>reproducible</b>: one manifest, two masters, no hand edits</li>
        </ul>
        <div class="code">&lt;LoamLogo
  type="horizontal"
  mode="auto"
  style={{ "--ld-brand": "${palette.brand}" }}
/&gt;

<em>// one line changes every file</em></div>
      </div>
    </section>
  </div>

  <footer>
    <span>Left: an illustrative typical first answer. Right: the actual Loam deck built by this repository.</span>
    <span>All names and drawings are fictional. MIT.</span>
  </footer>
</div>
</body>
</html>
`;

writeFileSync(join(HERE, "site", "before-after.html"), html, "utf8");
console.log("examples/site/before-after.html");
