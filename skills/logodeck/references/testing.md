# Testing a logo

A logo is tested by looking at it in the conditions it will actually meet. The tests below
are named so you can report them honestly and repeat them after each change. Run at least two
rounds: build, look, fix, rebuild, look again.

## The tests

### 1. 16 px test

Render the symbol at 16 × 16 px, then at 24, 32 and 64. At 16 px the mark must still be
recognisable and the negative space must not close. If the favicon is a different drawing
(`symbolSmall`), test that one too.

```bash
node "$SKILL_DIR/scripts/build.mjs" logo.json --png 16,32,64
```

Then open the PNGs at 100 % or place them in a browser tab mock. Do not judge a 16 px test by
zooming in; the point is the unzoomed pixel.

### 2. One-colour test

Open the mono file. It uses `currentColor`, so set a dark ink and a light ink. The mark must
keep its reading with no colour cues: no shape may depend on a hue change to be understood.
If two masses merge in mono, add a real gap.

### 3. Inverted test

Place the mono mark on a dark surface, then the dark file on its real dark background. Check
for irradiation: a light shape on dark appears to grow. If the mark looks fat, reduce its
weight for the dark version or use a softer off-white.

### 4. Mirror test

Flip the mark horizontally. Asymmetry should be intentional; the mirrored version is a quick
way to spot an accidental lean, an unbalanced mass or a hidden letter. Do not deliver the
mirror unless reflection is part of the brief.

### 5. Blur / squint test

Apply a 4–6 px blur or squint at the screen. The silhouette must still read. If the idea
disappears, the mark depends on detail that will not survive a favicon, a photo background or
a bad printer.

### 6. Letter test

Read the mark as a letter or a word it is not supposed to be. A sprout that reads as a `Y`, a
negative space that reads as an `A`, a pair that reads as a rude word in another language:
all are failures. Test the wordmark for `rn`/`m`, `cl`/`d`, `vv`/`w` collisions.

### 7. Junction check

Zoom to 400–800 % and inspect every place where two shapes meet. Look for a dark knot, a
one-pixel step, a tangent kink, a curve that overshoots the join, or a counter that pinches.
Fix the geometry; do not cover it with a rounded cap.

### 8. Peer / shelf test

Place the mark at the same optical size as three or four real competitors. It must look like it
belongs to the category and still be distinguishable. If it disappears, the weight or the
contrast is too low. If it shouts, it is too heavy or too saturated.

### 9. Repetition test

Repeat the mark in a row, a grid, a pattern and a small avatar. A mark that only works once
will fail in a product UI, a map, a list or a partner lockup. Check the rhythm and the spacing
between repeats.

### 10. Background test

Place the themed file on the brand background, on white, on a photo, on a dark UI and on a
coloured partner background. If it needs a white sticker to survive, design a contained
version instead of adding a halo.

### 11. Accessibility test

- Contrast measured, not guessed.
- Decorative use has `aria-hidden`; a standalone mark has `title` or `aria-label`.
- The mark is not the only carrier of meaning in a UI.
- The favicon is recognisable in a crowded tab bar.

### 12. Rebuild test

Change one token with `--theme brand=#…` and rebuild. Every themed file must follow. If one
file does not change, the composition or the substitution is wrong. Then change back.

## The two-pass rule

One pass is not a test; it is a look. After the first build:

1. Write down the three worst things you see, in order.
2. Fix the geometry, not the presentation.
3. Rebuild and run the same tests.
4. If the top problem is gone and no new one appeared, stop. If not, do a third pass.

Do not "improve" indefinitely. A logo is finished when the tests pass and the idea is clear,
not when you are bored.

## What the scripts check

`audit.mjs` checks the deterministic rules:

- no `<text>`, `<image>`, `<foreignObject>`, `<filter>`;
- no stroke, no embedded raster;
- `viewBox` present, positive and tight when there is no nested composition;
- no duplicate IDs;
- at most four literal colours;
- every token has a fallback;
- mono files contain no colour;
- `<title>` and `role="img"` present;
- the variant matrix is complete;
- the TSX has `variant`, `type`, `mode`, `title`, no Tailwind, no `dangerouslySetInnerHTML`.

What it cannot check: whether the idea is good, whether the mark reads at 16 px, whether the
junction is beautiful, whether the colour feels right. Those are your job.

## Scorecard

Use this in a critique or a review checkpoint. Score 1–5, then write the one fix that matters.

| Criterion | Question |
|---|---|
| Idea | Can I say what it is in one sentence? |
| Silhouette | Does it read in one colour, blurred? |
| Small size | Does it survive 16 px? |
| Distinctiveness | Does it avoid the category cliché? |
| Craft | Are the curves, joints and counters clean? |
| System | Do symbol, wordmark and lockups share a logic? |
| Colour | Does the palette pass and support the idea? |
| Fit | Does it match the brief and the audience? |
| Longevity | Will it still look intentional in ten years? |

A 5 in every row is suspicious. A 2 in "Idea" cannot be fixed by a colour change.

## Captures

When Playwright is available, capture the preview in light and dark, at 1440 px and 390 px,
and inspect the images. Save them next to the deck or in `assets/readme/` for the repository.
Name them by surface, theme and width: `deck-1440-light.png`, `deck-390-dark.png`.

If Playwright is not available, say so in the report. Do not claim a pixel test you did not
run. The SVG build and the audit still work without a browser.

## Reporting

In the final reply, list the tests that actually ran:

```
Tested: 16 px, mono, inverted, mirror, blur, letter, junction, peer.
Audit: 0 errors, 0 warnings.
Capture: preview inspected at 1440 px light/dark; no Playwright PNG.
Not tested: print proof, trademark clearance.
```

That is more convincing than "the logo is clean and scalable".
