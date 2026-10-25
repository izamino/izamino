// THE MEADOW: the one world of the series. Pip's burrow bank on the right, the hedge across the
// middle distance, the moon-seed's patch of earth front-left of centre. World units: a 1080 x 1920
// sheet; the camera (see `view`) pushes and pans over it. Every element has a reason:
// - the hedge: the edge of Pip's world (ep 4 climbs above it);
// - the burrow bank: home, where Pip watches from;
// - the bare patch: where the seed lands and the plant grows (the token's place never moves);
// - the far hills: depth, and the moon sets behind them at dawn.
import { Gfx, rng, oval, line, type P } from "./core";

export type Sky = "night" | "dawn" | "day" | "storm" | "dusk";
export const PATCH: P = [430, 1500];     // where the seed lands; the plant's root
export const BURROW: P = [990, 1330];
export const MOON: P = [250, 330];

const SKY: Record<Sky, { top: string; low: string; hill: string; hill2: string; grass: string; grassDk: string; glaze?: [string, number] }> = {
  night: { top: "#2b3a73", low: "#5d6ea8", hill: "#3f5c6e", hill2: "#2f4a5a", grass: "#5f8a6c", grassDk: "#3b6152", glaze: ["#33407a", 0.42] },
  dusk: { top: "#6d6aa8", low: "#f2b38f", hill: "#6f8a8a", hill2: "#557272", grass: "#86ad7c", grassDk: "#56805e", glaze: ["#6a5a9a", 0.18] },
  dawn: { top: "#a9c3e6", low: "#f7d2a8", hill: "#9cb5a8", hill2: "#7d9d8c", grass: "#97c08a", grassDk: "#5f9469" },
  day: { top: "#9cc6ea", low: "#e4eff2", hill: "#a5c79a", hill2: "#86b17f", grass: "#9cc79a", grassDk: "#6fa874" },
  storm: { top: "#55607a", low: "#8d95a6", hill: "#5e7470", hill2: "#4a605e", grass: "#6f9278", grassDk: "#4b6e58", glaze: ["#4a5370", 0.3] },
};

// the sky, far hills, hedge and meadow floor. `t` (frame) only moves grass and cloud, gently.
export const drawMeadow = (g: Gfx, sky: Sky, t: number, o: { hedge?: boolean; moon?: number; stars?: number; wind?: number } = {}) => {
  const c = SKY[sky], W = 1080, wind = o.wind ?? 1;
  // sky: granulating washes laid wet, darker at the top; the paint stops short of the sheet edge
  g.group("paint", () => {
    g.wash([[-900, -900], [1900, -900], [1500, 1260], [-420, 1260]], c.low, { alpha: 0.75, seed: 101, dx: 0, dy: 0, shrink: 1, rim: false });
    g.wash([[-900, -900], [1900, -900], [1500, 900], [700, 980], [300, 940], [-420, 1000]], c.top, { alpha: 0.4, seed: 104, dx: 0, dy: 0, shrink: 1, rim: false });
    g.wash([[-900, -900], [1900, -900], [1500, 740], [700, 840], [300, 800], [-420, 880]], c.top, { alpha: 0.45, seed: 102, dx: 0, dy: 0, shrink: 1, rim: false });
    g.wash([[-900, -900], [1900, -900], [1500, 560], [700, 640], [300, 600], [-420, 680]], c.top, { alpha: 0.5, seed: 105, dx: 0, dy: 0, shrink: 1, rim: false });
    g.wash([[-900, -900], [1900, -900], [1500, 260], [500, 380], [-420, 300]], c.top, { alpha: 0.5, seed: 103, dx: 0, dy: 0, shrink: 1, rim: false });
    if (sky !== "night") { const d = (t * 0.25) % 1400; [[200, 300, 170, 50], [760, 520, 210, 60], [520, 180, 150, 40]].forEach(([x, y, a, b], i) => g.wash(oval(((x + d * (0.6 + i * 0.2)) % 1500) - 200, y, a, b, 12), sky === "storm" ? "#6e7486" : "#fffaf0", { alpha: sky === "storm" ? 0.55 : 0.5, seed: 110 + i, dx: 0, dy: 0, shrink: 1, rim: false })); }
  });
  // far hills, two planes
  g.group("paint", () => {
    g.wash([[-420, 1500], [160, 1040], [380, 1010], [600, 1050], [820, 1000], [1500, 1060], [1500, 1300], [-420, 1300]], c.hill, { alpha: 0.7, seed: 120 });
    g.wash([[-420, 1180], [240, 1110], [520, 1130], [800, 1090], [1500, 1140], [1500, 1320], [-420, 1320]], c.hill2, { alpha: 0.65, seed: 121 });
  });
  // the hedge: a dark, lumpy mass of leaves with a pencil scribble on top
  if (o.hedge !== false) {
    const top: P[] = []; const r = rng(130); for (let x = -420; x <= 1500; x += 40) top.push([x, 1160 - 40 - r() * 46 - Math.sin(x * 0.01) * 14]);
    g.group("paint", () => { g.wash([...top, [1500, 1260], [-420, 1260]], c.grassDk, { alpha: 0.9, seed: 131 }); g.wash([...top.map(([x, y]) => [x, y + 26] as P), [1500, 1250], [-420, 1250]], "#2f4f44", { alpha: 0.45, seed: 132, rim: false }); });
    g.group("ink", () => { g.pen(top, { w: 1.6, seed: 133, wobble: 2.4, boil: 0.5, opacity: 0.55 }); for (let i = 0; i < 24; i++) { const x = 20 + i * 45 + r() * 20, y = 1150 + r() * 70; g.pen([[x, y], [x + 8, y - 7], [x + 16, y]], { w: 1.1, seed: 140 + i, wobble: 1, opacity: 0.35, retrace: false }); } });
  }
  // meadow floor
  g.group("paint", () => {
    g.wash([[-420, 1240], [300, 1220], [700, 1236], [1500, 1220], [1500, 2600], [-420, 2600]], c.grass, { alpha: 0.85, seed: 150, dx: 0, dy: 0, shrink: 1 });
    g.wash([[-420, 1600], [400, 1560], [800, 1600], [1500, 1580], [1500, 2600], [-420, 2600]], c.grassDk, { alpha: 0.45, seed: 151, rim: false });
    // the burrow bank, right: a rise of earth with a dark mouth
    g.wash([[660, 1470], [740, 1350], [860, 1300], [1000, 1290], [1500, 1300], [1500, 1500], [880, 1510]], "#9c8a64", { alpha: 0.55, seed: 152 });
    g.wash([[640, 1480], [720, 1380], [860, 1330], [1500, 1320], [1500, 1500]], c.grass, { alpha: 0.55, seed: 153, rim: false });
    g.wash(oval(BURROW[0] + 60, BURROW[1] - 10, 62, 44, 12), "#3d3140", { alpha: 0.85, seed: 154 });
    // the bare patch where the seed goes
    g.wash(oval(PATCH[0], PATCH[1] + 6, 92, 20, 12), "#a58a62", { alpha: 0.5, seed: 155 });
  });
  g.group("ink", () => {
    g.pen([[-420, 1240], [300, 1222], [700, 1238], [1500, 1222]], { w: 1.3, seed: 160, wobble: 1.5, opacity: 0.4 });
    g.pen(oval(BURROW[0] + 60, BURROW[1] - 10, 62, 44, 12).slice(0, 7), { w: 2, seed: 161, wobble: 0.6, opacity: 0.6 });
    g.pen([[680, 1474], [740, 1360], [860, 1306], [1000, 1294], [1500, 1302]], { w: 1.5, seed: 162, wobble: 1, opacity: 0.5 });
  });
  flowers(g, sky, t, wind);
  // grass blades: hand-placed drifts with bare rests, bending with the wind, one side leading
  grass(g, c.grassDk, t, wind);
};

// wildflowers in two drifts (left foreground, by the bank), bare grass between: clover heads and daisies
const FLOWERS: [number, number, number][] = [[90, 1620, 0], [130, 1660, 1], [70, 1700, 1], [170, 1610, 0], [210, 1690, 1], [600, 1560, 0], [650, 1600, 1], [700, 1555, 1], [1000, 1700, 0], [1040, 1760, 1], [960, 1820, 1], [300, 1850, 0], [360, 1890, 1]];
export const flowers = (g: Gfx, sky: Sky, t: number, wind = 1) => {
  const night = sky === "night" || sky === "storm";
  FLOWERS.forEach(([x, y, kind], i) => {
    const sc = 0.6 + (y - 1250) / 900, h = 40 * sc, sw = Math.sin(t * 0.07 + i) * 3 * wind * sc, top: P = [x + sw, y - h];
    g.group("ink", () => g.pen([[x, y], [x + sw * 0.4, y - h * 0.5], top], { w: 1.3 * sc, color: "#5f8a5c", seed: 500 + i, wobble: 0.3, boil: 0.3, retrace: false }));
    g.group("paint", () => {
      if (kind === 0) { for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.wash(oval(top[0] + Math.cos(a) * 7 * sc, top[1] + Math.sin(a) * 4 * sc, 5 * sc, 3.2 * sc, 6), night ? "#dfe0f0" : "#fffdf6", { alpha: 0.9, seed: 520 + i * 7 + k, dx: 0, dy: 0, shrink: 1, rim: true }); } g.wash(oval(top[0], top[1], 3 * sc, 2.4 * sc, 6), "#f3c84f", { alpha: 0.95, seed: 600 + i, dx: 0, dy: 0, shrink: 1, rim: false }); }
      else g.form(oval(top[0], top[1], 7 * sc, 8 * sc, 8), "#e7a0c0", "#b8668f", { seed: 620 + i, light: [-2, -2] });
    });
  });
};
const TUFTS: [number, number, number][] = [[40, 1900, 11], [200, 1960, 10], [460, 1930, 12], [820, 1950, 10], [980, 1940, 9], [60, 1700, 9], [150, 1860, 7], [250, 1650, 6], [330, 1790, 8], [560, 1700, 7], [640, 1860, 9], [760, 1640, 6], [900, 1760, 8], [1010, 1880, 7], [1040, 1620, 6], [120, 1440, 5], [620, 1420, 4], [520, 1330, 4], [200, 1300, 4], [960, 1560, 5], [300, 1520, 5]];
export const grass = (g: Gfx, col: string, t: number, wind = 1, front = false) => {
  g.group("ink", () => TUFTS.forEach(([x, y, n], k) => {
    if (front !== y > 1800) return;
    const r = rng(170 + k), sc = 0.6 + (y - 1250) / 900;
    for (let i = 0; i < n; i++) {
      const bx = x + (i - n / 2) * 7 * sc + (r() - 0.5) * 6, h = (40 + r() * 52) * sc, sway = Math.sin(t * 0.08 + bx * 0.02 + k) * 5 * wind * sc + 4 * wind * sc;
      g.pen([[bx, y], [bx + sway * 0.4 + (r() - 0.5) * 6, y - h * 0.55], [bx + sway + (r() - 0.5) * 10, y - h]], { w: 1.5 * sc, color: col, seed: 200 + k * 20 + i, wobble: 0.3, boil: 0.3, taper: 1, opacity: 0.85, retrace: false });
    }
  }));
};

// a glaze over the whole picture: night is laid as a final wash, the way a watercolourist would
export const glaze = (g: Gfx, sky: Sky, k = 1) => { const c = SKY[sky].glaze; if (!c) return; g.group("plain", () => g.fill([[-500, -500], [1600, -500], [1600, 2700], [-500, 2700]], c[0], c[1] * k), { blend: "multiply" }); };

// the moon: bare paper with a pale wash and a soft bloom; its craters are lifted, not painted
export const moon = (g: Gfx, p: P, r: number, bright = 1) => {
  g.group("plain", () => g.glow(p[0], p[1], r * 1.15, "#fff1c4", 0.4 * bright), { blend: "screen" });
  g.group("paint", () => { g.form(oval(p[0], p[1], r, r, 16), "#fffbea", "#efe2b4", { seed: 301, light: [-6, -6] }); [[-20, 10, 14], [18, -14, 9], [10, 26, 7]].forEach(([dx, dy, rr], i) => g.wash(oval(p[0] + dx * r / 80, p[1] + dy * r / 80, rr * r / 80, rr * r / 80 * 0.8, 8), "#e3d6a6", { alpha: 0.35, seed: 302 + i, dx: 0, dy: 0, shrink: 1, rim: false })); });
  g.group("ink", () => g.pen(oval(p[0], p[1], r, r, 16), { closed: true, w: 1, seed: 305, wobble: 0.6, opacity: 0.3, retrace: false }));
};

// stars: dots of white gouache, a few with a cross; they twinkle on their own phase
export const stars = (g: Gfx, t: number, n = 40, k = 1) => {
  g.group("plain", () => { const r = rng(410), c = g.cur; for (let i = 0; i < n; i++) { const x = r() * 1080, y = r() * 1000, s = 1 + r() * 2.6, tw = 0.6 + 0.4 * Math.sin(t * 0.15 + i * 1.7); if (Math.hypot(x - MOON[0], y - MOON[1]) < 140) continue; g.touch(x - 8, y - 8, x + 8, y + 8); c.globalAlpha = 0.9 * tw * k; c.fillStyle = "#fffdf2"; c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill(); if (s > 3) { c.globalAlpha = 0.5 * tw * k; c.fillRect(x - 7, y - 0.6, 14, 1.2); c.fillRect(x - 0.6, y - 7, 1.2, 14); } } c.globalAlpha = 1; });
};

// the moon seed: a pale almond of light with a soft bloom; `glow` 0..1
export const seed = (g: Gfx, p: P, s: number, glowK: number, rot = 0) => {
  g.group("plain", () => g.glow(p[0], p[1], 34 * s, "#fff1b8", 0.8 * glowK), { blend: "screen" });
  const shape = oval(0, 0, 9, 14, 10).map(([x, y]) => { const a = rot, c = Math.cos(a), sn = Math.sin(a); return [p[0] + (x * c - y * sn) * s, p[1] + (x * sn + y * c) * s] as P; });
  g.group("paint", () => g.form(shape, "#fff6d0", "#e9c76a", { seed: 320, light: [-2, -2] }));
  g.group("ink", () => g.pen(shape, { closed: true, w: 1.1, color: "#9b7a35", seed: 321, wobble: 0.2, opacity: 0.7, retrace: false }));
};

const leafList = (st: number) => { const l: [number, number, number][] = [[0.94, -1, 34], [0.9, 1, 30]]; if (st >= 0.3) l.push([0.55, 1, 46], [0.35, -1, 52]); if (st >= 0.6) l.push([0.18, 1, 70], [0.72, -1, 60], [0.5, -1, 64]); return l; };
const leafK = (st: number) => (0.6 + Math.min(1, st * 2) * 0.4) * (st < 0.6 ? 1 : 1 + ((st - 0.6) / 0.4) * 1.6);
export const plantHeight = (st: number) => (st < 0.3 ? 40 + (st / 0.3) * 60 : st < 0.6 ? 100 + ((st - 0.3) / 0.3) * 260 : 360 + ((st - 0.6) / 0.4) * 640);
/** where a small animal can stand on each leaf (no wind): [x, y] of the leaf's upper middle, sorted bottom to top */
export const leafSpots = (root: P, st: number): P[] => {
  const h = plantHeight(st), k = leafK(st), stem: P[] = [root, [root[0] - 4, root[1] - h * 0.35], [root[0] + 6, root[1] - h * 0.7], [root[0], root[1] - h]];
  return leafList(st).map(([a, s, L]) => { const i = Math.min(2, Math.floor(a * 3)), u = a * 3 - i, A = stem[i], B = stem[i + 1], p: P = [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u]; return [p[0] + s * L * k * 0.72, p[1] - L * k * 0.26] as P; }).sort((a, b) => b[1] - a[1]);
};
// the plant at growth stage `st`: 0 nothing, 0.1 sprout, 0.3 two leaves, 0.6 tall stalk, 0.8 bud, 1 open moon-flower
export const plant = (g: Gfx, root: P, st: number, t: number, wind = 1, bloom = 0) => {
  if (st <= 0) return;
  const hgt = st < 0.3 ? 40 + (st / 0.3) * 60 : st < 0.6 ? 100 + ((st - 0.3) / 0.3) * 260 : 360 + ((st - 0.6) / 0.4) * 640, sway = Math.sin(t * 0.06) * (4 + hgt * 0.02) * wind;
  const stem: P[] = [root, [root[0] + sway * 0.2 - 4, root[1] - hgt * 0.35], [root[0] + sway * 0.6 + 6, root[1] - hgt * 0.7], [root[0] + sway, root[1] - hgt]];
  const top = stem[3], leaf = (at: number, side: number, L: number) => { const i = Math.min(2, Math.floor(at * 3)), u = at * 3 - i, a = stem[i], b = stem[i + 1], p: P = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; return [p, [p[0] + side * L * 0.5, p[1] - L * 0.42], [p[0] + side * L, p[1] - L * 0.18], [p[0] + side * L * 0.55, p[1] + L * 0.06]] as P[]; };
  const leaves = leafList(st);
  g.group("paint", () => leaves.forEach(([a, s, L], i) => g.form(leaf(a, s, L * leafK(st)), "#a9cf8f", "#5f9469", { seed: 340 + i, light: [-3, -3] })));
  g.group("ink", () => { g.pen(stem, { w: 2.2 + st * 3 + Math.max(0, st - 0.6) * 30, color: "#4f7a4c", seed: 330, wobble: 0.5, boil: 0.3, taper: 0.6 }); leaves.forEach(([a, s, L], i) => { const lf = leaf(a, s, L * leafK(st)); g.pen(lf, { closed: true, w: 1.4, color: "#3f6440", seed: 350 + i, wobble: 0.3, boil: 0.3, opacity: 0.8 }); g.pen([lf[0], lf[2]], { w: 0.8, color: "#3f6440", seed: 360 + i, opacity: 0.5, retrace: false }); }); });
  // bud and flower at the top
  if (st >= 0.8) {
    const open = Math.max(0, Math.min(1, (st - 0.85) / 0.15)), R = 30 + open * 50;
    if (bloom > 0) g.group("plain", () => g.glow(top[0], top[1] - 10, 50 + bloom * 60, "#fff1b8", 0.55 * bloom), { blend: "screen" });
    const petals = 7; g.group("paint", () => { for (let i = 0; i < petals; i++) { const a = -Math.PI / 2 + (i - (petals - 1) / 2) * (0.25 + open * 0.55), tip: P = [top[0] + Math.cos(a) * R * 1.3, top[1] - 10 + Math.sin(a) * R * (0.9 + open * 0.3)]; g.form([[top[0] - 8, top[1]], [top[0] + (tip[0] - top[0]) * 0.5 - 14 * Math.sin(a), top[1] + (tip[1] - top[1]) * 0.5], tip, [top[0] + (tip[0] - top[0]) * 0.5 + 14 * Math.sin(a), top[1] + (tip[1] - top[1]) * 0.5], [top[0] + 8, top[1]]], "#fff8e0", "#e8cf8a", { seed: 370 + i, light: [-2, -3] }); } g.form(oval(top[0], top[1] + 4, 16, 12, 9), "#8fbf7c", "#5f9469", { seed: 380 }); });
    g.group("ink", () => { for (let i = 0; i < petals; i++) { const a = -Math.PI / 2 + (i - (petals - 1) / 2) * (0.25 + open * 0.55), tip: P = [top[0] + Math.cos(a) * R * 1.3, top[1] - 10 + Math.sin(a) * R * (0.9 + open * 0.3)]; g.pen([[top[0] - 8, top[1]], [top[0] + (tip[0] - top[0]) * 0.5 - 14 * Math.sin(a), top[1] + (tip[1] - top[1]) * 0.5], tip, [top[0] + (tip[0] - top[0]) * 0.5 + 14 * Math.sin(a), top[1] + (tip[1] - top[1]) * 0.5], [top[0] + 8, top[1]]], { closed: true, w: 1.3, color: "#8a6a3a", seed: 390 + i, wobble: 0.3, boil: 0.3, opacity: 0.7 }); } });
  }
  return top;
};

// a falling drop of light: a soft streak behind the seed
export const trail = (g: Gfx, pts: P[], k: number) => { if (pts.length < 2) return; g.group("plain", () => { const c = g.cur; g.mark(pts, 20); for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], u = i / pts.length; c.strokeStyle = "#fff3c4"; c.globalAlpha = 0.6 * u * k; c.lineWidth = 2 + u * 9; c.lineCap = "round"; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); } c.globalAlpha = 1; }, { blend: "screen", blur: 3 }); };

export const _unused = line;

// the sun at dawn: paper left light inside a warm bloom, low on the hills
export const sun = (g: Gfx, p: P, r: number, k = 1) => {
  g.group("plain", () => g.glow(p[0], p[1], r * 2.4, "#ffe2a8", 0.6 * k), { blend: "screen" });
  g.group("paint", () => g.form(oval(p[0], p[1], r, r, 14), "#fff3cf", "#f6c97a", { seed: 309, light: [-3, -3], alpha: k }));
};
/** a little burst of light: rays drawn as short strokes outward, `t` 0..1 */
export const burst = (g: Gfx, p: P, t: number, n = 9) => {
  if (t <= 0 || t >= 1) return;
  g.group("plain", () => g.glow(p[0], p[1], 40 + t * 90, "#fff1b8", 0.9 * (1 - t)), { blend: "screen" });
  g.group("ink", () => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.3, r0 = 20 + t * 50, r1 = r0 + 26 * (1 - t); g.pen([[p[0] + Math.cos(a) * r0, p[1] + Math.sin(a) * r0], [p[0] + Math.cos(a) * r1, p[1] + Math.sin(a) * r1]], { w: 1.8, color: "#f0c85a", seed: 940 + i, wobble: 0.2, opacity: 0.9 * (1 - t), retrace: false }); } });
};
/** dirt flicked up by digging paws: small earth dabs on arcs, phase from the frame */
export const dirt = (g: Gfx, p: P, f: number, k = 1, dir = 1) => {
  if (k <= 0) return;
  g.group("paint", () => { const r = rng(950); for (let i = 0; i < 10; i++) { const ph = ((f * 0.07 + r()) % 1), vx = (40 + r() * 70) * dir, vy = -(60 + r() * 80), x = p[0] + vx * ph, y = p[1] + vy * ph + 160 * ph * ph; if (ph > 0.9) continue; g.wash(oval(x, y, 4 + r() * 4, 3 + r() * 3, 6), "#8a6a46", { alpha: 0.85 * k, seed: 960 + i, dx: 0, dy: 0, shrink: 1, rim: false }); } });
};
/** the mound of earth over the planted seed, `h` 0..1 */
export const mound = (g: Gfx, p: P, h: number, hole = 0) => {
  if (hole > 0) g.group("paint", () => g.wash(oval(p[0], p[1], 30 * hole, 10 * hole, 10), "#4a3528", { alpha: 0.8, seed: 970, dx: 0, dy: 0, shrink: 1, rim: false }));
  if (h > 0) { const m: P[] = [[p[0] - 46, p[1] + 4], [p[0] - 24, p[1] - 10 * h], [p[0], p[1] - 16 * h], [p[0] + 26, p[1] - 9 * h], [p[0] + 48, p[1] + 4]]; g.group("paint", () => g.form([...m, [p[0], p[1] + 8]], "#a2825a", "#6b5038", { seed: 971, light: [-3, -3] })); g.group("ink", () => g.pen(m, { w: 1.4, seed: 972, wobble: 0.6, opacity: 0.6 })); }
};
