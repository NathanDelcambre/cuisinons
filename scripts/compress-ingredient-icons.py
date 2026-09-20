"""Resize ingredient PNGs for UI use without a large quality drop.

Icons render at 28–32 CSS px (up to ~96 device px on 3x). 384 px keeps a
comfortable retina margin while cutting the 1024 px originals down hard.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "apps" / "web" / "public" / "ingredients"
TARGET = 384
MAX_KEEP_BYTES = 90_000


def compress(path: Path) -> str:
    image = Image.open(path)
    rgb = image.convert("RGB")
    if rgb.size[0] != TARGET or rgb.size[1] != TARGET:
        rgb = rgb.resize((TARGET, TARGET), Image.Resampling.LANCZOS)
    elif path.stat().st_size <= MAX_KEEP_BYTES and image.size == (TARGET, TARGET):
        return "skip"
    rgb.save(path, format="PNG", optimize=True, compress_level=9)
    return "ok"


def main() -> None:
    files = sorted(p for p in ROOT.glob("*.png") if not p.name.startswith("cat-"))
    skipped = 0
    for index, path in enumerate(files, start=1):
        action = compress(path)
        if action == "skip":
            skipped += 1
        if index % 100 == 0 or index == len(files):
            print(f"{index}/{len(files)} (skipped {skipped})")


if __name__ == "__main__":
    main()
