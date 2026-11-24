# Contributing

Logodeck is a design system with a small, dependency-free engine. Keep it that way.

## Ground rules

- No runtime dependency. The build, audit and palette scripts run on Node 20+ with the
  standard library only. Playwright is optional and only used to render PNG captures.
- No brand assets. Do not add a real logo, a trademark, a font file or a screenshot of a
  third-party mark. Every example must be original and fictional.
- No copied text. Write instructions in your own words. Cite ideas, never paste files.
- No secrets. Never commit tokens, keys, `.env` files or private URLs.

## Local checks

```bash
npm run lint          # structure, frontmatter, links, JSON, palettes, build, audit
npm run build:example # rebuild examples/loam/dist
npm run audit:example # audit every generated SVG
npm run typecheck     # requires typescript, react and @types/react installed
npm run capture       # requires playwright and a Chromium download
```

`npm run lint` rebuilds the example in a temporary directory and compares it with the
committed deck. If you change the manifest or a master, run `npm run build:example` and
commit the regenerated files in `examples/loam/dist`.

## Changing the engine

- Keep the output deterministic: no dates, no random ids, no machine-specific paths.
- Keep every variant derived from the same masters. Never patch a generated file by hand.
- Add or change a palette in `skills/logodeck/assets/palettes.json` and run the palette
  check. A palette that fails contrast is rejected.
- Update `references/variants.md` and the matrix in `SKILL.md` when the output list changes.

## Commits

Use a short, imperative subject. One logical change per commit. Do not mention tools or
assistants in the message.
