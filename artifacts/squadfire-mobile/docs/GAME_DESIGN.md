# SquadFire — Game Design (vertical slice)

## Fantasy
Command a growing squad of armored troopers pushing along a sunlit coastal causeway toward a fortified city. Every trooper fires straight up the road, without pause; the player steers the squad to put those streams where the enemies are. Growth is the reward: more soldiers, more muzzles, more tracers — and a wider, deeper block to position.

## Core loop (stage-based, see `STAGE_SYSTEM.md`)
1. A run is a continuous chain of **Stages**. Each stage schedules several groups of grunts / runners / elites that advance down the causeway; the stage is cleared only when every scheduled enemy has spawned and died.
2. Gates scroll toward the squad in pairs; passing through the left or right gate applies its effect (squad +N, damage ×, fire rate +%). Squad and upgrades carry over between stages.
3. Every 5th stage ends with the boss **Warden of the Causeway** (every 10th: the major **High Warden**): normal groups first, `BOSS INCOMING`, then the boss holds mid-road, patrols slowly, and telegraphs lane slams.
4. `STAGE CLEAR` → next `STAGE 04` banner within ~1.6 s, no menu. All soldiers lost → `SQUAD LOST` (defeat) with the stage reached; RETRY restarts at Stage 1.

## Controls
- Horizontal drag anywhere: moves the squad anchor. **This is the aiming control** — soldiers only ever fire straight ahead, so moving the squad moves the fire lanes. The clamp considers the whole block: `anchorLimit = roadHalfWidth − formationHalfWidth − formationRoadMargin` (≤ ±0.72), so the outermost soldier never leaves the bridge.
- Pause button (top right). Long-press the STAGE pill opens the developer panel in dev builds only.

## Squad
- Starts with 5 soldiers, capped at 50.
- Every soldier faces the vanishing point (`ROAD_FORWARD`). Body heading is never derived from drag, targets, or slots.
- Formation (`game/formation.ts`): a compact, straight, symmetric block. Rows perpendicular to the road, columns parallel. `formationHorizontalSpacing` 0.21 (soldier sprite ≈ 0.18 wide), `formationLongitudinalSpacing` 0.16. Columns unlock at 2/5/10/20 soldiers (`formationColumnThresholds`) and cap at 5 (`formationMaxWidth` 0.9): 1 · 2 · wedge(1+2) · 2×2 · 3+2 · 3×2 · 3×3 · 4+4+2 · 5×4 · 5×10. Growth never removes a column; a lone remainder leads as point man, a wider partial row trails centred. Deep blocks compress row pitch (min 0.10) and creep forward ≤ 0.3 so the rear stays on screen.
- Each soldier is an independent shooter with a fixed lane (see `FIRING_SYSTEM.md`).
- Losing soldiers: enemy contact at the squad line removes one; a boss slam that lands on the anchor lane removes one.

## Enemies
| Type | HP | Speed | Notes |
| --- | --- | --- | --- |
| Grunt | 30 | 0.42 | Red armored trooper. Small sinusoidal wander, no drift toward the squad. |
| Runner | 18 | 0.66 | Small, amber-tinted grunt with a fast gait; from stage 3. |
| Elite | 110 | 0.34 | Larger, tinted, glow; from stage 4, share grows to 32 % by stage 40. |
| Warden (boss) | 2600 × stage multiplier (0.9 at stage 5) | — | Holds at y 3.1. Slow bounded patrol (0.28 u/s inside ±0.5, dwell 0.9–1.9 s) independent of the squad. Telegraphed slam (1.3 s, ±0.55 lane). Phase 2 at 50 % HP: faster slams, enraged banner. |

## Gates
Pairs, in order: (+3 squad | +25 % fire rate), (×1.5 damage | +4 squad), (+5 squad | ×2 damage). First pair at 9 s, then every 12 s across stages; suppressed while a boss is alive. Caps: fire rate ×2.5, damage ×3, squad 50.

## Feedback hierarchy
Muzzle flash < tracer < impact spark < kill burst < gate pass < boss slam < boss death. Screen shake only for slams, gate passes (small) and boss death; a "reduced screen shake" toggle lives in the pause card.

## Out of scope for this slice
Shop / spending the tracked coins, meta economy, campaign map / stage select, enemy ranged attacks, audio playback (aggregation hook exists), multiple weapons, intro cinematic / main menu (planned as the next phase).
