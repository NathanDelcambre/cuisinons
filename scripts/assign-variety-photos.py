import json
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parents[1]
assets = Path(r"C:\Users\dataa\.cursor\projects\c-Users-dataa-Desktop-Sides-Cuisinons\assets")
dest = root / "apps" / "web" / "public" / "recipes"
specs = json.loads((root / "scripts" / "variety-recipes.json").read_text(encoding="utf-8"))

files = {
    "pasta": assets / "recipe-pasta-cheese.jpg",
    "rice": assets / "recipe-rice-chicken.jpg",
    "beef": assets / "recipe-beef.jpg",
    "gratin": assets / "recipe-gratin.jpg",
    "lamb": assets / "recipe-lamb.jpg",
    "duck": assets / "recipe-duck.jpg",
    "salad": assets / "recipe-salad-cheese.jpg",
    "sausage": assets / "recipe-sausage.jpg",
    "chicken": assets / "recipe-chicken.jpg",
    "veal": assets / "recipe-veal.jpg",
}


def family(name: str) -> str:
    folded = name.lower()
    if folded.startswith("pâte") or folded.startswith("pate"):
        return "pasta"
    if folded.startswith("salade"):
        return "salad"
    if folded.startswith("gratin"):
        return "gratin"
    if "canard" in folded:
        return "duck"
    if "agneau" in folded:
        return "lamb"
    if "veau" in folded:
        return "veal"
    if "poulet" in folded or "dinde" in folded:
        return "chicken"
    if "saucisse" in folded or "merguez" in folded or "lardon" in folded:
        return "sausage"
    if folded.startswith("riz"):
        return "rice"
    return "beef"


opened = {key: Image.open(path).convert("RGB") for key, path in files.items()}
for spec in specs:
    opened[family(spec["name"])].save(dest / f"{spec['id']}.png", format="PNG", optimize=True)
print(f"wrote {len(specs)} pngs")
