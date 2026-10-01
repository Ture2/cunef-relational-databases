"""Synthesize the royalty-free background music -> public/audio/music.wav

    python scripts/music.py

A calm ambient pad plus a soft piano-like arpeggio over a slow I-V-vi-IV progression
in C major (C, G, Am, F), low-passed, no drums. 44.1 kHz stereo 16-bit, as long as the
video (read from src/timeline.ts), 2 s fade-in and 4 s fade-out. Deterministic (fixed seed).
Requires numpy.
"""

import re
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio" / "music.wav"
SR = 44100
CHORD_SEC = 4.0  # one chord every 4 s (slow)


def video_seconds() -> float:
    src = (ROOT / "src" / "timeline.ts").read_text(encoding="utf8")
    durs = re.search(r"const DURATIONS = \{(.*?)\}", src, re.S).group(1)
    holds = re.search(r"const HOLDS[^=]*= \{(.*?)\};", src, re.S).group(1)
    total = sum(float(v) for v in re.findall(r"\w+: s\(([\d.]+)\)", durs))
    total += sum(float(v) for v in re.findall(r"\w+: ([\d.]+)", holds))
    return total


def midi_hz(n: float) -> float:
    return 440.0 * 2 ** ((n - 69) / 12)


# C major, I-V-vi-IV. Pad voicings (MIDI) and arpeggio notes.
CHORDS = [
    {"bass": 36, "pad": [48, 52, 55, 60], "arp": [60, 64, 67, 72]},  # C
    {"bass": 43, "pad": [47, 50, 55, 59], "arp": [59, 62, 67, 71]},  # G
    {"bass": 45, "pad": [48, 52, 57, 60], "arp": [60, 64, 69, 72]},  # Am
    {"bass": 41, "pad": [48, 53, 57, 60], "arp": [60, 65, 69, 72]},  # F
]


def envelope(n: int, attack: float, release: float) -> np.ndarray:
    t = np.arange(n) / SR
    env = np.minimum(1.0, t / attack)
    tail = (n / SR) - t
    env *= np.clip(tail / release, 0.0, 1.0)
    return env * env * (3 - 2 * env)  # smoothstep


def pad_note(freq: float, n: int, rng: np.random.Generator) -> np.ndarray:
    t = np.arange(n) / SR
    out = np.zeros(n)
    for detune in (-0.12, 0.0, 0.12):  # three slightly detuned voices (cents-ish in Hz)
        ph = rng.uniform(0, 2 * np.pi)
        f = freq + detune
        out += np.sin(2 * np.pi * f * t + ph)
        out += 0.25 * np.sin(2 * np.pi * 2 * f * t + ph)
        out += 0.08 * np.sin(2 * np.pi * 3 * f * t + ph)
    # slow tremolo for movement
    out *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * t + rng.uniform(0, 6.28))
    return out / 3


def piano_note(freq: float, n: int) -> np.ndarray:
    t = np.arange(n) / SR
    decay = np.exp(-t * 2.2)
    attack = np.minimum(1.0, t / 0.012)
    tone = (np.sin(2 * np.pi * freq * t)
            + 0.35 * np.sin(2 * np.pi * 2 * freq * t) * np.exp(-t * 3)
            + 0.12 * np.sin(2 * np.pi * 3 * freq * t) * np.exp(-t * 5))
    return tone * decay * attack


def lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    """Smooth spectral low-pass (gentle Gaussian roll-off above `cutoff`)."""
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    gain = np.where(f <= cutoff, 1.0, np.exp(-((f - cutoff) / (cutoff * 0.6)) ** 2))
    return np.fft.irfft(spec * gain, n=len(x))


def main() -> None:
    rng = np.random.default_rng(7)
    seconds = video_seconds()
    total = int(round(seconds * SR))
    left = np.zeros(total)
    right = np.zeros(total)
    chord_n = int(CHORD_SEC * SR)
    overlap = int(1.5 * SR)
    beat = CHORD_SEC / 4

    for k, start in enumerate(range(0, total, chord_n)):
        chord = CHORDS[k % len(CHORDS)]
        n = min(chord_n + overlap, total - start)
        env = envelope(n, attack=1.2, release=1.6)
        # pad: spread voices across the stereo field
        for i, note in enumerate(chord["pad"]):
            sig = pad_note(midi_hz(note), n, rng) * env * 0.16
            pan = 0.3 + 0.4 * (i / (len(chord["pad"]) - 1))
            left[start:start + n] += sig * (1 - pan)
            right[start:start + n] += sig * pan
        bass = pad_note(midi_hz(chord["bass"]), n, rng) * env * 0.22
        left[start:start + n] += bass
        right[start:start + n] += bass
        # soft arpeggio: one note per beat, alternating pattern, gentle and sparse
        pattern = [0, 2, 1, 3] if k % 2 == 0 else [0, 1, 2, 1]
        for b, idx in enumerate(pattern):
            s0 = start + int(b * beat * SR)
            if s0 >= total:
                break
            m = min(int(2.5 * SR), total - s0)
            note = piano_note(midi_hz(chord["arp"][idx]), m) * 0.09
            pan = 0.35 + 0.3 * (idx / 3)
            left[s0:s0 + m] += note * (1 - pan)
            right[s0:s0 + m] += note * pan

    left = lowpass(left, 1800)
    right = lowpass(right, 1800)

    # 2 s fade-in, 4 s fade-out
    fade = np.ones(total)
    fi, fo = int(2 * SR), int(4 * SR)
    fade[:fi] = np.linspace(0, 1, fi) ** 2
    fade[-fo:] = np.linspace(1, 0, fo) ** 2
    left *= fade
    right *= fade

    peak = max(np.abs(left).max(), np.abs(right).max())
    stereo = np.stack([left, right], axis=1) / peak * 0.8
    pcm = (stereo * 32767).astype(np.int16)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"wrote {OUT} ({seconds:.1f} s)")


if __name__ == "__main__":
    main()
