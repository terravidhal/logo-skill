#!/usr/bin/env node
/**
 * logodeck palette utilities.
 *
 * One source of truth for colours: validate WCAG contrast, print a report, emit CSS
 * custom properties and resolve a theme override. No dependency, no network.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_PALETTES = resolve(HERE, "../assets/palettes.json");

export const THEME_KEYS = ["bg", "ink", "brand", "accent"];
export const DARK_KEYS = THEME_KEYS.map((key) => `${key}Dark`);

/** Thresholds from the skill contract. Keep them strict on purpose. */
export const MIN = {
  brand: 3,
  ink: 4.5,
  accent: 3,
};

export function normalizeHex(value, label = "colour") {
  if (typeof value !== "string") throw new Error(`${label} must be a hex string`);
  let hex = value.trim();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`${label} is not a valid hex colour: ${value}`);
  return hex.toUpperCase();
}

export function hexToRgb(hex) {
  const value = normalizeHex(hex);
  return {
    r: parseInt(value.slice(1, 3), 16),
    g: parseInt(value.slice(3, 5), 16),
    b: parseInt(value.slice(5, 7), 16),
  };
}

function channelToLinear(channel) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
}

export function loadPalettes(file = DEFAULT_PALETTES) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(data.palettes)) throw new Error("palettes.json must contain a palettes array");
  return data;
}

export function getPalette(name, file = DEFAULT_PALETTES) {
  const data = loadPalettes(file);
  const palette = data.palettes.find((entry) => entry.name === name);
  if (!palette) {
    const names = data.palettes.map((entry) => entry.name).join(", ");
    throw new Error(`unknown palette "${name}". Available: ${names}`);
  }
  return clone(palette);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function normalizePalette(palette) {
  const out = clone(palette);
  for (const mode of ["light", "dark"]) {
    if (!out[mode]) throw new Error(`palette ${palette.name} is missing the ${mode} mode`);
    for (const key of THEME_KEYS) {
      if (!out[mode][key]) throw new Error(`palette ${palette.name}.${mode} is missing ${key}`);
      out[mode][key] = normalizeHex(out[mode][key], `${palette.name}.${mode}.${key}`);
    }
  }
  return out;
}

export function paletteVars(palette) {
  const p = normalizePalette(palette);
  return {
    "--ld-bg": p.light.bg,
    "--ld-ink": p.light.ink,
    "--ld-brand": p.light.brand,
    "--ld-accent": p.light.accent,
    "--ld-bg-dark": p.dark.bg,
    "--ld-ink-dark": p.dark.ink,
    "--ld-brand-dark": p.dark.brand,
    "--ld-accent-dark": p.dark.accent,
    "--ld-on-dark": p.dark.ink,
  };
}

/** The colour map used to freeze a master into a fixed file. */
export function resolveTokens(palette, mode = "light") {
  const p = normalizePalette(palette);
  if (mode === "dark") {
    return {
      bg: p.dark.bg,
      ink: p.dark.ink,
      brand: p.dark.brand,
      accent: p.dark.accent,
      "bg-dark": p.dark.bg,
      "ink-dark": p.dark.ink,
      "brand-dark": p.dark.brand,
      "accent-dark": p.dark.accent,
      "on-dark": p.dark.ink,
    };
  }
  return {
    bg: p.light.bg,
    ink: p.light.ink,
    brand: p.light.brand,
    accent: p.light.accent,
    "bg-dark": p.dark.bg,
    "ink-dark": p.dark.ink,
    "brand-dark": p.dark.brand,
    "accent-dark": p.dark.accent,
    "on-dark": p.dark.ink,
  };
}

export function contrastReport(palette) {
  const p = normalizePalette(palette);
  const rows = [];
  for (const mode of ["light", "dark"]) {
    const set = p[mode];
    rows.push({
      mode,
      pair: "brand / bg",
      ratio: contrast(set.brand, set.bg),
      min: MIN.brand,
      pass: contrast(set.brand, set.bg) >= MIN.brand,
    });
    rows.push({
      mode,
      pair: "ink / bg",
      ratio: contrast(set.ink, set.bg),
      min: MIN.ink,
      pass: contrast(set.ink, set.bg) >= MIN.ink,
    });
    rows.push({
      mode,
      pair: "accent / bg",
      ratio: contrast(set.accent, set.bg),
      min: MIN.accent,
      pass: contrast(set.accent, set.bg) >= MIN.accent,
    });
  }
  return rows;
}

export function validatePalette(palette) {
  const errors = [];
  const warnings = [];
  try {
    normalizePalette(palette);
  } catch (error) {
    return { errors: [error.message], warnings, rows: [] };
  }
  const rows = contrastReport(palette);
  for (const row of rows) {
    if (!row.pass) {
      errors.push(
        `${palette.name} ${row.mode}: ${row.pair} is ${row.ratio}:1, needs ${row.min}:1`,
      );
    }
  }
  return { errors, warnings, rows };
}

export function validateAll(data) {
  const errors = [];
  const warnings = [];
  for (const palette of data.palettes) {
    const result = validatePalette(palette);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }
  return { errors, warnings };
}

export function themeCss(palette) {
  const vars = paletteVars(palette);
  const lines = Object.entries(vars).map(([key, value]) => `  ${key}: ${value};`);
  return `/* logodeck palette: ${palette.name} */
:root {
${lines.join("\n")}
}

:root[data-theme="dark"],
:root.dark {
  --ld-bg: var(--ld-bg-dark);
  --ld-ink: var(--ld-ink-dark);
  --ld-brand: var(--ld-brand-dark);
  --ld-accent: var(--ld-accent-dark);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ld-bg: var(--ld-bg-dark);
    --ld-ink: var(--ld-ink-dark);
    --ld-brand: var(--ld-brand-dark);
    --ld-accent: var(--ld-accent-dark);
  }
}
`;
}

function mixWithWhite(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (channel) => Math.round(channel + (255 - channel) * amount);
  return rgbToHex(mix(r), mix(g), mix(b));
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function liftForContrast(hex, background, minimum) {
  for (let step = 0; step <= 20; step += 1) {
    const candidate = mixWithWhite(hex, step / 20 * 0.92);
    if (contrast(candidate, background) >= minimum) return candidate;
  }
  return mixWithWhite(hex, 0.92);
}

export function applyOverrides(palette, overrides = {}) {
  const out = normalizePalette(palette);
  for (const [rawKey, rawValue] of Object.entries(overrides)) {
    const key = rawKey.replace(/^--ld-/, "");
    const value = normalizeHex(rawValue, key);
    const darkMatch = key.match(/^(bg|ink|brand|accent)-dark$/);
    if (darkMatch) {
      out.dark[darkMatch[1]] = value;
      continue;
    }
    if (!THEME_KEYS.includes(key)) {
      throw new Error(`cannot override unknown token "${rawKey}"`);
    }
    out.light[key] = value;
    if (key === "bg") continue;
    const role = key === "ink" ? "ink" : key;
    out.dark[key] = liftForContrast(value, out.dark.bg, MIN[role]);
  }
  return out;
}

/* ------------------------------------------------------------------ CLI */

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      args[key] = value ?? argv[++i] ?? true;
    } else {
      args._.push(arg);
    }
  }
  return args;
}

function printReport(palette) {
  const rows = contrastReport(palette);
  console.log(`\n${palette.name} — ${palette.label ?? ""}`);
  if (palette.note) console.log(`  ${palette.note}`);
  console.log("  mode   pair          ratio   min   status");
  for (const row of rows) {
    console.log(
      `  ${row.mode.padEnd(6)} ${row.pair.padEnd(13)} ${String(row.ratio).padStart(5)}  ${String(
        row.min,
      ).padStart(4)}   ${row.pass ? "pass" : "FAIL"}`,
    );
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] ?? "list";
  const file = args.file ? resolve(args.file) : DEFAULT_PALETTES;
  const data = loadPalettes(file);

  if (command === "list") {
    for (const palette of data.palettes) {
      const result = validatePalette(palette);
      const mark = result.errors.length ? "FAIL" : "ok";
      console.log(`${mark.padEnd(5)} ${palette.name.padEnd(16)} ${palette.label ?? ""}`);
    }
    return;
  }

  if (command === "show") {
    const name = args._[1];
    if (!name) throw new Error("usage: palette.mjs show <name>");
    printReport(getPalette(name, file));
    return;
  }

  if (command === "check") {
    const name = args._[1];
    const targets = name ? [getPalette(name, file)] : data.palettes;
    let failed = false;
    for (const palette of targets) {
      printReport(palette);
      const result = validatePalette(palette);
      for (const warning of result.warnings) console.warn(`  warning: ${warning}`);
      if (result.errors.length) {
        failed = true;
        for (const error of result.errors) console.error(`  error: ${error}`);
      }
    }
    if (failed) process.exitCode = 1;
    return;
  }

  if (command === "css") {
    const name = args._[1];
    if (!name) throw new Error("usage: palette.mjs css <name>");
    process.stdout.write(themeCss(getPalette(name, file)));
    return;
  }

  throw new Error(`unknown command "${command}". Use list, show, check or css.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`palette: ${error.message}`);
    process.exit(2);
  }
}
