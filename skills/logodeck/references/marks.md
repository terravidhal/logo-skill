# Mark types and lockups

A mark is a decision about **what carries recognition**. Choose the family before drawing the
shape. Most weak logos are a wordmark with a decorative symbol attached, or a symbol that is
really an illustration.

## The families

| Family | What carries recognition | Best when | Risks |
|---|---|---|---|
| **Wordmark** | the name, drawn as letters | the name is short, distinctive, pronounceable | long or generic names; hard to shrink |
| **Lettermark / monogram** | one or two letters | the initials are memorable and unique | crowded category; accidental words |
| **Pictorial** | a recognisable object | the object is specific and ownable | clip-art, literalism, category cliché |
| **Abstract** | a constructed form | the promise is conceptual or the name is abstract | meaninglessness, generic geometry |
| **Combination** | symbol plus wordmark | the brand needs both a compact and a full form | the two halves must share a logic |
| **Emblem** | a contained badge | heritage, uniforms, labels, seals | poor at 16 px; hard to animate |
| **Dynamic** | a system of forms | a platform, a festival, a family of products | needs rules and testing; not a single file |

A logo deck can contain a symbol and a wordmark even when the primary mark is a wordmark.
The important decision is which one is **primary** at small sizes.

## How to choose

Ask three questions in order:

1. **Will the name be seen before it is known?** If yes, the wordmark must do the work; the
   symbol is secondary.
2. **Is there a compact context?** Favicon, app icon, avatar, embossed button. If yes, the
   symbol must survive alone.
3. **Does the category already own a shape?** If every competitor uses a leaf, an abstract
   form or a monogram may be the differentiator.

Write the answer as one sentence: "The primary mark is the symbol because the app icon is the
first encounter; the wordmark is the signature for the header." This sentence drives the
whole deck.

## Symbol versus wordmark

A **symbol** is a shape with no letters. It must be readable without the name, which is a high
bar. Test it at 16 px and in one colour before committing. If it fails, it is not a symbol yet;
it is a drawing of an idea.

A **wordmark** is the name, drawn. It can be a modified existing typeface or custom letters.
What matters is that the letters share a construction logic: the same weight, the same corner
language, the same curve tension. A wordmark is not a font screenshot with tighter spacing.

A **combination** is not a symbol plus a wordmark placed next to each other by default. The
gap, the vertical alignment and the relative weight are part of the design. The lockup becomes
a third drawing, composed from the two masters with a fixed module.

## Lockup anatomy

Define these once, in the manifest:

- **Symbol height** — the reference unit.
- **Wordmark height** — usually 30–50 % of the symbol height for a combination. Lowercase
  wordmarks often sit around 40 %.
- **Gap** — one module, not an eyeballed value.
- **Padding** — the clear space around the lockup, usually 8–10 % of the symbol height.
- **Stacked gap** — smaller than the horizontal gap, because vertical stacking already
  separates the elements.

Then check the result by eye. Mathematics gives a consistent starting point; optical balance
decides the final value. A wordmark often needs to move down by 1–2 % to look centred because
the eye reads the x-height mass, not the bounding box.

## Optical size

The same drawing does not work at every size. Three levels are enough:

1. **Master** — full detail, used above 48 px.
2. **Small** — thicker negative space, fewer junctions, simplified for 16–32 px. This is the
   optional `symbolSmall` in the manifest, used by the favicon.
3. **Tile** — the mark on a background for app icons; the mark is usually 50–65 % of the tile.

Do not simply scale the master down and hope. Thin gaps disappear first. Counters fill in
second. Junctions blur third.

## Three directions, genuinely different

A common failure is three variations of the same idea. Force difference at the family level:

- Direction A: symbolic, abstract or pictorial.
- Direction B: letter-based, monogram or wordmark-led.
- Direction C: a combination or a different construction logic (geometric vs calligraphic,
  solid vs negative space, contained vs open).

Each direction gets a one-sentence shape description, a reason, a risk and the cliché it
avoids. Then choose one. Do not merge the three into a compromise.

## Negative space

The space inside and around a mark is part of the drawing. Three uses:

- **Cut a hole** to describe a second form (a seed crack, a sprout, a letter).
- **Open a gap** to separate two masses without an outline.
- **Leave a counter** large enough to survive at 16 px.

A hole that is smaller than about 1/24 of the mark width will close at small sizes. A gap that
is narrower than the stroke weight will look like a printing error. Test the negative space
alone, in one colour, on a flat background.

## Common traps

- **The literal object.** A leaf for a plant is not a logo; it is a label. Find the specific
  part, action or consequence.
- **Two ideas in one mark.** A seed that is also a globe that is also a letter is three marks
  fighting. Pick one reading and let the other be a reward, not a requirement.
- **The mascot too early.** Mascots are a system, not a substitute for a mark.
- **The gradient rescue.** A weak form with a gradient is still weak, and it breaks in one
  colour and in print.
- **The font as logo.** A wordmark set in a default font with a colour is not a mark. Draw at
  least one letter decision that belongs to the brand.
- **The accidental letter.** A shape that reads as a letter it is not, or as a rude gesture in
  another culture, must be caught in the letter test.

## Output of this step

A chosen family, a one-sentence reason, the primary/secondary relationship, the lockup module
and the small-size strategy. Then draw in `geometry.md` and `typography.md`.
