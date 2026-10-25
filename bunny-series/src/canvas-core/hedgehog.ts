// HAZEL the hedgehog (episodes 3-5), and the small props: the dock leaf, the carrot, the watering cup.
// Anatomy (European hedgehog, side view, facing +x, feet on y = 0): a low dome of spines from the
// brow to the rump, spines pointing back and laid flat along the body, paler tips; a soft brown face
// with a long tapering snout ending in a wet black nose; a small dark eye high on the snout; a
// rounded ear just showing in front of the spines; short legs with long-clawed feet; cream belly fur
// under the skirt of spines. Reference: hedgehog profile photographs (walking, sniffing).
import { Gfx, line, oval, rng, turn, type P } from "./core";

export type HogPose = { x: number; y: number; s: number; face?: 1 | -1; walk?: number; sniff?: number; blink?: number; curl?: number; seed?: number };
const DOME: P[] = [[-92, -8], [-104, -34], [-96, -70], [-70, -98], [-30, -112], [12, -108], [46, -90], [64, -64], [70, -34], [62, -12]];
const FACE: P[] = [[40, -78], [62, -66], [84, -48], [108, -34], [122, -26], [124, -18], [110, -12], [80, -8], [56, -6], [40, -20]];

export const drawHog = (g: Gfx, p: HogPose) => {
  const { face = 1, walk = 0, sniff = 0, blink = 0, seed = 31 } = p, F = (pts: P[]): P[] => (face === 1 ? pts : pts.map(([x, y]) => [-x, y])), L: P = [-6 * face, -8];
  const bob = Math.abs(Math.sin(walk * Math.PI)) * 3, B = (pts: P[]) => pts.map(([x, y]) => [x, y - bob] as P);
  const sn = Math.sin(sniff * 6.28) * 3, FA = (pts: P[]) => B(turn(pts, 50, -40, sn * 0.8));
  g.push(p.x, p.y, p.s);
  g.group("paint", () => g.wash(F(oval(0, 3, 110, 12, 12)), "#6b5f86", { alpha: 0.28, seed, dx: 0, dy: 0, shrink: 1, rim: false }));
  // legs: four short legs, near pair in front; the walk alternates them, near leads
  const legs: [number, number, boolean][] = [[-62, 0.5, false], [36, 0, false], [-50, 0, true], [48, 0.5, true]];
  legs.forEach(([lx, ph, near], i) => { const s = Math.sin((walk + ph) * Math.PI * 2) * 8, top: P = [lx, -16 - bob], foot: P = [lx + s, 0];
    g.group("paint", () => g.form(F([[top[0] - 7, top[1]], [top[0] + 7, top[1]], [foot[0] + 9, foot[1] - 2], [foot[0] + 12, foot[1]], [foot[0] - 7, foot[1]]]), near ? "#a07a5a" : "#7d5d44", "#5c4332", { seed: seed + 10 + i, light: L }));
    g.group("ink", () => { g.pen(F([[foot[0] - 6, foot[1] - 1], [foot[0] + 12, foot[1]]]), { w: 1.3, seed: seed + 20 + i, wobble: 0.2, opacity: 0.7, retrace: false }); [4, 8, 12].forEach((c, k) => g.pen(F([[foot[0] + c - 2, foot[1] - 1], [foot[0] + c + 1, foot[1] + 1]]), { w: 0.8, seed: seed + 24 + i * 3 + k, wobble: 0.1, opacity: 0.6, retrace: false })); });
  });
  // belly fur
  g.group("paint", () => g.wash(F(B([[-80, -14], [-40, -22], [20, -24], [56, -14], [40, -6], [-60, -6]])), "#e9d6b8", { alpha: 0.8, seed: seed + 30, dx: 0, dy: 0, shrink: 1, rim: false }));
  // face first, the dome overlaps its back edge
  const face2 = FA(FACE), eye = FA([[86, -46]])[0], nose = FA([[122, -22]])[0];
  g.group("paint", () => { g.form(F(face2), "#c8a27a", "#8f6c4e", { seed: seed + 40, light: L }); g.wash(F(FA([[70, -30], [110, -26], [118, -16], [80, -10], [56, -12]])), "#ecd8b8", { alpha: 0.75, seed: seed + 41, dx: 0, dy: 0, shrink: 1, rim: false }); });
  g.group("ink", () => {
    g.pen(F(face2), { closed: true, w: 1.8, seed: seed + 42, wobble: 0.5, boil: 0.35, taper: 0.5 });
    const k = g.cur, n = F([nose])[0], e = F([eye])[0]; g.touch(n[0] - 10, n[1] - 10, n[0] + 10, n[1] + 10); g.touch(e[0] - 8, e[1] - 8, e[0] + 8, e[1] + 8);
    k.fillStyle = "#231a1c"; k.beginPath(); k.ellipse(n[0], n[1], 7, 6, 0, 0, Math.PI * 2); k.fill(); k.fillStyle = "#fffaf3"; k.beginPath(); k.arc(n[0] - 2 * face, n[1] - 2.5, 1.8, 0, Math.PI * 2); k.fill();
    if (blink < 0.5) { k.fillStyle = "#1e1618"; k.beginPath(); k.ellipse(e[0], e[1], 5.2, 6, 0, 0, Math.PI * 2); k.fill(); k.fillStyle = "#fffaf3"; k.beginPath(); k.arc(e[0] - 1.6 * face, e[1] - 2.2, 1.7, 0, Math.PI * 2); k.fill(); }
    else g.pen([[e[0] - 6, e[1]], [e[0], e[1] + 2], [e[0] + 6, e[1]]], { w: 1.6, seed: seed + 43, wobble: 0.1, retrace: false });
    g.pen(F(FA([[118, -14], [108, -10], [98, -12]])), { w: 1.2, seed: seed + 44, wobble: 0.1, opacity: 0.7, retrace: false }); // mouth
    [[-4, 0.1], [2, -0.1]].forEach(([dy, a], i) => { const o = F(FA([[112, -22 + dy]]))[0]; g.pen([o, [o[0] + face * 26 * Math.cos(a), o[1] + 26 * Math.sin(a)]], { w: 0.6, seed: seed + 45 + i, wobble: 0.3, opacity: 0.45, retrace: false }); });
  });
  // the ear
  const ear = FA(oval(54, -66, 9, 8, 8));
  g.group("paint", () => g.form(F(ear), "#b8906c", "#7d5d44", { seed: seed + 50, light: L })); g.group("ink", () => g.pen(F(ear), { closed: true, w: 1.3, seed: seed + 51, wobble: 0.3, opacity: 0.8 }));
  // the dome of spines: a dark wash, then pencil spines laid back in rows, pale tips
  const dome = B(DOME);
  g.group("paint", () => { g.form(F([...dome, [40, -14], [-60, -10]]), "#8a6a50", "#4d3a2c", { seed: seed + 60, light: L }); g.wash(F(B([[-80, -60], [-40, -96], [10, -100], [40, -84], [0, -76], [-50, -54]])), "#c9a885", { alpha: 0.35, seed: seed + 61, dx: 0, dy: 0, shrink: 1, rim: false }); });
  g.group("ink", () => {
    g.pen(F([...dome, [40, -14], [-60, -10]]), { closed: true, w: 1.6, seed: seed + 62, wobble: 1.6, boil: 0.5, opacity: 0.7 });
    const r = rng(seed + 63);
    for (let i = 0; i < 70; i++) { const u = r(), v = r(), x = -96 + u * 158, top = -112 + Math.pow((x - (-20)) / 90, 2) * 70, y = top + 6 + v * (-14 - top - 6), len = 14 + r() * 10, a = Math.PI + 0.35 + (x - 0) * -0.002 + (r() - 0.5) * 0.25; const q: P = [x, y - bob], e: P = [x + Math.cos(a) * len * -1 * -1, y - bob + Math.sin(a) * len];
      if (y > -10) continue; g.pen(F([q, e]), { w: 1.1, color: i % 3 ? "#3a2b22" : "#e8d8bf", seed: seed + 100 + i, wobble: 0.2, boil: 0.3, opacity: i % 3 ? 0.65 : 0.8, retrace: false }); }
  });
  g.pop();
};

// ---------------------------------------------------------------- props
/** a dock leaf held as an umbrella: stem in the paw at `h`, blade above, tilted by `tilt` deg */
export const dockLeaf = (g: Gfx, h: P, tilt: number, s = 1, flutter = 0) => {
  const blade: P[] = [[0, -60], [-60, -84], [-120, -118], [-150, -150], [-130, -168], [-60, -170], [0, -176], [60, -170], [130, -168], [150, -150], [120, -118], [60, -84]].map(([x, y], i) => [x * s, (y + Math.sin(flutter + i) * 3) * s] as P);
  const T = (pts: P[]) => turn(pts.map(([x, y]) => [h[0] + x, h[1] + y] as P), h[0], h[1], tilt);
  g.group("paint", () => g.form(T(blade), "#9cc77e", "#4f7f4f", { seed: 801, light: [-4, -5] }));
  g.group("ink", () => { g.pen(T(blade), { closed: true, w: 1.8, color: "#3f6440", seed: 802, wobble: 0.6, boil: 0.4 }); g.pen(T([[0, 0], [0, -60 * s], [0, -176 * s]]), { w: 2.4, color: "#3f6440", seed: 803, wobble: 0.3 }); [-1, 1].forEach((sd) => [0.3, 0.5, 0.7].forEach((t, i) => { const y = -60 * s - t * 110 * s; g.pen(T([[0, y], [sd * 60 * s * (1 - t * 0.3), y - 18 * s]]), { w: 1, color: "#3f6440", seed: 804 + i + (sd > 0 ? 5 : 0), wobble: 0.3, opacity: 0.6, retrace: false }); })); });
};
/** a carrot: tapering root, fine rings, a tuft of feathery leaves */
export const carrot = (g: Gfx, p: P, ang: number, s = 1, bite = 0) => {
  const top = 86 * bite, root: P[] = [[-9 * (1 - bite * 0.8), top], [-7, Math.max(40, top + 4)], [-3, 76], [0, 86], [3, 76], [7, Math.max(40, top + 4)], [9 * (1 - bite * 0.8), top], ...(bite > 0 ? [[5, top - 4], [2, top + 3], [-2, top - 3], [-5, top + 2]] as P[] : [[0, -3]] as P[])].map(([x, y]) => [x * s, y * s] as P);
  const T = (pts: P[]) => turn(pts.map(([x, y]) => [p[0] + x, p[1] + y] as P), p[0], p[1], ang);
  if (bite < 0.1) g.group("ink", () => [-12, -4, 4, 12].forEach((dx, i) => g.pen(T([[0, 0], [dx * s * 0.6, -18 * s], [dx * s * 1.3, -38 * s]]), { w: 1.6, color: "#4f7a4c", seed: 820 + i, wobble: 0.4, boil: 0.3, retrace: false })));
  if (bite >= 0.95) return;
  g.group("paint", () => g.form(T(root), "#f29a4a", "#c4602a", { seed: 830, light: [-2, -3] }));
  g.group("ink", () => { g.pen(T(root), { closed: true, w: 1.3, color: "#8a4a20", seed: 831, wobble: 0.3, boil: 0.3 }); [20, 38, 56].filter((y) => y > top + 6).forEach((y, i) => g.pen(T(line([-6 * s, y * s], [-1 * s, (y + 3) * s])), { w: 0.9, color: "#8a4a20", seed: 832 + i, opacity: 0.6, retrace: false })); });
};
