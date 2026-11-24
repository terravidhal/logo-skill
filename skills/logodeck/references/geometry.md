# Geometry and SVG construction

Treat the SVG as a drawing, not as markup that happens to contain a shape. The goal is a
small number of intentional curves, a tight frame and a form that survives reduction.

## Canvas and view box

- Draw on a square or a proportionally simple canvas. A 256-unit square is a good default;
  the Loam symbol uses a 200 × 208 tight crop.
- The `viewBox` must be **tight around the drawing**. A 2 % margin is already generous.
  White space is added by the layout, not baked into the master.
- No fixed `width` or `height` on a master. The consumer decides the size; the `viewBox`
  carries the ratio.
- Use one coordinate system per master. If you need to move a shape, change its coordinates
  or use a `<g transform>` and expand it before delivery. Do not mix arbitrary offsets.

A tight crop makes composition deterministic: the build places two rectangles using the
`viewBox` ratios and never has to compute a bounding box from curves.

## Primitives first

Build with:

- circles and arcs for rotation and continuity;
- rectangles and squares for stability and rhythm;
- lines and stems for the skeleton;
- one or two custom curves for the idea.

Then combine them with boolean logic: union, subtract, intersect, exclude. In SVG, a hole is a
subpath with the opposite winding under `fill-rule="evenodd"`, or a properly wound subpath
under `nonzero`. Prefer `evenodd` for a simple hole; it is robust and readable.

```svg
<path fill-rule="evenodd" d="M…outer…Z M…inner…Z" />
```

The inner subpath does not need to be reversed with `evenodd`, but it must be closed.

## Curves that behave

- A circle approximated by four cubic segments uses the constant **0.55228475** for the
  control-point distance from each anchor. Do not eyeball it.
- A smooth join needs tangent continuity: the control point entering a point and the control
  point leaving it must be collinear with the anchor.
- A corner is a decision. If two segments meet at a nearly-straight angle, either make them
  exactly collinear or make the corner clearly intentional.
- Keep coordinates on a sensible grid. Integers or half-units produce clean intersections;
  random decimals produce fuzzy junctions.
- Fewer anchors, better shape. An eight-anchor circle with bad handles is worse than a
  four-segment circle with correct handles.

## Optical corrections

Geometry is mathematically correct; optics is what the eye believes. Apply these after the
construction, then re-test.

| Correction | What happens | Fix |
|---|---|---|
| **Overshoot** | round forms look smaller than flat forms of the same height | extend circles and curves 1–2 % beyond the cap line and baseline |
| **Bone effect** | a thick horizontal looks heavier than a vertical of the same width | thin horizontals slightly, or thicken verticals |
| **Irradiation** | light shapes on dark backgrounds appear to grow | shrink the light shape or lower its weight on dark |
| **Optical centre** | the geometric centre sits too high | move the visual mass down 1–3 % |
| **Junction blob** | curves meeting at a sharp angle create a dark knot | add a small inner radius or reduce the mass at the joint |
| **Counter closure** | small counters fill in when reduced | widen the counter or simplify the subpath |
| **Tangent kink** | two curves meet with a visible break | align handles or accept a deliberate corner |

Do not apply all of them mechanically. Apply the one the test reveals.

## Stroke and outline

A master must contain **filled paths**, not live strokes. Rationale: a stroke is a rendering
instruction that changes with the consumer, and it is the first thing to break when the file
is converted. Expand every stroke to an outline before delivery.

The build audit rejects `stroke` and `stroke-width`. If you are drawing with a stroked
skeleton, expand it in your design tool or convert the centreline to a filled capsule path.
A monoline wordmark is a set of capsules, not a set of stroked lines.

## Boolean holes

A hole is transparent, not white. Never draw a white shape on top of a coloured shape to fake
a hole: it breaks on dark backgrounds, in mono and in print. Use a subpath with `evenodd`, or
a real compound path.

Check that the hole is large enough:

- at least **1/24** of the mark width for a detail that must survive 16 px;
- at least the weight of the surrounding stroke for a gap that must read as a gap;
- not so large that the outer form loses its mass.

## Path hygiene

- Use absolute commands for masters. Relative commands are fine if you are certain, but
  absolute coordinates are easier to audit and to compare.
- Close every subpath with `Z`.
- Do not leave invisible construction paths in the final file.
- Do not use `<defs>` for a single-use gradient; do not use gradients at all in a logo.
- Do not use `<mask>` or `<clipPath>` when a boolean path can do the job.
- No `<text>`, `<tspan>`, `<image>`, `<foreignObject>` or `<filter>`.
- Keep IDs only when a real reference needs them, and make them unique.

## Composition without bounding boxes

The deck composes lockups with **nested `<svg>` elements**. The browser places each master in
a rectangle with its own `viewBox`; the build script never parses curves to guess a box.

```svg
<svg viewBox="0 0 3.09 1.16">
  <svg x="0.08" y="0.08" width="0.962" height="1"
       viewBox="28 24 200 208">
    …symbol…
  </svg>
  <svg x="1.342" y="0.36" width="1.67" height="0.44"
       viewBox="0 12 334 88">
    …wordmark…
  </svg>
</svg>
```

This is deterministic, short, and platform-independent. It also means a master must be tight:
a sloppy crop becomes a sloppy gap in every lockup.

## Construction order that works

1. Draw the idea as a solid silhouette in one colour.
2. Reduce it to the fewest shapes that keep the reading.
3. Cut the negative space.
4. Apply overshoot and optical centring.
5. Check the junctions and the counters.
6. Test at 16 px and in mono.
7. Only then add the wordmark and the lockups.

If step 1 is weak, steps 2–7 cannot save it.

## Self-check

- [ ] `viewBox` is tight and has no fixed root size.
- [ ] Every visible shape is a filled path or a simple primitive.
- [ ] No stroke, no filter, no mask, no raster, no text.
- [ ] Holes are real booleans, not white shapes.
- [ ] The main curves have tangent continuity or deliberate corners.
- [ ] Circles use the correct handle constant.
- [ ] Negative space is at least 1/24 of the width where it must survive.
- [ ] The form is optically centred, not just geometrically centred.
- [ ] The drawing survives 16 px and one colour.
- [ ] The audit reports zero errors.

## Common mistakes

- A 300-unit canvas with a 120-unit drawing: the crop is the drawing.
- A logo that is only a gradient or a shadow.
- A hole made with a white path, invisible on dark.
- Curves that meet with a visible kink at the join.
- A symbol that needs a caption to be understood.
- A favicon made by scaling the detailed master, with no small-size drawing.
- A `viewBox` with a different aspect ratio from the actual drawing.
- Stroke widths left in the file "because it looks the same in the preview".
