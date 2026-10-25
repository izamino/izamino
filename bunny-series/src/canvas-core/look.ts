// THE LOOK STILL: episode 1's hardest frame. Night; Pip on the burrow bank looks up as the moon seed
// falls, trailing light, toward the bare patch. One light: the moon, upper left.
import { Gfx, PENCIL, type Ctx, type Env, type P } from "./core";
import { Film } from "./film";
import { drawPip } from "./pip";
import { drawMeadow, glaze, grass, moon, seed, stars, trail, MOON } from "./meadow";

export const drawLook = (ctx: Ctx, frame: number, env: Env) => {
  const g = new Gfx(ctx, env, frame, PENCIL);
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = "#fbf6ec"; ctx.fillRect(0, 0, env.W, env.H);
  drawMeadow(g, "night", frame);
  drawPip(g, { x: 760, y: 1500, s: 1.55, face: -1, head: -26, earN: 22, earF: 14, look: -0.5, smile: 0.5 });
  grass(g, "#3b6152", frame, 1, true);
  glaze(g, "night");
  moon(g, MOON, 92);
  stars(g, frame, 46);
  const path: P[] = Array.from({ length: 14 }, (_, i) => { const u = i / 13; return [MOON[0] + 60 + u * 170, MOON[1] + 110 + u * u * 520]; });
  trail(g, path, 1);
  seed(g, path[13], 1.4, 1, 0.5);
  g.paper("paper", 0.12); g.vignette("rgba(30,30,70,0.18)"); g.paper("coldpress", 0.2);
};

export const look: Film = {
  meta: { title: "look", W: 1080, H: 1920, fps: 24, bpm: 80, durationFrames: 1 },
  assets: { images: {} },
  shots: [{ id: "look", start: 0, end: 1, draw: drawLook }],
};
