# Wordmark and typography

A wordmark is the name drawn as a system of letters. It is not a font file screenshot, and it
is never a `<text>` element in a delivered logo.

## Two legitimate routes

1. **Modified typeface.** Start from a licensed typeface, then change the letters that need a
   brand decision: width, terminals, a single join, a counter. This is fast and coherent.
2. **Custom letters.** Draw the skeleton and the strokes, then expand to filled paths. This is
   slower but gives full control and avoids font licensing in the logo.

In both cases, the final file contains **paths**. The font is a construction tool, not a
runtime dependency. If the typeface licence does not allow embedding or modification, do not
use it for the wordmark; choose another or draw the letters.

## The letter system

Decide these before drawing:

- **Case** — uppercase is stable and formal; lowercase is friendlier and often better for a
  wordmark because it has a stronger horizontal rhythm. Mixed case needs a reason.
- **Weight** — one weight for the whole wordmark. Fake bold (offset copies) creates lumps.
- **Contrast** — monoline (constant weight) or modulated (thick/thin). Pick one and keep it.
- **Terminals** — flat, rounded, angled, sheared. One language.
- **Corners** — sharp, soft, or a mix with a rule. One language.
- **Width** — condensed, normal, extended. Do not squeeze a normal font; draw the width.

The wordmark must share a construction logic with the symbol: the same corner radius family,
a compatible weight, a compatible level of detail. Two unrelated styles placed side by side
look like a collaboration, not a brand.

## Proportions

- **Cap height** is the reference for uppercase letters.
- **x-height** controls the perceived size of lowercase. A larger x-height reads better small.
- **Ascender and descender** must not collide with the symbol in a lockup.
- **Optical size**: a wordmark at 16 px needs a larger x-height and fewer fine details than one
  at 200 px.

The Loam wordmark uses a tight 334 × 88 box: cap top at y=12, baseline at y=100, x-height top
at y=44. The numbers are deliberate; the proportions are part of the brand.

## Spacing

Spacing is optical, not mathematical.

1. Set a **sidebearing** for the first and last letters, usually 8–15 % of the letter width.
2. Set **pair spacing** by the area between letters, not by equal gaps. Round letters need
   less space than straight ones.
3. Check the **rhythm** at a glance: no pair should look like a hole or a collision.
4. In a lockup, the gap between symbol and wordmark is one module, usually 25–35 % of the
   symbol height. It should feel like the same air as the letter spacing.

Common pair problems: `r` followed by `n` can merge; `L` followed by `o` opens a big hole;
`a` followed by `v` closes up; `T` followed by `o` looks loose. Fix the pair, not the whole
word.

## Drawing letters as paths

- Build each letter from a small number of filled shapes: stems, bowls, arches, joins.
- A monoline `o` is a ring: outer circle plus inner circle with `fill-rule="evenodd"`.
- A single-storey `a` is a bowl plus a stem that overlaps the bowl's right side.
- An `m` is three stems plus two top bands; the inner gaps are part of the silhouette, not
  holes.
- A `L` is a stem plus a foot; merge them with overlapping rectangles or a single outline.
- Do not use `<text>`, even with `font-family`. The result depends on the machine and cannot
  be audited.

If you use a design tool, convert the text to outlines and simplify the result: remove
overlapping duplicate nodes, close the contours, and check the counters. Auto-trace is not a
drawing method; it produces noise.

## Accents, punctuation and other scripts

- Test the name with its real diacritics: é, ü, ñ, ç, ø, ł. Do not add them as an afterthought.
- A dot on an `i` is an optical element; its size and position matter.
- Punctuation (period, hyphen, ampersand) must share the weight and the corner language.
- A non-Latin script may need a different construction logic. Do not force Latin geometry onto
  it. If you cannot draw it responsibly, propose a wordmark in Latin plus a local lockup.
- A long name may need a stacked or abbreviated form. Design the abbreviation as a wordmark,
  not as a crop.

## Licensing and honesty

- A logo delivered as paths does not need a font file at runtime, but the **design** may still
  be derivative of a licensed typeface. Check the licence for modification and embedding.
- Do not claim a typeface is "free" without checking.
- If the user supplies a font, use it for the wordmark only if the licence allows; otherwise
  draw a compatible alternative and say why.
- Never ship a `.woff` in the deck. The deck is SVG and TSX.

## Letter test

Read the wordmark as a stranger would:

- Does any letter look like a different letter (`rn` as `m`, `cl` as `d`)?
- Does the word read as another word in the user's language?
- Does the spacing create an accidental word or a rude shape?
- Does the first letter carry too much weight?
- Does the last letter fall off the baseline visually?
- At 16 px, are the counters still open?

If a letter fails, redraw that letter. Do not add a spacing hack to hide a shape problem.

## Shelf test

Place the wordmark next to three or four real competitors at the same optical size. It must
look like it belongs to the category and still be recognisable as itself. If it disappears,
the weight or the width is wrong. If it shouts, the weight is too heavy or the spacing too
tight.

## Checklist

- [ ] The wordmark is paths, not text.
- [ ] One weight, one contrast logic, one corner language.
- [ ] Cap height, x-height and baseline are deliberate numbers.
- [ ] Sidebearings and pair spacing are optically even.
- [ ] The lockup gap matches the letter rhythm.
- [ ] Diacritics and punctuation are drawn, not substituted.
- [ ] The letter test passes in the target language.
- [ ] The shelf test passes against real competitors.
- [ ] The font licence is checked or the letters are custom.
- [ ] The wordmark survives 16 px and one colour.
