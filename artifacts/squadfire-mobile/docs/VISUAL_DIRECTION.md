# SquadFire — Visual Direction

**Concept: "Sunlit Causeway".** A bright, saturated coastal highway cutting across turquoise water toward a glass megacity on the horizon. Clean concrete, cyan safety rails, blue armored heroes, red-hot enemies. Premium stylized realism, readable at arm's length — and deep: the bridge runs to the vanishing point and enemies are seen long before they matter.

## Camera (v0.3.5 long-range framing)
Elevated, pitched-down perspective: the road is widest at the bottom (squad) and funnels to a single vanishing point on the horizon. Horizon at 17.5 % height, squad line at 71.5 %, focal length tied to `ROAD_LENGTH` (= 8) so the spawn line reads at ~22 % scale (~20 px figures). The 50-soldier rear row still lands above the bottom edge. The drawn bridge continues to `ROAD_FAR` (90 units, a few px under the horizon) — never end the road inside the frame.

## Depth layering (back → front)
1. Sky gradient + skyline painting (its sea horizon aligned to the camera horizon); faint mirrored reflection under the horizon.
2. Water: gradient, drifting noise highlights, sun-glitter column right of centre, perspective swell lines tightening toward the horizon.
3. Road: gradient + grain, slab seams and debris to the horizon, converging longitudinal seams, cyan edge guide strips that stay visible after the seams vanish, aerial-perspective fade past 1.5 × `ROAD_LENGTH`.
4. Barriers: detailed 3-face modules to y = 16, then one simplified strip per side to `ROAD_FAR`; light masts every 4 units with warm caps (the shrinking cadence is the main depth cue).
5. Units: contact shadows scale with depth; enemies materialise over 0.5 s at the spawn line and carry a warm ground marker below ~45 % scale so a 20 px silhouette still reads as a threat. Sprite size always equals hitbox scale — no size floor.
6. Haze: strongest right under the horizon, gone by the spawn line, so distant figures stay readable while the far bridge dissolves.

## Palette (`components/battlefield/palette.ts`)
- Sky/horizon painted backdrop (`assets/environment/horizon_coastal.jpg`), turquoise water gradient with animated noise.
- Road: warm grey concrete gradient (far → near), slab seams, subtle grain, debris marks.
- Barriers: three-tone modules (lit inner face on the right, shaded on the left, bright top), cyan rail.
- Squad: cobalt blue armor. Enemies: crimson armor; elites tinted hotter with a glow. Boss: dark crimson with a left-arm cannon.
- VFX: warm white tracers with a soft core, pale-gold muzzle stars, amber impact sparks, kill bursts in enemy red.
- Gates: cyan (squad), gold (damage), violet (fire rate) frames with huge numerals.

## Characters
Generated 2.5D sprites (stylized realism, hard-surface armor, strong top key light), alpha-trimmed. Blue vs red must be instant: soldiers royal-blue/steel with cyan emissive back-light; grunts crimson/gunmetal with an orange visor and chest core (the warm accent is what survives at 20 px); runners reuse the grunt with an amber tint, elites hotter + larger. Anchors and muzzles are declared in `game/visuals.ts` (foot anchor, weapon anchor, muzzle position as fractions of the frame). Soldiers always face the vanishing point; the sprite is authored rear-view with a vertical rifle and is never rotated by gameplay (only `baseVisualRotationOffset`, shared with the sim so the muzzle stays on the barrel tip). Even-id enemies are mirrored for variety.

## Lighting cues
Key light from top-left: contact shadow ellipses under every unit, barrier top faces brightest, right inner faces lit. Haze fades the far bridge into the horizon; the road slab itself cools toward sky colour with distance.

## HUD
Minimal: stage pill (`STAGE 03`), squad count, pause; boss name + bar only while the boss is alive; transient banners for gates/stage start/stage clear/boss events. No counters or debug text in gameplay; the debug overlay is dev-only.
