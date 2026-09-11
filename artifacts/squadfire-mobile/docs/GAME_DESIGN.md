# SquadFire — Game Design (vertical slice)

## Fantasy
Command a growing squad of armored troopers pushing along a sunlit coastal causeway toward a fortified city. Every trooper fires straight up the road, without pause; the player steers the squad to put those streams where the enemies are. Growth is the reward: more soldiers, more muzzles, more tracers — and a wider, deeper block to position.

## Core loop (planet → stages, see `PLANET_SYSTEM.md`, `STAGE_SYSTEM.md`)
1. A run is one **planet**: Earth = 10 fixed stages, ~13–15 minutes. Each stage schedules its exact enemy count (36 → 120, absolute HP 20 → 120) over a spawn window (60 → 90 s); enemies enter just below the horizon and walk the whole causeway (~50 s for a grunt). The stage is cleared only when every scheduled enemy has spawned and died; nothing is ever dropped.
2. Gates scroll toward the squad in pairs; passing through the left or right gate applies its effect (Squad Power +N, damage ×, fire rate ×). Power and upgrades carry over between stages; at a cap the gate is swapped for the complementary effect.
3. Stage 5 ends with the **Warden of the Causeway** (4500 HP) and Stage 10 with the **High Warden** (18 000 HP): full schedule first, `BOSS INCOMING`, then the boss enters from the far horizon (~10 s approach, hittable the whole way), holds mid-road, patrols slowly, and telegraphs lane slams.
4. `STAGE CLEAR` → next `STAGE 04` banner within ~1.6 s, no menu. Stage 10 cleared → `EARTH COMPLETE` summary, back to the planet card (`PROGRESS 10/10`, next planet locked). Squad Power 0 → `SQUAD LOST` with the stage reached; **RETRY and every new run start at Stage 1 with power 5** (no mid-planet continue).

## Controls
- Horizontal drag anywhere: moves the squad anchor. **This is the aiming control** — soldiers only ever fire straight ahead, so moving the squad moves the fire lanes. The clamp considers the whole block: `anchorLimit = roadHalfWidth − formationHalfWidth − formationRoadMargin` (≤ ±0.72), so the outermost soldier never leaves the bridge.
- Pause button (top right). Long-press the STAGE pill opens the developer panel in dev builds only.

## Squad
- **Squad Power** is the real strength (starts 5, cap 500); the visible squad is its 10:1 representation (1–9 → normals, then one buffed "Power10" soldier per 10 power plus one partial; max 50 visible). A P10 soldier fires the same cadence with 10× bullet damage — same DPS as ten normals, more overkill. Consolidation (9 → 10) is a cyan pulse; losing a soldier at 10 splits back into 9 normals. See `SQUAD_STACKING.md`.
- Every soldier faces the vanishing point (`ROAD_FORWARD`). Body heading is never derived from drag, targets, or slots.
- Formation (`game/formation.ts`): a compact, straight, symmetric block. Rows perpendicular to the road, columns parallel. `formationHorizontalSpacing` 0.21 (soldier sprite ≈ 0.18 wide), `formationLongitudinalSpacing` 0.16. Columns unlock at 2/5/10/20 soldiers (`formationColumnThresholds`) and cap at 5 (`formationMaxWidth` 0.9): 1 · 2 · wedge(1+2) · 2×2 · 3+2 · 3×2 · 3×3 · 4+4+2 · 5×4 · 5×10. Growth never removes a column; a lone remainder leads as point man, a wider partial row trails centred. Deep blocks compress row pitch (min 0.10) and creep forward ≤ 0.3 so the rear stays on screen.
- Each soldier is an independent shooter with a fixed lane (see `FIRING_SYSTEM.md`).
- Losing power: enemy contact at the squad line costs 1 power; a boss slam that lands on the anchor lane costs 1 power. The rearmost visible soldier plays the casualty.

## Enemies
| Type | HP | Speed | Notes |
| --- | --- | --- | --- |
| Grunt | stage HP (20 → 120) | 0.42 × stage speed | Red armored trooper. Small sinusoidal wander, no drift toward the squad. |
| Runner | stage HP | 0.66 × stage speed | Small, amber-tinted grunt with a fast gait; from Stage 2 (14 % → 24 %). |
| Elite | stage HP | 0.34 × stage speed | Larger, tinted, glow; from Stage 3 (4 % → 12 %). |
| Warden (Stage 5) | 4500 | approach ≈ 1.9 u/s | Enters at the far horizon, reaches y 3.1 in ~10 s. Slow bounded patrol (0.28 u/s inside ±0.5, dwell 0.9–1.9 s) independent of the squad. Telegraphed slam (1.3 s, ±0.55 lane). Phase 2 at 50 % HP: faster slams, enraged banner. |
| High Warden (Stage 10) | 18 000 | same | Same behaviour, slam interval × 0.85. |
HP is per stage (`StageConfig.enemyHP`), identical for all three archetypes; archetypes differ in speed and hit radius only.

## Gates
Pairs, in order: (+3 squad | ×1.25 fire rate), (×1.5 damage | +4 squad), (+5 squad | ×2 damage). First pair at 9 s, then every 12 s across stages; suppressed while a boss is alive. Caps: fire rate ×2.5, damage ×3, Squad Power 500. +squad is clamped to the room left so the number shown is the number applied, and at power 500 the squad side becomes a modifier; modifier gates at their cap still appear (multiplier clamps) — unchanged from v0.3.6. ~68 pairs per Earth run.

## Feedback hierarchy
Muzzle flash < tracer < impact spark < kill burst < gate pass < boss slam < boss death. Screen shake only for slams, gate passes (small) and boss death; a "reduced screen shake" toggle lives in the pause card.

## Out of scope for this slice
Shop / spending the tracked coins, meta economy, planet select / unlock rules (Earth only, next planet shown as LOCKED), mid-planet continue, enemy ranged attacks, audio playback (aggregation hook exists), multiple weapons, intro cinematic / main menu.
