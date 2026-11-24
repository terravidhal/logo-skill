# Contributing

Logodeck is a design system with a small, dependency-free engine. Keep it that way.

## Ground rules

- No runtime dependency. The build, audit and palette scripts run on Node 20+ with the
  standard library only. Chromium is optional and only used to render PNG captures.
- No brand assets. Do not add a real logo, a trademark, a font file or a screenshot of a
  third-party mark. Every example must be original and fictional.
- No copied text. Write instructions in your own words. Cite ideas, never paste files.
- No secrets. Never commit tokens, keys, `.env` files or private URLs.

## Local checks

```bash
npm run lint          # structure, frontmatter, links, JSON, palettes, all builds, audits
npm run build:examples # rebuild every deck, primary and alternate palette
npm run boards        # regenerate the eight plates and the gallery
npm run proof         # regenerate the before/after page
npm run audit:examples # audit the committed decks without rebuilding
npm run typecheck     # requires typescript, react and @types/react installed
npm run capture       # requires Chromium; ffmpeg is optional for the GIF
```

`npm run lint` rebuilds every example in a temporary directory and compares it with the
committed decks. If you change a manifest or a master, run `npm run build:examples`,
`npm run boards` and `npm run proof`, then commit the regenerated files.

The seven added brands are drawn by `examples/make-masters.mjs`; run `npm run masters` before a
build if you edit that generator. The script is deterministic and writes only the seven brand
folders, never the Loam masters.

## Changing the engine

- Keep the output deterministic: no dates, no random ids, no machine-specific paths.
- Keep every variant derived from the same masters. Never patch a generated file by hand.
- Add or change a palette in `skills/logodeck/assets/palettes.json` and run the palette
  check. A palette that fails contrast is rejected.
- Update `references/variants.md` and the matrix in `SKILL.md` when the output list changes.
- The proof captures are the only heavy files in the repository. Do not add more image formats
  or duplicate captures: the four viewport/theme pairs per plate are the contract.

## Commits

Use a short, imperative subject. One logical change per commit. Do not mention tools or
assistants in the message.
