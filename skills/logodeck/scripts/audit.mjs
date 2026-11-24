#!/usr/bin/env node
/**
 * logodeck audit — deterministic checks for the SVG files a logo deck contains.
 *
 * Errors block delivery. Warnings are design smells to inspect. The score compares
 * iterations; it never excuses an error.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED = [
  "symbol",
  "symbol-mono",
  "symbol-dark",
  "wordmark",
  "wordmark-mono",
  "wordmark-dark",
  "lockup-horizontal",
  "lockup-horizontal-mono",
  "lockup-horizontal-dark",
  "lockup-stacked",
  "lockup-stacked-mono",
  "lockup-stacked-dark",
  "favicon",
  "app-icon",
  "app-icon-maskable",
];

const KNOWN_TOKENS = new Set([
  "bg",
  "ink",
  "brand",
  "accent",
  "bg-dark",
  "ink-dark",
  "brand-dark",
  "accent-dark",
  "on-dark",
]);

const FORBIDDEN = ["text", "image", "foreignObject", "filter"];

function usage() {
  return `logodeck audit

  node audit.mjs <file.svg|dir>... [--strict] [--json] [--quiet]

  --strict   treat warnings as failures
  --json     print a machine-readable report
  --quiet    only print the summary
`;
}

function parseArgs(argv) {
  const args = { _: [], strict: false, json: false, quiet: false };
  for (const arg of argv) {
    if (arg === "--strict") args.strict = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--quiet") args.quiet = true;
    else if (arg === "--help") args.help = true;
    else args._.push(arg);
  }
  return args;
}

function collect(target) {
  const path = resolve(target);
  if (!existsSync(path)) return { files: [], dirs: [] };
  if (statSync(path).isDirectory()) {
    const files = readdirSync(path)
      .filter((name) => extname(name).toLowerCase() === ".svg")
      .sort()
      .map((name) => join(path, name));
    return { files, dirs: [path] };
  }
  return { files: [path], dirs: [] };
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pathBounds(d) {
  const commands = String(d).match(/[a-zA-Z]/g) ?? [];
  // Relative commands and arcs cannot be bounded by pairing raw numbers; skip them so the
  // tightness check never reports a false overflow on a valid drawing.
  if (commands.some((command) => command === command.toLowerCase() || command === "A")) return null;
  const tokens = String(d).match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!tokens) return null;
  const numbers = tokens.map((token) => Number(token)).filter((value) => Number.isFinite(value));
  if (numbers.length < 2) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    const x = numbers[i];
    const y = numbers[i + 1];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

function contentBounds(text) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let found = false;
  const take = (box) => {
    if (!box) return;
    found = true;
    minX = Math.min(minX, box.minX);
    minY = Math.min(minY, box.minY);
    maxX = Math.max(maxX, box.maxX);
    maxY = Math.max(maxY, box.maxY);
  };
  for (const match of text.matchAll(/<rect\b([^>]*)\/?>/gi)) {
    const attrs = match[1];
    const x = number(attrs.match(/\bx="([^"]+)"/)?.[1] ?? 0);
    const y = number(attrs.match(/\by="([^"]+)"/)?.[1] ?? 0);
    const w = number(attrs.match(/\bwidth="([^"]+)"/)?.[1]);
    const h = number(attrs.match(/\bheight="([^"]+)"/)?.[1]);
    if (x !== null && y !== null && w !== null && h !== null) {
      take({ minX: x, minY: y, maxX: x + w, maxY: y + h });
    }
  }
  for (const match of text.matchAll(/<circle\b([^>]*)\/?>/gi)) {
    const attrs = match[1];
    const cx = number(attrs.match(/\bcx="([^"]+)"/)?.[1] ?? 0);
    const cy = number(attrs.match(/\bcy="([^"]+)"/)?.[1] ?? 0);
    const r = number(attrs.match(/\br="([^"]+)"/)?.[1]);
    if (cx !== null && cy !== null && r !== null) {
      take({ minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r });
    }
  }
  for (const match of text.matchAll(/<path\b([^>]*)\/?>/gi)) {
    const d = match[1].match(/\bd="([^"]+)"/)?.[1];
    if (d) {
      const box = pathBounds(d);
      if (box) take({ minX: box.minX, minY: box.minY, maxX: box.maxX, maxY: box.maxY });
    }
  }
  return found ? { minX, minY, maxX, maxY } : null;
}

function auditSvg(file) {
  const text = readFileSync(file, "utf8");
  const name = basename(file);
  const errors = [];
  const warnings = [];
  const root = text.match(/<svg\b([^>]*)>/i);
  if (!root) {
    return { file: name, errors: ["not an SVG document"], warnings, score: 0 };
  }
  const rootAttrs = root[1];
  const viewBoxRaw = rootAttrs.match(/\bviewBox\s*=\s*"([^"]+)"/i)?.[1];
  let viewBox = null;
  if (!viewBoxRaw) {
    errors.push("root is missing a viewBox");
  } else {
    const parts = viewBoxRaw.trim().replace(/,/g, " ").split(/\s+/).map(Number);
    if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
      errors.push(`invalid viewBox: ${viewBoxRaw}`);
    } else if (parts[2] <= 0 || parts[3] <= 0) {
      errors.push(`viewBox has a non-positive size: ${viewBoxRaw}`);
    } else {
      viewBox = { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
    }
  }
  if (/\bwidth\s*=\s*"[^"]*"/i.test(rootAttrs) && !/data-ld="[^"]*(favicon|app-icon)/.test(rootAttrs)) {
    errors.push("root has a fixed width; use the viewBox and let the consumer size it");
  }
  if (/\bheight\s*=\s*"[^"]*"/i.test(rootAttrs) && !/data-ld="[^"]*(favicon|app-icon)/.test(rootAttrs)) {
    errors.push("root has a fixed height; use the viewBox and let the consumer size it");
  }

  for (const tag of FORBIDDEN) {
    if (new RegExp(`<${tag}\\b`, "i").test(text)) errors.push(`contains <${tag}>`);
  }
  if (/<(mask|clipPath)\b/i.test(text)) warnings.push("uses mask/clipPath (compatibility risk)");
  if (/<style\b/i.test(text)) warnings.push("contains a <style> block; prefer tokens and attributes");
  if (/data:image\//i.test(text)) errors.push("contains embedded raster data");

  const tokenRefs = [...text.matchAll(/var\(\s*--ld-([a-z0-9-]+)\s*(,?)([^)]*)\)/g)];
  for (const ref of tokenRefs) {
    const [, token, comma, rest] = ref;
    if (!KNOWN_TOKENS.has(token)) errors.push(`unknown token --ld-${token}`);
    if (!comma.trim() || !rest.trim()) errors.push(`token --ld-${token} has no fallback colour`);
  }

  const literals = new Set();
  for (const match of text.matchAll(/(?:fill|stroke|stop-color)\s*=\s*"([^"]+)"/g)) {
    const value = match[1].trim();
    for (const hex of value.match(/#[0-9a-f]{3,8}\b/gi) ?? []) literals.add(hex.toUpperCase());
    if (/^rgba?\(|^hsla?\(/i.test(value)) literals.add(value.toLowerCase());
  }
  if (literals.size > 4) errors.push(`uses ${literals.size} literal colours (max 4 outside tokens)`);

  const isMono = /-mono\.svg$/i.test(name);
  if (isMono) {
    for (const match of text.matchAll(/\bfill\s*=\s*"([^"]+)"/g)) {
      const value = match[1].trim();
      if (value !== "none" && value !== "currentColor" && !value.startsWith("url(")) {
        errors.push(`mono file uses a colour fill: ${value}`);
        break;
      }
    }
  }

  for (const match of text.matchAll(/\bstroke\s*=\s*"([^"]+)"/g)) {
    if (match[1].trim() !== "none") {
      errors.push("uses a stroke; expand strokes to filled paths");
      break;
    }
  }
  if (/\bstroke-width\s*=/i.test(text)) errors.push("uses stroke-width; expand strokes to filled paths");

  const ids = [...text.matchAll(/\bid\s*=\s*"([^"]+)"/g)].map((match) => match[1]);
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate) errors.push(`duplicate id: ${duplicate}`);

  if (!/<title\b/i.test(text)) errors.push("missing <title> for accessibility");
  if (!/\brole\s*=\s*"img"/i.test(rootAttrs)) errors.push('root is missing role="img"');

  const hasNestedSvg = /<svg\b/i.test(text.slice(root[0].length));
  if (viewBox && !hasNestedSvg) {
    const bounds = contentBounds(text);
    if (bounds) {
      const margins = [
        bounds.minX - viewBox.x,
        bounds.minY - viewBox.y,
        viewBox.x + viewBox.w - bounds.maxX,
        viewBox.y + viewBox.h - bounds.maxY,
      ];
      const scale = Math.max(viewBox.w, viewBox.h);
      const worst = Math.max(...margins.map((value) => Math.abs(value)));
      if (worst > scale * 0.02) {
        warnings.push(`viewBox is not tight (worst margin ${Math.round((worst / scale) * 1000) / 10}%)`);
      }
      if (margins.some((value) => value < -0.001)) {
        errors.push("content overflows the viewBox");
      }
    }
  }

  let anchors = 0;
  for (const match of text.matchAll(/<path\b[^>]*\bd="([^"]+)"/gi)) {
    anchors += (match[1].match(/[a-zA-Z]/g) ?? []).length;
  }
  if (anchors > 90) warnings.push(`${anchors} path commands; simplify the drawing`);

  if (/favicon\.svg$/i.test(name) && viewBox && Math.abs(viewBox.w - viewBox.h) > 0.01) {
    warnings.push("favicon viewBox is not square");
  }
  if (/app-icon.*\.svg$/i.test(name) && viewBox && Math.abs(viewBox.w - viewBox.h) > 0.01) {
    warnings.push("app icon viewBox is not square");
  }

  const score = Math.max(
    0,
    100 - errors.length * 15 - warnings.length * 3,
  );
  return { file: name, errors, warnings, score, literals: literals.size, anchors };
}

function auditTsx(file) {
  const text = readFileSync(file, "utf8");
  const errors = [];
  const warnings = [];
  if (/dangerouslySetInnerHTML/.test(text)) errors.push("uses dangerouslySetInnerHTML");
  if (!/useSyncExternalStore/.test(text)) errors.push("does not implement mode auto with useSyncExternalStore");
  for (const prop of ["variant", "type", "mode", "title"]) {
    if (!new RegExp(`${prop}\\??:`).test(text)) errors.push(`missing prop: ${prop}`);
  }
  if (!/export default/.test(text)) warnings.push("no default export");
  const imports = [...text.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);
  for (const specifier of imports) {
    if (specifier !== "react") errors.push(`imports an unexpected package: ${specifier}`);
  }
  if (/tailwind|className=\"[^\"]*\b(dark:|bg-|text-)/.test(text)) {
    errors.push("relies on Tailwind classes");
  }
  const score = Math.max(0, 100 - errors.length * 15 - warnings.length * 3);
  return { file: basename(file), errors, warnings, score };
}

function inferSlug(svgs) {
  const counts = new Map();
  for (const name of svgs) {
    for (const key of EXPECTED) {
      const suffix = `-${key}.svg`;
      if (name.endsWith(suffix)) {
        const prefix = name.slice(0, -suffix.length);
        counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
      }
    }
  }
  let best = null;
  let bestCount = 0;
  for (const [prefix, count] of counts) {
    if (count > bestCount) {
      best = prefix;
      bestCount = count;
    }
  }
  return best;
}

function checkMatrix(directory) {
  const errors = [];
  const svgs = readdirSync(directory).filter((name) => extname(name) === ".svg");
  const slug = inferSlug(svgs);
  if (!slug) return { errors: ["no SVG files to infer the deck slug"], slug: null };
  for (const key of EXPECTED) {
    if (!existsSync(join(directory, `${slug}-${key}.svg`))) {
      errors.push(`missing variant: ${slug}-${key}.svg`);
    }
  }
  for (const suffix of [".tsx", "-tokens.json", "-palette.css", "-preview.html"]) {
    if (!existsSync(join(directory, `${slug}${suffix}`))) {
      errors.push(`missing file: ${slug}${suffix}`);
    }
  }
  const tsx = join(directory, `${slug}.tsx`);
  if (existsSync(tsx)) {
    const report = auditTsx(tsx);
    errors.push(...report.errors.map((error) => `${slug}.tsx: ${error}`));
  }
  return { errors, slug };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length === 0) {
    process.stdout.write(usage());
    process.exitCode = args.help ? 0 : 2;
    return;
  }
  const files = [];
  const dirs = [];
  for (const target of args._) {
    const found = collect(target);
    files.push(...found.files);
    dirs.push(...found.dirs);
  }
  if (!files.length) {
    console.error("logodeck audit: no SVG files found");
    process.exitCode = 2;
    return;
  }

  const reports = files.map(auditSvg);
  let matrixErrors = [];
  let slug = null;
  for (const directory of dirs) {
    const result = checkMatrix(directory);
    matrixErrors.push(...result.errors);
    if (result.slug) slug = result.slug;
  }

  const errorCount =
    reports.reduce((sum, report) => sum + report.errors.length, 0) + matrixErrors.length;
  const warnings = reports.reduce((sum, report) => sum + report.warnings.length, 0);
  const score = reports.length
    ? Math.round(reports.reduce((sum, report) => sum + report.score, 0) / reports.length)
    : 0;

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          slug,
          score,
          errors: errorCount,
          warnings,
          reports: reports.map((report) => ({
            file: report.file,
            errors: report.errors,
            warnings: report.warnings,
            score: report.score,
          })),
          matrix: matrixErrors,
        },
        null,
        2,
      ),
    );
  } else {
    for (const report of reports) {
      const state = report.errors.length ? "FAIL" : report.warnings.length ? "warn" : "ok";
      if (!args.quiet) {
        console.log(`\n${report.file} — ${state} (${report.score}/100)`);
        for (const error of report.errors) console.log(`  error: ${error}`);
        for (const warning of report.warnings) console.log(`  warning: ${warning}`);
      }
    }
    if (matrixErrors.length && !args.quiet) {
      console.log("\nmatrix");
      for (const error of matrixErrors) console.log(`  error: ${error}`);
    }
    console.log(
      `\n${score}/100 · ${errorCount} error${errorCount === 1 ? "" : "s"} · ${warnings} warning${
        warnings === 1 ? "" : "s"
      } · ${files.length} SVG`,
    );
  }

  if (errorCount || (args.strict && warnings)) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
