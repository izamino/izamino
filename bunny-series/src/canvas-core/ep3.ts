// EPISODE 3 — THE VISITOR.  mine -> ours.
// Setup: the sprout grows; Pip has a carrot for lunch. Turn (frame 900): Pip sees how thin and hungry
// the hedgehog is and looks at his own carrot. Payoff: he shares it; two friends by the plant.
// Token: the carrot (planted 0, given 1100, eaten by 1270). The plant 0.3 -> 0.45.
//
// cue table — music: intro 0, verse 144, hog 432, bridge (decide) 720, hook (share) 1008, outro 1296
//   0    S1 sunny noon, Pip by the plant with a carrot; title
//   216  S2 Pip nibbles the carrot; the plant is taller every day
//   432  S3 the hedge rustles (440); Hazel the hedgehog sniffs her way out toward the plant
//   648  S4 Hazel sniffs a leaf (700); Pip stamps over, ears back: "Hey! That's my plant!"; Hazel shrinks
//   864  S5 close: Hazel's thin face, a tummy rumble; Pip looks at his carrot (930)
//   1080 S6 Pip holds out the carrot (1100); Hazel eats (1150-1270); both smile
//   1296 S7 sunset, side by side by the plant; "Next time: The Climb"
import type { Ctx, Env, Gfx, P } from "./core";
import { drawPip, blinkAt, breath, hopAlong } from "./pip";
import { drawHog } from "./hedgehog";
import { drawMeadow, grass, mound, plant, PATCH } from "./meadow";
import { carrot } from "./hedgehog";
import { BAR, cam, caption, clamp01, episode, mix, ramp, sheet, titleCard, words, type Scene } from "./series";
import { filmScore } from "./score";
import { ep3Score } from "./pipScore";

const INK = "#3d3437", ROOT: P = [PATCH[0], PATCH[1] - 8];
const growth = (f: number) => mix(0.3, 0.45, clamp01(f / 1100));
const SEAT: P = [PATCH[0] + 250, PATCH[1] + 6];
/** Pip with the carrot in his near paw; `bite` for nibbles */
const pipWithCarrot = (g: Gfx, f: number, o: Partial<Parameters<typeof drawPip>[1]>, held: boolean, bite = 0, eatAt = -1) => {
  const nib = eatAt >= 0 ? Math.max(0, Math.sin(f * 0.9)) : 0;
  const pose = drawPip(g, { x: SEAT[0], y: SEAT[1], s: 1.45, face: -1, lean: held ? -20 : 0, paw: held ? -55 - nib * 10 : 0, pawF: held ? -45 : 0, head: held ? 8 + nib * 4 : 0, earN: 20, earF: 12, look: -0.6, blink: blinkAt(f, 13), smile: 0.6, twitch: nib, ...o });
  if (held) carrot(g, [pose.paw[0] - 4, pose.paw[1] - 6], 128, 1.6, bite);
  return pose;
};
const hedgeRustle = (g: Gfx, f: number, k: number) => { if (k <= 0) return; g.group("ink", () => { for (let i = 0; i < 7; i++) { const x = 120 + i * 22, y = 1210 + Math.sin(i * 2) * 12, a = Math.sin(f * 0.8 + i) * 6 * k; g.pen([[x, y], [x + 8 + a, y - 10], [x + 18, y]], { w: 1.6, color: "#2f4f44", seed: 1000 + i, wobble: 0.6, opacity: 0.8, retrace: false }); } }); };

const s1 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  cam(g, env, [PATCH[0] + 150, PATCH[1] - 250], 1.55, () => {
    drawMeadow(g, "day", l, { wind: 0.7 });
    mound(g, [PATCH[0], PATCH[1] + 4], 1); plant(g, ROOT, growth(l), l, 0.7);
    carrot(g, [PATCH[0] + 90, SEAT[1] - 2], 96, 1.6); // lying on the grass beside him
    drawPip(g, { x: SEAT[0], y: SEAT[1], s: 1.45, face: -1, head: mix(-6, 10, ramp(l, 60, 100)) + breath(l), lean: mix(0, 10, ramp(l, 60, 100)), earN: 22, earF: 14, look: -0.8, blink: blinkAt(l, 2), smile: 0.9, twitch: Math.sin(l * 1.2) * ramp(l, 80, 110) });
    grass(g, "#6fa874", l, 0.7, true);
  });
  titleCard(g, l, 30, 3, "The Visitor", INK, 200);
});

const s2 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 216 + l;
  cam(g, env, [mix(PATCH[0] + 140, PATCH[0] + 90, ramp(l, 0, 216)), PATCH[1] - 260], mix(1.4, 1.3, ramp(l, 0, 216)), () => {
    drawMeadow(g, "day", f, { wind: 0.7 });
    mound(g, [PATCH[0], PATCH[1] + 4], 1); plant(g, ROOT, growth(f), f, 0.7);
    pipWithCarrot(g, f, { smile: 1 }, true, ramp(l, 40, 200) * 0.25, 0);
    grass(g, "#6fa874", f, 0.7, true);
  });
  caption(g, l, 24, "The sprout grew taller every day.", { y: 300, color: INK, seed: 921 });
});

const s3 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 432 + l, hx = mix(60, PATCH[0] - 170, ramp(l, 40, 200, (t) => t)), alert = ramp(l, 20, 40);
  cam(g, env, [mix(360, 470, ramp(l, 0, 216)), 1330], 1.25, () => {
    drawMeadow(g, "day", f, { wind: 0.7 });
    hedgeRustle(g, f, l < 60 ? 1 : 0);
    mound(g, [PATCH[0], PATCH[1] + 4], 1); plant(g, ROOT, growth(f), f, 0.7);
    if (l > 30) drawHog(g, { x: hx, y: PATCH[1] + 20, s: 0.9, face: 1, walk: l < 200 ? f / 14 : 0, sniff: f / 10, blink: (f % 60) < 4 ? 1 : 0 });
    pipWithCarrot(g, f, { head: -4, earN: mix(20, 34, alert), earF: mix(12, 28, alert), smile: 0.4, look: -1 }, true, 0.25);
    grass(g, "#6fa874", f, 0.7, true);
  });
  caption(g, l, 60, "One day, someone new came sniffing by.", { y: 300, color: INK, seed: 922 });
});

const s4 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 648 + l, sniffLeaf = ramp(l, 30, 60), stamp = hopAlong(l, 90, 126, SEAT[0], SEAT[0] - 50, 18), shrink = ramp(l, 130, 160);
  cam(g, env, [PATCH[0] + 40, PATCH[1] - 200], 1.4, () => {
    drawMeadow(g, "day", f, { wind: 0.7 });
    mound(g, [PATCH[0], PATCH[1] + 4], 1); plant(g, ROOT, growth(f), f + (l > 40 && l < 90 ? Math.sin(f) * 8 : 0), 0.7);
    drawHog(g, { x: mix(PATCH[0] - 170, PATCH[0] - 110, sniffLeaf) - shrink * 40, y: PATCH[1] + 20, s: 0.9, face: 1, walk: l < 60 ? f / 14 : 0, sniff: l < 90 ? f / 6 : 0, blink: shrink > 0.5 ? 1 : 0 });
    const angry = ramp(l, 80, 100) * (1 - ramp(l, 170, 210));
    const pose = drawPip(g, { x: stamp.x, y: SEAT[1], s: 1.45, face: -1, stretch: stamp.stretch, lift: stamp.lift * 0.5, lean: stamp.lean + angry * 10, head: 10 * angry, earN: mix(20, -40, angry), earF: mix(12, -46, angry), look: -1, blink: 0, smile: mix(0.4, 0, angry), paw: -30, pawF: -20 });
    carrot(g, [pose.paw[0] - 4, pose.paw[1] - 6], 128, 1.6, 0.25);
    grass(g, "#6fa874", f, 0.7, true);
  });
  caption(g, l, 100, "\"Hey! That's my plant!\" said Pip.", { y: 300, color: INK, seed: 923 });
});

const s5 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 864 + l, turn = ramp(l, 60, 80), back = ramp(l, 140, 160), rumble = l > 20 && l < 50 ? Math.sin(f * 3) * 2 : 0;
  // two framings, cut on the beat at local 108: Hazel's face, then Pip and his carrot
  if (l < 108) cam(g, env, [PATCH[0] - 130, PATCH[1] - 60], 2.6, () => {
    drawMeadow(g, "day", f, { wind: 0.5 });
    drawHog(g, { x: PATCH[0] - 150 + rumble, y: PATCH[1] + 20, s: 0.9, face: 1, sniff: 0, blink: (f % 50) < 6 ? 1 : 0 });
    grass(g, "#6fa874", f, 0.5, true);
  });
  else cam(g, env, [SEAT[0] - 70, SEAT[1] - 220], 2.0, () => {
    drawMeadow(g, "day", f, { wind: 0.5 });
    pipWithCarrot(g, f, { head: mix(6, 20, turn), look: mix(-1, 0.2, turn) * (1 - back) - back, smile: mix(0, 0.5, back), earN: mix(-10, 16, back), earF: mix(-16, 10, back), blink: blinkAt(f, 40) }, true, 0.25);
    grass(g, "#6fa874", f, 0.5, true);
  });
  caption(g, l, 30, "But the visitor looked so very hungry...", { y: 1640, color: INK, seed: 924 });
});

const s6 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 1080 + l, give = ramp(l, 10, 40), eat = ramp(l, 70, 190), happy = ramp(l, 150, 190);
  const hogX = PATCH[0] - 150, pipX = mix(SEAT[0], PATCH[0] + 170, give);
  cam(g, env, [PATCH[0] + 10, PATCH[1] - 180], 1.5, () => {
    drawMeadow(g, "day", f, { wind: 0.7 });
    mound(g, [PATCH[0], PATCH[1] + 4], 1); plant(g, ROOT, growth(f), f, 0.7);
    drawHog(g, { x: hogX + 20 * give, y: PATCH[1] + 20, s: 0.9, face: 1, sniff: eat > 0 && eat < 1 ? f / 5 : 0, blink: happy > 0.5 && (f % 40) < 10 ? 1 : 0 });
    const pose = drawPip(g, { x: pipX, y: SEAT[1], s: 1.45, face: -1, lean: mix(-20, -6, give), paw: mix(-55, -10, give), pawF: -20, head: 4, earN: 22, earF: 14, look: -1, blink: blinkAt(f, 20), smile: mix(0.4, 1, happy) });
    const cp: P = eat > 0 ? [hogX + 20 * give + 240, PATCH[1] - 6] : [pose.paw[0] - 4, pose.paw[1] - 6];
    carrot(g, cp, eat > 0 ? 90 : mix(128, 90, give), 1.6, mix(0.25, 1, eat));
    grass(g, "#6fa874", f, 0.7, true);
  });
  caption(g, l, 40, "So Pip shared his carrot.", { y: 300, color: INK, seed: 925 });
});

const s7 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 1296 + l;
  cam(g, env, [PATCH[0] + 20, PATCH[1] - 260], mix(1.4, 1.5, ramp(l, 0, 144)), () => {
    drawMeadow(g, "dusk", f, { wind: 0.5 });
    mound(g, [PATCH[0], PATCH[1] + 4], 1); plant(g, ROOT, growth(f), f, 0.5);
    drawHog(g, { x: PATCH[0] - 130, y: PATCH[1] + 20, s: 0.9, face: 1, blink: (f % 70) < 4 ? 1 : 0, sniff: f / 30 });
    drawPip(g, { x: PATCH[0] + 200, y: SEAT[1], s: 1.45, face: -1, head: -8 + breath(f), earN: 22, earF: 14, look: -0.4, blink: blinkAt(f, 5), smile: 1 });
    grass(g, "#56805e", f, 0.5, true);
  });
  caption(g, l, 0, "Two friends, and one little plant.", { y: 300, color: INK, seed: 926 });
  words(g, "Next time: The Climb", 540, 1700, 34, INK, 927, clamp01((l - 60) / 30));
});

const scenes: Scene[] = [
  { id: "s1-noon", start: 0, end: 3 * BAR, draw: s1 },
  { id: "s2-grow", start: 3 * BAR, end: 6 * BAR, draw: s2 },
  { id: "s3-visitor", start: 6 * BAR, end: 9 * BAR, draw: s3 },
  { id: "s4-mine", start: 9 * BAR, end: 12 * BAR, draw: s4 },
  { id: "s5-hungry", start: 12 * BAR, end: 15 * BAR, draw: s5 },
  { id: "s6-share", start: 15 * BAR, end: 18 * BAR, draw: s6 },
  { id: "s7-friends", start: 18 * BAR, end: 20 * BAR, draw: s7, fade: 24 },
];

export const ep3 = episode("Pip and the Moon Seed — 3. The Visitor", scenes, filmScore(ep3Score(), 24, 1440), [[1400, 1440, "the last line is read"]]);
