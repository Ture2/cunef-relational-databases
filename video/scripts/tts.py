"""Regenerate the voice-over from src/narration.json.

    python scripts/tts.py                  # generate missing segments, normalise, measure, validate
    python scripts/tts.py --force          # re-synthesise every segment
    python scripts/tts.py --video ternary  # the same for another video (src/<video>/narration.json)

Requires: pip install edge-tts   (sends the narration text to Microsoft's online TTS service)

Steps per segment:
  1. edge-tts -> scripts/.cache/<id>-<hash>.mp3  (cached by text/voice/rate)
  2. ffmpeg loudnorm (-16 LUFS, -1.5 dBTP) -> public/audio/vo/<id>.mp3
  3. ffprobe duration -> written back into narration.json as durationSec
Then every segment is checked: it must end >= 0.4 s before the next one starts and
before its scene ends (scene lengths are parsed from src/timeline.ts). Exits 1 on failure.
"""

import asyncio
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
# The normalization video lives in src/; every other video in src/<name>/ (--video <name>).
VIDEO = sys.argv[sys.argv.index("--video") + 1] if "--video" in sys.argv else None
SRC = ROOT / "src" / VIDEO if VIDEO else ROOT / "src"
NARRATION = SRC / "narration.json"
TIMELINE = SRC / "timeline.ts"
CACHE = ROOT / "scripts" / ".cache"
OUT = ROOT / "public" / "audio" / "vo"
BIN = ROOT / "node_modules" / "@remotion" / "compositor-win32-x64-msvc"
GAP = 0.4  # minimum silence before the next segment (s)
END_MARGIN = 0.3  # minimum silence before the scene ends (s)


def tool(name: str) -> str:
    local = BIN / f"{name}.exe"
    if local.exists():
        return str(local)
    found = shutil.which(name)
    if not found:
        sys.exit(f"{name} not found (expected {local})")
    return found


FFMPEG = tool("ffmpeg")
FFPROBE = tool("ffprobe")


def scene_lengths() -> dict[str, float]:
    """Seconds per scene = DURATIONS + HOLDS from src/timeline.ts."""
    src = TIMELINE.read_text(encoding="utf8")
    dur_block = re.search(r"const DURATIONS = \{(.*?)\}", src, re.S).group(1)
    holds_block = re.search(r"const HOLDS[^=]*= \{(.*?)\};", src, re.S).group(1)
    durs = {k: float(v) for k, v in re.findall(r"(\w+): s\(([\d.]+)\)", dur_block)}
    holds = {k: float(v) for k, v in re.findall(r"(\w+): ([\d.]+)", holds_block)}
    return {k: v + holds.get(k, 0.0) for k, v in durs.items()}


async def synth(text: str, voice: str, rate: str, dest: Path) -> None:
    await edge_tts.Communicate(text, voice, rate=rate).save(str(dest))


def duration(path: Path) -> float:
    out = subprocess.run(
        [FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    return float(out)


def main() -> int:
    force = "--force" in sys.argv
    data = json.loads(NARRATION.read_text(encoding="utf8"))
    voice, default_rate = data["voice"], data.get("rate", "+0%")
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)

    for seg in data["segments"]:
        rate = seg.get("rate", default_rate)
        key = hashlib.sha1(f"{voice}|{rate}|{seg['text']}".encode()).hexdigest()[:10]
        raw = CACHE / f"{seg['id']}-{key}.mp3"
        if force or not raw.exists():
            print(f"tts   {seg['id']}")
            asyncio.run(synth(seg["text"], voice, rate, raw))
        final = OUT / f"{seg['id']}.mp3"
        subprocess.run(
            [FFMPEG, "-y", "-v", "error", "-i", str(raw),
             "-af", "loudnorm=I=-16:TP=-1.5:LRA=7", "-ar", "44100", "-ac", "1",
             "-c:a", "libmp3lame", "-b:a", "128k", str(final)],
            check=True,
        )
        seg["durationSec"] = round(duration(final), 3)

    NARRATION.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf8")

    scenes = scene_lengths()
    errors = []
    segs = data["segments"]
    words = 0
    speech = 0.0
    for i, seg in enumerate(segs):
        end = seg["startSec"] + seg["durationSec"]
        words += len(seg["text"].split())
        speech += seg["durationSec"]
        nxt = segs[i + 1] if i + 1 < len(segs) and segs[i + 1]["scene"] == seg["scene"] else None
        limit = nxt["startSec"] - GAP if nxt else scenes[seg["scene"]] - END_MARGIN
        slack = limit - end
        flag = "OK " if slack >= 0 else "BAD"
        print(f"{flag} {seg['id']:7s} {seg['startSec']:5.1f} + {seg['durationSec']:5.2f} = {end:5.2f}  "
              f"limit {limit:5.2f}  slack {slack:+.2f}")
        if slack < 0:
            what = f"next segment {nxt['id']}" if nxt else f"end of scene {seg['scene']}"
            errors.append(f"{seg['id']} overruns {what} by {-slack:.2f} s")

    print(f"\n{len(segs)} segments, {words} words, {speech:.1f} s of speech "
          f"({words / speech * 60:.0f} wpm while speaking)")
    if errors:
        print("\nFAILED:\n  " + "\n  ".join(errors))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
