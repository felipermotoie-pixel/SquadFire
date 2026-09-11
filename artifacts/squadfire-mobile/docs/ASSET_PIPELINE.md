# SquadFire — Asset Pipeline

## Sources
`assets/source/` keeps the original 1024² generated renders (not bundled at runtime — reference only; safe to delete before a store build). `assets/source/v035/` holds the v0.3.5 art (soldier, grunt, skyline).

## Runtime assets
| File | Size | Notes |
| --- | --- | --- |
| `assets/characters/player/soldier_blue.png` | 123×320 | Alpha-trimmed, straight rear view, shoulders square, rifle vertical above the right shoulder (muzzle at the top edge). Player sprites must be authored facing the vanishing point; any residual tilt goes in `baseVisualRotationOffset`, never in the formation. |
| `assets/characters/enemies/grunt_red.png` | 154×320 | Charging pose facing camera, orange visor/core; runners and elites reuse it with a color filter (+ scale for elites). |
| `assets/characters/bosses/boss_crimson.png` | 730×640 | Left-arm cannon = muzzle. |
| `assets/environment/horizon_coastal.jpg` | 1024² | Sea horizon at 63.5 % down the image (`HORIZON_IMAGE_LINE` in the renderer aligns it to the camera horizon; re-measure if replaced). Also drawn mirrored under the horizon as the water reflection. |

## Adding or replacing a character
1. Generate/export on a transparent background, trim alpha, resize so the tallest dimension is ≤ 320 px (boss ≤ 730 px).
2. Add a `VisualDefinition` in `game/visuals.ts`: aspect, world height, foot anchor, weapon anchor, muzzle position (fractions of the frame), `baseVisualRotationOffset`. Measure anchors from the alpha mask (e.g. `magick sprite.png -alpha extract -threshold 50% txt:-`): muzzle = mean x of the topmost opaque rows, foot anchor = body centre of mass.
3. Register the image in `Battlefield.tsx` (`useImage`) and `scripts/render-preview.ts` (Node loader).
4. Run `pnpm run render:preview` and check that muzzle flashes sit on the barrel in the PNGs (`07-alignment-01`), and that enemies still read at the spawn line (`11-long-range`).

## Fonts
Inter Black 900 (display numerals, banners in-canvas) and Inter Bold 700 (debug overlay) are loaded from `@expo-google-fonts/inter` both as RN fonts (HUD) and as Skia fonts (canvas).

## Rendering budget
All sprites are drawn with linear filtering + mipmaps through `drawImageRectOptions`; there is no atlas yet. If draw calls become the bottleneck at 50 soldiers + 300 enemies, batch into a Skia atlas (`drawAtlas`) — the sprite frame geometry already provides per-instance rects.
