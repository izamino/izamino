// EPISODE 2 — THE STORM.  fear -> brave.
// Setup: a windy afternoon; Pip tends the sprout. Turn (frame 504): the rain comes and Pip bolts for
// the burrow, then looks back at the sprout alone. Payoff: Pip holds a dock leaf over it all night;
// in the morning the sprout has a second pair of leaves. Token: the sprout (0.2 -> 0.3).
//
// cue table — music: intro 0, verse (minor) 144, bridge (heartbeat) 432, build (brave) 720, hook (morning) 1008, outro 1296
//   0    S1 windy afternoon, Pip by the sprout, a gust; title
//   216  S2 the sky darkens, first drops (300), rain (360); Pip hops to the burrow bank
//   432  S3 storm: Pip crouched by the burrow, ears flat, trembling; the sprout bends; lightning (540)
//   648  S4 Pip turns back, hops out, plucks the dock leaf (760)
//   864  S5 Pip rears and holds the leaf over the sprout; rain drums off it; lightning (970)
//   1080 S6 dawn (dissolve): clear sky, Pip asleep holding the leaf; the sprout's new leaves (1150)
//   1296 S7 Pip wakes and sees; "Next time: The Visitor"
import type { Ctx, Env, Gfx, P } from "./core";
import { drawPip, blinkAt, breath, hopAlong } from "./pip";
import { drawMeadow, glaze, grass, sun, burst, mound, plant, PATCH, BURROW } from "./meadow";
import { dockLeaf } from "./hedgehog";
import { BAR, cam, caption, clamp01, episode, mix, rain, ramp, sheet, titleCard, words, type Scene } from "./series";
import { filmScore } from "./score";
import { ep2Score } from "./pipScore";

const INK = "#3d3437", CREAM = "#f6ecd2", ROOT: P = [PATCH[0], PATCH[1] - 8], BANK: P = [BURROW[0] - 120, BURROW[1] + 80];
const flash = (g: Gfx, l: number, at: number) => { const t = l - at; if (t < 0 || t > 14) return; const k = t < 2 ? 1 : t < 4 ? 0.3 : t < 6 ? 0.8 : (14 - t) / 8 * 0.5; g.group("plain", () => g.fill([[-10, -10], [1100, -10], [1100, 1930], [-10, 1930]], "#f4f2ff", 0.55 * k), { blend: "screen" }); };
const bolt = (g: Gfx, l: number, at: number, x: number) => { const t = l - at; if (t < 0 || t > 6) return; const pts: P[] = [[x, 380], [x - 30, 520], [x + 10, 540], [x - 40, 700], [x - 5, 720], [x - 50, 900]]; g.group("ink", () => g.pen(pts, { w: 4, color: "#fffbe8", seed: 980, wobble: 0.3, opacity: t < 3 ? 1 : 0.4, retrace: false })); };

const s1 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const gust = Math.max(0, Math.sin(((l - 20) / 60) * Math.PI)) * (l > 20 && l < 80 ? 1 : 0), wind = 1 + gust * 2.5;
  cam(g, env, [PATCH[0] + 110, PATCH[1] - 260], 1.6, () => {
    drawMeadow(g, "dusk", l, { wind });
    mound(g, [PATCH[0], PATCH[1] + 4], 1); plant(g, ROOT, 0.2, l * (1 + gust * 3), wind);
    drawPip(g, { x: PATCH[0] + 170, y: PATCH[1] + 6, s: 1.45, face: -1, head: 6 + breath(l), earN: 20 - gust * 50, earF: 12 - gust * 56, bend: 52 + gust * 30, look: -0.7, blink: blinkAt(l, 5), smile: mix(0.8, 0.2, gust), lean: gust * 6 });
    grass(g, "#56805e", l, wind, true);
  });
  titleCard(g, l, 30, 2, "The Storm", INK, 200);
});

const s2 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 216 + l, dark = ramp(l, 0, 150), r = ramp(l, 84, 150), h = hopAlong(l, 120, 192, PATCH[0] + 170, BANK[0], 18);
  cam(g, env, [mix(560, 640, ramp(l, 110, 200)), 1150], 1.15, () => {
    drawMeadow(g, dark < 0.5 ? "dusk" : "storm", f, { wind: 2 + dark * 2 });
    mound(g, [PATCH[0], PATCH[1] + 4], 1); plant(g, ROOT, 0.2, f * 2, 2 + dark * 3);
    const y = mix(PATCH[1] + 6, BANK[1], clamp01((h.x - PATCH[0] - 170) / (BANK[0] - PATCH[0] - 170)));
    drawPip(g, { x: h.x, y, s: 1.45, face: l < 110 ? -1 : 1, stretch: h.stretch, lift: h.lift, lean: h.lean, head: l < 110 ? -20 : 4, earN: mix(20, -30, dark) - h.earBack, earF: mix(12, -36, dark) - h.earBack, bend: 70, look: l < 110 ? -0.2 : 0.4, blink: blinkAt(f), smile: mix(0.5, 0, dark) });
    grass(g, "#4b6e58", f, 2 + dark * 2, true);
    glaze(g, "storm", dark);
    rain(g, f, r * 0.7, 0.4);
  });
  caption(g, l, 30, "Then the sky turned grey, and the wind began to howl.", { y: 300, color: dark > 0.5 ? CREAM : INK, seed: 911 });
});

const s3 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 432 + l, look = ramp(l, 150, 190), tremble = Math.sin(f * 2.3) * 1.6;
  cam(g, env, [mix(760, 700, ramp(l, 0, 216)), 1280], 1.35, () => {
    drawMeadow(g, "storm", f, { wind: 4 });
    mound(g, [PATCH[0], PATCH[1] + 4], 1); plant(g, ROOT, 0.2, f * 3, 5);
    drawPip(g, { x: BANK[0] + tremble, y: BANK[1], s: 1.45, face: look > 0.5 ? -1 : 1, lean: 14, head: 18, earN: -62, earF: -66, bend: 80, blink: l < 100 && blinkAt(f) ? 1 : 0, look: look > 0.5 ? -1 : 0, smile: 0 });
    grass(g, "#4b6e58", f, 4, true);
    glaze(g, "storm"); bolt(g, l, 108, 300); flash(g, l, 108); rain(g, f, 1, 0.5);
  });
  caption(g, l, 150, "But the little sprout was all alone.", { y: 300, color: CREAM, seed: 912 });
});

const s4 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 648 + l, h1 = hopAlong(l, 40, 112, BANK[0], 680, 18), has = l >= 112;
  cam(g, env, [mix(720, 620, ramp(l, 30, 140)), 1300], 1.3, () => {
    drawMeadow(g, "storm", f, { wind: 4 });
    mound(g, [PATCH[0], PATCH[1] + 4], 1); plant(g, ROOT, 0.2, f * 3, 5);
    if (!has) dockLeaf(g, [640, 1480], -8 + Math.sin(f * 0.3) * 6, 0.8, f * 0.3); // the dock plant, growing by the path
    const y = mix(BANK[1], 1520, clamp01((BANK[0] - h1.x) / (BANK[0] - 680)));
    const pose = drawPip(g, { x: h1.x, y, s: 1.45, face: -1, stretch: h1.stretch, lift: h1.lift, lean: has ? -26 : h1.lean + (l > 100 ? 18 : 0), head: has ? 4 : 10, paw: has ? -60 : l > 100 ? -30 : 0, pawF: has ? -50 : 0, earN: -10 - h1.earBack, earF: -16 - h1.earBack, bend: 64, look: -0.8, blink: blinkAt(f, 21), smile: mix(0, 0.5, ramp(l, 112, 160)) });
    if (has) dockLeaf(g, pose.paw, 22 + Math.sin(f * 0.4) * 5, 0.85, f * 0.3);
    grass(g, "#4b6e58", f, 4, true);
    glaze(g, "storm"); rain(g, f, 1, 0.5);
  });
  caption(g, l, 120, "So Pip found the biggest leaf...", { y: 300, color: CREAM, seed: 913 });
});

const s5 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 864 + l, h = hopAlong(l, 0, 54, 680, PATCH[0] + 120, 18), up = ramp(l, 54, 80), shake = Math.sin(f * 1.7) * 3 * up;
  cam(g, env, [PATCH[0] + 70, PATCH[1] - 240], mix(1.5, 1.8, ramp(l, 40, 200)), () => {
    drawMeadow(g, "storm", f, { wind: 4 });
    mound(g, [PATCH[0], PATCH[1] + 4], 1); plant(g, ROOT, 0.2, f * (3 - up * 2), 5 - up * 4);
    const pose = drawPip(g, { x: h.x + shake * 0.3, y: PATCH[1] + 6, s: 1.45, face: -1, stretch: h.stretch, lift: h.lift, lean: mix(-26, -34, up), head: -10 + shake * 0.5, paw: mix(-60, -96, up), pawF: mix(-50, -90, up), earN: -20, earF: -26, bend: 60, look: -0.6, blink: blinkAt(f, 3), smile: mix(0.2, 0.6, ramp(l, 120, 170)) });
    const leafAt: P = [pose.paw[0] - 10, pose.paw[1]];
    dockLeaf(g, leafAt, mix(20, -30, up) + shake, mix(0.85, 1.25, up), f * 0.5);
    // rain bounces off the leaf: short splashes along its top edge
    if (up > 0.5) g.group("ink", () => { for (let i = 0; i < 6; i++) { const ph = (f * 0.25 + i * 0.37) % 1, x = leafAt[0] - 200 + i * 40, y = leafAt[1] - 120 - i * 6; g.pen([[x, y], [x - 10 - ph * 20, y - 14 - ph * 10]], { w: 1.2, color: "#4a6aa8", seed: 990 + i, opacity: 0.7 * (1 - ph), retrace: false }); } });
    grass(g, "#4b6e58", f, 4, true);
    glaze(g, "storm"); bolt(g, l, 106, 820); flash(g, l, 106); rain(g, f, 1, 0.5);
  });
  caption(g, l, 110, "...and held it up, all night long.", { y: 300, color: CREAM, seed: 914 });
});

const s6 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 1080 + l, grow = ramp(l, 60, 130), wake = ramp(l, 150, 180);
  cam(g, env, [PATCH[0] + 80, PATCH[1] - 220], 1.45, () => {
    drawMeadow(g, "dawn", f, { wind: 0.5 });
    sun(g, [880, 1050], 54, 0.9);
    mound(g, [PATCH[0], PATCH[1] + 4], 1); plant(g, ROOT, mix(0.2, 0.3, grow), f, 0.5);
    if (grow > 0 && grow < 1) burst(g, [ROOT[0], ROOT[1] - 70], grow);
    const pose = drawPip(g, { x: PATCH[0] + 150, y: PATCH[1] + 6, s: 1.45, face: -1, lean: mix(12, 0, wake), head: mix(22, -14, wake) + breath(f) * 1.5, paw: -30, pawF: -20, earN: mix(-56, 20, wake), earF: mix(-62, 12, wake), bend: 64, blink: wake < 0.5 ? 1 : blinkAt(f), look: -0.8, smile: mix(0.4, 1, wake) });
    dockLeaf(g, pose.paw, -70 + Math.sin(f * 0.05) * 3, 1.15, f * 0.05);
    // dew on the grass: points of light
    g.group("plain", () => [[300, 1600], [620, 1660], [200, 1500], [780, 1580]].forEach(([x, y], i) => g.glow(x, y, 5, "#fffbe8", 0.5 + 0.5 * Math.sin(f * 0.15 + i))), { blend: "screen" });
    grass(g, "#5f9469", f, 0.5, true);
  });
  caption(g, l, 30, "By morning, the sky was clear.", { y: 300, color: INK, seed: 915 });
});

const s7 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 1296 + l, near = ramp(l, 10, 50);
  cam(g, env, [PATCH[0] + 80, PATCH[1] - 150], 2, () => {
    drawMeadow(g, "dawn", f, { wind: 0.5 });
    mound(g, [PATCH[0], PATCH[1] + 4], 1); plant(g, ROOT, 0.3, f, 0.5);
    dockLeaf(g, [PATCH[0] + 260, PATCH[1] + 10], 78, 1.1, 0);
    drawPip(g, { x: mix(PATCH[0] + 160, PATCH[0] + 140, near), y: PATCH[1] + 6, s: 1.45, face: -1, lean: 10 * near, head: -10 + 8 * near + breath(f), earN: 26, earF: 18, blink: blinkAt(f, 9), look: -0.8, smile: 1, twitch: Math.sin(f * 1.3) * near });
  });
  caption(g, l, 0, "It had grown two new leaves!", { y: 1560, color: INK, seed: 916 });
  words(g, "Next time: The Visitor", 540, 1700, 34, INK, 917, clamp01((l - 60) / 30));
});

const scenes: Scene[] = [
  { id: "s1-wind", start: 0, end: 3 * BAR, draw: s1 },
  { id: "s2-grey", start: 3 * BAR, end: 6 * BAR, draw: s2 },
  { id: "s3-afraid", start: 6 * BAR, end: 9 * BAR, draw: s3 },
  { id: "s4-leaf", start: 9 * BAR, end: 12 * BAR, draw: s4 },
  { id: "s5-hold", start: 12 * BAR, end: 15 * BAR, draw: s5 },
  { id: "s6-morning", start: 15 * BAR, end: 18 * BAR, draw: s6, fade: 36 },
  { id: "s7-leaves", start: 18 * BAR, end: 20 * BAR, draw: s7 },
];

export const ep2 = episode("Pip and the Moon Seed — 2. The Storm", scenes, filmScore(ep2Score(), 24, 1440), [[1400, 1440, "the last line is read"]]);
