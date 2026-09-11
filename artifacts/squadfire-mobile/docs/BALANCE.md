# SquadFire — Balance

All numbers live in `game/balance.ts`.

## Damage model
```
squad DPS ≈ soldiers × damage(10) × damageMult × fireRate(2/s) × fireRateMult × hitEfficiency
```
Squad size enters exactly once (number of shooters). Fire-rate and damage multipliers come only from gates and are capped (×2.5, ×3).

## Reference numbers
| Soldiers | Shots/s | DPS (no mods) | Grunt kills/s (30 HP) |
| --- | --- | --- | --- |
| 1 | 2 | 20 | 0.67 |
| 5 | 10 | 100 | 3.3 |
| 10 | 20 | 200 | 6.7 |
| 25 | 50 | 500 | 16.7 |
| 50 | 100 | 1000 | 33 |

Boss (2600 HP base; stage 5 = 2340, stage 10 major = 4043, +28 % per boss cycle): 20 soldiers ≈ 6.5 s time-to-kill at base mods with all lanes on the body; 10 soldiers ≈ 13 s. Boss slams every 6.5 s (4.5 s in phase 2) so a 10-soldier squad eats ~2 slams.

## Pacing (seed-independent targets)
- Stage curve (`game/stages.ts`, details in `STAGE_SYSTEM.md`): stage totals 10 / 14 / 15 / 20 / 14+boss for 1–5, then 22 → ~110 by stage 100; group size 4 → 12; delay between groups 1.35 → 0.45 s; enemy HP × 0.6 at stage 1, ×1 at stage 5, then `1 + (n−5)·0.035`; speed up to +45 %; post-boss stages ×0.85 enemies / ×0.9 HP.
- Enemy mix: grunts only in 1–2, runners (18 HP, 0.66 u/s) from 3, elites from 4 (6 % → 32 % share).
- Boss every 5 stages after the stage's sequence + 1.3 s warning. Autopilot sims (seeds 11/23/42): stage 1 clears in 12.4–12.5 s, stage 2 12.6–13.0 s, stage 5 with a 12-soldier squad 21.4–21.7 s including the boss. v0.3.6 (compact formation, ranged projectiles) moved these by ≤ 0.3 s vs v0.3.5 — within seed noise.
- Gates: first at 9 s, then every 12 s, paused while a boss is alive → ~1 pair per early stage.
- Approach distance (v0.3.5): `ROAD_LENGTH` grew 6 → 8 for long-range visibility, and enemy/gate/boss spawns follow it. Speeds were **not** retuned, so time-to-contact is longer than in v0.3.4: grunt ≈ 19 s (was 14), runner ≈ 12 s (was 9), elite ≈ 23 s (was 17); gates and the boss arrive ≈ 3.6 s later. Base speeds/HP were not changed so the stage curve numbers above still hold in relative terms; if the extra firing time makes early stages too easy, the honest knob is `ENEMIES.<kind>.speed` (×1.33 restores v0.3.4 contact times), not the spawn line.

## Hit efficiency
There is no targeting and no overkill bookkeeping: `hitEfficiency` is entirely the player's positioning. A grunt (hit radius 0.2) standing in the block is crossed by two or three lanes (0.15 apart); a 50-soldier block puts 10 bullets/s into each of its 5 lanes. Boss hit radius 0.62 spans the whole 0.60-wide block when centred on it. Collision is a swept segment test against unchanged hitboxes, so nothing tunnels at 30 Hz and hit rates are the same at 30/60/120 Hz.

## Formation and reach (v0.3.6 ultra-compact)
Columns unlock at 2/5/12/24 soldiers and cap at 5 columns × 0.15 = 0.60 wide (centre span); rows are 0.12 apart, so 50 soldiers = 5 × 10 with the rear row at −0.60 (`formationMaxRearDepth`). Safe anchor range = min over rows of `roadHalfWidthAt(rowY) − 0.30 − SOLDIER_HALF_WIDTH (≈ 0.095) − formationRoadMargin (0.06)`, capped by `anchorLimit` 0.72: ±0.70 for 1–10 soldiers, ±0.62 for 20, ±0.55 for 25–50. The outermost soldier centre never passes 0.845 (rendered barrier edge 0.94). A wider block trades a little reach for lane count and density.

## Projectile range
Bullets are not clipped at the spawn line: they fly to `camera.farVisibleDepth` (≈ 23.1, ~3× the road) and fade out there. Only the first 8.9 units (`COMBAT_DEPTH`) can contain targets, so range has no balance effect — a miss is a miss — it only changes how far tracers are visible. Pool 780 (50 soldiers × 12 in flight × 1.3); measured peak 531 with every shot missing at the capped cadence.

## Tuning knobs worth touching first
1. `stageConfig()` bands in `game/stages.ts` (totals, group size, delays, elite share) — pressure curve; `STAGES.bossEvery` — boss cadence.
2. `bossConfigFor()` HP / attack scale — boss difficulty per cycle.
3. `GATES.interval` — growth rate.
4. `WEAPONS.rifle.fireRate` — global cadence (changes every soldier's period, not their phase).
5. `SQUAD.formationMaxColumns` / `formationHorizontalSpacing` — lane count and lane pitch (positioning difficulty).
6. `BOSS.patrolSpeed` / `patrolRange` — how much the player must chase the boss.
