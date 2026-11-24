# The variant matrix

A logo is a family, not a file. The build generates the family from one manifest and two
masters. This is what keeps the wordmark, the lockups and the favicon from drifting apart.

## Files

| File | Drawing | Colour | Use |
|---|---|---|---|
| `symbol.svg` | symbol | tokens | primary mark, inline, themed |
| `symbol-mono.svg` | symbol | `currentColor` | one-colour UI, stamps, engraving |
| `symbol-dark.svg` | symbol | dark tokens | dark backgrounds |
| `wordmark.svg` | wordmark | tokens | narrow formats |
| `wordmark-mono.svg` | wordmark | `currentColor` | one-colour |
| `wordmark-dark.svg` | wordmark | dark tokens | dark backgrounds |
| `lockup-horizontal.svg` | symbol + wordmark | tokens | headers, signatures |
| `lockup-horizontal-mono.svg` | lockup | `currentColor` | one-colour |
| `lockup-horizontal-dark.svg` | lockup | dark tokens | dark headers |
| `lockup-stacked.svg` | symbol over wordmark | tokens | square formats, covers |
| `lockup-stacked-mono.svg` | stacked | `currentColor` | one-colour |
| `lockup-stacked-dark.svg` | stacked | dark tokens | dark covers |
| `favicon.svg` | simplified symbol on tile | fixed | 16/32 px tab |
| `app-icon.svg` | symbol on rounded tile | fixed | iOS/Android/PWA |
| `app-icon-maskable.svg` | symbol, full bleed | fixed | maskable PWA |
| `<slug>.tsx` | all types | tokens + modes | React/Next |
| `<slug>-tokens.json` | palette + ratios | — | design system |
| `<slug>-palette.css` | CSS custom properties | — | global theming |
| `<slug>-preview.html` | control sheet | — | review, capture |

## Naming

- `<slug>` is lowercase, short and stable. It is not the marketing name.
- Variant suffixes are fixed and ordered: `symbol`, `symbol-mono`, `symbol-dark`.
- One file, one purpose. Do not create `logo-final-v3.svg`.
- Keep the deck in a folder named after the slug; never mix two brands in one deck.

## Two palettes

A palette is a token set, not a second drawing. When the manifest declares `altPalette` and
`altOut`, build the same manifest twice: once into `out`, once into `altOut` with `--palette`.
Each folder holds the full 19-file matrix with the same file names; the masters are never
duplicated or recoloured by hand. This is how the examples ship two complete decks per brand.

## The symbol

The symbol is the primary mark when the app icon or the avatar is the first encounter. It must
work alone. The build exposes the tight `viewBox`; the consumer sizes it with CSS.

The themed file keeps `var(--ld-brand, #fallback)` so an inline SVG follows the page. The
fixed dark file replaces every token with the dark palette. The mono file uses `currentColor`
for every fill, so a parent `color` style recolours it.

## The wordmark

The wordmark is the name as paths, tight-cropped. It is not a lockup and it is not a symbol.
Use it where the name must be present but the symbol would be redundant or too small.

A wordmark-only lockup is legitimate: place the wordmark with its own clear space, not with
the symbol's module.

## Lockups

Two compositions are generated:

**Horizontal** — symbol left, wordmark right, one gap module. This is the default signature
for headers, navigation and documents.

**Stacked** — symbol above, wordmark below, a smaller gap. Use it for square formats, social
avatars, packaging and covers.

The build computes the layout in unitless ratios:

```
symbolHeight = 1
wordmarkHeight = 0.44
gap = 0.3
padding = 0.08
stackedGap = 0.22
```

The nested `<svg>` technique lets each master keep its own tight `viewBox`. The gap is a
module, not a guess. Optical alignment may still require a small manual adjustment in the
manifest: if the wordmark looks high, lower `wordmarkHeight`'s y position by editing the
composition offset, not by editing the generated file. (The build centres the boxes; a visual
nudge belongs in a future manifest option, not in a hand-edited output.)

Do not add a tagline to the lockup as part of the logo. Optional descriptors are separate
assets with their own spacing rules.

## Favicon

A favicon is not a scaled logo. It is a separate small-size composition.

- Use a **simplified drawing** (`symbolSmall`) when the master has thin counters.
- Prefer a **tile**: a brand-coloured rounded square with the mark knocked out in the
  background colour. It reads on light and dark browser chrome.
- Keep the mark at 60–70 % of the tile. Too large looks cramped; too small disappears.
- Test at 16 px, then at 32 and 64. The 16 px version is the real test.
- Do not put text in a favicon.
- The favicon is a fixed-colour file, not a themed file: a favicon is loaded by the browser
  outside the page's CSS context.

## App icon

- Square canvas, usually 512 × 512 for the source.
- Rounded tile with a radius around 22–24 % of the side for the platform preview.
- The mark occupies 50–65 % of the tile. The rest is safe space.
- A maskable icon is full bleed with the mark at about 50 %, so a circular or squircle mask
  never crops the mark. Do not add a rounded corner to a maskable icon; the platform applies
  its own mask.
- Do not bake in platform-specific shadows or gloss. The platform adds them.
- Apple and Android have different safe areas and corner treatments. The generated files are
  source art; the store build may still need platform-specific exports.

## Mono

Mono is not "dark" and it is not "grey". It is one ink, no colour, used for:

- stamps, embossing, engraving, embroidery;
- one-colour print and cheap packaging;
- UI where the logo is part of the text colour;
- partner lockups with a single-colour requirement.

Mono is available for the symbol, the wordmark and both lockups. Test it on light and dark
surfaces; if the mark needs a second tone to read, the shape is not finished.

## React component

The generated component is deliberately small:

```tsx
type Props = Omit<SVGProps<SVGSVGElement>, "type"> & {
  variant?: "color" | "mono";
  type?: "icon" | "wordmark" | "horizontal" | "stacked";
  mode?: "auto" | "light" | "dark";
  title?: string;
};
```

- `variant="mono"` uses `currentColor` for every type.
- `type` covers the icon, the wordmark-only mark, and both lockups.
- `mode="auto"` follows `.dark`, `[data-theme="dark"]` and `prefers-color-scheme`, using
  `useSyncExternalStore`. The server snapshot is light, so SSR hydrates without a mismatch.
- `title` makes the mark accessible; an empty title makes it decorative.
- `height` defaults to `1em`; `width` follows the mark ratio unless supplied.
- Theme with CSS variables in `style`; the palette constants are the fallback.
- No Tailwind, no CSS import, no package other than `react`.

The component is a convenience, not a replacement for the files. Some contexts (email, print,
a CMS, a native app) need the SVG files.

## Tokens and CSS

`<slug>-tokens.json` stores the palette, both modes and the measured contrast ratios. Use it
in a design system, a docs page or a build step.

`<slug>-palette.css` defines the tokens on `:root`, maps the base tokens to the dark set under
`[data-theme="dark"]` and `.dark`, and handles `prefers-color-scheme` when no explicit theme
is set. Import it once, then override `--ld-brand` on any subtree.

## Preview

`<slug>-preview.html` is a standalone page: no network, no fonts to download, no build step. It
shows the family, the sizes, the mono and dark versions, the favicon in a tab, the app icon,
the contrast table, the file list, and live colour inputs. Use it for review and for captures.

## When to add a special variant

Add a variant only when a real context needs it and the master can produce it consistently:

- a horizontal compact mark for a very narrow header;
- a one-letter monogram for an avatar;
- a contained emblem for a stamp;
- a wordmark with a descriptor for a formal document.

Every extra variant is a new file to maintain. Add it to the matrix, to the audit and to the
preview, or do not add it.

## Checklist

- [ ] All 15 SVG variants exist, plus TSX, tokens, CSS and preview.
- [ ] The mono variant is truly one colour.
- [ ] The dark variant has designed dark colours.
- [ ] The favicon uses a simplified or bolder drawing and reads at 16 px.
- [ ] The app icon has a safe margin; the maskable icon is full bleed.
- [ ] Lockups share one spacing module and one construction logic.
- [ ] The TSX covers all four types and both variants.
- [ ] Auto mode follows system, class and data attribute.
- [ ] Tokens and CSS are generated, not hand-written per variant.
- [ ] No generated file was edited by hand.
