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
