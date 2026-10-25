// PIP, the one character module of "Pip and the Moon Seed". Every shot POSES this; nothing redraws it.
//
// Anatomy (a sitting European rabbit, three-quarter profile, facing +x, feet on y = 0):
// a heavy rounded haunch with the thigh contour inside it; the long hind foot flat on the ground
// and reaching forward under the body; short straight forelegs with small paws and two toe
// splits; an egg-shaped head carried low and forward of the shoulder; a high side-set eye with a
// pale eye-ring and a catchlight; a puffed whisker pad, a Y nose and split upper lip; long ears
// widest a third of the way up, rising from the top-back of the skull, pink inside; a white
// cottontail; cream chin, chest and belly; fawn back, darker along the spine.
// Reference opened: wild-rabbit sitting profile photographs and Potter-era storybook plates (for
// the proportion of head to haunch only). Stylised: head ~ 1.25x real size for a storybook face.
//
// Distinguishing features (must show in every shot): the near ear bent forward at the tip; the
// short blue knitted scarf with one tail; the white tail; cream chest.
import { GRAPHITE, Gfx, TINT, line, oval, turn, type P } from "./core";

export const FUR = { coat: "#d9b48a", coatShade: "#9b7454", spine: "#b98d63", cream: "#f8eedd", creamShade: "#d8c5a8", ear: "#efb1b4", earShade: "#c98a8f", scarf: "#6f93c4", scarfShade: "#486a9a", nose: "#d98390" };

export type PipPose = {
  x: number; y: number; s: number; face?: 1 | -1;
  lean?: number;      // deg, whole body about the haunch; negative rears up (front lifts)
  stretch?: number;   // 0 sit .. 1 full hop stretch
  lift?: number;      // body off the ground (hop), local units
  head?: number;      // deg, head pitch about the neck; negative looks up
  earN?: number; earF?: number; // deg, near / far ear about its root (negative = back)
  bend?: number;      // deg, the near ear's bent tip
  blink?: number;     // 0 open .. 1 shut
  look?: number;      // -1..1 pupil along the eye
  paw?: number;       // deg, near foreleg about the shoulder (negative = reach forward/up)
  pawF?: number;      // far foreleg
  smile?: number;     // 0 .. 1
  twitch?: number;    // nose twitch, -1..1
  seed?: number;
};

const T = (pts: P[], c: P, deg: number) => (deg ? turn(pts, c[0], c[1], deg) : pts);
const off = (pts: P[], d: P): P[] => pts.map(([x, y]) => [x + d[0], y + d[1]]);

// hand-placed silhouettes, clockwise from the back of the haunch at the ground
const BODY: P[] = [[-66, -2], [-98, -22], [-113, -62], [-108, -108], [-90, -146], [-60, -170], [-22, -180], [14, -173], [40, -154], [60, -132], [70, -98], [68, -62], [57, -32], [40, -10], [12, -1], [-28, 1]];
const STRETCHED: P[] = [[-92, -6], [-128, -30], [-146, -70], [-140, -110], [-112, -140], [-70, -158], [-24, -164], [18, -160], [52, -148], [82, -128], [96, -100], [92, -70], [76, -44], [50, -24], [14, -14], [-40, -6]];
const CREAM: P[] = [[38, -152], [60, -132], [70, -98], [68, -62], [57, -32], [40, -10], [22, -6], [30, -40], [26, -84], [28, -126]];
const THIGH: P[] = [[4, -6], [-12, -48], [-38, -86], [-70, -96], [-98, -82]];
const FOOT_HOP: P[] = [[-84, -22], [-100, -30], [-140, -14], [-170, 0], [-186, 10], [-188, 18], [-168, 16], [-120, 4], [-86, -8]];
const FOOT: P[] = [[-82, -4], [-62, -17], [-14, -15], [22, -13], [40, -7], [44, 1], [20, 5], [-40, 5], [-80, 4]];
const LEG: P[] = [[33, -80], [53, -82], [57, -50], [57, -18], [66, -10], [73, -3], [69, 3], [50, 4], [42, -3], [39, -34]];
const HEAD: P[] = [[22, -188], [26, -216], [52, -240], [84, -244], [108, -232], [126, -210], [139, -192], [138, -178], [128, -166], [108, -157], [80, -153], [52, -158], [32, -168]];
const CHIN: P[] = [[132, -170], [120, -161], [102, -156], [84, -154], [92, -164], [112, -168]];
const EAR: P[] = [[-12, 0], [-20, -40], [-22, -88], [-16, -130], [-2, -150], [12, -138], [19, -94], [17, -40], [11, 0]];
const INNER: P[] = [[-5, -14], [-11, -48], [-12, -90], [-7, -124], [0, -134], [7, -124], [10, -90], [8, -48], [4, -14]];
const TAIL: P[] = [[-104, -60], [-122, -64], [-134, -50], [-132, -32], [-118, -22], [-102, -28]];
const SCARF: P[] = [[24, -176], [44, -170], [66, -160], [78, -152], [76, -138], [56, -144], [34, -152], [18, -158]];
const SCARF_TAIL: P[] = [[52, -150], [66, -146], [70, -112], [68, -96], [54, -98], [52, -126]];
const NECK: P = [40, -168], SHOULDER: P = [44, -70], HAUNCH: P = [-60, -20];

const lerpShape = (a: P[], b: P[], t: number): P[] => a.map(([x, y], i) => [x + (b[i][0] - x) * t, y + (b[i][1] - y) * t]);
// the near ear's tip folds forward: points above the bend line rotate about it
const bendEar = (pts: P[], deg: number): P[] => pts.map((p) => (p[1] < -92 ? (turn([p], 0, -92, deg * Math.min(1, (-92 - p[1]) / 24 + 0.35))[0]) : p));

export const drawPip = (g: Gfx, p: PipPose) => {
  const { face = 1, lean = 0, stretch = 0, lift = 0, head = 0, earN = 0, earF = 0, bend = 52, blink = 0, look = 0, paw = 0, pawF = 0, smile = 0.3, twitch = 0, seed = 7 } = p;
  // one light for the series: upper left of the picture. In rabbit-local space it flips with the face.
  const L: P = [-7 * face, -9];
  const flip = (pts: P[]): P[] => (face === 1 ? pts : pts.map(([x, y]) => [-x, y]));
  // body space: stretch, lean about the haunch, lift
  const B = (pts: P[]) => off(T(pts, HAUNCH, lean), [0, -lift]);
  const body = B(lerpShape(BODY, STRETCHED, stretch)), sk = 1 + stretch * 0.35;
  const neck = B([[NECK[0] + stretch * 40, NECK[1] + stretch * 10]])[0], hd = (pts: P[]) => T(off(pts, [neck[0] - NECK[0], neck[1] - NECK[1]]), neck, head + lean * 0.5);
  const shoulder = B([[SHOULDER[0] + stretch * 36, SHOULDER[1] + stretch * 14]])[0];
  const leg = (deg: number, dx = 0): P[] => T(off(LEG, [shoulder[0] - SHOULDER[0] + dx, shoulder[1] - SHOULDER[1]]), shoulder, deg + lean + stretch * -50);
  const foot = lerpShape(FOOT, B(FOOT_HOP), stretch);
  const earRoot = (n: number): P => hd([[n ? 62 : 46, n ? -236 : -238]])[0], hdA = head + lean * 0.5;
  const ear = (near: boolean, shape: P[]): P[] => { const r = earRoot(near ? 1 : 0), a = (near ? earN : earF) - 14 + hdA + (near ? 0 : -9); let s = near ? bendEar(shape, bend) : shape; s = s.map(([x, y]) => [x * (near ? 1 : 0.92), y * (near ? 1 : 0.95)] as P); return T(off(s, r), r, a); };
  g.push(p.x, p.y, p.s);
  const F = flip, sd = seed;
  // contact shadow on the ground, away from the light
  g.group("paint", () => g.wash(F(oval(-10 + 18, 4 + lift * 0.02, 128 - lift * 0.3, 15, 14)), "#6b5f86", { alpha: 0.3 * Math.max(0.3, 1 - lift / 120), seed: sd, dx: 0, dy: 0, shrink: 1, rim: false }));
  // far side first: far ear, far foreleg
  const farEar = ear(false, EAR);
  g.group("paint", () => { g.form(F(farEar), FUR.spine, FUR.coatShade, { seed: sd + 1, light: L }); g.form(F(leg(pawF, -16)), FUR.coatShade, "#7d5d44", { seed: sd + 2, light: L }); });
  g.group("ink", () => { g.pen(F(farEar), { closed: true, w: 1.5, seed: sd + 3, wobble: 0.5, boil: 0.35, opacity: 0.7 }); g.pen(F(leg(pawF, -16)), { closed: true, w: 1.3, seed: sd + 4, wobble: 0.4, boil: 0.3, opacity: 0.6 }); });
  // body, cream front, spine shade, tail
  g.group("paint", () => {
    g.form(F(body), FUR.coat, FUR.coatShade, { seed: sd + 10, light: L, hi: [F([[-58, -152]])[0][0], -152 - lift, 14 * sk, 6, -25 * face] });
    g.wash(F(B(lerpShape(CREAM, CREAM.map(([x, y]) => [x + 30, y + 12] as P), stretch))), FUR.cream, { alpha: 0.82, seed: sd + 11, dx: 0, dy: 0, shrink: 1, rim: false });
    g.wash(F(B([[-96, -120], [-80, -156], [-46, -176], [-6, -180], [-30, -168], [-70, -146]])), FUR.spine, { alpha: 0.4, seed: sd + 12, dx: 0, dy: 0, shrink: 1, rim: false });
    g.form(F(B(TAIL)), FUR.cream, FUR.creamShade, { seed: sd + 13, light: L });
    g.form(F(foot), FUR.coat, FUR.coatShade, { seed: sd + 14, light: L });
    g.wash(F(off(foot.slice(5, 9), [0, -3])), FUR.cream, { alpha: 0.6, seed: sd + 15, dx: 0, dy: 0, shrink: 1, rim: false });
  });
  g.group("ink", () => {
    g.pen(F(body), { closed: true, w: 2.4, seed: sd + 20, wobble: 0.6, boil: 0.4, taper: 0.6 });
    g.pen(F(B(THIGH.map(([x, y]) => [x - stretch * 20, y + stretch * 6] as P))), { w: 1.5, seed: sd + 21, wobble: 0.4, boil: 0.3, opacity: 0.6, retrace: false });
    g.pen(F(B(TAIL)), { closed: true, w: 1.2, seed: sd + 22, wobble: 1.2, boil: 0.4, opacity: 0.55, retrace: false });
    g.pen(F(foot), { closed: true, w: 2, seed: sd + 23, wobble: 0.4, boil: 0.3, taper: 0.5 });
    [0, 1].forEach((i) => g.pen(F(line(foot[4 + 0], foot[4 + 0]).map(([x, y]) => [x - 8 - i * 8, y + 3 + i] as P).concat([[foot[4][0] - 10 - i * 8, foot[4][1] + 8]])), { w: 1.1, seed: sd + 24 + i, wobble: 0.2, opacity: 0.5, retrace: false }));
    // fur: short pencil flicks along the back, following the form
    g.hatch(F([[-96, 0]])[0][0] - (face === 1 ? 0 : 60), -132 - lift, 60, { n: 6, len: 12, angle: face === 1 ? -0.5 : -2.6, seed: sd + 26, opacity: 0.28, pw: 1.2 });
  });
  // near foreleg
  const nl = leg(paw);
  g.group("paint", () => g.form(F(nl), FUR.coat, FUR.coatShade, { seed: sd + 30, light: L }));
  g.group("ink", () => { g.pen(F(nl), { closed: true, w: 1.9, seed: sd + 31, wobble: 0.4, boil: 0.35, taper: 0.5 }); [0, 1].forEach((i) => { const a = nl[5], b = nl[6]; const q: P = [a[0] + (b[0] - a[0]) * (0.35 + i * 0.3), a[1] + (b[1] - a[1]) * (0.35 + i * 0.3)]; g.pen(F([q, [q[0] - 2, q[1] - 6]]), { w: 1, seed: sd + 32 + i, wobble: 0.1, opacity: 0.6, retrace: false }); }); });
  // scarf: under the chin, one tail down the chest
  const sc = hd(SCARF).map(([x, y], i) => [x, y + (i > 3 ? 2 : 0)] as P), st = B(SCARF_TAIL);
  g.group("paint", () => { g.form(F(st), FUR.scarf, FUR.scarfShade, { seed: sd + 40, light: L }); g.form(F(sc), FUR.scarf, FUR.scarfShade, { seed: sd + 41, light: L }); });
  g.group("ink", () => {
    g.pen(F(st), { closed: true, w: 1.6, seed: sd + 42, wobble: 0.4, boil: 0.3 }); g.pen(F(sc), { closed: true, w: 1.8, seed: sd + 43, wobble: 0.4, boil: 0.3 });
    // knit ribs and a fringe
    [0.25, 0.5, 0.75].forEach((t, i) => { const a = sc[Math.round(t * 3)], b = sc[7 - Math.round(t * 3)]; g.pen(F(line(a, b, 1)), { w: 1, color: "#3b5683", seed: sd + 44 + i, wobble: 0.3, opacity: 0.55, retrace: false }); });
    [0, 1, 2].forEach((i) => { const a: P = [st[3][0] - 3 - i * 5, st[3][1] - 1]; g.pen(F([a, [a[0] + 1, a[1] + 9]]), { w: 1.1, color: "#3b5683", seed: sd + 48 + i, wobble: 0.2, opacity: 0.7, retrace: false }); });
  });
  // head
  const H = hd(HEAD), eyeC = hd([[92, -212]])[0];
  g.group("paint", () => {
    g.form(F(H), FUR.coat, FUR.coatShade, { seed: sd + 50, light: L, hi: [F([hd([[66, -226]])[0]])[0][0], hd([[66, -226]])[0][1], 16, 8, -30 * face] });
    g.wash(F(hd(CHIN)), FUR.cream, { alpha: 0.85, seed: sd + 51, dx: 0, dy: 0, shrink: 1, rim: false });
    g.wash(F(hd(oval(121, -180, 14, 11, 9))), FUR.cream, { alpha: 0.7, seed: sd + 52, dx: 0, dy: 0, shrink: 1, rim: false }); // whisker pad
    g.wash(F([eyeC].flatMap((c) => oval(c[0], c[1], 17, 18, 10))), FUR.cream, { alpha: 0.55, seed: sd + 53, dx: 0, dy: 0, shrink: 1, rim: false }); // eye ring
    g.wash(F(hd(oval(104, -184, 11, 7, 8))), "#f2a0a8", { alpha: 0.32, seed: sd + 54, dx: 0, dy: 0, shrink: 1, rim: false }); // cheek
  });
  g.group("ink", () => {
    g.pen(F(H), { closed: true, w: 2.4, seed: sd + 60, wobble: 0.6, boil: 0.4, taper: 0.6 });
    // nose: a Y under a soft pink pad, split upper lip, the mouth corner
    const tw = twitch * 1.5, N = hd([[136 + tw, -190]])[0];
    g.wash(F(oval(N[0] - 1, N[1] - 1, 6, 4.5, 7)), FUR.nose, { alpha: 0.9, seed: sd + 59, dx: 0, dy: 0, shrink: 1, rim: false });
    g.pen(F([[N[0] - 4, N[1] - 3], [N[0] + 1, N[1] + 1], [N[0] + 3, N[1] - 4]]), { w: 2.2, color: "#7e3a46", seed: sd + 61, wobble: 0.1, boil: 0.2, retrace: false });
    g.pen(F(hd([[137 + tw, -189], [135, -180], [131, -173]])), { w: 1.6, seed: sd + 62, wobble: 0.1, opacity: 0.9, retrace: false });
    g.pen(F(hd([[131, -173], [124, -168 + smile * 2], [116, -170 - smile * 4]])), { w: 1.6, seed: sd + 63, wobble: 0.1, opacity: 0.85, retrace: false });
    // whiskers: fine, from the pad, one side leads
    [[-6, 0.18], [0, 0.02], [5, -0.14]].forEach(([dy, a], i) => { const o = hd([[124, -182 + dy]])[0], hA = ((hdA) * Math.PI) / 180 + a; g.pen(F([o, [o[0] + Math.cos(hA) * 26, o[1] + Math.sin(hA) * 26 - 3], [o[0] + Math.cos(hA) * 50, o[1] + Math.sin(hA) * 50 + 2]]), { w: 0.7, seed: sd + 64 + i, wobble: 0.4, boil: 0.5, opacity: 0.45, retrace: false }); });
    // the jaw join and the cheek fur
    g.pen(F(hd([[54, -160], [74, -170], [96, -168]])), { w: 1.1, seed: sd + 68, wobble: 0.3, opacity: 0.4, retrace: false });
  });
  // the eye: dark, high, a catchlight toward the light, lids that close
  g.group("ink", () => {
    const k = g.cur, c = F([eyeC])[0], open = 1 - Math.min(1, Math.max(0, blink));
    g.touch(c[0] - 16, c[1] - 16, c[0] + 16, c[1] + 16);
    if (open > 0.12) {
      k.save(); k.beginPath(); k.ellipse(c[0], c[1], 10, 12 * open, 0, 0, Math.PI * 2); k.clip();
      k.fillStyle = "#2c2226"; k.beginPath(); k.ellipse(c[0] + look * 2 * face, c[1], 10, 12, 0, 0, Math.PI * 2); k.fill();
      k.fillStyle = "#5a3a2c"; k.beginPath(); k.ellipse(c[0] + (look * 2 + 2) * face, c[1] + 4, 6, 6, 0, 0, Math.PI * 2); k.fill();
      k.fillStyle = "#1a1416"; k.beginPath(); k.ellipse(c[0] + (look * 2 + 1) * face, c[1] + 1, 5, 6, 0, 0, Math.PI * 2); k.fill();
      k.fillStyle = "#fffaf3"; k.beginPath(); k.arc(c[0] - 3.5 * face + look * 2 * face, c[1] - 5, 3.4, 0, Math.PI * 2); k.fill();
      k.globalAlpha = 0.8; k.beginPath(); k.arc(c[0] + 3 * face, c[1] + 5, 1.4, 0, Math.PI * 2); k.fill(); k.globalAlpha = 1; k.restore();
    }
    // upper lid line (and the closed eye, a soft arc)
    const lidY = -12 * open + 1;
    g.pen([[c[0] - 11, c[1] - 2 + lidY * 0.3], [c[0], c[1] + lidY], [c[0] + 11, c[1] - 2 + lidY * 0.3]], { w: open < 0.2 ? 2 : 1.6, seed: sd + 70, wobble: 0.1, boil: 0.2, opacity: 0.85, retrace: false });
    // lashes of fur over the brow
    g.pen(F(hd([[80, -230], [94, -232], [106, -226]])), { w: 1, seed: sd + 71, wobble: 0.3, opacity: 0.35, retrace: false });
  });
  // near ear last: in front of the skull
  const nearEar = ear(true, EAR), nearIn = ear(true, INNER);
  g.group("paint", () => { g.form(F(nearEar), FUR.coat, FUR.coatShade, { seed: sd + 80, light: L }); g.wash(F(nearIn), FUR.ear, { alpha: 0.85, seed: sd + 81, dx: 0, dy: 0, shrink: 0.96, rim: true }); });
  g.group("ink", () => { g.pen(F(nearEar), { closed: true, w: 2.1, seed: sd + 82, wobble: 0.5, boil: 0.4, taper: 0.6 }); g.pen(F(nearIn.slice(1, 8)), { w: 1, color: FUR.earShade, seed: sd + 83, wobble: 0.4, opacity: 0.7, retrace: false }); });
  g.pop();
};

export const PIP_VERSION = 1;
export { GRAPHITE, TINT };
