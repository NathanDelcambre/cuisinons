"""Render extra ingredient icons as 384 px PNG (draw at 768, then downscale)."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "scripts" / "ingredient-icon-extra.csv"
OUT_DIR = ROOT / "apps" / "web" / "public" / "ingredients"
JSON_OUT = ROOT / "scripts" / "ingredient-icon-extra.json"
CATALOG = ROOT / "scripts" / "ingredient-icon-catalog.json"
SIZE = 384
SCALE = 2
CANVAS = SIZE * SCALE
CREAM = (244, 242, 239)

FAMILY_COLORS = {
    "meat": ("#c45c4a", "#d97767"),
    "bird": ("#d9946f", "#e8b298"),
    "steak": ("#a84a3c", "#c45c4a"),
    "can": ("#8a8178", "#c7dad0"),
    "bowl": ("#e8b298", "#d9946f"),
    "sausage": ("#c45c4a", "#2f2b27"),
    "slice": ("#e8b298", "#c9a06a"),
    "shrimp": ("#d9946f", "#f2cdb8"),
    "fish": ("#4a6a82", "#7aa0b8"),
    "shell": ("#8a8178", "#f2cdb8"),
    "wedge": ("#c9a06a", "#e8b298"),
    "wheel": ("#e8b298", "#c9a06a"),
    "heart": ("#d9946f", "#fffaf6"),
    "oval": ("#fffaf6", "#e8b298"),
    "pyramid": ("#c9a06a", "#648374"),
    "cube": ("#fffaf6", "#c9a06a"),
    "squash": ("#d9946f", "#648374"),
    "root": ("#e8b298", "#648374"),
    "leaf": ("#648374", "#4f6a5d"),
    "pod": ("#648374", "#c7dad0"),
    "sprout": ("#c7dad0", "#648374"),
    "round": ("#c45c4a", "#648374"),
    "citrus": ("#d9946f", "#c9a06a"),
    "grain": ("#c9a06a", "#e8b298"),
    "powder": ("#fffaf6", "#c9a06a"),
    "bun": ("#d9946f", "#e8b298"),
    "diamond": ("#e8b298", "#c9a06a"),
    "sheet": ("#fffdf9", "#e8b298"),
    "triangle": ("#c9a06a", "#2f2b27"),
    "jar": ("#c45c4a", "#fffaf6"),
    "bottle": ("#648374", "#c9a06a"),
    "glass": ("#c45c4a", "#fffaf6"),
    "candy": ("#d97767", "#c9a06a"),
    "coconut": ("#fffaf6", "#2f2b27"),
    "cup": ("#fffaf6", "#e8b298"),
    "loaf": ("#d9946f", "#e8b298"),
    "pretzel": ("#d9946f", "#c9a06a"),
    "pasta": ("#c9a06a", "#e8b298"),
    "sprig": ("#648374", "#4f6a5d"),
    "bar": ("#6b4636", "#c9a06a"),
    "roll": ("#e8b298", "#648374"),
}


def slug_hash(slug: str) -> int:
    value = 2166136261
    for char in slug:
        value ^= ord(char)
        value = (value * 16777619) & 0xFFFFFFFF
    return value


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    raw = value.removeprefix("#")
    return int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16)


def jitter(color: str, hashed: int, spread: int = 18) -> tuple[int, int, int]:
    r, g, b = hex_to_rgb(color)
    delta = (hashed % (spread * 2 + 1)) - spread
    return (
        max(0, min(255, r + delta)),
        max(0, min(255, g + delta // 2)),
        max(0, min(255, b - delta // 3)),
    )


def xy(draw_size: int, left: float, top: float, right: float, bottom: float) -> tuple[int, int, int, int]:
    s = draw_size / 128
    return int(left * s), int(top * s), int(right * s), int(bottom * s)


def parse_csv() -> list[dict[str, object]]:
    items: list[dict[str, object]] = []
    for raw in CSV.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        slug, family, fr, aliases = (line.split(",", 3) + [""])[:4]
        alias_list = [part.strip() for part in aliases.split(";") if part.strip()]
        items.append({"slug": slug.strip(), "family": family.strip(), "fr": fr.strip(), "aliases": alias_list})
    return items


def marks(draw: ImageDraw.ImageDraw, hashed: int, fill: tuple[int, int, int], size: int) -> None:
    kind = hashed % 5
    if kind == 0:
        return
    if kind == 1:
        draw.ellipse(xy(size, 52, 52, 60, 60), fill=fill)
        draw.ellipse(xy(size, 70, 66, 78, 74), fill=fill)
    elif kind == 2:
        draw.line(xy(size, 44, 58, 84, 58)[:2] + xy(size, 44, 58, 84, 58)[2:], fill=fill, width=max(2, size // 64))
    elif kind == 3:
        draw.ellipse(xy(size, 60, 48, 72, 56), fill=fill)
    else:
        draw.arc(xy(size, 48, 48, 80, 80), start=200, end=320, fill=fill, width=max(3, size // 48))


def paint(draw: ImageDraw.ImageDraw, family: str, fill: tuple[int, int, int], accent: tuple[int, int, int], hashed: int, size: int) -> None:
    box = xy
    if family in {"round", "citrus", "heart", "coconut"}:
        draw.ellipse(box(size, 36, 38, 92, 96), fill=fill)
        draw.ellipse(box(size, 46, 48, 64, 70), fill=accent)
        if family == "citrus":
            draw.ellipse(box(size, 50, 52, 78, 82), outline=accent, width=max(3, size // 48))
        if family == "heart":
            draw.ellipse(box(size, 40, 44, 68, 76), fill=fill)
            draw.ellipse(box(size, 60, 44, 88, 76), fill=fill)
            draw.polygon([box(size, 42, 62, 0, 0)[:2], box(size, 86, 62, 0, 0)[:2], box(size, 64, 96, 0, 0)[:2]], fill=fill)
    elif family in {"oval", "squash", "root", "pod"}:
        draw.ellipse(box(size, 40, 32, 88, 100), fill=fill)
        draw.ellipse(box(size, 48, 44, 68, 72), fill=accent)
        if family == "root":
            draw.polygon([box(size, 60, 28, 0, 0)[:2], box(size, 72, 8, 0, 0)[:2], box(size, 80, 32, 0, 0)[:2]], fill=accent)
    elif family in {"leaf", "sprout", "sprig"}:
        draw.ellipse(box(size, 30, 48, 70, 96), fill=fill)
        draw.ellipse(box(size, 58, 36, 98, 88), fill=accent)
        draw.line(box(size, 64, 40, 64, 104)[:2] + box(size, 64, 40, 64, 104)[2:], fill=(79, 106, 93), width=max(4, size // 40))
    elif family == "fish":
        draw.polygon(
            [
                box(size, 28, 64, 0, 0)[:2],
                box(size, 70, 40, 0, 0)[:2],
                box(size, 102, 64, 0, 0)[:2],
                box(size, 70, 88, 0, 0)[:2],
            ],
            fill=fill,
        )
        draw.polygon([box(size, 92, 64, 0, 0)[:2], box(size, 114, 48, 0, 0)[:2], box(size, 114, 80, 0, 0)[:2]], fill=accent)
        draw.ellipse(box(size, 44, 58, 54, 68), fill=(47, 43, 39))
    elif family in {"shrimp"}:
        draw.arc(box(size, 36, 36, 96, 96), start=20, end=200, fill=fill, width=max(14, size // 14))
        draw.ellipse(box(size, 70, 40, 92, 62), fill=fill)
    elif family == "shell":
        draw.ellipse(box(size, 34, 48, 94, 96), fill=fill)
        draw.ellipse(box(size, 48, 58, 80, 86), fill=accent)
    elif family in {"meat", "steak", "bird"}:
        draw.ellipse(box(size, 30, 48, 98, 96), fill=fill)
        draw.ellipse(box(size, 70, 40, 108, 78), fill=accent)
        if family == "steak":
            draw.arc(box(size, 40, 52, 88, 88), start=20, end=160, fill=(47, 43, 39), width=max(3, size // 64))
    elif family == "sausage":
        draw.rounded_rectangle(box(size, 28, 56, 100, 80), radius=size // 12, fill=fill)
        draw.line(box(size, 48, 56, 48, 80)[:2] + box(size, 48, 56, 48, 80)[2:], fill=accent, width=max(3, size // 64))
        draw.line(box(size, 80, 56, 80, 80)[:2] + box(size, 80, 56, 80, 80)[2:], fill=accent, width=max(3, size // 64))
    elif family in {"wedge", "pyramid", "triangle", "diamond"}:
        draw.polygon([box(size, 64, 28, 0, 0)[:2], box(size, 104, 96, 0, 0)[:2], box(size, 24, 96, 0, 0)[:2]], fill=fill)
        draw.ellipse(box(size, 56, 60, 70, 74), fill=accent)
    elif family in {"wheel", "round"} and family == "wheel":
        draw.ellipse(box(size, 32, 36, 96, 100), fill=fill)
        draw.ellipse(box(size, 48, 52, 80, 84), fill=accent)
    elif family in {"bottle", "jar", "glass", "cup"}:
        draw.rounded_rectangle(box(size, 46, 40, 82, 100), radius=size // 18, fill=fill)
        draw.rectangle(box(size, 54, 28, 74, 44), fill=accent)
        if family == "glass":
            draw.polygon([box(size, 48, 40, 0, 0)[:2], box(size, 80, 40, 0, 0)[:2], box(size, 72, 88, 0, 0)[:2], box(size, 56, 88, 0, 0)[:2]], fill=fill)
            draw.rectangle(box(size, 60, 88, 68, 104), fill=accent)
    elif family in {"loaf", "bun", "pretzel"}:
        draw.ellipse(box(size, 28, 56, 100, 100), fill=fill)
        draw.ellipse(box(size, 36, 40, 92, 80), fill=accent)
        if family == "pretzel":
            draw.arc(box(size, 40, 44, 88, 92), start=0, end=270, fill=fill, width=max(10, size // 16))
    elif family in {"bowl", "powder", "grain", "pasta"}:
        draw.ellipse(box(size, 28, 64, 100, 104), fill=fill)
        draw.ellipse(box(size, 40, 44, 56, 64), fill=accent)
        draw.ellipse(box(size, 58, 36, 76, 58), fill=fill)
        draw.ellipse(box(size, 74, 48, 92, 68), fill=accent)
    elif family in {"bar", "sheet", "slice", "cube"}:
        draw.rounded_rectangle(box(size, 34, 44, 94, 92), radius=size // 16, fill=fill)
        draw.rectangle(box(size, 34, 58, 94, 64), fill=accent)
    elif family in {"can", "candy"}:
        draw.rounded_rectangle(box(size, 44, 32, 84, 100), radius=size // 14, fill=fill)
        draw.ellipse(box(size, 44, 28, 84, 44), fill=accent)
    elif family == "roll":
        draw.rounded_rectangle(box(size, 28, 52, 100, 84), radius=size // 10, fill=fill)
        draw.ellipse(box(size, 86, 52, 108, 84), fill=accent)
    else:
        draw.ellipse(box(size, 36, 40, 92, 96), fill=fill)
        draw.ellipse(box(size, 50, 52, 70, 72), fill=accent)
    marks(draw, hashed, accent, size)


def render_icon(family: str, slug: str) -> Image.Image:
    hashed = slug_hash(slug)
    base, accent = FAMILY_COLORS.get(family, ("#d9946f", "#c9a06a"))
    image = Image.new("RGB", (CANVAS, CANVAS), CREAM)
    draw = ImageDraw.Draw(image)
    paint(draw, family, jitter(base, hashed), jitter(accent, hashed >> 3), hashed, CANVAS)
    return image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def main() -> None:
    extras = parse_csv()
    existing = {item["slug"] for item in json.loads(CATALOG.read_text(encoding="utf-8"))}
    kept = [item for item in extras if item["slug"] not in existing]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for index, item in enumerate(kept, start=1):
        path = OUT_DIR / f"{item['slug']}.png"
        render_icon(str(item["family"]), str(item["slug"])).save(path, format="PNG", optimize=True, compress_level=9)
        if index % 100 == 0 or index == len(kept):
            print(f"{index}/{len(kept)}")
    payload = [
        {
            "slug": item["slug"],
            "fr": item["fr"],
            "en": f"illustrated {item['fr']}",
            "aliases": item["aliases"],
        }
        for item in kept
    ]
    JSON_OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(payload)} extra pngs")


if __name__ == "__main__":
    main()
