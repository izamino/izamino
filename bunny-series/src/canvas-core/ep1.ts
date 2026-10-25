// EPISODE 1 — THE SEED.  alone -> caretaker.
// Setup: every night Pip watches the moon. Turn (frame 468): the moon lets a seed fall. Payoff: Pip
// plants it, and at dawn a sprout says hello. Token: the seed (lands 576, sprouts 1170).
//
// cue table (frames @24 fps, beat 18, bar 72) — music: intro 0, verse 144, wonder 432, bridge 720, hook 1008, outro 1296
//   0    S1 close on Pip at night, ear flick; title lettered in the sky       (hook in the first second)
//   216  S2 wide: the meadow, the moon; "Every night..."
//   432  S3 the seed falls (468) and lands (576) with a burst; Pip's ears shoot up
//   648  S4 Pip hops to the patch, sniffs the glowing seed
//   864  S5 close: Pip digs, sets the seed in, covers it
//   1080 S6 dawn (dissolve): Pip asleep by the mound; the sun; the sprout breaks (1170); Pip wakes
//   1296 S7 nose to sprout; "Next time: The Storm"
import type { Ctx, Env, P } from "./core";
import { drawPip, blinkAt, breath, hopAlong } from "./pip";
import { drawMeadow, glaze, grass, moon, seed, stars, trail, sun, burst, dirt, mound, plant, MOON, PATCH } from "./meadow";
import { BAR, cam, caption, clamp01, ease, episode, mix, ramp, sheet, titleCard, words, type Scene } from "./series";
import { filmScore } from "./score";
import { ep1Score } from "./pipScore";

const CREAM = "#f6ecd2", INK = "#3d3437";
const SEAT: P = [760, 1500];               // Pip's place on the bank
const FALL0: P = [MOON[0] + 50, MOON[1] + 100], LAND: P = [PATCH[0], PATCH[1] - 6];
const fallAt = (u: number): P => [mix(FALL0[0], LAND[0], u), mix(FALL0[1], LAND[1], u * u)];

const night = (g: Parameters<typeof drawPip>[0], f: number, fg: () => void, o: { seedUp?: number } = {}) => {
  drawMeadow(g, "night", f); fg(); grass(g, "#3b6152", f, 1, true); glaze(g, "night");
  moon(g, MOON, 92, 1 + 0.08 * Math.sin(f * 0.05) + (o.seedUp ?? 0)); stars(g, f, 46);
};

// S1: close on Pip; the ear flicks at frame 10, the head lifts to the moon by 90
const s1 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const look = ramp(l, 40, 100), z = mix(1.9, 1.45, ramp(l, 0, 216));
  cam(g, env, [SEAT[0] - 60, SEAT[1] - 300], z, () => night(g, l, () => drawPip(g, { x: SEAT[0], y: SEAT[1], s: 1.55, face: -1, head: mix(8, -26, look) + breath(l), earN: mix(-4, 22, look) + (l > 8 && l < 22 ? -18 : 0), earF: mix(-10, 14, look), look: -0.5 * look, blink: blinkAt(l, 30), smile: 0.4, twitch: Math.sin(l * 0.9) * (l < 40 ? 1 : 0.2) })));
  titleCard(g, l, 36, 1, "The Seed", CREAM, 200);
});

// S2: wide; the moon breathes, Pip sits watching
const s2 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 216 + l;
  cam(g, env, [540, mix(1010, 950, l / 216)], mix(1.1, 1.0, l / 216), () => night(g, f, () => drawPip(g, { x: SEAT[0], y: SEAT[1], s: 1.55, face: -1, head: -26 + breath(f), earN: 22 + Math.sin(f * 0.07) * 3, earF: 14, look: -0.5, blink: blinkAt(f), smile: 0.5, twitch: Math.sin(f * 0.7) * 0.3 })));
  caption(g, l, 24, "Every night, Pip watched the moon.", { y: 1720, color: CREAM, seed: 902 });
});

// S3: the moon lets go (local 36 = frame 468), the seed falls and lands (local 144 = 576)
const s3 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 432 + l, u = clamp01((l - 36) / 108), landed = l >= 144, startle = ramp(l, 40, 60);
  cam(g, env, [mix(540, 520, l / 216), mix(950, 1060, l / 216)], mix(1.0, 1.12, l / 216), () => {
    night(g, f, () => {
      drawPip(g, { x: SEAT[0], y: SEAT[1], s: 1.55, face: -1, head: mix(-26, -14, ramp(l, 120, 150)) + breath(f), earN: mix(22, 34, startle), earF: mix(14, 26, startle), look: mix(-0.5, -1, ramp(l, 100, 150)), blink: l > 60 ? 0 : blinkAt(f), smile: mix(0.5, 0.9, startle), twitch: Math.sin(f * 1.1) * startle });
      if (landed) { burst(g, LAND, (l - 144) / 40); seed(g, LAND, 1.2, 0.8 + 0.2 * Math.sin(f * 0.2), 0.3); }
    }, { seedUp: l > 20 && l < 50 ? 0.5 * Math.sin(((l - 20) / 30) * Math.PI) : 0 });
    if (l >= 36 && !landed) { const pts: P[] = Array.from({ length: 12 }, (_, i) => fallAt(Math.max(0, u - (11 - i) * 0.025))); trail(g, pts, 1); seed(g, fallAt(u), 1.4, 1, u * 4); }
  });
  caption(g, l, 60, "One night, the moon let something fall.", { y: 1730, color: CREAM, seed: 903 });
});

// S4: Pip hops down to the patch (3 hops), sniffs the seed
const s4 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 648 + l, h = hopAlong(l, 20, 74, SEAT[0], PATCH[0] + 150, 18), y = mix(SEAT[1], PATCH[1], clamp01((h.x - SEAT[0]) / (PATCH[0] + 150 - SEAT[0])));
  const camX = mix(640, 560, l / 216), z = mix(1.12, 1.35, l / 216);
  cam(g, env, [camX, mix(1080, 1300, l / 216)], z, () => night(g, f, () => {
    seed(g, LAND, 1.2, 0.85 + 0.15 * Math.sin(f * 0.2), 0.3);
    const sniff = l > 90 ? 1 : 0;
    drawPip(g, { x: h.x, y, s: 1.5, face: -1, stretch: h.stretch, lift: h.lift, lean: h.lean + sniff * 14, head: (sniff ? 16 : 0) + breath(f), earN: 18 - h.earBack + sniff * 6, earF: 10 - h.earBack, look: -0.7, blink: blinkAt(f, 11), smile: 0.6, twitch: sniff * Math.sin(f * 1.6) });
  }));
  caption(g, l, 110, "A seed, warm as a little star.", { y: 300, color: CREAM, seed: 904 });
});

// S5: close; digging (paws alternate), the seed set in (local 120), covered by 190
const s5 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 864 + l, digging = l < 110, set = l >= 120, cover = ramp(l, 130, 190);
  cam(g, env, [PATCH[0] + 40, PATCH[1] - 120], 2.1, () => night(g, f, () => {
    mound(g, [PATCH[0], PATCH[1] + 4], cover, digging ? clamp01(l / 60) : 1 - cover);
    if (!set || cover < 0.5) seed(g, set ? [PATCH[0], PATCH[1] + 2] : [PATCH[0] - 40, PATCH[1] - 8], 1.1, set ? 0.6 * (1 - cover) : 0.9, 0.3);
    dirt(g, [PATCH[0] + 10, PATCH[1]], f, digging ? 1 : 0, 1);
    const pa = digging ? Math.sin(f * 0.9) * 26 - 30 : set && cover < 1 ? Math.sin(f * 0.5) * 12 - 20 : 0;
    drawPip(g, { x: PATCH[0] + 80, y: PATCH[1] + 4, s: 1.4, face: -1, lean: digging || cover < 1 ? 22 : 4, head: digging ? 20 : mix(10, -4, ramp(l, 190, 210)), paw: pa, pawF: digging ? -Math.sin(f * 0.9) * 26 - 30 : pa * 0.6, earN: 10, earF: 4, look: -0.3, blink: blinkAt(f, 40), smile: mix(0.4, 0.9, ramp(l, 190, 210)) });
  }));
  caption(g, l, 30, "Pip dug a bed and tucked it in.", { y: 300, color: CREAM, seed: 905 });
});

// S6: dawn. Pip asleep by the mound; the sun lifts; the sprout breaks (local 90 = frame 1170); Pip wakes
const s6 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 1080 + l, rise = ramp(l, 0, 216), sprout = ramp(l, 90, 150), wake = ramp(l, 140, 170);
  cam(g, env, [520, mix(1180, 1260, rise)], mix(1.2, 1.4, rise), () => {
    drawMeadow(g, "dawn", f, { wind: 0.6 });
    sun(g, [900, mix(1150, 1010, rise)], 54, 0.6 + rise * 0.4);
    mound(g, [PATCH[0], PATCH[1] + 4], 1);
    plant(g, [PATCH[0], PATCH[1] - 8], sprout * 0.2, f, 0.6);
    if (sprout > 0 && sprout < 1) burst(g, [PATCH[0], PATCH[1] - 30], sprout);
    drawPip(g, { x: PATCH[0] + 150, y: PATCH[1] + 6, s: 1.45, face: -1, lean: mix(10, 0, wake), head: mix(22, -6, wake) + breath(f) * 1.5, earN: mix(-60, 20, wake), earF: mix(-66, 12, wake), bend: mix(70, 52, wake), blink: wake < 0.5 ? 1 : blinkAt(f), look: -0.6, smile: mix(0.3, 1, wake) });
    grass(g, "#5f9469", f, 0.6, true);
  });
  caption(g, l, 160, "And in the morning, it said hello.", { y: 300, color: INK, seed: 906 });
});

// S7: nose to sprout, then the episode's last line and the token, held to read
const s7 = (ctx: Ctx, l: number, env: Env) => sheet(ctx, env, l, (g) => {
  const f = 1296 + l, near = ramp(l, 0, 40);
  cam(g, env, [PATCH[0] + 90, PATCH[1] - 110], mix(2.0, 2.2, ramp(l, 0, 144)), () => {
    drawMeadow(g, "dawn", f, { wind: 0.6 });
    mound(g, [PATCH[0], PATCH[1] + 4], 1);
    plant(g, [PATCH[0], PATCH[1] - 8], 0.2, f, 0.6);
    drawPip(g, { x: mix(PATCH[0] + 190, PATCH[0] + 165, near), y: PATCH[1] + 6, s: 1.45, face: -1, lean: 12 * near, head: 14 * near + breath(f), earN: 22, earF: 14, blink: blinkAt(f, 7), look: -0.8, smile: 1, twitch: Math.sin(f * 1.4) * near });
  });
  words(g, "Next time: The Storm", 540, 1700, 34, INK, 907, clamp01((l - 60) / 30));
});

const scenes: Scene[] = [
  { id: "s1-close", start: 0, end: 3 * BAR, draw: s1 },
  { id: "s2-wide", start: 3 * BAR, end: 6 * BAR, draw: s2 },
  { id: "s3-fall", start: 6 * BAR, end: 9 * BAR, draw: s3 },
  { id: "s4-hop", start: 9 * BAR, end: 12 * BAR, draw: s4 },
  { id: "s5-dig", start: 12 * BAR, end: 15 * BAR, draw: s5 },
  { id: "s6-dawn", start: 15 * BAR, end: 18 * BAR, draw: s6, fade: 36 },
  { id: "s7-hello", start: 18 * BAR, end: 20 * BAR, draw: s7 },
];

export const ep1 = episode("Pip and the Moon Seed — 1. The Seed", scenes, filmScore(ep1Score(), 24, 1440), [[1400, 1440, "the last line is read"]]);
export const _ease = ease;
