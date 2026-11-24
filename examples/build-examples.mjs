#!/usr/bin/env node
/**
 * Build every example in two palettes and audit the result.
 *
 *   node examples/build-examples.mjs [--no-build|--no-audit] [--only slug]
 *
 * The decks are deterministic: no dates, no random ids, no machine-specific paths.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "../skills/logodeck/scripts/build.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const args = process.argv.slice(2);
const noAudit = args.includes("--no-audit");
const noBuild = args.includes("--no-build");
const onlyIndex = args.indexOf("--only");
const only = onlyIndex >= 0 ? args[onlyIndex + 1] : null;

const examples = readdirSync(HERE, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => name !== "site" && name !== "typecheck")
  .filter((name) => !only || name === only)
  .filter((name) => {
    try {
      return statSync(join(HERE, name, "logo.json")).isFile();
    } catch {
      return false;
    }
  })
  .sort();

let failed = false;
if (!noBuild) {
  for (const slug of examples) {
    const dir = join(HERE, slug);
    const manifestFile = join(dir, "logo.json");
    const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
    console.log(`\n${manifest.name} — ${manifest.palette} + ${manifest.altPalette}`);

    const primary = await build(manifestFile, {
      out: join(dir, manifest.out ?? "dist"),
      quiet: true,
    });
    console.log(`  ${primary.written.length} files → ${manifest.out ?? "dist"}`);

    if (manifest.altPalette) {
      const alt = await build(manifestFile, {
        out: join(dir, manifest.altOut ?? "dist-alt"),
        palette: manifest.altPalette,
        quiet: true,
      });
      console.log(`  ${alt.written.length} files → ${manifest.altOut ?? "dist-alt"}  (${manifest.altPalette})`);
    }
  }
}

if (!noAudit) {
  console.log("\naudit");
  for (const slug of examples) {
    const dir = join(HERE, slug);
    const manifest = JSON.parse(readFileSync(join(dir, "logo.json"), "utf8"));
    const targets = [join(dir, manifest.out ?? "dist")];
    if (manifest.altPalette) targets.push(join(dir, manifest.altOut ?? "dist-alt"));
    const audit = spawnSync(
      process.execPath,
      [join(ROOT, "skills/logodeck/scripts/audit.mjs"), ...targets, "--json"],
      { encoding: "utf8" },
    );
    let report;
    try {
      report = JSON.parse(audit.stdout);
    } catch {
      console.error(`  ${slug}: audit did not return JSON`);
      console.error((audit.stderr || audit.stdout || "").trim());
      failed = true;
      continue;
    }
    const state = report.errors === 0 ? "ok" : "FAIL";
    console.log(`  ${state.padEnd(4)} ${slug.padEnd(10)} score ${report.score} · ${report.errors} errors · ${report.warnings} warnings`);
    if (report.errors) {
      failed = true;
      for (const entry of report.reports ?? []) {
        for (const error of entry.errors ?? []) console.error(`        ${entry.file}: ${error}`);
      }
      for (const error of report.matrix ?? []) console.error(`        matrix: ${error}`);
    }
  }
}

if (failed) process.exitCode = 1;
