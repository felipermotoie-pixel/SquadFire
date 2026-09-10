# SquadFire — Game Design (vertical slice)

## Fantasy
Command a growing squad of armored troopers pushing along a sunlit coastal causeway toward a fortified city. Every trooper fires straight up the road, without pause; the player steers the squad to put those streams where the enemies are. Growth is the reward: more soldiers, more muzzles, more tracers — and a wider, deeper block to position.

## Core loop (one stage)
1. Waves of red grunts and heavier elites advance down the causeway.
2. Gates scroll toward the squad in pairs; passing through the left or right gate applies its effect (squad +N, damage ×, fire rate +%).
3. After enough kills the boss **Warden of the Causeway** enters, holds mid-road, patrols slowly, and telegraphs lane slams.
4. Boss defeated → `CAUSEWAY SECURED` (victory). All soldiers lost → `SQUAD LOST` (defeat).

## Controls
- Horizontal drag anywhere: moves the squad anchor. **This is the aiming control** — soldiers only ever fire straight ahead, so moving the squad moves the fire lanes. The anchor clamp shrinks as the formation gets wider (`roadHalfWidth − formationHalfWidth`, at most ±0.72) so the whole block stays on the road.
- Pause button (top right). Long-press the WAVE pill opens the developer panel in dev builds only.

## Squad
- Starts with 5 soldiers, capped at 50.
- Every soldier faces the vanishing point (`ROAD_FORWARD`). Body heading is never derived from drag, targets, or slots.
- Formation (`game/formation.ts`): a straight, symmetric block. Rows perpendicular to the road, columns parallel to it. `formationHorizontalSpacing` 0.25, `formationLongitudinalSpacing` 0.17, `formationMaxWidth` 1.0 / `formationMaxColumns` 5. Past 5 columns soldiers add rows behind; deep blocks compress row pitch (min 0.10) and creep forward at most 0.3 so the rear stays on screen. 50 soldiers = 5 × 10.
- Each soldier is an independent shooter with a fixed lane (see `FIRING_SYSTEM.md`).
- Losing soldiers: enemy contact at the squad line removes one; a boss slam that lands on the anchor lane removes one.

## Enemies
| Type | HP | Speed | Notes |
| --- | --- | --- | --- |
| Grunt | 30 | 0.42 | Red armored trooper. Small sinusoidal wander, no drift toward the squad. |
| Elite | 110 | 0.34 | Larger, tinted, glow; appears from wave 2 (16 %). |
| Warden (boss) | 2600 | — | Holds at y 3.1. Slow bounded patrol (0.28 u/s inside ±0.5, dwell 0.9–1.9 s) independent of the squad. Telegraphed slam (1.3 s, ±0.55 lane). Phase 2 at 50 % HP: faster slams, enraged banner. |

## Gates
Pairs, in order: (+3 squad | +25 % fire rate), (×1.5 damage | +4 squad), (+5 squad | ×2 damage). First pair at 9 s, then every 12 s until the boss spawns. Caps: fire rate ×2.5, damage ×3, squad 50.

## Feedback hierarchy
Muzzle flash < tracer < impact spark < kill burst < gate pass < boss slam < boss death. Screen shake only for slams, gate passes (small) and boss death; a "reduced screen shake" toggle lives in the pause card.

## Out of scope for this slice
Shop, meta economy, campaign map, enemy ranged attacks, audio playback (aggregation hook exists), multiple weapons, intro cinematic / main menu (planned as the next phase).
