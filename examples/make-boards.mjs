#!/usr/bin/env node
/**
 * Build one presentation plate per brand and the gallery that links them.
 *
 *   node examples/make-boards.mjs
 *
 * The plates are static HTML: every SVG is inlined from the committed decks, so the
 * two palettes can be shown side by side with CSS custom properties and no network.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const entries = readdirSync(HERE, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => {
    try {
      return statSync(join(HERE, name, "logo.json")).isFile();
    } catch {
      return false;
    }
  })
  .sort();

const brands = entries.map((slug) => {
  const dir = join(HERE, slug);
  const manifest = JSON.parse(readFileSync(join(dir, "logo.json"), "utf8"));
  const primary = JSON.parse(readFileSync(join(dir, manifest.out ?? "dist", `${slug}-tokens.json`), "utf8"));
  const altFile = join(dir, manifest.altOut ?? "dist-alt", `${slug}-tokens.json`);
  let alt = null;
  try {
    alt = JSON.parse(readFileSync(altFile, "utf8"));
  } catch {
    alt = null;
  }
  return { slug, dir, manifest, primary, alt };
});

function svg(brand, deck, name) {
  return readFileSync(join(brand.dir, deck, `${brand.slug}-${name}.svg`), "utf8");
}

function plateVars(palette, mode) {
  const set = palette[mode];
  return `--ld-bg:${set.bg};--ld-ink:${set.ink};--ld-brand:${set.brand};--ld-accent:${set.accent};--plate-bg:${set.bg};--plate-ink:${set.ink}`;
}

function swatches(palette, mode) {
  const set = palette[mode];
  return ["bg", "ink", "brand", "accent"]
    .map(
      (key) =>
        `<span class="swatch"><i style="background:${set[key]}"></i><b>${key}</b><code>${set[key]}</code></span>`,
    )
    .join("");
}

function contrastRows(palette) {
  return palette.contrast
    .map(
      (row) =>
        `<tr><td>${row.mode}</td><td>${row.pair}</td><td>${row.ratio}:1</td><td class="${row.pass ? "pass" : "fail"}">${row.pass ? "pass" : "fail"}</td></tr>`,
    )
    .join("");
}

function lowest(palette) {
  return palette.contrast.reduce((min, row) => (row.ratio < min.ratio ? row : min), palette.contrast[0]);
}

function fileList(brand, deck, label) {
  const files = readdirSync(join(brand.dir, deck)).sort();
  return `<details class="files"><summary>${label} · ${files.length} files</summary><ul>${files
    .map((file) => `<li><code>${escapeHtml(deck)}/${escapeHtml(file)}</code></li>`)
    .join("")}</ul></details>`;
}

function palettePlate(brand, palette, mode, deck, label) {
  const svgMarkup = svg(brand, deck, mode === "dark" ? "lockup-horizontal-dark" : "lockup-horizontal");
  const low = lowest(palette);
  return `<article class="plate ${mode}" style="${plateVars(palette, mode)}">
    <div class="plate-head"><span>${escapeHtml(label)}</span><span class="badge">${mode}</span></div>
    <div class="plate-lockup">${svgMarkup}</div>
    <div class="swatch-row">${swatches(palette, mode)}</div>
    <p class="plate-note">Lowest pair <b>${low.ratio}:1</b> · ${escapeHtml(low.pair)} (${escapeHtml(low.mode)}), floor ${low.min}:1.</p>
  </article>`;
}

function board(brand) {
  const { manifest, primary, alt, slug } = brand;
  const name = escapeHtml(manifest.name);
  const primaryLight = plateVars(primary, "light");
  const primaryDark = plateVars(primary, "dark");
  const altLight = alt ? plateVars(alt, "light") : null;
  const altDark = alt ? plateVars(alt, "dark") : null;
  const lowestPrimary = lowest(primary);
  const lowestAlt = alt ? lowest(alt) : null;
  const accentStyle = `--ld-brand:${primary.light.brand};--ld-ink:${primary.light.ink};--ld-accent:${primary.light.accent}`;

  return `<!doctype html>
<html lang="en" data-theme="light" data-brand="${slug}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${name} — logodeck identity plate</title>
<style>
  :root {
    ${primaryLight};
    --ink-soft: color-mix(in srgb, var(--ld-ink) 64%, transparent);
    --line: color-mix(in srgb, var(--ld-ink) 15%, transparent);
    --surface: color-mix(in srgb, var(--ld-bg) 88%, white);
    --shadow: 0 28px 70px rgba(10, 20, 15, .12);
    color-scheme: light;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  }
  html[data-theme="dark"] {
    ${primaryDark};
    --ink-soft: color-mix(in srgb, var(--ld-ink) 66%, transparent);
    --line: color-mix(in srgb, var(--ld-ink) 20%, transparent);
    --surface: color-mix(in srgb, var(--ld-bg) 90%, white);
    --shadow: 0 28px 70px rgba(0, 0, 0, .4);
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--ld-bg); color: var(--ld-ink); transition: background 170ms ease, color 170ms ease; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: .01ms !important;
      scroll-behavior: auto !important;
    }
  }
  a { color: inherit; }
  .wrap { width: min(1240px, calc(100% - 48px)); margin: 0 auto; padding: 28px 0 72px; }
  nav { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-bottom: 26px; }
  nav .crumb { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-soft); }
  nav .tools { display: flex; gap: 8px; flex-wrap: wrap; }
  button, .button { font: inherit; border: 1px solid var(--line); background: var(--surface); color: var(--ld-ink); border-radius: 999px; padding: 8px 14px; cursor: pointer; text-decoration: none; display: inline-block; }
  .hero { display: grid; grid-template-columns: 1.3fr .7fr; gap: 28px; align-items: stretch; padding: 24px 0 22px; }
  .hero-main { display: flex; flex-direction: column; justify-content: space-between; gap: 30px; }
  .eyebrow { font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: var(--ink-soft); }
  h1 { font-size: clamp(56px, 8vw, 118px); line-height: .88; letter-spacing: -.045em; margin: 14px 0 18px; font-weight: 650; }
  .promise { font-size: clamp(18px, 2.1vw, 26px); line-height: 1.35; max-width: 28ch; margin: 0; }
  .idea { margin: 24px 0 0; font-size: 14px; line-height: 1.7; color: var(--ink-soft); max-width: 52ch; }
  .hero-lockup { border: 1px solid var(--line); border-radius: 30px; background: var(--surface); box-shadow: var(--shadow); padding: 40px; display: grid; place-items: center; min-height: 250px; }
  .hero-lockup svg { width: min(100%, 430px); height: auto; display: block; }
  .dark-panel { border-radius: 30px; padding: 30px; display: flex; flex-direction: column; justify-content: space-between; gap: 22px; box-shadow: var(--shadow); }
  .dark-panel .eyebrow { color: color-mix(in srgb, currentColor 62%, transparent); }
  .dark-panel svg { width: min(100%, 260px); height: auto; display: block; }
  .section { margin-top: 52px; }
  .section-head { display: flex; justify-content: space-between; align-items: baseline; gap: 20px; border-bottom: 1px solid var(--line); padding-bottom: 12px; margin-bottom: 20px; }
  h2 { margin: 0; font-size: 15px; letter-spacing: .13em; text-transform: uppercase; font-weight: 600; }
  .section-head p { margin: 0; color: var(--ink-soft); font-size: 13px; max-width: 52ch; }
  .grid { display: grid; gap: 16px; }
  .grid-5 { grid-template-columns: repeat(5, 1fr); }
  .grid-3 { grid-template-columns: repeat(3, 1fr); }
  .grid-2 { grid-template-columns: 1fr 1fr; }
  .card { border: 1px solid var(--line); border-radius: 22px; background: var(--surface); padding: 22px; display: flex; flex-direction: column; gap: 16px; min-height: 176px; }
  .card h3 { margin: 0; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-soft); font-weight: 600; }
  .card .art { flex: 1; display: grid; place-items: center; }
  .card .art svg { display: block; max-width: 100%; height: auto; }
  .art.symbol svg { width: 118px; height: 118px; }
  .art.word svg { width: min(100%, 250px); height: auto; }
  .art.lockup svg { width: min(100%, 330px); height: auto; }
  .art.app svg { width: 92px; height: 92px; }
  .mono { color: var(--ld-ink); }
  .darkcard { border-color: transparent; }
  .darkcard h3 { color: color-mix(in srgb, currentColor 62%, transparent); }
  .darkcard .mono { color: inherit; }
  .favicons { display: flex; align-items: flex-end; gap: 18px; flex-wrap: wrap; }
  .favicons figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 7px; color: var(--ink-soft); font-size: 11px; }
  .favicons svg, .favicons span svg { display: block; width: 100%; height: 100%; }
  .palette-group { border-top: 1px solid var(--line); padding-top: 18px; margin-top: 22px; }
  .palette-group:first-of-type { border-top: 0; margin-top: 0; padding-top: 0; }
  .palette-title { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
  .palette-title b { font-size: 17px; }
  .palette-title span { color: var(--ink-soft); font-size: 13px; }
  .plate-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .plate { border-radius: 20px; padding: 18px; background: var(--plate-bg); color: var(--plate-ink); border: 1px solid color-mix(in srgb, var(--plate-ink) 14%, transparent); display: flex; flex-direction: column; gap: 13px; }
  .plate.dark { border-color: rgba(255, 255, 255, .12); }
  .plate-head { display: flex; justify-content: space-between; align-items: center; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: color-mix(in srgb, var(--plate-ink) 62%, transparent); }
  .badge { border: 1px solid currentColor; border-radius: 999px; padding: 3px 8px; letter-spacing: .06em; }
  .plate-lockup { min-height: 68px; display: flex; align-items: center; }
  .plate-lockup svg { width: min(100%, 300px); height: auto; display: block; }
  .swatch-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
  .swatch { display: flex; flex-direction: column; gap: 5px; font-size: 10px; min-width: 0; }
  .swatch i { display: block; height: 30px; border-radius: 8px; border: 1px solid color-mix(in srgb, var(--plate-ink) 18%, transparent); }
  .swatch b { font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: color-mix(in srgb, var(--plate-ink) 65%, transparent); }
  .swatch code { font: 10px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; opacity: .8; }
  .plate-note { margin: 0; font-size: 11px; line-height: 1.5; color: color-mix(in srgb, var(--plate-ink) 66%, transparent); }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--line); }
  th { color: var(--ink-soft); font-weight: 600; }
  td.pass { color: var(--ld-brand); font-weight: 600; }
  td.fail { color: #B42318; font-weight: 600; }
  .code { margin: 0; padding: 18px; border-radius: 18px; background: #0E1713; color: #E9F2EC; border: 1px solid rgba(255, 255, 255, .08); overflow: auto; font: 12px/1.8 ui-monospace, SFMono-Regular, Menlo, monospace; }
  .files { border-top: 1px solid var(--line); padding: 10px 0; font-size: 12px; }
  .files summary { cursor: pointer; color: var(--ink-soft); }
  .files ul { columns: 2; gap: 20px; margin: 10px 0 0; padding: 0; list-style: none; }
  .files li { break-inside: avoid; margin-bottom: 5px; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  footer { margin-top: 54px; border-top: 1px solid var(--line); padding-top: 18px; display: flex; justify-content: space-between; gap: 18px; flex-wrap: wrap; color: var(--ink-soft); font-size: 12px; }
  @media (max-width: 980px) {
    .hero { grid-template-columns: 1fr; }
    .grid-5 { grid-template-columns: repeat(2, 1fr); }
    .grid-3, .grid-2, .plate-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 560px) {
    .wrap { width: calc(100% - 28px); padding-top: 16px; }
    .grid-5 { grid-template-columns: repeat(2, 1fr); }
    .hero-lockup { padding: 22px; }
    .plate { padding: 14px; }
    .swatch-row { grid-template-columns: repeat(2, 1fr); }
    .files ul { columns: 1; }
    h1 { font-size: 56px; }
  }
</style>
</head>
<body>
<div class="wrap">
  <nav>
    <span class="crumb"><a href="../site/index.html">logodeck</a> / identity plate / ${slug}</span>
    <span class="tools">
      <button type="button" id="theme">Toggle dark</button>
      <a class="button" href="dist/${slug}-preview.html">Open the preview</a>
    </span>
  </nav>

  <header class="hero">
    <div class="hero-main">
      <div>
        <div class="eyebrow">${escapeHtml(manifest.sector)} · fictional brand · palette ${escapeHtml(manifest.palette)}</div>
        <h1>${name}</h1>
        <p class="promise">${escapeHtml(manifest.promise)}</p>
        <p class="idea"><b>Idea.</b> ${escapeHtml(manifest.idea)}</p>
      </div>
      <div class="hero-lockup">${svg(brand, "dist", "lockup-horizontal")}</div>
    </div>
    <aside class="dark-panel" style="background:${primary.dark.bg};color:${primary.dark.ink}">
      <div class="eyebrow">On dark</div>
      ${svg(brand, "dist", "lockup-stacked-dark")}
      <div class="eyebrow">${lowestPrimary.ratio}:1 lowest pair</div>
    </aside>
  </header>

  <section class="section">
    <div class="section-head"><h2>The mark</h2><p>One drawing, then the whole family: mono for one colour, a simplified favicon, a tile and a maskable icon.</p></div>
    <div class="grid grid-5">
      <div class="card"><h3>Symbol</h3><div class="art symbol">${svg(brand, "dist", "symbol")}</div></div>
      <div class="card"><h3>Symbol mono</h3><div class="art symbol mono">${svg(brand, "dist", "symbol-mono")}</div></div>
      <div class="card darkcard" style="background:${primary.dark.bg};color:${primary.dark.ink}"><h3>Symbol dark</h3><div class="art symbol">${svg(brand, "dist", "symbol-dark")}</div></div>
      <div class="card"><h3>Favicon</h3><div class="art"><div class="favicons">
        <figure><span style="display:block;width:32px;height:32px">${svg(brand, "dist", "favicon")}</span><figcaption>32</figcaption></figure>
        <figure><span style="display:block;width:16px;height:16px">${svg(brand, "dist", "favicon")}</span><figcaption>16</figcaption></figure>
      </div></div></div>
      <div class="card"><h3>App icon</h3><div class="art app">${svg(brand, "dist", "app-icon")}</div></div>
    </div>
  </section>

  <section class="section">
    <div class="section-head"><h2>Wordmark & lockups</h2><p>The name is drawn as paths. The lockups are composed from the same two masters, never retouched.</p></div>
    <div class="grid grid-3">
      <div class="card"><h3>Wordmark</h3><div class="art word">${svg(brand, "dist", "wordmark")}</div></div>
      <div class="card"><h3>Horizontal</h3><div class="art lockup">${svg(brand, "dist", "lockup-horizontal")}</div></div>
      <div class="card darkcard" style="background:${primary.dark.bg};color:${primary.dark.ink}"><h3>Stacked dark</h3><div class="art lockup">${svg(brand, "dist", "lockup-stacked-dark")}</div></div>
    </div>
  </section>

  <section class="section">
    <div class="section-head"><h2>Two palettes</h2><p>Every pair is measured in light and dark. The drawing never changes; only the tokens do.</p></div>
    <div class="palette-group">
      <div class="palette-title"><b>${escapeHtml(primary.label ?? primary.name)}</b><span>${escapeHtml(primary.note ?? "")} · primary</span></div>
      <div class="plate-grid">
        ${palettePlate(brand, primary, "light", "dist", "Primary")}
        ${palettePlate(brand, primary, "dark", "dist", "Primary")}
      </div>
    </div>
    ${
      alt && altLight
        ? `<div class="palette-group">
      <div class="palette-title"><b>${escapeHtml(alt.label ?? alt.name)}</b><span>${escapeHtml(alt.note ?? "")} · alternate</span></div>
      <div class="plate-grid">
        ${palettePlate(brand, alt, "light", "dist-alt", "Alternate")}
        ${palettePlate(brand, alt, "dark", "dist-alt", "Alternate")}
      </div>
    </div>`
        : ""
    }
    <div class="card" style="margin-top:16px">
      <h3>Contrast, measured</h3>
      <table>
        <thead><tr><th>Mode</th><th>Pair</th><th>Ratio</th><th>Status</th></tr></thead>
        <tbody>${contrastRows(primary)}</tbody>
      </table>
      ${alt ? `<p class="plate-note" style="color:var(--ink-soft)">Alternate ${escapeHtml(alt.name)}: lowest ${lowestAlt.ratio}:1 (${escapeHtml(lowestAlt.pair)}, ${escapeHtml(lowestAlt.mode)}).</p>` : ""}
    </div>
  </section>

  <section class="section">
    <div class="section-head"><h2>One line</h2><p>The same theme contract in HTML, CSS or React. Change a token, rebuild, and every variant follows.</p></div>
    <div class="grid grid-2">
      <pre class="code">&lt;svg class="logo" style="--ld-brand:${primary.light.brand}; --ld-accent:${primary.light.accent}"&gt;…&lt;/svg&gt;

&lt;${escapeHtml(manifest.component)} type="horizontal" /&gt;

:root {
  --ld-brand: ${primary.light.brand};
  --ld-accent: ${primary.light.accent};
}</pre>
      <div class="card">
        <h3>What is in the folder</h3>
        <p class="plate-note" style="color:var(--ink-soft);font-size:13px">Fifteen SVG variants, a favicon, two app icons, tokens, palette CSS, a control-sheet preview and a typed React component. The alternate palette is built from the same masters.</p>
        ${fileList(brand, "dist", "Primary deck")}
        ${alt ? fileList(brand, "dist-alt", "Alternate deck") : ""}
      </div>
    </div>
  </section>

  <footer>
    <span>${name} is a fictional brand drawn for this repository. No third-party mark, font or photograph is used.</span>
    <span>MIT · generated by logodeck · ${escapeHtml(manifest.title)}</span>
  </footer>
</div>
<script>
  const root = document.documentElement;
  document.getElementById("theme").addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  });
</script>
</body>
</html>
`;
}

for (const brand of brands) {
  writeFileSync(join(brand.dir, "board.html"), board(brand), "utf8");
  console.log(`  ${brand.slug}/board.html`);
}

/* ------------------------------------------------------------------ gallery */

const cards = brands
  .map((brand, index) => {
    const { manifest, primary } = brand;
    const light = primary.light;
    const dark = primary.dark;
    return `<a class="brand-card" href="../${brand.slug}/board.html" style="
      --c-bg-l:${light.bg};--c-ink-l:${light.ink};--c-brand-l:${light.brand};--c-accent-l:${light.accent};
      --c-bg-d:${dark.bg};--c-ink-d:${dark.ink};--c-brand-d:${dark.brand};--c-accent-d:${dark.accent};">
      <div class="card-top"><span class="num">${String(index + 1).padStart(2, "0")}</span><span class="sector">${escapeHtml(manifest.sector)}</span></div>
      <div class="card-art">${svg(brand, "dist", "symbol")}</div>
      <div class="card-copy"><h2>${escapeHtml(manifest.name)}</h2><p>${escapeHtml(manifest.promise)}</p></div>
      <div class="card-foot"><span class="dots" aria-hidden="true"><i style="background:var(--brand)"></i><i style="background:var(--accent)"></i><i style="background:var(--ink)"></i></span><span>Open the plate →</span></div>
    </a>`;
  })
  .join("\n");

const gallery = `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>logodeck — eight identities, two palettes each</title>
<style>
  :root {
    --bg: #F6F4EC; --ink: #16241D; --brand: #1F6F4A; --accent: #C2542D;
    --muted: rgba(22, 36, 29, .64); --line: rgba(22, 36, 29, .15); --surface: #FFFDF8;
    color-scheme: light;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  }
  html[data-theme="dark"] {
    --bg: #101A16; --ink: #EAF2EC; --brand: #64C79A; --accent: #F08A5D;
    --muted: rgba(234, 242, 236, .66); --line: rgba(234, 242, 236, .16); --surface: #18211D;
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); transition: background 170ms ease, color 170ms ease; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: .01ms !important;
      scroll-behavior: auto !important;
    }
  }
  .wrap { width: min(1240px, calc(100% - 48px)); margin: 0 auto; padding: 30px 0 78px; }
  nav { display: flex; justify-content: space-between; align-items: center; gap: 18px; padding-bottom: 34px; }
  nav .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; letter-spacing: -.02em; }
  nav .brand i { width: 11px; height: 11px; border-radius: 3px; background: var(--brand); display: block; }
  nav .tools { display: flex; gap: 8px; }
  button, .button { font: inherit; border: 1px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 999px; padding: 8px 14px; cursor: pointer; text-decoration: none; display: inline-block; }
  .hero { display: grid; grid-template-columns: 1.25fr .75fr; gap: 40px; align-items: end; padding: 30px 0 48px; }
  .eyebrow { font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
  h1 { font-size: clamp(48px, 7vw, 96px); line-height: .93; letter-spacing: -.045em; margin: 16px 0 22px; max-width: 14ch; }
  .lede { font-size: clamp(17px, 2vw, 22px); line-height: 1.55; color: var(--muted); max-width: 54ch; margin: 0; }
  .install { margin-top: 24px; display: inline-block; border: 1px solid var(--line); background: var(--surface); border-radius: 12px; padding: 12px 16px; font: 13px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }
  .hero-side { border: 1px solid var(--line); border-radius: 26px; background: var(--surface); padding: 24px; display: grid; gap: 18px; }
  .hero-side h2 { margin: 0; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
  .hero-side p { margin: 0; color: var(--muted); line-height: 1.6; font-size: 14px; }
  .symbol-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .symbol-row span { width: 38px; height: 38px; display: block; padding: 4px; background: rgba(255,255,255,.92); border-radius: 9px; }
  .symbol-row svg { width: 100%; height: 100%; display: block; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .brand-card { --bg: var(--c-bg-l); --ink: var(--c-ink-l); --brand: var(--c-brand-l); --accent: var(--c-accent-l);
    --ld-brand: var(--brand); --ld-ink: var(--ink); --ld-accent: var(--accent);
    display: flex; flex-direction: column; gap: 16px; min-height: 330px; border-radius: 24px; padding: 18px;
    background: var(--bg); color: var(--ink); border: 1px solid color-mix(in srgb, var(--ink) 16%, transparent);
    text-decoration: none; transition: transform 160ms ease, box-shadow 160ms ease; }
  html[data-theme="dark"] .brand-card { --bg: var(--c-bg-d); --ink: var(--c-ink-d); --brand: var(--c-brand-d); --accent: var(--c-accent-d); }
  .brand-card:hover { transform: translateY(-3px); box-shadow: 0 22px 50px rgba(10, 20, 15, .16); }
  .card-top { display: flex; justify-content: space-between; gap: 10px; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: color-mix(in srgb, var(--ink) 62%, transparent); }
  .card-art { flex: 1; display: grid; place-items: center; padding: 12px 0; }
  .card-art svg { width: 112px; height: 112px; display: block; }
  .card-copy h2 { margin: 0 0 5px; font-size: 24px; letter-spacing: -.02em; }
  .card-copy p { margin: 0; font-size: 13px; line-height: 1.5; color: color-mix(in srgb, var(--ink) 66%, transparent); }
  .card-foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 12px; color: color-mix(in srgb, var(--ink) 62%, transparent); }
  .dots { display: flex; gap: 5px; } .dots i { width: 10px; height: 10px; border-radius: 50%; display: block; }
  .note { margin-top: 44px; border-top: 1px solid var(--line); padding-top: 20px; display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; color: var(--muted); font-size: 13px; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  @media (max-width: 1040px) { .grid { grid-template-columns: repeat(2, 1fr); } .hero { grid-template-columns: 1fr; } }
  @media (max-width: 620px) {
    .wrap { width: calc(100% - 28px); padding-top: 16px; }
    .grid { grid-template-columns: 1fr; }
    .brand-card { min-height: 290px; }
    .hero { padding-top: 14px; }
  }
</style>
</head>
<body>
<div class="wrap">
  <nav>
    <div class="brand"><i></i>logodeck</div>
    <div class="tools"><button type="button" id="theme">Toggle dark</button><a class="button" href="../../README.md">README</a></div>
  </nav>

  <header class="hero">
    <div>
      <div class="eyebrow">Eight fictional identities · two audited palettes each</div>
      <h1>A logo is a family of files.</h1>
      <p class="lede">Each plate starts from one symbol and one wordmark, then builds the icon, mono, dark, lockups, favicon, app icon, tokens, preview and a typed React component. Colour changes in one line.</p>
      <div class="install">npx skills add terravidhal/logodeck</div>
    </div>
    <aside class="hero-side">
      <h2>In this repository</h2>
      <p>Eight sectors, eight mark types, sixteen complete decks. Open any plate to compare the primary and alternate palettes side by side.</p>
      <div class="symbol-row">${brands
        .map((brand) => `<span title="${escapeHtml(brand.manifest.name)}">${svg(brand, "dist", "symbol")}</span>`)
        .join("")}</div>
    </aside>
  </header>

  <main class="grid">
    ${cards}
  </main>

  <div class="note">
    <span>All brands, drawings and names are fictional. No third-party mark, font or image is embedded.</span>
    <span>MIT · <a href="../../README.md">README</a></span>
  </div>
</div>
<script>
  const root = document.documentElement;
  document.getElementById("theme").addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  });
</script>
</body>
</html>
`;

writeFileSync(join(HERE, "site", "index.html"), gallery, "utf8");
console.log(`  site/index.html\n\n${brands.length} plates and the gallery written.`);
