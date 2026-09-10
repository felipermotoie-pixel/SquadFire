# SquadFire — Visual Direction

**Concept: "Sunlit Causeway".** A bright, saturated coastal highway cutting across turquoise water toward a white city on the horizon. Clean concrete, cyan safety rails, blue armored heroes, red-hot enemies. Premium stylized 3D-look, readable at arm's length.

## Camera
Pitched-down perspective: the road is widest at the bottom (squad) and funnels to the vanishing point. Horizon at 21.5 % height, squad line at 70.5 %. Nearest rows overlap the bottom edge slightly — the squad feels close.

## Palette (`components/battlefield/palette.ts`)
- Sky/horizon painted backdrop (`assets/environment/horizon_coastal.jpg`), turquoise water gradient with animated noise.
- Road: warm grey concrete gradient (far → near), slab seams, subtle grain, debris marks.
- Barriers: three-tone modules (lit inner face on the right, shaded on the left, bright top), cyan rail.
- Squad: cobalt blue armor. Enemies: crimson armor; elites tinted hotter with a glow. Boss: dark crimson with a left-arm cannon.
- VFX: warm white tracers with a soft core, pale-gold muzzle stars, amber impact sparks, kill bursts in enemy red.
- Gates: cyan (squad), gold (damage), violet (fire rate) frames with huge numerals.

## Characters
Generated 2.5D sprites, alpha-trimmed. Anchors and muzzles are declared in `game/visuals.ts` (foot anchor, weapon anchor, muzzle position as fractions of the frame). Soldiers rotate toward their aim using `soldierSpriteRotation`, shared with the sim so the muzzle stays on the barrel. Even-id enemies are mirrored for variety.

## Lighting cues
Key light from top-left: contact shadow ellipses under every unit, barrier top faces brightest, right inner faces lit. Haze fades the far road into the horizon.

## HUD
Minimal: wave pill, squad count, pause; boss name + bar only while the boss is alive; transient banners for gates/waves/boss events. No counters or debug text in gameplay; the debug overlay is dev-only.
