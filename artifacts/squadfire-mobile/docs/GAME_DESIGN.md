# SquadFire — Game Design (vertical slice)

## Fantasy
Command a growing squad of armored troopers pushing along a sunlit coastal causeway toward a fortified city. The squad fires automatically; the player only steers. Growth is the reward: more soldiers, more muzzles, more tracers.

## Core loop (one stage)
1. Waves of red grunts and heavier elites advance down the causeway.
2. Gates scroll toward the squad in pairs; passing through the left or right gate applies its effect (squad +N, damage ×, fire rate +%).
3. After enough kills the boss **Warden of the Causeway** enters, holds mid-road, and telegraphs lane slams.
4. Boss defeated → `CAUSEWAY SECURED` (victory). All soldiers lost → `SQUAD LOST` (defeat).

## Controls
- Horizontal drag anywhere: moves the squad anchor (clamped to ±0.72 of the road). Formation follows with light lag.
- Pause button (top right). Long-press the WAVE pill opens the developer panel in dev builds only.

## Squad
- Starts with 5 soldiers, capped at 50.
- Formation: staggered rows, 0.25 lateral × 0.17 forward spacing, widens after 5 rows.
- Each soldier is an independent shooter (see `FIRING_SYSTEM.md`).
- Losing soldiers: enemy contact at the squad line removes one; a boss slam that lands on the anchor lane removes one.

## Enemies
| Type | HP | Speed | Notes |
| --- | --- | --- | --- |
| Grunt | 30 | 0.42 | Red armored trooper. |
| Elite | 110 | 0.34 | Larger, tinted, glow; appears from wave 2 (16 %). |
| Warden (boss) | 2600 | — | Holds at y 3.1, lateral drift, telegraphed slam (1.3 s, ±0.55 lane). Phase 2 at 50 % HP: faster slams, enraged banner. |

## Gates
Pairs, in order: (+3 squad | +25 % fire rate), (×1.5 damage | +4 squad), (+5 squad | ×2 damage). First pair at 9 s, then every 12 s until the boss spawns. Caps: fire rate ×2.5, damage ×3, squad 50.

## Feedback hierarchy
Muzzle flash < tracer < impact spark < kill burst < gate pass < boss slam < boss death. Screen shake only for slams, gate passes (small) and boss death; a "reduced screen shake" toggle lives in the pause card.

## Out of scope for this slice
Shop, meta economy, campaign map, enemy ranged attacks, audio playback (aggregation hook exists), multiple weapons.
