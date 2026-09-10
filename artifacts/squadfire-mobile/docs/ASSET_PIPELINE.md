# SquadFire — Asset Pipeline

## Sources
`assets/source/` keeps the original 1024² generated renders (not bundled at runtime — reference only; safe to delete before a store build).

## Runtime assets
| File | Size | Notes |
| --- | --- | --- |
| `assets/characters/player/soldier_blue.png` | 140×320 | Alpha-trimmed, seen from behind, rifle up-right. |
| `assets/characters/enemies/grunt_red.png` | 206×320 | Faces camera; elites reuse it with a color filter + scale. |
| `assets/characters/bosses/boss_crimson.png` | 730×640 | Left-arm cannon = muzzle. |
| `assets/environment/horizon_coastal.jpg` | 1024² | Horizon line ≈ 64 % down the image; renderer aligns it to the camera horizon. |

## Adding or replacing a character
1. Generate/export on a transparent background, trim alpha, resize so the tallest dimension is ≤ 320 px (boss ≤ 730 px).
2. Add a `VisualDefinition` in `game/visuals.ts`: aspect, world height, foot anchor, weapon anchor, muzzle position (fractions of the frame), barrel angle.
3. Register the image in `Battlefield.tsx` (`useImage`) and `scripts/render-preview.ts` (Node loader).
4. Run `pnpm run render:preview` and check that muzzle flashes sit on the barrel in the PNGs.

## Fonts
Inter Black 900 (display numerals, banners in-canvas) and Inter Bold 700 (debug overlay) are loaded from `@expo-google-fonts/inter` both as RN fonts (HUD) and as Skia fonts (canvas).

## Rendering budget
All sprites are drawn with linear filtering + mipmaps through `drawImageRectOptions`; there is no atlas yet. If draw calls become the bottleneck at 50 soldiers + 300 enemies, batch into a Skia atlas (`drawAtlas`) — the sprite frame geometry already provides per-instance rects.
