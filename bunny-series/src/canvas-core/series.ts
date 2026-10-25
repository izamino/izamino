// Shared film machinery for the five episodes: the grid, easing, the camera, hand-lettered words,
// dissolves, and drawing on twos. Every episode imports this; none of them changes it privately.
import { Gfx, PENCIL, rng, type Ctx, type Env, type P } from "./core";
import { GLYPHS, handWrite } from "./scrapbookKit";
import type { Film, Shot } from "./film";

export const FPS = 24, BPM = 80, BEAT = 18, BAR = 72, LEN = 1440; // 20 bars = 60 s
export const clamp01 = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v);
export const ease = (t: number) => { const x = clamp01(t); return x >= 1 ? 1 : x * x * (3 - 2 * x); };
export const easeOut = (t: number) => { const x = clamp01(t); return x >= 1 ? 1 : 1 - (1 - x) ** 3; };
/** 0..1 across [a, b) frames, eased */
export const ramp = (f: number, a: number, b: number, e = ease) => e((f - a) / (b - a));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const mixP = (a: P, b: P, t: number): P => [mix(a[0], b[0], t), mix(a[1], b[1], t)];

// punctuation the lettering kit lacks
GLYPHS["!"] = GLYPHS["!"] ?? { l: [[[1, 0], [0.9, 4.2]], [[0.9, 5.5], [1, 5.9]]], w: 2 };
GLYPHS["?"] = GLYPHS["?"] ?? { c: [[[0.3, 1.2], [1.1, 0.1], [2.6, 0.1], [3.4, 1], [3.4, 2.2], [1.9, 3.2], [1.8, 4.2]]], l: [[[1.8, 5.5], [1.9, 5.9]]], w: 3.6 };

// ---------------------------------------------------------------- the camera
/** look at world point `c` with zoom `z`; draw the world inside, then pop */
export const cam = (g: Gfx, env: Env, c: P, z: number, fn: () => void) => { g.push(env.W / 2 - c[0] * z, env.H / 2 - c[1] * z, z); fn(); g.pop(); };

// ---------------------------------------------------------------- words, lettered by pencil
const charW = (ch: string) => ((GLYPHS[ch]?.w ?? GLYPHS[ch.toUpperCase()]?.w ?? 4) * 0.92 + 1.1);
export const textW = (s: string, cap: number) => [...s].reduce((a, ch) => a + charW(ch), 0) * (cap / 6);
const wrap = (s: string, cap: number, maxW: number) => { const out: string[] = []; let cur = ""; for (const w of s.split(" ")) { const t = cur ? cur + " " + w : w; if (textW(t, cap) > maxW && cur) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; };
/** centred, wrapped, written stroke by stroke as `p` goes 0..1 (each line follows the last) */
export const words = (g: Gfx, text: string, cx: number, y: number, cap: number, color: string, seed: number, p = 1, o: { maxW?: number; lead?: number; w?: number } = {}) => {
  const lines = wrap(text.toUpperCase(), cap, o.maxW ?? 860), lead = o.lead ?? cap * 1.75, total = lines.reduce((a, l) => a + l.length, 0); let done = 0;
  g.group("ink", () => lines.forEach((ln, i) => {
    const lp = p >= 1 ? 1 : clamp01((p * total - done) / ln.length); done += ln.length;
    if (lp > 0) handWrite(g, ln, cx - textW(ln, cap) / 2, y + i * lead, cap, color, seed + i * 31, lp, 0.12, Math.max(1.6, cap / 13) * (o.w ?? 1));
  }));
};
/** a caption that is written over `write` frames from `from`, held, and stays until the shot ends */
export const caption = (g: Gfx, f: number, from: number, text: string, o: { y?: number; color?: string; cap?: number; seed?: number; write?: number } = {}) => {
  if (f < from) return;
  words(g, text, 540, o.y ?? 250, o.cap ?? 36, o.color ?? "#3d3437", o.seed ?? 900, clamp01((f - from) / (o.write ?? 30)));
};

/** the title card lettering: series name, episode number, episode title */
export const titleCard = (g: Gfx, f: number, from: number, ep: number, title: string, color: string, y = 230) => {
  if (f < from) return;
  const t = f - from;
  words(g, "Pip and the Moon Seed", 540, y, 28, color, 801, clamp01(t / 24));
  words(g, "Episode " + ep, 540, y + 64, 24, color, 811, clamp01((t - 18) / 14), { w: 0.8 });
  words(g, title, 540, y + 130, 66, color, 821, clamp01((t - 30) / 30), { w: 1.25 });
};

// ---------------------------------------------------------------- frames
type Draw = (ctx: Ctx, local: number, env: Env) => void;
/** the sheet: warm paper under everything, the paper grain over everything */
export const sheet = (ctx: Ctx, env: Env, f: number, fn: (g: Gfx) => void, vign = "rgba(90,50,50,0.1)") => {
  const g = new Gfx(ctx, env, f, PENCIL);
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = "#fbf6ec"; ctx.fillRect(0, 0, env.W, env.H);
  fn(g);
  g.paper("paper", 0.12); g.vignette(vign); g.paper("coldpress", 0.2);
};
/** a dissolve: B over A at `t`. Both are full frames; A is drawn on a spare surface. */
export const dissolve = (ctx: Ctx, env: Env, a: () => void | Draw, b: Draw, la: number, lb: number, t: number) => {
  const key = `dissolve:${env.W}x${env.H}x${env.scale}`; let L = env.cache.get(key) as ReturnType<Env["canvas"]> | undefined;
  if (!L) { L = env.canvas(Math.round(env.W * env.scale), Math.round(env.H * env.scale)); env.cache.set(key, L); }
  (a as Draw)(L.ctx, la, env); b(ctx, lb, env);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - clamp01(t); ctx.drawImage(L.canvas as CanvasImageSource, 0, 0); ctx.restore();
};

export type Scene = { id: string; start: number; end: number; draw: Draw; /** frames of dissolve from the previous scene */ fade?: number };
/** scenes -> shots. A scene with `fade` dissolves in from the previous one over its first frames. Drawn on twos. */
export const shots = (scenes: Scene[]): Shot[] => scenes.map((s, i) => {
  const prev = scenes[i - 1];
  const draw: Draw = (ctx, local, env) => {
    const l = local - (local % 2);
    if (s.fade && prev && l < s.fade) return dissolve(ctx, env, prev.draw as Draw, s.draw, prev.end - prev.start + l, l, ease(l / s.fade));
    s.draw(ctx, l, env);
  };
  return { id: s.id, start: s.start, end: s.end, draw };
});

export const episode = (title: string, scenes: Scene[], audio?: Film["audio"], holds: [number, number, string][] = []): Film => {
  scenes.forEach((s, i) => { if (s.start % BEAT) throw new Error(`${title}: scene ${s.id} starts off the beat grid (${s.start})`); if (i && scenes[i - 1].end !== s.start) throw new Error(`${title}: gap before ${s.id}`); });
  if (scenes[scenes.length - 1].end !== LEN) throw new Error(`${title}: scenes end at ${scenes[scenes.length - 1].end}, not ${LEN}`);
  return { meta: { title, W: 1080, H: 1920, fps: FPS, bpm: BPM, durationFrames: LEN, step: 2, kind: "story", holds, poster: 300 }, assets: { images: {} }, shots: shots(scenes), audio };
};

// ---------------------------------------------------------------- weather and small things
/** rain: blue pencil dashes falling on a slant; splashes where they land */
export const rain = (g: Gfx, f: number, k: number, wind = 0.35) => {
  if (k <= 0) return;
  g.group("ink", () => { const r = rng(77); for (let i = 0; i < Math.round(150 * k); i++) { const x0 = r() * 1400 - 200, sp = 26 + r() * 14, ph = r() * 2000, y = ((ph + f * sp) % 2100) - 100, x = x0 + y * wind, L = 34 + r() * 26; g.pen([[x, y], [x + L * wind, y + L]], { w: 2.4, color: "#d4def2", seed: 700 + i, wobble: 0.2, boil: 0, taper: 1, opacity: 0.55, retrace: false }); } });
  g.group("ink", () => { const r = rng(78); for (let i = 0; i < Math.round(26 * k); i++) { const x = r() * 1080, y = 1300 + r() * 600, ph = (f + r() * 20) % 20, s = ph / 20; if (s > 0.6) continue; g.pen([[x - 8 * s - 3, y - 6 * s], [x, y - 2], [x + 8 * s + 3, y - 6 * s]], { w: 1.6, color: "#d4def2", seed: 760 + i, wobble: 0.2, opacity: 0.7 * (1 - s), retrace: false }); } });
};
/** fireflies: warm points that wander on their own slow paths */
export const fireflies = (g: Gfx, f: number, n: number, box: [number, number, number, number], k = 1) => {
  g.group("plain", () => { const r = rng(91); for (let i = 0; i < n; i++) { const ax = r(), ay = r(), ph = r() * 6.28, sp = 0.02 + r() * 0.02; const x = box[0] + (box[2] - box[0]) * (ax + 0.06 * Math.sin(f * sp + ph)), y = box[1] + (box[3] - box[1]) * (ay + 0.05 * Math.cos(f * sp * 1.3 + ph)), b = (0.5 + 0.5 * Math.sin(f * 0.12 + ph * 3)) * k; if (b > 0.05) g.glow(x, y, 9, "#fff0a0", b); } }, { blend: "screen" });
};
