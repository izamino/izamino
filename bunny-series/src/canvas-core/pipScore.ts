// THE SERIES THEME — "Pip and the Moon Seed". One motif carries all five episodes; each episode
// re-voices it for its mood. This file holds the theme's material (chords, motifs) and episode 1's form.
//
// Brief as numbers: 60 s per episode, 4/4 at 80 bpm = 20 bars of 3 s (a bar = 72 film frames at 24 fps).
// Feeling, in the person's words: "warm and gentle". Style: tender acoustic (folk). Mood: tender,
// turning hopeful at dawn. Key D major (a warm, open key for harp).
//
// THE MOTIF ("the seed"): an upbeat lift A-B into D, a step up and a fall back, the long note on
// the downbeat of the second bar. It avoids beat 1 (it starts after a breath, the way Pip watches
// before moving). Stated, answered, sequenced up a step for the wonder, fragmented while digging,
// augmented at dawn, and its last word alone at the end.
//
// Tension sketch, episode 1:  intro .2 | A .3 | A' (seed falls) .55 | B dig .45 (dip) | A'' dawn .8 PEAK | outro .2
// Climax: bar 17 (dawn, the sprout), A5 over D, full layers.
import type { Material } from "./music/compose";

export const CHORDS: Material["chords"] = {
  D: { voicing: "[D3 A3 F#4]", bass: "D2:2 A2:2" },
  Dadd9: { voicing: "[D3 A3 E4 F#4]", bass: "D2:3 A2:1" },
  G: { voicing: "[G3 B3 D4]", bass: "G2:2 D3:2" },
  Gmaj7: { voicing: "[G3 B3 D4 F#4]", bass: "G2:3 B2:1" },
  A: { voicing: "[A3 C#4 E4]", bass: "A2:2 E3:2" },
  Asus4: { voicing: "[A3 D4 E4]", bass: "A2:4" },
  Bm: { voicing: "[B3 D4 F#4]", bass: "B2:2 F#2:2" },
  Em7: { voicing: "[G3 B3 D4 E4]", bass: "E2:2 B2:2" },
  Gm: { voicing: "[G3 Bb3 D4]", bass: "G2:4" },
  "D/F#": { voicing: "[A3 D4 F#4]", bass: "F#2:2 A2:2" },
  "F#": { voicing: "[F#3 A#3 C#4]", bass: "F#2:2 C#3:2" },
  E: { voicing: "[E3 B3 G#4]", bass: "E2:2 B2:2" },
  "C#m": { voicing: "[C#4 E4 G#4]", bass: "C#3:2 G#2:2" },
  B: { voicing: "[B3 D#4 F#4]", bass: "B2:2 F#2:2" },
};

export const MOTIFS: Record<string, string> = {
  // question and answer (2 bars each)
  seedQ: "r:1 A4:.5 B4:.5 D5:1 E5:.5 F#5:.5 | E5:1.5 D5:.5 B4:2",
  seedA: "r:1 A4:.5 B4:.5 D5:1 E5:.5 D5:.5 | C#5:1 B4:.5 C#5:.5 D5:2",
  // sequenced a step up: the seed is falling, the world opens
  wonderQ: "r:1 B4:.5 C#5:.5 E5:1 F#5:.5 G5:.5 | F#5:1.5 E5:.5 C#5:2",
  wonderA: "r:1 D5:.5 E5:.5 F#5:1 G5:.5 E5:.5 | F#5:1 E5:.5 D5:.5 E5:2",
  // fragments while digging, in the relative minor
  digA: "B4:.5 D5:.5 r:.5 B4:.5 F#5:1 E5:1 | D5:1.5 C#5:.5 B4:2",
  digB: "G4:.5 B4:.5 r:.5 G4:.5 D5:1 E5:1 | C#5:3 r:1",
  // dawn: augmented, rising to the series' high note
  dawn: "r:1 A4:.5 B4:.5 D5:1 F#5:.5 A5:.5@0.8 | G5:1.5@0.85 F#5:.5 E5:2 | r:1 D5:.5 E5:.5 F#5:1 E5:.5 C#5:.5 | D5:4",
  last: "r:1 A4:.5 B4:.5 D5:2 | r:4",
};

export const ep1Score = (): Material => ({
  style: "folk", title: "Pip and the Moon Seed — 1. The Seed", seed: 4101, mood: "tender",
  bpm: 80, key: "D", mode: "major", meter: "4/4",
  moodControls: { energy: 0.35, warmth: 0.7, brightness: 0.45, tension: 0.2, space: 0.3 },
  swing: 0.5, dyn: [0.5, 0.62], tail: 2.6,
  voices: {
    lead: { inst: "harp", role: "melody", send: 0.12 },
    counter: { inst: "vibes", role: "color", send: 0.14 },
    chords: "strings",
    bass: { inst: "bass", role: "bass", opts: { kind: "upright" }, send: 0.05 },
  },
  levels: { lead: 3.5 },
  chords: CHORDS,
  grooves: { main: { family: "pulse", density: 0.25, variation: 0.3 } },
  motifs: {
    ...MOTIFS,
    // vibes answer in the lead's rests, high and quiet
    ansA: "r:3 F#5:1 | r:2 A5:2",
    ansB: "r:3 E5:1 | r:2 C#5:2",
    ansDawn: "r:2 D5:1 E5:1 | F#5:4",
  },
  sections: [
    { groove: null, kind: "intro", bars: 2, harmony: ["Dadd9", "Gmaj7"], chordVel: 0.7, counter: "r:2 A4:1 D5:1 | F#5:2 E5:2", energy: 0.3 },
    { groove: null, kind: "verse", bars: 4, harmony: ["D", "G", "Bm", "A"], lead: ["seedQ", "seedA"], energy: 0.35 },
    { groove: null, kind: "verse", id: "wonder", bars: 4, harmony: ["Em7", "A", "D/F#", "Asus4"], lead: ["wonderQ", "wonderA"], counter: ["ansA", "ansB"], energy: 0.55 },
    { groove: null, kind: "bridge", bars: 4, harmony: ["Bm", "G", "Bm", "A"], lead: ["digA", "digB"], stretch: true, energy: 0.45 },
    { kind: "hook", bars: 4, harmony: ["D", "Gmaj7", "Em7 A", "D"], bass: ["D2:2 A2:2", "G2:3 B2:1", "E2:2 A2:2", "D2:4"], lead: ["dawn"], counter: ["r:4 | r:4", "ansDawn"], energy: 0.8 },
    { groove: null, kind: "outro", bars: 2, harmony: ["G", "D"], lead: ["last"], chordVel: 0.75, energy: 0.3 },
  ],
});

// ---------------------------------------------------------------- episodes 2-5: the same theme, re-voiced
const VOICES: Material["voices"] = {
  lead: { inst: "harp", role: "melody", send: 0.12 },
  counter: { inst: "vibes", role: "color", send: 0.14 },
  chords: "strings",
  bass: { inst: "bass", role: "bass", opts: { kind: "upright" }, send: 0.05 },
};
const DAWN_BASS = ["D2:2 A2:2", "G2:3 B2:1", "E2:2 A2:2", "D2:4"];
const base = (n: number, title: string, mood: Material["mood"], seed: number, mc: Material["moodControls"], motifs: Record<string, string>, sections: Material["sections"]): Material => ({
  style: "folk", title: `Pip and the Moon Seed — ${n}. ${title}`, seed, mood, bpm: 80, key: "D", mode: "major", meter: "4/4",
  moodControls: mc, swing: 0.5, dyn: [0.5, 0.62], tail: 2.6, voices: VOICES, levels: { lead: 3.5 }, chords: CHORDS,
  grooves: { main: { family: "pulse", density: 0.3, variation: 0.3 } },
  motifs: { ...MOTIFS, ansA: "r:3 F#5:1 | r:2 A5:2", ansB: "r:3 E5:1 | r:2 C#5:2", ansDawn: "r:2 D5:1 E5:1 | F#5:4", ...motifs },
  sections: sections.map((x) => ({ groove: null, ...x })),
});

// 2. THE STORM: the theme turned minor in the wind; a heartbeat while Pip is afraid; brave sequence; morning home
export const ep2Score = (): Material => base(2, "The Storm", "wistful", 4202, { energy: 0.45, warmth: 0.6, brightness: 0.4, tension: 0.45, space: 0.3 }, {
  stormQ: "r:1 F#4:.5 G4:.5 B4:1 C#5:.5 D5:.5 | C#5:1.5 B4:.5 F#4:2",
  stormA: "r:1 F#4:.5 G4:.5 B4:1 C#5:.5 B4:.5 | A#4:1 G4:.5 A#4:.5 B4:2",
  afraid: "B4:1 r:1 F#4:1 r:1 | G4:2 F#4:2 | B4:1 r:1 D5:1 r:1 | C#5:3 r:1",
  braveQ: "r:1 B4:.5 C#5:.5 D5:1 E5:.5 F#5:.5 | G5:1.5 F#5:.5 E5:2",
  braveA: "r:1 C#5:.5 D5:.5 E5:1 F#5:.5 G5:.5 | A5:2@0.85 F#5:1 E5:1",
}, [
  { kind: "intro", bars: 2, harmony: ["D", "Bm"], chordVel: 0.7, counter: "r:2 F#4:1 A4:1 | D5:2 r:2", energy: 0.3 },
  { kind: "verse", bars: 4, key: "B", mode: "harmonicMinor", harmony: ["Bm", "G", "Em7", "F#"], lead: ["stormQ", "stormA"], energy: 0.45 },
  { kind: "bridge", bars: 4, key: "B", mode: "harmonicMinor", harmony: ["Bm", "G", "Bm", "F#"], lead: ["afraid"], groove: "main", stretch: true, energy: 0.5 },
  { kind: "build", bars: 4, harmony: ["G", "A", "Bm", "A"], lead: ["braveQ", "braveA"], groove: "main", energy: 0.7 },
  { kind: "hook", bars: 4, harmony: ["D", "Gmaj7", "Em7 A", "D"], bass: DAWN_BASS, lead: ["seedQ", "seedA"], counter: ["ansA", "ansB"], energy: 0.6 },
  { kind: "outro", bars: 2, harmony: ["G", "D"], lead: ["last"], chordVel: 0.75, energy: 0.3 },
]);

// 3. THE VISITOR: a second idea, the hedgehog's sniffing figure low on the vibes; Pip decides; the theme shared in thirds
export const ep3Score = (): Material => base(3, "The Visitor", "hopeful", 4303, { energy: 0.4, warmth: 0.7, brightness: 0.5, tension: 0.25, space: 0.3 }, {
  hog: "A3:.5 r:.5 B3:.5 r:.5 D4:.5 E4:.5 D4:1 | r:1 F#4:.5 E4:.5 D4:1 B3:1 | G3:.5 r:.5 A3:.5 r:.5 B3:.5 D4:.5 E4:1 | r:1 C#4:.5 D4:.5 E4:1 A3:1",
  peek: "r:4 | r:2 A4:1 B4:1 | r:4 | r:2 C#5:1 B4:1",
  decideQ: "r:1 E5:.5 D5:.5 B4:1 A4:1 | B4:1.5 C#5:.5 D5:2",
  decideA: "r:1 E5:.5 F#5:.5 G5:1 E5:1 | C#5:3 r:1",
  shareC: "r:1 F#4:.5 G4:.5 B4:1 C#5:.5 D5:.5 | C#5:1.5 B4:.5 G4:2 | r:1 F#4:.5 G4:.5 B4:1 C#5:.5 B4:.5 | A4:1 G4:.5 A4:.5 F#4:2",
}, [
  { kind: "intro", bars: 2, harmony: ["D", "G"], chordVel: 0.7, counter: "r:2 F#4:1 A4:1 | D5:2 C#5:2", energy: 0.3 },
  { kind: "verse", bars: 4, harmony: ["D", "G", "Bm", "A"], lead: ["seedQ", "seedA"], energy: 0.4 },
  { kind: "verse", id: "hog", bars: 4, harmony: ["G", "D/F#", "Em7", "A"], lead: ["peek"], counter: ["hog"], stretch: true, energy: 0.45 },
  { kind: "bridge", bars: 4, harmony: ["Em7", "A", "Bm", "Asus4"], lead: ["decideQ", "decideA"], energy: 0.5 },
  { kind: "hook", bars: 4, harmony: ["D", "Gmaj7", "Em7 A", "D"], bass: DAWN_BASS, lead: ["seedQ", "seedA"], counter: ["shareC"], groove: "main", energy: 0.7 },
  { kind: "outro", bars: 2, harmony: ["G", "D"], lead: ["last"], counter: "r:2 A3:.5 B3:.5 D4:1 | r:4", chordVel: 0.75, energy: 0.3 },
]);

// 4. THE CLIMB: rising steps while Pip climbs; the theme lifted a whole step to E at the top; calm back home in D
export const ep4Score = (): Material => base(4, "The Climb", "hopeful", 4404, { energy: 0.5, warmth: 0.6, brightness: 0.55, tension: 0.3, space: 0.35 }, {
  climb1: "r:1 D4:.5 E4:.5 F#4:1 A4:1 | B4:1.5 A4:.5 F#4:2",
  climb2: "r:1 E4:.5 F#4:.5 A4:1 B4:1 | D5:1.5 C#5:.5 A4:2",
  climb3: "r:1 F#4:.5 A4:.5 B4:1 D5:1 | E5:1.5 D5:.5 B4:2",
  climb4: "r:1 A4:.5 B4:.5 D5:1 E5:1 | F#5:2 E5:1 C#5:1",
  topQ: "r:1 B4:.5 C#5:.5 E5:1 F#5:.5 G#5:.5 | F#5:1.5 E5:.5 C#5:2",
  topA: "r:1 B4:.5 C#5:.5 E5:1 G#5:.5 B5:.5@0.8 | A5:1.5 G#5:.5 F#5:1 E5:1",
  viewQ: "r:2 A4:.5 B4:.5 D5:1 | E5:2 D5:2",
  viewA: "r:2 A4:.5 B4:.5 D5:1 | C#5:2 E5:2",
}, [
  { kind: "intro", bars: 2, harmony: ["Bm", "G"], chordVel: 0.7, counter: "r:2 F#4:1 B4:1 | D5:2 C#5:2", energy: 0.3 },
  { kind: "verse", bars: 4, harmony: ["D", "Em7", "D/F#", "G"], lead: ["climb1", "climb2"], energy: 0.45 },
  { kind: "build", bars: 4, harmony: ["G", "A", "Bm", "A"], lead: ["climb3", "climb4"], groove: "main", stretch: true, energy: 0.65 },
  { kind: "hook", bars: 4, key: "E", mode: "major", harmony: ["E", "A", "C#m", "B"], lead: ["topQ", "topA"], counter: "r:4 | r:4 | r:2 C#6:1 B5:1 | G#5:4", groove: "main", energy: 0.85 },
  { kind: "bridge", bars: 4, harmony: ["G", "D/F#", "Em7", "Asus4"], lead: ["viewQ", "viewA"], energy: 0.4 },
  { kind: "outro", bars: 2, harmony: ["G", "D"], lead: ["last"], chordVel: 0.75, energy: 0.3 },
]);

// 5. THE FLOWER: episode 1's opening returns; the bloom at full voice; seeds given to the wind; the last word
export const ep5Score = (): Material => base(5, "The Flower", "romantic", 4505, { energy: 0.5, warmth: 0.75, brightness: 0.5, tension: 0.2, space: 0.35 }, {}, [
  { kind: "intro", bars: 2, harmony: ["Dadd9", "Gmaj7"], chordVel: 0.7, counter: "r:2 A4:1 D5:1 | F#5:2 E5:2", energy: 0.3 },
  { kind: "verse", bars: 4, harmony: ["D", "G", "Bm", "A"], lead: ["seedQ", "seedA"], energy: 0.45 },
  { kind: "build", bars: 4, harmony: ["Em7", "A", "D/F#", "Asus4"], lead: ["wonderQ", "wonderA"], counter: ["ansA", "ansB"], groove: "main", energy: 0.65 },
  { kind: "hook", bars: 4, harmony: ["D", "Gmaj7", "Em7 A", "D"], bass: DAWN_BASS, lead: ["dawn"], counter: ["r:4 | r:4", "ansDawn"], groove: "main", energy: 0.85 },
  { kind: "bridge", bars: 4, harmony: ["G", "D/F#", "Em7", "A"], lead: "r:2 A4:.5 B4:.5 D5:1 | E5:2 D5:2 | r:2 A4:.5 B4:.5 D5:1 | C#5:2 E5:2", counter: "r:3 A5:1 | B5:2 A5:2 | r:3 F#5:1 | E5:4", stretch: true, energy: 0.45 },
  { kind: "outro", bars: 2, harmony: ["G", "D"], lead: ["last"], counter: "r:2 A3:.5 B3:.5 D4:1 | r:4", chordVel: 0.75, energy: 0.3 },
]);
