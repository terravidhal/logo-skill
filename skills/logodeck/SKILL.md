---
name: logodeck
description: >-
  Design an original logo and deliver the complete identity deck in one run:
  symbol, mono symbol, dark version, wordmark, horizontal and stacked lockups,
  favicon, app icon, maskable icon, themed SVG, palette CSS, tokens, an inspected
  preview and a typed React component with automatic light/dark mode. Use when
  the user asks for a logo, logomark, wordmark, monogram, brand mark, app icon,
  favicon, logo variants, a logo kit or deck, a rebrand, a colour change on an
  existing mark, or a React logo component — even when they do not say "logo".
  Enforces a short brief, category clichés to avoid, geometric SVG built from
  paths, optical corrections, 16 px and one-colour tests, accessible contrast,
  and a strict refusal to copy or trace an existing brand.
license: MIT
---

# logodeck

A logo is an identifier, not an explanation. One idea, drawn once, readable small, works in
one colour, survives a decade. This skill gets you from a name and a promise to a complete,
consistent deck of files, not a single untested SVG.

## The contract

- **One idea.** If you need a paragraph to explain the mark, it is not a mark yet.
- **Black first.** Choose the shape in one colour. Colour comes after the form survives.
- **Small first.** It must read at 16 px. If it only works at 256 px, it is an illustration.
- **One source.** The symbol and the wordmark are the only drawings. Every other file is
  composed from them. Never patch a generated file by hand.
- **Original only.** Never copy, trace, mirror or "make it like" an existing brand. A request
  to imitate is a request for a direction, not a copy.
- **Measured, not claimed.** Run the audit, the contrast check and the small-size tests.
  Do not write "tested" if you did not run it.

## Choose the mode

| Mode | Trigger | Output |
|---|---|---|
| **Design** (default) | new logo, brand mark, app icon | brief, three directions, full deck |
| **Review** | "show me first", strategic rebrand | three concepts, one image, a recommendation, then wait |
| **Critique** | "critique this logo" | scorecard, three priority fixes, no unrequested redraw |
| **Redesign** | existing mark, new positioning | keep the recognition cues that still work, rebuild the rest |
| **Assets** | existing logo, missing variants | favicon, app icon, mono, dark, lockups from the supplied art |
| **Theme** | "change the brand colour" | one token change, rebuild, all variants follow |

State the mode in one sentence at the top of the reply. Do not impose a checkpoint when the
user explicitly asked for the full deck; the deck is the promise. Use **Review** only when the
user asks to see concepts first or the decision is high-stakes.

## Workflow

Follow the steps in order. Skip a step only when the user already supplied its output.

### 0. Read the request

Extract: name, category, audience, promise, language, existing assets, hard constraints,
delivery format. Ask **at most five** questions. If the answers are not available, write your
assumptions explicitly and continue. Never block the work on a question you can answer with a
reasonable assumption.

### 1. Write a one-page brief

Name, one-sentence promise, audience, three to five adjectives, two or three competitors,
constraints, and what the mark must **not** say. Fill `references/brief.md` in your working
notes, not in the final deliverable.

### 2. Research the category, then reject its clichés

List the conventions a buyer expects, then list the clichés you will not draw. A leaf for
sustainability, a shield for security, a chat bubble for messaging, a swoosh for motion, a
pin for local: these are category wallpaper. Use the convention to be legible, then find a
specific angle the category does not own. Build a word map: literal nouns, verbs, materials,
tools, sounds, local references, opposite ideas.

If web search is available, verify current conventions and look for recent rebrands in the
category. If it is not, say so and rely on the brief plus the trope list. Do not pretend you
researched.

### 3. Generate concepts, then choose three directions

Write 8–12 ideas as one sentence each. Each idea must describe a **shape**, not a mood:
"a seed whose crack is a contour line", not "growth and trust". Then select three directions
that use **different mark types** (for example: pictorial, abstract, monogram; or wordmark-led,
symbol-led, combination). For each, write:

- the shape in one sentence;
- why it fits the brief;
- what it risks;
- the category cliché it avoids.

Pick one. State the reason in one paragraph. Do not average three ideas into a camel.

### 4. Draw two masters

Create `symbol.svg` and `wordmark.svg`, each tightly cropped with a clean `viewBox`. Use
filled paths only. The colour comes from tokens:

```svg
fill="var(--ld-brand, #1F6F4A)"
```

The symbol must work alone. The wordmark must be built from paths, never from `<text>`.
Read `references/geometry.md` and `references/typography.md` before drawing. Run the audit on
the masters, then build the deck.

### 5. Test, then refine

Run the build, the audit and the visual tests in `references/testing.md`: 16 px, one colour,
inverted, mirrored, blurred, letter test, junction check, peer test. Fix the drawing, rebuild,
and test again. Two passes minimum. A test you did not run does not count.

### 6. Build the deck

```bash
# from the repository that contains the skill
node skills/logodeck/scripts/build.mjs examples/loam/logo.json

# from an installed skill (find the folder once, then reuse it)
node "$SKILL_DIR/scripts/build.mjs" path/to/logo.json

# another palette, or one changed token
node "$SKILL_DIR/scripts/build.mjs" logo.json --palette cobalt-mint
node "$SKILL_DIR/scripts/build.mjs" logo.json --theme brand=#0F6B5C

# optional raster exports (needs playwright + chromium)
node "$SKILL_DIR/scripts/build.mjs" logo.json --png 16,32,192,512 --ico

# audit the whole deck, including the matrix and the React component
node "$SKILL_DIR/scripts/audit.mjs" path/to/dist
```

Inspect the generated preview with a browser. If Playwright is available, capture the deck
at 1440 px and 390 px, light and dark, and look at the images yourself. If it is not
available, open the preview another way and say that you could not run the pixel test.

### 7. Deliver

Report exactly what exists, where it is, which palette was used, which tests ran, and what
is still a limitation. Read `references/delivery.md` for the handover format.

## Manifest

```json
{
  "name": "Loam",
  "slug": "loam",
  "component": "LoamLogo",
  "title": "Loam — soil health for small farms",
  "palette": "moss-clay",
  "altPalette": "clay-cream",
  "files": {
    "symbol": "symbol.svg",
    "wordmark": "wordmark.svg",
    "symbolSmall": "symbol-small.svg"
  },
  "geometry": {
    "symbolHeight": 1,
    "wordmarkHeight": 0.44,
    "gap": 0.3,
    "padding": 0.08,
    "stackedGap": 0.22,
    "appIconScale": 0.62,
    "appIconRadius": 0.225,
    "faviconScale": 0.68,
    "maskableScale": 0.5
  },
  "out": "dist",
  "altOut": "dist-alt"
}
```

`symbolSmall` is optional: a simplified drawing with thicker negative space for the favicon.
`altPalette` is optional: run the build again with `--palette altPalette --out altOut` to get a
second complete deck from the same two masters, so the client can compare two palettes without
redrawing. All paths are relative to the manifest. The geometry values are unitless ratios; the
build turns them into a composed `viewBox`.

## What the deck contains

| File | Use |
|---|---|
| `<slug>-symbol.svg` | primary mark, themed with CSS variables |
| `<slug>-symbol-mono.svg` | one-colour UI, `currentColor` |
| `<slug>-symbol-dark.svg` | dedicated colours for dark backgrounds |
| `<slug>-wordmark.svg` | name as paths, themed |
| `<slug>-wordmark-mono.svg` | one-colour wordmark |
| `<slug>-wordmark-dark.svg` | wordmark on dark |
| `<slug>-lockup-horizontal.svg` | header and signature, themed |
| `<slug>-lockup-horizontal-mono.svg` | one-colour lockup |
| `<slug>-lockup-horizontal-dark.svg` | lockup on dark |
| `<slug>-lockup-stacked.svg` | square formats, social avatars, covers |
| `<slug>-lockup-stacked-mono.svg` | one-colour stacked |
| `<slug>-lockup-stacked-dark.svg` | stacked on dark |
| `<slug>-favicon.svg` | 16/32 px, simplified or tightly cropped |
| `<slug>-app-icon.svg` | rounded tile, safe margin |
| `<slug>-app-icon-maskable.svg` | full bleed, 50 % mark for maskable PWA |
| `<slug>.tsx` | typed React component, modes light/dark/auto |
| `<slug>-tokens.json` | palette, modes and measured ratios |
| `<slug>-palette.css` | CSS custom properties for both themes |
| `<slug>-preview.html` | standalone control sheet |

Do not hand-edit the output. If a file is wrong, fix the master or the manifest and rebuild.

## Theme in one line

```html
<svg class="logo" style="--ld-brand:#0F6B5C; --ld-accent:#FF6B4A">…</svg>
```

```tsx
<LoamLogo type="horizontal" style={{ "--ld-brand": "#0F6B5C" }} />
```

```css
:root { --ld-brand: #0F6B5C; --ld-accent: #FF6B4A; }
```

Tokens: `--ld-bg`, `--ld-ink`, `--ld-brand`, `--ld-accent`, plus the `-dark` variants.
The palette CSS maps the base tokens to the dark set under `[data-theme="dark"]` and
`prefers-color-scheme`. A file loaded with `<img src>` does not inherit page variables:
use the inline themed SVG for live theming, or the generated fixed dark file for `<img>`.

## React component

```tsx
type Props = Omit<SVGProps<SVGSVGElement>, "type"> & {
  variant?: "color" | "mono";
  type?: "icon" | "wordmark" | "horizontal" | "stacked";
  mode?: "auto" | "light" | "dark";
  title?: string;
};
```

- `variant="mono"` works for every `type` with `currentColor`.
- `mode="auto"` observes `.dark`, `[data-theme]` and `prefers-color-scheme` with
  `useSyncExternalStore`; the server snapshot is light.
- `title=""` makes the mark decorative (`aria-hidden`); a non-empty title adds `role="img"`,
  `aria-label` and a `<title>`.
- Default height is `1em`; width follows the mark ratio unless supplied.
- No Tailwind, no CSS import, no package beyond `react`. Theme through `style` variables.

## Hard rules

- No `<text>` in any logo file: a wordmark is paths.
- No `<image>`, embedded raster, `<foreignObject>` or `<filter>`.
- No stroke in a master; expand it to filled paths. No masks if a boolean path can do the job.
- At most four literal colours outside tokens; three is better. Flat fills, no decorative
  gradients.
- Contrast floors: brand on background ≥ 3:1, ink on background ≥ 4.5:1, accent on
  background ≥ 3:1, in both light and dark. Fix the palette, do not hide the warning.
- Never copy or trace a third-party mark. Never imply affiliation, endorsement or origin.
- Never publish, push, deploy or create an account as part of this skill.
- Do not claim a font, a trademark clearance or a pixel test you did not verify.

## Final checklist

- [ ] One sentence explains the idea.
- [ ] The symbol reads without the wordmark.
- [ ] Legible at 16 px, in one colour, inverted, mirrored and blurred.
- [ ] Dark version has its own colours, not a white recolour.
- [ ] Favicon uses a simplified or bolder drawing.
- [ ] Lockups use one spacing module; optical balance looks right.
- [ ] Palette passes the contrast floor in both modes.
- [ ] All 15 SVG files, tokens, CSS, preview and TSX exist.
- [ ] `audit.mjs` reports zero errors; the TSX typechecks in CI or locally.
- [ ] The preview was actually inspected.
- [ ] Limits are stated: trademark, font licence, untested environments.

## Response format

Keep the final reply short and concrete:

1. **Idea** — one sentence.
2. **Files** — the deck folder and anything notable (`symbol-small.svg`, palette).
3. **Palette** — name, lowest measured contrast, dark-mode note.
4. **Tests** — which ones ran, which images were inspected, audit score.
5. **Limits** — trademark, font licence, raster export if Playwright was unavailable.
6. **Next step** — one optional action (rename, palette swap, print variant).

Do not paste all the SVG source in the reply. Put it in files and point to them.

## References

Read only what the task needs; the whole folder is short.

| File | Read it for |
|---|---|
| `references/brief.md` | discovery, assumptions, word map, category clichés |
| `references/marks.md` | choosing a mark type, symbol vs wordmark, lockups |
| `references/geometry.md` | SVG construction, curves, viewBox, optical corrections |
| `references/typography.md` | building a wordmark, spacing, font licensing |
| `references/color.md` | tokens, contrast, dark mode, palette selection |
| `references/testing.md` | named tests, how to run them, scorecard |
| `references/variants.md` | file matrix, favicon, app icon, React component |
| `references/delivery.md` | handover, usage rules, honest limits |
