# Colour, tokens and dark mode

Colour is the last decision, not the first. The mark must work in one colour before a palette
is chosen. Then colour gives the brand a temperature, a category signal and a system.

## The token contract

Every generated file reads from the same seven values:

| Token | Role | Typical use |
|---|---|---|
| `--ld-bg` | light background | page, tile, preview |
| `--ld-ink` | main ink | wordmark, text, mono |
| `--ld-brand` | brand colour | symbol, primary surface |
| `--ld-accent` | secondary colour | small signal, ≤ 30 % of the surface |
| `--ld-bg-dark` | dark background | dark page, dark tile |
| `--ld-ink-dark` | ink on dark | wordmark on dark |
| `--ld-brand-dark` | brand on dark | symbol on dark |
| `--ld-accent-dark` | accent on dark | small signal on dark |

The base tokens map to the dark set under `[data-theme="dark"]` in the generated CSS. The
`-dark` tokens exist because a good dark version is not the light version inverted.

## Contrast floors

Measured with the WCAG relative-luminance formula:

- brand on background ≥ **3:1** (large graphic);
- accent on background ≥ **3:1**;
- ink on background ≥ **4.5:1** (text and wordmark);
- repeat all three on the dark background with the dark tokens.

These are floors, not targets. A logo that only just passes at 3:1 will look weak on a
projector and in print. Aim higher for the ink, and check the brand against the actual surface
it will sit on, not only against white.

The build rejects a palette below the floor. Do not bypass `--allow-low-contrast` to ship a
failed palette; change the colour.

## Dark mode is not inversion

- A dark brand is usually **lighter and less saturated** than the light brand. `#1F6F4A` does
  not become `#FFFFFF`; it becomes a lighter, slightly cooler green.
- Pure white on near-black "bleeds": the light shape appears larger. Reduce the weight or the
  size slightly, or use a soft off-white such as `#EAF2EC`.
- Pure black on white is harsh for a wordmark. Use a near-black ink.
- The accent needs its own dark value; a warm accent that works on cream often vibrates on a
  dark blue.
- Test the dark version on the actual dark surface, not on a grey checkerboard.

## Choosing a palette

Start from the brief, not from a colour trend.

1. **Temperature** — warm, cool, neutral.
2. **Saturation** — quiet, confident, loud.
3. **Cultural reading** — what the colour means in the user's market.
4. **Category differentiation** — what everyone else uses, and what is still legible.
5. **Contrast** — measure, do not guess.

Seven audited palettes are provided in `skills/logodeck/assets/palettes.json`:
`moss-clay`, `spruce-coral`, `cobalt-mint`, `plum-gold`, `slate-sky`, `clay-cream`,
`midnight-rose`. Use one as a starting point or supply your own and run the check.

A useful palette has one dominant role, one support role and one signal role. Three colours of
equal weight is not a palette; it is a fight.

## One line to change everything

Themed SVG:

```html
<svg class="logo" style="--ld-brand:#0F6B5C; --ld-accent:#FF6B4A">…</svg>
```

Global CSS:

```css
:root { --ld-brand: #0F6B5C; --ld-accent: #FF6B4A; }
```

React:

```tsx
<LoamLogo type="horizontal" style={{ "--ld-brand": "#0F6B5C" }} />
```

Rebuild with another palette or a single override:

```bash
node "$SKILL_DIR/scripts/build.mjs" logo.json --palette cobalt-mint
node "$SKILL_DIR/scripts/build.mjs" logo.json --theme brand=#0F6B5C
```

`--theme` accepts `bg`, `ink`, `brand`, `accent` and the `-dark` variants. A base override is
applied to both modes (except `bg`); an explicit `-dark` override changes only the dark side.
The build re-checks contrast after the override.

## The `<img>` limit

An SVG loaded through `<img src="logo.svg">` is a separate document: it does not inherit the
page's CSS variables. Two honest options:

- **Inline** the themed SVG when you need live theming.
- **Use a fixed file** (`*-dark.svg`) when you need an `<img>` or a CSS background.

This is the only theming constraint. State it in the handover.

## Accessibility and perception

- Do not rely on hue alone to carry meaning. A red/green signal needs a shape or a label.
- Check the mark with a deuteranopia simulation if the brand colour is the only differentiator.
- A logo is decorative when the name is already in text: mark it `aria-hidden` in that context.
  When it is the only label, provide `title` / `aria-label`.
- Very saturated colours on large surfaces cause vibration. Use the accent on a small area.
- A brand colour that is fashionable this year may date the mark. The shape should carry the
  brand; colour should be replaceable.

## Print and production

- Screen hex is not a print specification. If the client prints, propose a Pantone/CMYK match
  and say it must be proofed. Do not invent a Pantone number.
- A one-colour version is mandatory for stamps, embossing, embroidery, engraving and cheap
  packaging. The mono file is not optional.
- A dark version is for screens and dark packaging; it is not a substitute for the one-colour
  version.
- Foil, varnish and glow are production effects, not logo files. Do not bake them into the SVG.
- Check the mark on a busy photo background: if it needs a white outline, design a contained
  version instead of adding a stroke.

## Common mistakes

- White shapes used to fake holes: they disappear on dark and in mono.
- Accent used on 50 % of the surface: it stops being an accent.
- A dark version made with `filter: invert()` or by swapping every colour to white.
- A palette chosen before the form, used to rescue a weak shape.
- A gradient that only works on one background.
- Contrast measured against white while the actual surface is beige or dark.
- A brand colour that is also the "buy" button colour, so the logo competes with the CTA.

## Checklist

- [ ] The mark works in one colour before colour is applied.
- [ ] The palette has a dominant, a support and a signal role.
- [ ] Brand ≥ 3:1, accent ≥ 3:1, ink ≥ 4.5:1 on both backgrounds.
- [ ] The dark brand is a designed colour, not white.
- [ ] The dark ink is a soft off-white, not pure white.
- [ ] The accent is used on ≤ 30 % of the surface.
- [ ] The `<img>` theming limit is documented.
- [ ] A one-colour version exists for production.
- [ ] Print limits are stated (no invented Pantone, proof required).
- [ ] The palette is named and stored in one place.
