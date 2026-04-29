"""
Strip the white outer outline from capybara sprite PNGs.

Algorithm: a "white" pixel (R, G, B all >= WHITE_THRESHOLD) is only made
transparent if at least one of its 4-neighbours is already transparent
(alpha == 0). This peels off the outline ring without touching internal
white details (eye sparkle, water droplets, food highlights, etc.).

Run:
    python scripts/remove-outline.py            # process default folder
    python scripts/remove-outline.py <folder>   # process a specific folder

By default it backs up the originals to <folder>_original/ once, so it's
safe to re-run.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

from PIL import Image

WHITE_THRESHOLD = 235  # R, G, B all >= this value count as "white"
PEEL_PASSES = 2  # how many outline rings to peel (handles 2-pixel outlines)


def remove_outline(path: Path) -> tuple[int, int]:
    """Remove the outer white outline from a single PNG. Returns (removed, kept)."""
    img = Image.open(path).convert("RGBA")
    width, height = img.size
    pixels = img.load()
    if pixels is None:
        return 0, 0

    total_removed = 0
    total_white = 0

    for _ in range(PEEL_PASSES):
        to_clear: list[tuple[int, int]] = []
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                if a == 0:
                    continue
                is_white = (
                    r >= WHITE_THRESHOLD
                    and g >= WHITE_THRESHOLD
                    and b >= WHITE_THRESHOLD
                )
                if not is_white:
                    continue
                total_white += 1
                # Check 4-neighbours for transparency. Out-of-bounds also
                # counts as "transparent" so edge-clinging outlines are caught.
                touches_transparent = False
                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < width and 0 <= ny < height):
                        touches_transparent = True
                        break
                    if pixels[nx, ny][3] == 0:
                        touches_transparent = True
                        break
                if touches_transparent:
                    to_clear.append((x, y))

        if not to_clear:
            break
        for x, y in to_clear:
            pixels[x, y] = (0, 0, 0, 0)
        total_removed += len(to_clear)

    img.save(path, "PNG")
    return total_removed, total_white


def main() -> int:
    here = Path(__file__).resolve().parent
    default_folder = here.parent / "assets" / "images" / "CapyMovements"

    folder = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else default_folder
    if not folder.is_dir():
        print(f"error: folder not found: {folder}", file=sys.stderr)
        return 1

    backup_dir = folder.with_name(folder.name + "_original")
    if not backup_dir.exists():
        backup_dir.mkdir(parents=True, exist_ok=True)
        for png in folder.glob("*.png"):
            shutil.copy2(png, backup_dir / png.name)
        print(f"backed up {len(list(backup_dir.glob('*.png')))} files to {backup_dir}")
    else:
        print(f"backup already exists at {backup_dir} (skipping)")

    files = sorted(folder.glob("*.png"))
    if not files:
        print(f"no PNGs in {folder}")
        return 0

    grand_removed = 0
    for png in files:
        removed, white = remove_outline(png)
        grand_removed += removed
        print(f"  {png.name:<24} removed {removed:>5}px (of {white:>5} white)")

    print(f"done. {len(files)} files processed, {grand_removed} outline pixels cleared.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
