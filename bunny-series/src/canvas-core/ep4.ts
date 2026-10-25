// EPISODE 4 — THE CLIMB.  small -> big world.
// Setup: the plant now towers over the hedge, a closed bud at its tip. Turn (frame 720): Pip reaches
// the top and the camera pulls back: the meadow is tiny, the moon enormous. Payoff: Pip waves to
// Hazel far below and falls asleep beside the bud, which glows once in the dark. Token: the bud.
//
// cue table — music: intro 0, verse (climb) 144, build 432, hook (top, E major) 720, bridge (view) 1008, outro 1296
//   0    S1 night; Pip and Hazel at the foot of the stalk, looking up; title
//   216  S2 Pip hops onto the first leaf (250, 286)
//   432  S3 leaf to leaf, the camera rising with him; reaches the top leaf at 700
//   720  S4 the pull-back: the whole meadow below, the moon huge and close
//   1008 S5 Pip waves down to Hazel; the bud glows (1190)
//   1296 S6 asleep by the bud under the moon; "Next time: The Flower"
import type { Ctx, Env, Gfx, P } from "./core";
import { drawPip, blinkAt, breath, hop } from "./pip";
import { drawHog } from "./hedgehog";
import { drawMeadow, glaze, grass, moon, stars, mound, plant, leafSpots, plantHeight, PATCH } from "./meadow";
import { BAR, cam, caption, clamp01, episode, fireflies, mix, mixP, ramp, sheet, titleCard, words, type Scene } from "./series";
import { filmScore } from "./score";
import { ep4Score } from "./pipScore";

const CREAM = "#f6ecd2", ST = 0.8, ROOT: P = [PATCH[0], PATCH[1] - 8], S = 0.56;
const SPOTS = leafSpots(ROOT, ST), TOP = SPOTS[4], BUD: P = [ROOT[0], ROOT[1] - plantHeight(ST)];
/** the moon is far: it sits fixed on the screen while the camera moves, so a pull-back makes it loom */
const MOON_SCREEN: P = [300, 470], MOON_R = 190;
const HOG: P = [PATCH[0] - 170, PATCH[1] + 20];
// the climb: ground -> spot 0 -> 1 -> 2 -> 3 -> 4, each hop 36 frames, starting at film frame 250
const PATH: P[] = [[PATCH[0] + 200, PATCH[1] + 6], ...SPOTS.slice(0, 5)];
const HOPS: [number, number][] = [[250, 286], [360, 396], [470, 506], [560, 596], [650, 686]];
const climber = (f: number) => {
  let at = 0; for (let i = 0; i < HOPS.length; i++) if (f >= HOPS[i][1]) at = i + 1;
  const cur = HOPS.find(([a, b]) => f >= a && f < b);
  if (!cur) { const p = PATH[at]; return { p, face: (at % 2 ? (p[0] < ROOT[0] ? 1 : -1) : -1) as 1 | -1, stretch: 0, lift: 0, lean: 0, earBack: 0 }; }
  const i = HOPS.indexOf(cur), u = (f - cur[0]) / (cur[1] - cur[0]), h = hop(u), a = PATH[i], b = PATH[i + 1];
  const p: P = [mix(a[0], b[0], h.travel), mix(a[1], b[1], h.travel) - Math.sin(h.travel * Math.PI) * 90];
  return { p, face: (b[0] < a[0] ? -1 : 1) as 1 | -1, stretch: h.stretch, lift: 0, lean: h.lean - 18 * Math.sin(h.travel * Math.PI), earBack: h.earBack };
};
const world = (g: Gfx, f: number, o: { pip?: boolean; wave?: number; sleep?: number; bud?: number; cam?: [P, number]; moonK?: number } = {}) => {
  drawMeadow(g, "night", f, { wind: 0.4 });
  mound(g, [PATCH[0], PATCH[1] + 4], 1);
  plant(g, ROOT, ST, f, 0.15, o.bud ?? 0);
  drawHog(g, { x: HOG[0], y: HOG[1], s: 0.6, face: 1, blink: (f % 80) < 4 ? 1 : 0, sniff: f / 25 });
  if (o.pip !== false) {
    const c = climber(f), wave = o.wave ?? 0, sl = o.sleep ?? 0;
    drawPip(g, { x: c.p[0], y: c.p[1], s: S, face: c.face, stretch: c.stretch, lean: c.lean + sl * 10 - wave * 20, head: mix(-14, 22, sl) + breath(f) * (1 + sl), earN: mix(18, -58, sl) - c.earBack, earF: mix(12, -64, sl) - c.earBack, paw: wave ? -80 + Math.sin(f * 0.5) * 30 * wave : 0, look: 0.4, blink: sl > 0.5 ? 1 : blinkAt(f), smile: 0.8 });
  }
  grass(g, "#3b6152", f, 0.4, true);
  glaze(g, "night");
  fireflies(g, f, 18, [60, 700, 1000, 1600], 1);
};
const bigMoon = (g: Gfx, k = 1) => moon(g, MOON_SCREEN, MOON_R * k, 1.2);

const s1 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const up = l / 216;
  cam(g, env, [PATCH[0] + 60, mix(PATCH[1] - 260, PATCH[1] - 480, up)], mix(1.2, 1.32, up), () => { world(g, l); });
  stars(g, l, 30, 0.6);
  titleCard(g, l, 30, 4, "The Climb", CREAM, 200);
});

const s2 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 216 + l;
  cam(g, env, [PATCH[0] + 60, mix(PATCH[1] - 320, PATCH[1] - 440, l / 216)], mix(1.36, 1.5, l / 216), () => world(g, f));
  caption(g, l, 20, "The plant had grown taller than the hedge.", { y: 300, color: CREAM, seed: 941 });
});

const s3 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 432 + l, c = climber(f), look = mixP([PATCH[0] + 40, c.p[1] - 120], [PATCH[0] + 40, TOP[1] - 140], ramp(l, 230, 288));
  cam(g, env, [look[0], mix(PATCH[1] - 440, look[1], ramp(l, 0, 60))], mix(1.5, 1.7, l / 288), () => world(g, f));
  caption(g, l, 30, "Up and up went Pip!", { y: 1700, color: CREAM, seed: 942 });
});

const s4 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 720 + l, back = l / 288, z = Math.pow(2, mix(Math.log2(1.6), Math.log2(0.62), back));
  const c: P = mixP([TOP[0], TOP[1] - 120], [560, 960], back);
  cam(g, env, c, z, () => { world(g, f); fireflies(g, f, 14, [100, 1300, 1000, 1700], back); });
  bigMoon(g, mix(0.75, 1, back)); stars(g, f, 60, 0.8);
  caption(g, l, 150, "The world was so big, and the moon so close!", { y: 1720, color: CREAM, seed: 943 });
});

const s5 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 1008 + l, wave = ramp(l, 20, 40) * (1 - ramp(l, 120, 140)), glowB = Math.max(0, Math.sin(clamp01((l - 160) / 90) * Math.PI));
  const c: P = [TOP[0] - 120, mix(TOP[1] + 140, TOP[1] + 20, l / 288)];
  cam(g, env, c, mix(1.15, 1.35, l / 288), () => world(g, f, { wave, bud: glowB }));
  bigMoon(g); stars(g, f, 60, 0.8);
  caption(g, l, 30, "\"Goodnight, Hazel!\" Pip called down.", { y: 1700, color: CREAM, seed: 944 });
});

const s6 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 1296 + l, sl = ramp(l, 10, 60);
  const c: P = [TOP[0] - 60, TOP[1] - 80], z = mix(1.75, 2.0, l / 144);
  cam(g, env, c, z, () => world(g, f, { sleep: sl, bud: 0.25 + 0.15 * Math.sin(f * 0.1) }));
  bigMoon(g); stars(g, f, 60, 0.8);
  words(g, "Next time: The Flower", 540, 1700, 34, CREAM, 947, clamp01((l - 60) / 30));
});

const scenes: Scene[] = [
  { id: "s1-foot", start: 0, end: 3 * BAR, draw: s1 },
  { id: "s2-first", start: 3 * BAR, end: 6 * BAR, draw: s2 },
  { id: "s3-climb", start: 6 * BAR, end: 10 * BAR, draw: s3 },
  { id: "s4-top", start: 10 * BAR, end: 14 * BAR, draw: s4 },
  { id: "s5-wave", start: 14 * BAR, end: 18 * BAR, draw: s5 },
  { id: "s6-sleep", start: 18 * BAR, end: 20 * BAR, draw: s6, fade: 24 },
];

export const ep4 = episode("Pip and the Moon Seed — 4. The Climb", scenes, filmScore(ep4Score(), 24, 1440), [[1400, 1440, "the last line is read"]]);
