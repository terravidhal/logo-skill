#!/usr/bin/env node
/**
 * Draw the masters for the fictional brands that ship with logodeck.
 *
 * The symbols are hand-placed paths. The wordmarks use one shared geometric
 * skeleton (round capsules, no stroke, no font) with a per-brand weight, tracking
 * and width, so the family stays coherent without shipping a font file.
 *
 * Every drawing is original. The names are invented.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const round = (value) => Math.round(value * 1000) / 1000;

function capsule(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 0.001) {
    return `M${round(x1 - r)} ${round(y1)}A${r} ${r} 0 1 0 ${round(x1 + r)} ${round(y1)}A${r} ${r} 0 1 0 ${round(x1 - r)} ${round(y1)}Z`;
  }
  const nx = -dy / length;
  const ny = dx / length;
  const ax = round(x1 + nx * r);
  const ay = round(y1 + ny * r);
  const bx = round(x2 + nx * r);
  const by = round(y2 + ny * r);
  const cx = round(x2 - nx * r);
  const cy = round(y2 - ny * r);
  const ex = round(x1 - nx * r);
  const ey = round(y1 - ny * r);
  return `M${ax} ${ay}L${bx} ${by}A${r} ${r} 0 0 0 ${cx} ${cy}L${ex} ${ey}A${r} ${r} 0 0 1 ${ax} ${ay}Z`;
}

function stroke(points, r) {
  const parts = [];
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    parts.push(capsule(x1, y1, x2, y2, r));
  }
  return parts.join("");
}

const GLYPHS = {
  A: { w: 64, strokes: [[[0, 100], [32, 0], [64, 100]], [[14, 64], [50, 64]]] },
  B: {
    w: 52,
    strokes: [
      [[0, 0], [0, 100]],
      [[0, 0], [24, 0], [42, 10], [48, 24], [42, 38], [24, 48], [0, 48]],
      [[0, 48], [28, 48], [48, 60], [54, 76], [48, 90], [28, 100], [0, 100]],
    ],
  },
  C: {
    w: 54,
    strokes: [[[48, 12], [34, 0], [16, 0], [2, 14], [2, 86], [16, 100], [34, 100], [48, 88]]],
  },
  D: {
    w: 54,
    strokes: [
      [[0, 0], [0, 100]],
      [[0, 0], [22, 0], [44, 14], [50, 30], [50, 70], [44, 86], [22, 100], [0, 100]],
    ],
  },
  E: { w: 48, strokes: [[[0, 0], [0, 100]], [[0, 0], [46, 0]], [[0, 50], [36, 50]], [[0, 100], [46, 100]]] },
  I: { w: 0, strokes: [[[0, 0], [0, 100]]] },
  K: { w: 52, strokes: [[[0, 0], [0, 100]], [[0, 54], [46, 0]], [[16, 38], [52, 100]]] },
  L: { w: 46, strokes: [[[0, 0], [0, 100]], [[0, 100], [44, 100]]] },
  M: { w: 66, strokes: [[[0, 100], [0, 0], [33, 58], [66, 0], [66, 100]]] },
  N: { w: 58, strokes: [[[0, 100], [0, 0], [58, 100], [58, 0]]] },
  O: { w: 58, ellipses: [[29, 50, 29, 50]] },
  R: {
    w: 52,
    strokes: [
      [[0, 0], [0, 100]],
      [[0, 0], [24, 0], [42, 10], [48, 24], [42, 36], [24, 46], [0, 46]],
      [[22, 46], [50, 100]],
    ],
  },
  S: {
    w: 52,
    strokes: [[[50, 12], [34, 0], [14, 0], [2, 12], [2, 30], [14, 42], [36, 50], [48, 62], [48, 82], [36, 100], [12, 100], [0, 88]]],
  },
  T: { w: 54, strokes: [[[0, 0], [54, 0]], [[27, 0], [27, 100]]] },
  U: {
    w: 58,
    strokes: [[[0, 0], [0, 76], [8, 92], [26, 100], [32, 100], [50, 92], [58, 76], [58, 0]]],
  },
  V: { w: 58, strokes: [[[0, 0], [29, 100], [58, 0]]] },
};

function ellipseRing(cx, cy, rx, ry, thickness) {
  const irx = rx - thickness;
  const iry = ry - thickness;
  const outer = `M${round(cx - rx)} ${round(cy)}A${round(rx)} ${round(ry)} 0 1 0 ${round(cx + rx)} ${round(cy)}A${round(rx)} ${round(ry)} 0 1 0 ${round(cx - rx)} ${round(cy)}Z`;
  const inner = `M${round(cx - irx)} ${round(cy)}A${round(irx)} ${round(iry)} 0 1 1 ${round(cx + irx)} ${round(cy)}A${round(irx)} ${round(iry)} 0 1 1 ${round(cx - irx)} ${round(cy)}Z`;
  return outer + inner;
}

function wordmark(text, options) {
  const { weight = 14, tracking = 18, ink = "#16241D", widthScale = 1 } = options;
  const r = weight / 2;
  let pen = 0;
  const parts = [];
  for (const letter of text) {
    const glyph = GLYPHS[letter];
    if (!glyph) throw new Error(`no glyph for ${letter}`);
    const glyphWidth = glyph.w * widthScale;
    for (const points of glyph.strokes ?? []) {
      const scaled = points.map(([x, y]) => [pen + x * widthScale, y]);
      parts.push(stroke(scaled, r));
    }
    for (const ellipse of glyph.ellipses ?? []) {
      const [cx, cy, rx, ry] = ellipse;
      parts.push(ellipseRing(pen + cx * widthScale, cy, rx * widthScale, ry, weight));
    }
    pen += glyphWidth + weight + tracking;
  }
  const width = pen - tracking;
  const viewBox = `${round(-r)} ${round(-r)} ${round(width)} ${round(100 + weight)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  <g fill="var(--ld-ink, ${ink})">
    ${parts.map((part) => `<path fill-rule="evenodd" d="${part}" />`).join("\n    ")}
  </g>
</svg>
`;
}

function symbolDoc(viewBox, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  ${body}
</svg>
`;
}

const brands = [
  {
    name: "Aerune",
    slug: "aerune",
    component: "AeruneLogo",
    title: "Aerune — weather windows for paragliding pilots",
    promise: "Weather windows for paragliding pilots.",
    sector: "Outdoor · weather",
    idea: "A paraglider canopy, tilted into a wind-cut wing, with the pilot as a single dot.",
    palette: "slate-sky",
    altPalette: "midnight-rose",
    ink: "#18202B",
    altInk: "#1B1720",
    type: { weight: 13, tracking: 22, widthScale: 1.04 },
    symbol: `M22 182C38 104 102 46 218 30C154 62 106 110 86 184C68 160 44 162 22 182Z`,
    symbolSmall: `M20 186C34 98 100 40 222 26C154 60 104 112 82 190C64 160 40 162 20 186Z`,
    dot: [152, 196, 12],
    dotSmall: [156, 198, 16],
  },
  {
    name: "Brambler",
    slug: "brambler",
    component: "BramblerLogo",
    title: "Brambler — small-batch preserves from hedgerow fruit",
    promise: "Small-batch preserves from hedgerow fruit.",
    sector: "Food · pantry",
    idea: "Three thorn blades turn around a seed; the fruit stays hidden in the bramble.",
    palette: "plum-gold",
    altPalette: "moss-clay",
    ink: "#23161F",
    altInk: "#16241D",
    type: { weight: 15, tracking: 14, widthScale: 0.98 },
    blades: true,
    bladeDot: [120, 196, 18],
    bladeDotSmall: [120, 206, 22],
  },
  {
    name: "Tessaro",
    slug: "tessaro",
    component: "TessaroLogo",
    title: "Tessaro — modular architecture for tight city plots",
    promise: "Modular architecture for tight city plots.",
    sector: "Architecture · interiors",
    idea: "A T assembled from five tiles, with one module slipped a few millimetres out of line.",
    palette: "clay-cream",
    altPalette: "cobalt-mint",
    ink: "#2A1E17",
    altInk: "#101B2D",
    type: { weight: 16, tracking: 10, widthScale: 1.08 },
    symbol: `<rect x="30" y="30" width="56" height="56" rx="3" />
  <rect x="100" y="30" width="56" height="56" rx="3" />
  <rect x="170" y="30" width="56" height="56" rx="3" />
  <rect x="100" y="100" width="56" height="56" rx="3" />
  <rect x="106" y="170" width="56" height="56" rx="3" />`,
    symbolSmall: `<rect x="24" y="24" width="62" height="62" rx="3" />
  <rect x="98" y="24" width="62" height="62" rx="3" />
  <rect x="172" y="24" width="62" height="62" rx="3" />
  <rect x="98" y="98" width="62" height="62" rx="3" />
  <rect x="104" y="172" width="62" height="62" rx="3" />`,
    symbolWrapper: (body, colorVar) => `<g fill="${colorVar}">\n  ${body}\n  </g>`,
    viewBox: "30 30 196 196",
    smallViewBox: "24 24 210 210",
  },
  {
    name: "Nocturla",
    slug: "nocturla",
    component: "NocturlaLogo",
    title: "Nocturla — slow radio for the small hours",
    promise: "Slow radio for the small hours.",
    sector: "Audio · wellbeing",
    idea: "A crescent opens into a two-bar signal: night on one side, a voice on the other.",
    palette: "midnight-rose",
    altPalette: "slate-sky",
    ink: "#1B1720",
    altInk: "#18202B",
    type: { weight: 12, tracking: 24, widthScale: 1.02 },
    symbol: `M112 24C62 24 22 67 22 120C22 173 62 216 112 216C146 216 176 197 194 168C174 180 150 187 128 187C89 187 58 157 58 120C58 83 89 53 128 53C146 53 163 59 177 69C163 42 140 24 112 24Z`,
    bars: [
      [190, 92, 26, 15, 7.5],
      [190, 124, 38, 15, 7.5],
    ],
    barsSmall: [
      [184, 90, 30, 20, 10],
      [184, 126, 44, 20, 10],
    ],
  },
  {
    name: "Velluma",
    slug: "velluma",
    component: "VellumaLogo",
    title: "Velluma — notes that keep the shape of a book",
    promise: "Notes that keep the shape of a book.",
    sector: "Reading · productivity",
    idea: "Two page-arms fold into a V; the open top keeps the shape of a book.",
    palette: "plum-gold",
    altPalette: "clay-cream",
    ink: "#23161F",
    altInk: "#2A1E17",
    type: { weight: 14, tracking: 16, widthScale: 1 },
    vellumShape: true,
  },
  {
    name: "Cindral",
    slug: "cindral",
    component: "CindralLogo",
    title: "Cindral — wood-fired coffee, roasted in small batches",
    promise: "Wood-fired coffee, roasted in small batches.",
    sector: "Coffee · roastery",
    idea: "A coffee bean whose crease is a flame.",
    palette: "clay-cream",
    altPalette: "spruce-coral",
    ink: "#2A1E17",
    altInk: "#14211F",
    type: { weight: 15, tracking: 15, widthScale: 1 },
    flameOuter: `M120 16C158 54 196 92 196 140C196 188 162 224 120 224C78 224 44 188 44 140C44 92 82 54 120 16Z`,
    beanHole: `M120 84C150 84 172 106 172 136C172 160 158 180 138 190C120 198 98 192 82 176C66 160 66 132 82 114C94 100 106 86 120 84Z`,
    beanHoleSmall: `M120 76C154 76 180 102 180 136C180 164 164 186 142 198C122 208 98 200 80 182C62 164 62 132 80 112C94 96 106 78 120 76Z`,
  },
  {
    name: "Tandera",
    slug: "tandera",
    component: "TanderaLogo",
    title: "Tandera — quiet cycling routes for two",
    promise: "Quiet cycling routes for two.",
    sector: "Travel · cycling",
    idea: "Two wheels and one diagonal frame: a bicycle reduced to a route.",
    palette: "cobalt-mint",
    altPalette: "spruce-coral",
    ink: "#101B2D",
    altInk: "#14211F",
    type: { weight: 14, tracking: 19, widthScale: 1.02 },
    rings: [
      [72, 168, 48, 27],
      [168, 72, 48, 27],
    ],
    ringsSmall: [
      [72, 168, 52, 31],
      [168, 72, 52, 31],
    ],
    frame: [72, 168, 168, 72, 13],
    frameSmall: [72, 168, 168, 72, 17],
  },
];

const brandPalette = {
  "slate-sky": { ink: "#18202B" },
  "midnight-rose": { ink: "#1B1720" },
  "plum-gold": { ink: "#23161F" },
  "moss-clay": { ink: "#16241D" },
  "clay-cream": { ink: "#2A1E17" },
  "cobalt-mint": { ink: "#101B2D" },
  "spruce-coral": { ink: "#14211F" },
};

function rotatePoint(x, y, angle, cx = 120, cy = 120) {
  const radians = (angle * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return [
    cx + dx * Math.cos(radians) - dy * Math.sin(radians),
    cy + dx * Math.sin(radians) + dy * Math.cos(radians),
  ];
}

function blade(angle, scale) {
  const points = [
    [120, 120],
    [112, 88],
    [110, 54],
    [120, 18],
    [138, 54],
    [152, 86],
    [154, 118],
    [144, 124],
    [130, 126],
    [120, 120],
  ].map(([x, y]) => {
    const scaledX = 120 + (x - 120) * scale;
    const scaledY = 120 + (y - 120) * scale;
    return rotatePoint(scaledX, scaledY, angle);
  });
  const f = (index) => `${round(points[index][0])} ${round(points[index][1])}`;
  return `M${f(0)}C${f(1)} ${f(2)} ${f(3)}C${f(4)} ${f(5)} ${f(6)}C${f(7)} ${f(8)} ${f(9)}Z`;
}

function ring(cx, cy, ro, ri) {
  return `M${round(cx - ro)} ${cy}A${ro} ${ro} 0 1 0 ${round(cx + ro)} ${cy}A${ro} ${ro} 0 1 0 ${round(cx - ro)} ${cy}Z`
    + `M${round(cx - ri)} ${cy}A${ri} ${ri} 0 1 1 ${round(cx + ri)} ${cy}A${ri} ${ri} 0 1 1 ${round(cx - ri)} ${cy}Z`;
}

function makeSymbol(brand, small) {
  const color = `var(--ld-brand, ${brandPalette[brand.palette].ink})`;
  if (brand.rings) {
    const rings = small ? brand.ringsSmall : brand.rings;
    const [x1, y1, x2, y2, r] = small ? brand.frameSmall : brand.frame;
    const body = `<g fill="${color}">\n    ${rings
      .map(([cx, cy, ro, ri]) => `<path fill-rule="evenodd" d="${ring(cx, cy, ro, ri)}" />`)
      .join("\n    ")}\n    <path d="${capsule(x1, y1, x2, y2, r)}" />\n  </g>`;
    return symbolDoc(small ? "20 20 200 200" : "24 24 192 192", body);
  }
  if (brand.blades) {
    const scale = small ? 1.08 : 1;
    const d = [0, 120, 240].map((angle) => blade(angle, scale)).join("");
    const [cx, cy, r] = small ? brand.bladeDotSmall : brand.bladeDot;
    const box = small ? "24 9 192 220" : "31 17.5 178 197.5";
    return symbolDoc(
      box,
      `<g fill="${color}">\n    <path d="${d}" />\n    <circle cx="${cx}" cy="${cy}" r="${r}" />\n  </g>`,
    );
  }
  if (brand.vellumShape) {
    const d = small
      ? "M24 20 L120 216 L216 20 L150 20 L120 146 L90 20 Z"
      : "M28 28 L120 208 L212 28 L152 28 L120 146 L88 28 Z";
    const box = small ? "24 20 192 196" : "28 28 184 180";
    return symbolDoc(box, `<g fill="${color}">\n    <path d="${d}" />\n  </g>`);
  }
  if (brand.flameOuter) {
    const hole = small ? brand.beanHoleSmall : brand.beanHole;
    const crease = small
      ? stroke([[114, 94], [130, 122], [112, 150], [130, 178]], 7)
      : stroke([[116, 104], [128, 124], [114, 144], [128, 164]], 5);
    const body = `<g fill="${color}">\n    <path fill-rule="evenodd" d="${brand.flameOuter}${hole}${crease}" />\n  </g>`;
    return symbolDoc("44 16 152 208", body);
  }
  if (brand.bars) {
    const bars = small ? brand.barsSmall : brand.bars;
    const body = `<g fill="${color}">\n    <path d="${brand.symbol}" />\n    ${bars
      .map(([x, y, w, h, r]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" />`)
      .join("\n    ")}\n  </g>`;
    return symbolDoc("22 24 206 192", body);
  }
  if (brand.dot) {
    const [cx, cy, r] = small ? brand.dotSmall : brand.dot;
    const body = `<g fill="${color}">\n    <path d="${small ? brand.symbolSmall : brand.symbol}" />\n    <circle cx="${cx}" cy="${cy}" r="${r}" />\n  </g>`;
    return symbolDoc(small ? "20 26 202 188" : "22 30 196 178", body);
  }
  if (brand.symbolWrapper) {
    const body = small ? brand.symbolSmall : brand.symbol;
    return symbolDoc(small ? brand.smallViewBox : brand.viewBox, brand.symbolWrapper(body, color));
  }
  if (brand.symbol) {
    const body = `<g fill="${color}">\n    <path d="${small && brand.symbolSmall ? brand.symbolSmall : brand.symbol}" />\n  </g>`;
    return symbolDoc(small ? "12 12 216 216" : "18 18 204 204", body);
  }
  throw new Error(`no symbol for ${brand.slug}`);
}

function makeManifest(brand) {
  return `${JSON.stringify(
    {
      name: brand.name,
      slug: brand.slug,
      component: brand.component,
      title: brand.title,
      promise: brand.promise,
      sector: brand.sector,
      idea: brand.idea,
      palette: brand.palette,
      altPalette: brand.altPalette,
      files: {
        symbol: "symbol.svg",
        wordmark: "wordmark.svg",
        symbolSmall: "symbol-small.svg",
      },
      geometry: {
        symbolHeight: 1,
        wordmarkHeight: 0.42,
        gap: 0.3,
        padding: 0.08,
        stackedGap: 0.22,
        appIconScale: 0.62,
        appIconRadius: 0.225,
        faviconScale: 0.68,
        maskableScale: 0.5,
      },
      out: "dist",
      altOut: "dist-alt",
    },
    null,
    2,
  )}\n`;
}

for (const brand of brands) {
  const dir = join(HERE, brand.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "symbol.svg"), makeSymbol(brand, false), "utf8");
  writeFileSync(join(dir, "symbol-small.svg"), makeSymbol(brand, true), "utf8");
  writeFileSync(
    join(dir, "wordmark.svg"),
    wordmark(brand.name.toUpperCase(), { ...brand.type, ink: brand.ink }),
    "utf8",
  );
  writeFileSync(join(dir, "logo.json"), makeManifest(brand), "utf8");
  console.log(`  ${brand.slug}`);
}

console.log(`\n${brands.length} fictional brand masters written to ${HERE}`);
