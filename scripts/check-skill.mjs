#!/usr/bin/env node
/**
 * Repository check for logodeck.
 *
 * Validates the skill structure, frontmatter, links, JSON, palettes, the example build,
 * the audit matrix, the committed deck, the React component, secrets and size budgets.
 *
 *   node scripts/check-skill.mjs [--no-build] [--verbose]
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPalettes, validateAll } from "../skills/logodeck/scripts/palette.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = join(ROOT, "skills/logodeck");
const errors = [];
const warnings = [];
const checks = [];

const argv = new Set(process.argv.slice(2));
const skipBuild = argv.has("--no-build");
const verbose = argv.has("--verbose");

function ok(message) {
  checks.push({ state: "ok", message });
  if (verbose) console.log(`  ok   ${message}`);
}

function fail(message) {
  errors.push(message);
  if (verbose) console.log(`  FAIL ${message}`);
}

function warn(message) {
  warnings.push(message);
  if (verbose) console.log(`  warn ${message}`);
}

function check(condition, message) {
  if (condition) ok(message);
  else fail(message);
  return condition;
}

function read(file) {
  return readFileSync(file, "utf8");
}

function walk(directory, options = {}, output = []) {
  if (!existsSync(directory)) return output;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (options.skip?.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path, options, output);
    else output.push(path);
  }
  return output;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  const fields = {};
  let current = null;
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
    if (kv) {
      current = kv[1];
      const value = kv[2].trim();
      fields[current] = value === ">-" || value === "|" ? "" : value;
      continue;
    }
    if (current && /^\s+/.test(line)) {
      fields[current] = `${fields[current]} ${line.trim()}`.trim();
      continue;
    }
    if (line.trim() === "") continue;
    current = null;
  }
  return fields;
}

function parseJsonFile(file) {
  try {
    return JSON.parse(read(file));
  } catch (error) {
    fail(`${relative(ROOT, file)} is not valid JSON: ${error.message}`);
    return null;
  }
}

function requireFile(file, label = relative(ROOT, file)) {
  return check(existsSync(file), `${label} exists`);
}

function scanSecrets() {
  const patterns = [
    [/AKIA[0-9A-Z]{16}/, "AWS access key"],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
    [/ghp_[0-9A-Za-z]{30,}/, "GitHub token"],
    [/xox[baprs]-[0-9A-Za-z-]{10,}/, "Slack token"],
    [/sk-[0-9A-Za-z]{20,}/, "API secret key"],
    [/https?:\/\/[^\s/@]+:[^\s/@]+@/, "credentials in a URL"],
  ];
  const files = walk(ROOT, {
    skip: new Set(["ref", "node_modules", ".git", ".vague", "dist", ".next"]),
  }).filter((file) => statSync(file).size < 300_000);
  let hits = 0;
  for (const file of files) {
    if (basename(file) === ".env" || basename(file).startsWith(".env.")) {
      fail(`secret file present: ${relative(ROOT, file)}`);
      hits += 1;
      continue;
    }
    if (!/\.(md|json|mjs|js|ts|tsx|yml|yaml|css|html|svg|txt|sh)$/i.test(file)) continue;
    const text = read(file);
    for (const [pattern, label] of patterns) {
      if (pattern.test(text)) {
        fail(`${label} pattern in ${relative(ROOT, file)}`);
        hits += 1;
      }
    }
  }
  if (!hits) ok("no secret patterns found");
}

function staticTsxCheck(file) {
  const text = read(file);
  check(!/dangerouslySetInnerHTML/.test(text), "TSX does not use dangerouslySetInnerHTML");
  check(/useSyncExternalStore/.test(text), "TSX implements mode auto with useSyncExternalStore");
  for (const prop of ["variant", "type", "mode", "title"]) {
    check(new RegExp(`${prop}\\??:`).test(text), `TSX exposes "${prop}"`);
  }
  const imports = [...text.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);
  check(imports.every((name) => name === "react"), "TSX imports only react");
  check(!/tailwind|className="[^"]*\b(dark:|bg-|text-)/.test(text), "TSX does not require Tailwind");
  check(/--ld-brand/.test(text), "TSX keeps the brand token");
  check(/const LIGHT/.test(text) && /const DARK/.test(text), "TSX ships light and dark palettes");
}

function compareDeck(tempDir) {
  const committed = join(ROOT, "examples/loam/dist");
  if (!existsSync(committed)) {
    fail("examples/loam/dist is missing; run npm run build:example");
    return;
  }
  const generated = readdirSync(tempDir).sort();
  const expected = [
    "loam-app-icon-maskable.svg",
    "loam-app-icon.svg",
    "loam-favicon.svg",
    "loam-lockup-horizontal-dark.svg",
    "loam-lockup-horizontal-mono.svg",
    "loam-lockup-horizontal.svg",
    "loam-lockup-stacked-dark.svg",
    "loam-lockup-stacked-mono.svg",
    "loam-lockup-stacked.svg",
    "loam-palette.css",
    "loam-preview.html",
    "loam-symbol-dark.svg",
    "loam-symbol-mono.svg",
    "loam-symbol.svg",
    "loam-tokens.json",
    "loam-wordmark-dark.svg",
    "loam-wordmark-mono.svg",
    "loam-wordmark.svg",
    "loam.tsx",
  ].sort();
  check(
    JSON.stringify(generated) === JSON.stringify(expected),
    "the example build produces the expected 19 files",
  );
  let differences = 0;
  for (const name of generated) {
    const committedFile = join(committed, name);
    if (!existsSync(committedFile)) {
      fail(`committed deck is missing ${name}; run npm run build:example`);
      differences += 1;
      continue;
    }
    if (read(committedFile) !== read(join(tempDir, name))) {
      fail(`committed ${name} is stale; run npm run build:example`);
      differences += 1;
    }
  }
  if (!differences) ok("the committed deck is reproducible");
  const extras = readdirSync(committed).filter((name) => !expected.includes(name));
  if (extras.length) warn(`committed deck has extra files: ${extras.join(", ")}`);
}

function buildAndAudit() {
  const tempDir = mkdtempSync(join(tmpdir(), "logodeck-"));
  try {
    const build = spawnSync(
      process.execPath,
      [
        join(SKILL, "scripts/build.mjs"),
        join(ROOT, "examples/loam/logo.json"),
        "--out",
        tempDir,
        "--quiet",
      ],
      { encoding: "utf8" },
    );
    if (build.status !== 0) {
      fail(`example build failed: ${(build.stderr || build.stdout || "").trim()}`);
      return;
    }
    ok("example build succeeds");
    compareDeck(tempDir);

    const audit = spawnSync(
      process.execPath,
      [join(SKILL, "scripts/audit.mjs"), tempDir, "--json"],
      { encoding: "utf8" },
    );
    let report = null;
    try {
      report = JSON.parse(audit.stdout);
    } catch {
      fail(`audit did not return JSON: ${(audit.stderr || audit.stdout || "").trim()}`);
      return;
    }
    if (report.errors > 0 || audit.status !== 0) {
      for (const entry of report.reports ?? []) {
        for (const error of entry.errors ?? []) fail(`audit ${entry.file}: ${error}`);
      }
      for (const error of report.matrix ?? []) fail(`audit matrix: ${error}`);
    } else {
      ok(`audit passes with ${report.warnings} warnings (score ${report.score})`);
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function checkSizeBudget() {
  const skillFiles = walk(SKILL, { skip: new Set(["node_modules"]) });
  const skillBytes = skillFiles.reduce((sum, file) => sum + statSync(file).size, 0);
  check(skillBytes < 320_000, `skill folder is ${Math.round(skillBytes / 1024)} KB (< 320 KB)`);
  const repoFiles = walk(ROOT, {
    skip: new Set(["ref", "node_modules", ".git", ".vague", "dist", ".next"]),
  });
  const repoBytes = repoFiles.reduce((sum, file) => sum + statSync(file).size, 0);
  check(repoBytes < 2_500_000, `repository is ${Math.round(repoBytes / 1024)} KB (< 2.5 MB)`);
}

function main() {
  console.log("logodeck — repository check\n");

  // Structure
  const required = [
    "README.md",
    "LICENSE",
    "CONTRIBUTING.md",
    "package.json",
    "evals/evals.json",
    "scripts/check-skill.mjs",
    ".github/workflows/check.yml",
    "assets/readme/before-after.svg",
    "assets/readme/family.svg",
    "assets/templates/logo.config.example.json",
    "assets/templates/symbol.svg",
    "assets/templates/wordmark.svg",
    "examples/loam/logo.json",
    "examples/loam/symbol.svg",
    "examples/loam/symbol-small.svg",
    "examples/loam/wordmark.svg",
    "examples/capture.mjs",
    "examples/site/index.html",
    "examples/typecheck/tsconfig.json",
    "skills/logodeck/SKILL.md",
    "skills/logodeck/assets/palettes.json",
    "skills/logodeck/scripts/build.mjs",
    "skills/logodeck/scripts/audit.mjs",
    "skills/logodeck/scripts/palette.mjs",
  ];
  for (const file of required) requireFile(join(ROOT, file));

  const references = [
    "brief.md",
    "marks.md",
    "geometry.md",
    "typography.md",
    "color.md",
    "testing.md",
    "variants.md",
    "delivery.md",
  ];
  for (const name of references) requireFile(join(SKILL, "references", name));

  // Frontmatter
  const skillFile = join(SKILL, "SKILL.md");
  if (existsSync(skillFile)) {
    const text = read(skillFile);
    const frontmatter = parseFrontmatter(text);
    check(Boolean(frontmatter), "SKILL.md has frontmatter");
    if (frontmatter) {
      check(frontmatter.name === "logodeck", `frontmatter name is logodeck (got "${frontmatter.name}")`);
      const description = frontmatter.description ?? "";
      check(description.length >= 300, `description is precise (${description.length} chars)`);
      check(description.length <= 1100, `description stays under 1100 chars (${description.length})`);
      for (const word of [
        "logo",
        "wordmark",
        "favicon",
        "app icon",
        "variants",
        "React",
        "SVG",
        "contrast",
      ]) {
        check(description.toLowerCase().includes(word.toLowerCase()), `description mentions ${word}`);
      }
      check(frontmatter.license === "MIT", "frontmatter license is MIT");
    }
    check(/\bno copy|never copy|copied|copy, trace|copy or trace/i.test(text), "SKILL.md forbids copying");
    check(/audit\.mjs/.test(text), "SKILL.md documents the audit");
    check(/build\.mjs/.test(text), "SKILL.md documents the build");
    for (const name of references) {
      check(text.includes(`references/${name}`), `SKILL.md links references/${name}`);
    }
  }

  // Fontmatter description budget warning for the whole skill
  // JSON files
  for (const file of [
    "package.json",
    "evals/evals.json",
    "skills/logodeck/assets/palettes.json",
    "examples/loam/logo.json",
    "examples/loam/dist/loam-tokens.json",
    "assets/templates/logo.config.example.json",
  ]) {
    const path = join(ROOT, file);
    if (existsSync(path)) parseJsonFile(path);
  }

  // Palettes
  try {
    const data = loadPalettes(join(SKILL, "assets/palettes.json"));
    check(data.palettes.length >= 7, `palettes.json offers ${data.palettes.length} palettes`);
    const result = validateAll(data);
    if (result.errors.length) for (const error of result.errors) fail(`palette: ${error}`);
    else ok("all palettes pass the contrast floor");
    for (const warning of result.warnings) warn(`palette: ${warning}`);
  } catch (error) {
    fail(`palette check failed: ${error.message}`);
  }

  // Masters
  for (const name of ["symbol.svg", "symbol-small.svg", "wordmark.svg"]) {
    const file = join(ROOT, "examples/loam", name);
    if (!existsSync(file)) continue;
    const text = read(file);
    check(/viewBox="[^"]+"/.test(text), `${name} has a viewBox`);
    check(!/<(text|image|filter|foreignObject)\b/i.test(text), `${name} has no forbidden element`);
    check(!/\bstroke\s*=/.test(text), `${name} has no live stroke`);
    check(/var\(--ld-[a-z-]+,\s*#[0-9A-Fa-f]{3,8}\)/.test(text), `${name} uses token fallbacks`);
  }

  // Evals
  const evalsFile = join(ROOT, "evals/evals.json");
  if (existsSync(evalsFile)) {
    const evals = parseJsonFile(evalsFile);
    check(Array.isArray(evals?.cases) && evals.cases.length >= 6, "evals.json has at least 6 cases");
    if (evals?.cases) {
      for (const item of evals.cases) {
        check(Boolean(item.id && item.prompt), `eval ${item.id ?? "?"} has an id and a prompt`);
        check(
          Array.isArray(item.must) && item.must.length > 0,
          `eval ${item.id ?? "?"} declares expected behaviour`,
        );
        check(
          Array.isArray(item.mustNot) && item.mustNot.length > 0,
          `eval ${item.id ?? "?"} declares forbidden behaviour`,
        );
      }
    }
  }

  // README
  const readme = join(ROOT, "README.md");
  if (existsSync(readme)) {
    const text = read(readme);
    check(/npx skills add terravidhal\/logodeck/.test(text), "README shows the install command");
    check(text.includes("assets/readme/before-after.svg"), "README links the before/after plate");
    check(text.includes("assets/readme/family.svg"), "README links the family plate");
    check(/MIT/.test(text), "README states the licence");
    check(/does not|won't|will not/i.test(text), "README states the limits");
  }

  // TSX
  const tsx = join(ROOT, "examples/loam/dist/loam.tsx");
  if (existsSync(tsx)) staticTsxCheck(tsx);

  // CI
  const ci = join(ROOT, ".github/workflows/check.yml");
  if (existsSync(ci)) {
    const text = read(ci);
    check(/npm run lint/.test(text), "CI runs npm run lint");
    check(/typecheck|tsc/.test(text), "CI typechecks the generated component");
    check(/build:example|build\.mjs/.test(text), "CI builds the example");
  }

  // Secrets and size
  scanSecrets();
  checkSizeBudget();

  if (!skipBuild) buildAndAudit();

  console.log(`\n${errors.length ? "FAILED" : "PASS"} — ${checks.filter((c) => c.state === "ok").length} ok · ${errors.length} errors · ${warnings.length} warnings\n`);
  for (const error of errors) console.error(`  error: ${error}`);
  for (const warning of warnings) console.warn(`  warning: ${warning}`);
  if (errors.length) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(`check-skill: ${error.message}`);
  process.exit(1);
}
