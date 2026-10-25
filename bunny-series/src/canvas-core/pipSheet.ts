// Pip's model sheet: the poses the series needs, on plain paper, so the rabbit is settled before any scene.
import { Gfx, PENCIL, type Ctx, type Env } from "./core";
import { Film } from "./film";
import { drawPip, type PipPose } from "./pip";

const POSES: PipPose[] = [
  { x: 300, y: 560, s: 1.25 },
  { x: 800, y: 560, s: 1.25, face: -1, head: -24, earN: -8, earF: -14, look: -0.4, smile: 0.6 },
  { x: 300, y: 1060, s: 1.25, stretch: 1, lift: 40, earN: -40, earF: -46, head: 6, lean: 6 },
  { x: 800, y: 1060, s: 1.25, lean: -28, head: 10, paw: -70, pawF: -60, smile: 0.8 },
  { x: 300, y: 1560, s: 1.25, blink: 1, head: 14, earN: -30, earF: -36, bend: 60 },
  { x: 800, y: 1560, s: 1.25, face: -1, head: -8, earN: 10, earF: 4, twitch: 1, look: 0.6 },
];

const draw = (ctx: Ctx, frame: number, env: Env) => {
  const g = new Gfx(ctx, env, frame, PENCIL);
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = "#fbf6ec"; ctx.fillRect(0, 0, env.W, env.H);
  POSES.forEach((p, i) => drawPip(g, { ...p, seed: 7 }));
  g.paper("paper", 0.12); g.paper("coldpress", 0.18);
};

export const pipSheet: Film = {
  meta: { title: "pipSheet", W: 1080, H: 1920, fps: 24, bpm: 80, durationFrames: 1 },
  assets: { images: {} },
  shots: [{ id: "sheet", start: 0, end: 1, draw }],
};
