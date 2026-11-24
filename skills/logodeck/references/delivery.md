# Delivery and handover

A logo deck is a small design system. The handover must make it usable without a meeting, and
must be honest about what it does not cover.

## What to hand over

1. **The deck folder** — the 15 SVG files, the TSX, the tokens, the CSS and the preview.
2. **The masters** — `symbol.svg`, `wordmark.svg`, optional `symbolSmall.svg`, and the
   manifest. This is what the user edits later.
3. **The palette** — name, the seven tokens, the measured ratios.
4. **The usage rules** — clear space, minimum size, what not to do.
5. **The limits** — trademark, fonts, print, raster, untested environments.

Do not hand over only a PNG or only a screenshot. The editable source is the deliverable.

## Usage rules

Write these in the brand notes, not just in the chat.

### Clear space

Define one module, usually the symbol height or a fraction of it. The minimum clear space
around a lockup is 0.5–1 module on every side. No text, no image edge, no other logo may enter
that space.

### Minimum size

- Symbol: 16 px for the favicon drawing, 24–32 px for the master.
- Wordmark: the size where the counters stay open, usually 80–120 px wide on screen.
- Horizontal lockup: the size where the wordmark is still legible; measure it, do not guess.
- Stacked lockup: larger, because the wordmark is below the symbol.

### Colour

- Use the themed file for live colour.
- Use the fixed dark file on dark surfaces.
- Use the mono file for one-colour production.
- Do not recolour the symbol with an unrelated accent. The accent is a signal, not a second
  brand colour.

### Don'ts

- Do not stretch, squeeze, rotate, outline, add a shadow, add a gradient or place the mark on
  a busy photo without a contained version.
- Do not rebuild the lockup by moving the symbol and the wordmark by eye. Use the generated
  lockup or the manifest.
- Do not use the symbol as a bullet or as a decorative pattern at a size where it becomes
  noise.
- Do not put the logo inside another shape unless the brief calls for a contained emblem.

## Brand notes template

```
Brand:            <name>
Idea:             <one sentence>
Palette:          <name>, light/dark tokens, lowest contrast <ratio>
Primary mark:     <symbol | wordmark | lockup>
Minimum size:     <values>
Clear space:      <module>
Files:            <deck folder>
React:            <component name>, props, mode auto
Limits:           <trademark, fonts, print, raster>
```

## Honest limits

State these explicitly, in the reply and in the notes:

- **Trademark.** A visual search or a trademark clearance is not part of this work. The mark
  may conflict with an existing registration. The user must run a professional search before
  filing or launching.
- **Name and domain.** Availability is not checked. The skill draws a mark; it does not
  reserve a name.
- **Fonts.** If the wordmark was built from a typeface, the licence must allow modification
  and embedding. The deck contains paths, but the design may still be derivative. Replace the
  font or draw custom letters if the licence is unclear.
- **Print.** Screen colours are not a print specification. A Pantone/CMYK match must be proofed.
  Do not invent a Pantone number.
- **Raster.** PNG and ICO are optional and need Playwright/Chromium. If the environment lacks
  it, say so. The SVG deck is still complete.
- **Tests.** List the tests that ran. Do not claim a pixel test or a print proof you did not do.
- **Platforms.** App store icons, favicons and maskable icons have platform-specific rules.
  The generated files are source art; the store build may need extra exports.
- **Language.** A wordmark in a script you cannot read needs a native review. Do not guess at
  letterforms or diacritics.

## Final report format

Keep it short. The user can open the files.

```
Done. Idea: <one sentence>.

Deck: <path> (15 SVG, TSX, tokens, CSS, preview)
Palette: <name> — lowest contrast <ratio>:1; dark set included.
React: <Component /> with variant, type, mode, title; no Tailwind.
Tested: 16 px, mono, inverted, mirror, blur, letter, junction, peer.
Audit: 0 errors, 0 warnings.
Limits: trademark and font licence not cleared; <raster/print status>.
Next: <one optional action>.
```

If the work is a critique, do not deliver a deck. Deliver the scorecard, the three priority
fixes and one proposed direction, and wait for approval.

## Maintainability

- One manifest and two masters is the source of truth.
- A colour change is one token, then a rebuild. Never edit 15 files by hand.
- A geometry change is a manifest value, then a rebuild. If a lockup needs a manual nudge,
  add it to the manifest in a future version rather than patching the output.
- Keep the generated files in version control so a diff shows exactly what changed.
- Do not commit secrets, `.env` files, private URLs or third-party brand assets.
- Do not publish, push or deploy as part of the skill. Delivery is local unless the user asks
  for a specific publishing action.

## Decision log

For a real project, keep three lines:

```
Chosen direction: <name> because <reason>.
Rejected: <direction> because <reason>.
Open question: <the one thing the user must decide>.
```

This is more useful than a mood board and it prevents the next person from re-litigating the
same three ideas.
