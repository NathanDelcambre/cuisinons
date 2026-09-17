"""Détoure le fond magenta, recadre et compresse les icônes d'ustensiles."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

SRC = Path(r"C:\Users\dataa\.cursor\projects\c-Users-dataa-Desktop-Sides-Cuisinons\assets")
DST = Path(__file__).resolve().parents[1] / "apps" / "web" / "public" / "equipment"
PREVIEW = 320
SIZE = 96
PAD_RATIO = 0.12
KEY_DIST = 110


def dist2(c: tuple[int, int, int], k: tuple[int, int, int]) -> int:
    return (c[0] - k[0]) ** 2 + (c[1] - k[1]) ** 2 + (c[2] - k[2]) ** 2


def sample_key(im: Image.Image) -> tuple[int, int, int]:
    w, h = im.size
    px = im.load()
    samples = [
        px[2, 2][:3],
        px[w - 3, 2][:3],
        px[2, h - 3][:3],
        px[w - 3, h - 3][:3],
        px[w // 2, 2][:3],
        px[w // 2, h - 3][:3],
    ]
    rs, gs, bs = zip(*samples)
    return (sorted(rs)[len(rs) // 2], sorted(gs)[len(gs) // 2], sorted(bs)[len(bs) // 2])


def flood_key(im: Image.Image) -> Image.Image:
    px = im.convert("RGBA")
    w, h = px.size
    data = px.load()
    key = sample_key(px)
    limit = KEY_DIST * KEY_DIST
    seen = bytearray(w * h)
    q: deque[int] = deque()

    def idx(x: int, y: int) -> int:
        return y * w + x

    def maybe(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= w or y >= h:
            return
        i = idx(x, y)
        if seen[i]:
            return
        r, g, b, a = data[x, y]
        if a == 0 or dist2((r, g, b), key) <= limit:
            seen[i] = 1
            q.append(i)

    for x in range(w):
        maybe(x, 0)
        maybe(x, h - 1)
    for y in range(h):
        maybe(0, y)
        maybe(w - 1, y)

    removed: list[int] = []
    while q:
        i = q.popleft()
        removed.append(i)
        x, y = i % w, i // w
        data[x, y] = (0, 0, 0, 0)
        maybe(x - 1, y)
        maybe(x + 1, y)
        maybe(x, y - 1)
        maybe(x, y + 1)

    removed_set = set(removed)
    border: set[int] = set()
    for i in removed:
        x, y = i % w, i // w
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                j = idx(nx, ny)
                if j not in removed_set:
                    border.add(j)
    for j in border:
        x, y = j % w, j // w
        r, g, b, a = data[x, y]
        data[x, y] = (r, g, b, int(a * 0.4))

    fringe: list[tuple[int, int]] = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            if not a or dist2((r, g, b), key) > limit:
                continue
            if any(
                0 <= nx < w and 0 <= ny < h and data[nx, ny][3] == 0
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
            ):
                fringe.append((x, y))
    for x, y in fringe:
        data[x, y] = (0, 0, 0, 0)

    return px


def fit_square(im: Image.Image) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    cropped = im.crop(bbox)
    cw, ch = cropped.size
    side = int(max(cw, ch) * (1 + PAD_RATIO * 2))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(cropped, ((side - cw) // 2, (side - ch) // 2), cropped)
    return canvas.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def save_png(im: Image.Image, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, format="PNG", optimize=True, compress_level=9)


def main() -> None:
    files = sorted(SRC.glob("equipment-*.png"))
    if not files:
        raise SystemExit(f"Aucun PNG trouvé dans {SRC}")
    DST.mkdir(parents=True, exist_ok=True)
    total = 0
    for src in files:
        slug = src.stem.removeprefix("equipment-")
        out = DST / f"{slug}.png"
        raw = Image.open(src).convert("RGBA")
        raw.thumbnail((PREVIEW, PREVIEW), Image.Resampling.BOX)
        processed = fit_square(flood_key(raw))
        save_png(processed, out)
        size = out.stat().st_size
        total += size
        print(f"{slug:24} {size / 1024:6.1f} Ko")
    print(f"total {len(files)} fichiers · {total / 1024:.1f} Ko")


if __name__ == "__main__":
    main()
