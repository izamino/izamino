"""Synthesize a 45s cinematic bed (no melodic instruments) and mix bundled SFX.

Usage: python3 -I make_audio.py <sfx_dir> <out_wav>
"""
import subprocess
import sys
import wave

import numpy as np

SR = 48000
DUR = 45.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)

sfx_dir, out_path = sys.argv[1], sys.argv[2]


def env_curve(points):
    """Piecewise-linear envelope from [(time, gain), ...]."""
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)


def lowpass(x, cutoff):
    # one-pole lowpass, cutoff in Hz (scalar)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


# --- Drone pad: D root, A fifth, octave; slow beating and breathing ---------
def pad_voice(freq, detune=0.35, harmonics=6):
    sig = np.zeros(N)
    for d in (-detune, 0.0, detune):
        f = freq + d
        for h in range(1, harmonics + 1):
            sig += np.sin(2 * np.pi * f * h * t + h * 0.7) / (h ** 1.6)
    return sig


pad = (pad_voice(73.42) * 1.0 + pad_voice(110.0) * 0.55 + pad_voice(146.83) * 0.35
       + pad_voice(220.0, harmonics=3) * 0.12)
breath = 0.75 + 0.25 * np.sin(2 * np.pi * t / 6.0)
pad *= breath
# Brightness lifts in the energetic middle by mixing a gentler upper layer.
shimmer = (np.sin(2 * np.pi * 587.33 * t) + 0.6 * np.sin(2 * np.pi * 880.0 * t + 1.1)) * (
    0.5 + 0.5 * np.sin(2 * np.pi * t / 3.1))
pad_env = env_curve([(0, 0), (2.5, 0.55), (8, 0.7), (20, 0.6), (25, 0.75), (35, 0.7),
                     (39.6, 0.85), (40.0, 0.35), (41, 0.9), (44, 0.6), (45, 0)])
shim_env = env_curve([(0, 0), (3, 0.08), (8, 0.05), (20, 0.03), (30, 0.06), (40, 0.04),
                      (41, 0.16), (44, 0.1), (45, 0)])
pad = pad / np.max(np.abs(pad)) * pad_env * 0.32 + shimmer * shim_env * 0.25

# --- Percussive pulses (synth sub-hits, no instrument samples) --------------
BPM = 96
BEAT = 60 / BPM
drums = np.zeros(N)


def add_hit(at, freq0=110, freq1=42, decay=0.28, gain=1.0, noise=0.15):
    i0 = int(at * SR)
    L = int(SR * decay * 4)
    if i0 >= N:
        return
    L = min(L, N - i0)
    tt = np.arange(L) / SR
    f = freq1 + (freq0 - freq1) * np.exp(-tt * 28)
    phase = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(phase) * np.exp(-tt / decay)
    nz = rng.standard_normal(L) * np.exp(-tt / 0.03) * noise
    drums[i0:i0 + L] += (body + nz) * gain


def add_tick(at, gain=0.25):
    i0 = int(at * SR)
    L = min(int(SR * 0.06), N - i0)
    if L <= 0:
        return
    tt = np.arange(L) / SR
    nz = rng.standard_normal(L)
    nz = np.diff(np.concatenate([[0], nz]))  # crude highpass
    drums[i0:i0 + L] += nz * np.exp(-tt / 0.012) * gain


def beats(start, end, every=1.0):
    k = 0
    out = []
    while True:
        x = start + k * BEAT * every
        if x >= end - 1e-6:
            return out
        out.append(x)
        k += 1


# 8–14: heartbeat pulse every two beats
for b in beats(8.0, 14.0, 2):
    add_hit(b, gain=0.8)
    add_hit(b + BEAT * 0.5, gain=0.45)
# 14–20: steady pulse + ticks
for b in beats(14.0, 20.0, 1):
    add_hit(b, gain=0.55 if int(round((b - 14) / BEAT)) % 2 else 0.85)
for b in beats(14.0 + BEAT / 2, 20.0, 1):
    add_tick(b, 0.18)
# 20–25: energetic: hits on every beat, doubled ticks, accents
for b in beats(20.0, 25.0, 1):
    add_hit(b, freq0=130, gain=0.95, noise=0.3)
for b in beats(20.0, 25.0, 0.5):
    add_tick(b, 0.22)
for b in beats(20.0 + BEAT * 1.5, 25.0, 4):
    add_hit(b, freq0=180, freq1=90, decay=0.12, gain=0.5, noise=0.6)
# 25–30: lighter travel groove
for b in beats(25.0, 30.0, 2):
    add_hit(b, gain=0.6)
for b in beats(25.0 + BEAT, 30.0, 2):
    add_tick(b, 0.16)
# 30–35: build, density rising
for b in beats(30.0, 35.0, 1):
    add_hit(b, gain=0.6 + 0.08 * (b - 30))
for b in beats(33.0, 35.0, 0.5):
    add_tick(b, 0.2)
# 35–40: soft pulse under the phone, roll into the drop
for b in beats(35.0, 38.75, 2):
    add_hit(b, gain=0.5)
for b in beats(38.75, 39.95, 0.25):
    add_hit(b, freq0=150, freq1=70, decay=0.08, gain=0.35 + 0.4 * (b - 38.75), noise=0.4)

drums = drums / (np.max(np.abs(drums)) + 1e-9) * 0.55

# --- Wind / air bed for the opening ----------------------------------------
air = lowpass(rng.standard_normal(N).astype(np.float64), 500.0)
air = air / np.max(np.abs(air)) * env_curve([(0, 0), (1.0, 0.18), (8, 0.08), (12, 0.0),
                                             (25, 0.0), (26, 0.08), (30, 0.0), (45, 0)])

mix = np.stack([pad + drums + air, pad + drums + air], axis=1)
# subtle stereo width on the pad
mix[:, 0] += np.roll(pad, 240) * 0.08
mix[:, 1] -= np.roll(pad, 240) * 0.08


def load_sfx(name):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"{sfx_dir}/{name}.mp3", "-f", "f32le",
                          "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def place(name, at, gain=1.0, tail_fade=None, last=None):
    s = load_sfx(name)
    if last:
        s = s[-int(last * SR):]
    s = s / (np.max(np.abs(s)) + 1e-9) * gain * 0.6
    if tail_fade:
        L = min(len(s), int(tail_fade * SR))
        s = s[:L] * np.linspace(1, 0, L)[:, None] ** 2 if tail_fade < len(s) / SR else s
    i0 = int(at * SR)
    L = min(len(s), N - i0)
    mix[i0:i0 + L] += s[:L]


place("whoosh-cinematic", 2.2, 0.45)
place("sparkle", 4.6, 0.35)
place("whoosh", 7.75, 0.6)
place("impact-bass-1", 8.0, 0.55, tail_fade=1.4)
place("whoosh-short", 9.3, 0.4)
place("whoosh-short", 10.5, 0.4)
place("impact-bass-2", 12.35, 0.3, tail_fade=1.0)
place("whoosh", 13.75, 0.55)
place("pop", 15.4, 0.35)
place("pop", 16.4, 0.35)
place("pop", 17.4, 0.35)
place("riser", 17.0, 0.4, last=3.0)
place("impact-bass-1", 20.0, 0.65, tail_fade=1.4)
place("whoosh-short", 21.4, 0.55)
place("impact-bass-2", 22.3, 0.3, tail_fade=1.0)
place("whoosh", 24.75, 0.6)
place("ping", 26.6, 0.3)
place("ping", 27.6, 0.3)
place("whoosh", 29.75, 0.6)
place("impact-bass-2", 31.0, 0.3, tail_fade=1.0)
place("pop", 32.6, 0.3)
place("pop", 33.0, 0.3)
place("pop", 33.4, 0.3)
place("whoosh-cinematic", 34.6, 0.5)
place("click", 38.0, 0.9)
place("riser", 36.5, 0.5, last=3.5)
place("notification", 38.25, 0.35)
place("impact-bass-1", 40.0, 0.75, tail_fade=2.0)
place("sparkle", 40.9, 0.45)
place("chime", 42.6, 0.25)

# master: gentle fade in/out + soft limiter
master = env_curve([(0, 0), (0.4, 1), (43.4, 1), (45, 0)])
mix *= master[:, None]
peak = np.max(np.abs(mix))
mix = np.tanh(mix / peak * 1.3) / np.tanh(1.3) * 0.89

pcm = (mix * 32767).astype(np.int16)
with wave.open(out_path, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", out_path, len(pcm) / SR, "s")
