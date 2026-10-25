// EPISODE 5 — THE FLOWER.  receive -> give.
// Setup: full moon; the bud on the tall stalk glows. Turn (frame 540): the moon-flower opens and lights
// the meadow. Payoff: its new seeds lift on the wind; Pip lets them go, for someone else to find. The
// last seed drifts across the moon: the token, back where it began. "The End".
//
// cue table — music: intro 0, verse 144, build (bloom) 432, hook (light) 720, bridge (give) 1008, outro 1296
//   0    S1 dusk: the stalk, the closed bud, Pip and Hazel at its foot; title
//   216  S2 night; fireflies gather; the bud begins to glow
//   432  S3 the bloom (opens 480-600); a burst; the meadow lights up
//   720  S4 Pip hops for joy, Hazel sways, light everywhere
//   1008 S5 the seeds lift from the flower (1040-); Pip waves them off
//   1296 S6 one seed crosses the moon; "The End"
import type { Ctx, Env, Gfx, P } from "./core";
import { drawPip, blinkAt, breath, hop } from "./pip";
import { drawHog } from "./hedgehog";
import { drawMeadow, glaze, grass, moon, stars, mound, plant, plantHeight, seed, burst, MOON, PATCH } from "./meadow";
import { BAR, cam, caption, clamp01, episode, fireflies, mix, ramp, sheet, titleCard, words, type Scene } from "./series";
import { filmScore } from "./score";
import { ep5Score } from "./pipScore";

const CREAM = "#f6ecd2", INK = "#3d3437", ROOT: P = [PATCH[0], PATCH[1] - 8];
const stage = (f: number) => mix(0.8, 1, ramp(f, 480, 600));
const topAt = (st: number): P => [ROOT[0], ROOT[1] - plantHeight(st)];
const PIP: P = [PATCH[0] + 210, PATCH[1] + 6], HOG: P = [PATCH[0] - 190, PATCH[1] + 20];
// eight seeds leave the flower one by one from 1040; each drifts up and to the left on its own wobble
const seedAt = (i: number, f: number): P | null => {
  const t0 = 1040 + i * 22, t = f - t0; if (t < 0) return null;
  const top = topAt(1), u = t / 300, drift = Math.sin(t * 0.04 + i) * 40;
  return [top[0] + (i % 2 ? 1 : -1) * (20 + i * 6) - u * (120 + i * 30) + drift, top[1] - 30 - u * (420 + i * 40)];
};

const scene = (g: Gfx, f: number, sky: "dusk" | "night", o: { bloom?: number; joy?: number; wave?: number; seeds?: boolean } = {}) => {
  const st = stage(f), bloom = o.bloom ?? 0, joy = o.joy ?? 0, wave = o.wave ?? 0;
  drawMeadow(g, sky, f, { wind: 0.4 });
  mound(g, [PATCH[0], PATCH[1] + 4], 1);
  const top = plant(g, ROOT, st, f, 0.2, bloom) ?? topAt(st);
  drawHog(g, { x: HOG[0], y: HOG[1], s: 0.7, face: 1, walk: joy ? f / 10 : 0, sniff: f / 20, blink: (f % 70) < 4 ? 1 : 0 });
  const h = hop(((f % 36) / 36)), j = joy > 0.5;
  drawPip(g, { x: PIP[0], y: PIP[1], s: 0.95, face: -1, stretch: j ? h.stretch * 0.6 : 0, lift: j ? h.lift * 0.8 : 0, lean: j ? h.lean : -wave * 18, head: -30 + breath(f), paw: wave ? -110 + Math.sin(f * 0.45) * 25 : 0, earN: 22 - (j ? h.earBack : 0), earF: 14 - (j ? h.earBack : 0), look: -0.6, blink: blinkAt(f, 17), smile: 0.7 + 0.3 * joy });
  grass(g, sky === "dusk" ? "#56805e" : "#3b6152", f, 0.4, true);
  if (sky === "night") glaze(g, "night", 1 - bloom * 0.45);
  // the flower's light sits over the glaze: it is the light source now
  if (bloom > 0) g.group("plain", () => { g.glow(top[0], top[1] - 20, 70 + bloom * 50, "#fff3c0", 0.65 * bloom); g.glow(top[0], PATCH[1] - 160, 460, "#ffe2a0", 0.2 * bloom); }, { blend: "screen" });
  if (o.seeds) for (let i = 0; i < 8; i++) { const p = seedAt(i, f); if (p) seed(g, p, 0.7, 0.9, f * 0.05 + i); }
  return top;
};

const s1 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  cam(g, env, [PATCH[0] + 20, mix(PATCH[1] - 300, PATCH[1] - 420, ramp(l, 40, 216))], 1.2, () => scene(g, l, "dusk"));
  titleCard(g, l, 30, 5, "The Flower", INK, 200);
});

const s2 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 216 + l, budGlow = 0.15 + 0.25 * ramp(l, 60, 216) * (0.7 + 0.3 * Math.sin(f * 0.15));
  cam(g, env, [PATCH[0] + 20, PATCH[1] - 420], 1.2, () => { scene(g, f, "night", { bloom: budGlow }); fireflies(g, f, 12, [80, 1150, 1000, 1550], ramp(l, 20, 120)); });
  moon(g, [880, 300], 80, 1); stars(g, f, 40, 0.8);
  caption(g, l, 30, "On the night of the full moon, the bud began to glow.", { y: 1700, color: CREAM, seed: 951 });
});

const s3 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 432 + l, open = ramp(l, 48, 168), push = ramp(l, 0, 200), top = topAt(stage(f));
  cam(g, env, [PATCH[0], mix(PATCH[1] - 420, top[1] + 120, push)], mix(1.2, 1.6, push), () => {
    scene(g, f, "night", { bloom: 0.4 + open * 0.6 }); fireflies(g, f, 14, [80, 1100, 1000, 1550], 1);
    burst(g, [top[0], top[1] - 20], clamp01((l - 160) / 50));
  });
  moon(g, [880, 300], 80, 1); stars(g, f, 40, 0.8 * (1 - open * 0.4));
  caption(g, l, 170, "...and the moon-flower opened!", { y: 1700, color: CREAM, seed: 952 });
});

const s4 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 720 + l, back = ramp(l, 0, 160);
  cam(g, env, [PATCH[0] + 20, mix(PATCH[1] - 560, PATCH[1] - 360, back)], mix(1.4, 1.1, back), () => { scene(g, f, "night", { bloom: 1, joy: l > 60 && l < 250 ? 1 : 0 }); fireflies(g, f, 20, [40, 1050, 1040, 1600], 1); });
  moon(g, [880, 300], 80, 1); stars(g, f, 40, 0.6);
  caption(g, l, 30, "It filled the whole meadow with light.", { y: 1700, color: CREAM, seed: 953 });
});

const s5 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 1008 + l, wave = ramp(l, 120, 140) * (1 - ramp(l, 250, 270));
  cam(g, env, [PATCH[0] - 40, mix(PATCH[1] - 420, PATCH[1] - 700, ramp(l, 40, 288))], 1.0, () => { scene(g, f, "night", { bloom: 0.85, wave, seeds: true }); fireflies(g, f, 16, [40, 1100, 1040, 1600], 1); });
  moon(g, [880, 300], 80, 1); stars(g, f, 40, 0.7);
  caption(g, l, 40, "Pip let the new seeds fly, for someone else to find.", { y: 1700, color: CREAM, seed: 954 });
});

const s6 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 1296 + l, u = clamp01(l / 140), M: P = [MOON[0] + 290, MOON[1] + 220];
  cam(g, env, [540, 760], 1.25, () => {
    drawMeadow(g, "night", f, { wind: 0.3 }); glaze(g, "night", 0.8);
    moon(g, M, 150, 1.2); stars(g, f, 50, 0.9);
    seed(g, [mix(M[0] - 380, M[0] + 120, u), M[1] + 240 - u * 300 + Math.sin(f * 0.08) * 16], 1.1, 1, f * 0.05);
  });
  words(g, "The End", 540, 1560, 72, CREAM, 957, clamp01((l - 40) / 40), { w: 1.2 });
  words(g, "Pip and the Moon Seed", 540, 1700, 28, CREAM, 958, clamp01((l - 70) / 30));
});

const scenes: Scene[] = [
  { id: "s1-dusk", start: 0, end: 3 * BAR, draw: s1 },
  { id: "s2-glow", start: 3 * BAR, end: 6 * BAR, draw: s2, fade: 24 },
  { id: "s3-bloom", start: 6 * BAR, end: 10 * BAR, draw: s3 },
  { id: "s4-light", start: 10 * BAR, end: 14 * BAR, draw: s4 },
  { id: "s5-give", start: 14 * BAR, end: 18 * BAR, draw: s5 },
  { id: "s6-end", start: 18 * BAR, end: 20 * BAR, draw: s6, fade: 24 },
];

export const ep5 = episode("Pip and the Moon Seed — 5. The Flower", scenes, filmScore(ep5Score(), 24, 1440), [[1390, 1440, "The End is read"]]);
