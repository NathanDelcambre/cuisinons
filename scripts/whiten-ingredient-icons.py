"""Whiten cream paper backgrounds on ingredient PNGs; keep the illustrated food."""

from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "apps" / "web" / "public" / "ingredients"


def whiten(path: Path) -> None:
    image = Image.open(path).convert("RGB")
    pixels = np.asarray(image).astype(np.float32)
    sample = pixels[8:24, 8:24].reshape(-1, 3).mean(axis=0)
    dist = np.sqrt(((pixels - sample) ** 2).sum(axis=2))
    mask = dist < 42
    t = np.where(mask, 0.94, 0.0)[:, :, None]
    out = pixels * (1.0 - t) + 255.0 * t
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(path)


def main() -> None:
    files = [p for p in ROOT.glob("*.png") if not p.name.startswith("cat-")]
    for i, path in enumerate(files, start=1):
        whiten(path)
        if i % 100 == 0 or i == len(files):
            print(f"{i}/{len(files)}")


if __name__ == "__main__":
    main()
