# SquadFire — Test Plan

## Automated (headless)
`pnpm run test:sim` — `game/tests/fire-system.test.ts` (59 checks) + `game/tests/stage-system.test.ts` (10 checks, stage Tests A–F: Stage 1 flow with an autopilot player, Stage 2 volume, Stage 5 boss order and "never completes before the boss dies", Stage 6 relief, Stage 10 auto-major-boss, 120-stage config validity, campaign-save migration).

Fire-system checks:

| Group | What it proves |
| --- | --- |
| Test A — static squad | 10 soldiers fire with no enemies; every shot direction is exactly `ROAD_FORWARD`; each soldier keeps one fixed lane; lane count = formation columns (4 for 10 soldiers); in-flight projectiles never leave their lane. |
| Test B — off-axis | Enemy at x 0.7, squad at 0: 0 hits over 4 s. After `setInputX(0.7)` hits register. |
| Miss / range | A missed bullet flies to `camera.farVisibleDepth` (≈ 23, well past the 8-long road) and expires by travel, not lifetime; all ten muzzle depths of a 50-soldier block terminate at the same boundary; lifetime ≥ 1.1 × flight time. |
| Max-depth enemy | An enemy at `ENEMIES.maxSpawnDepth` is still hittable (combat band covers every spawn). |
| Pool | 50 soldiers × capped rate × all misses: peak ≤ theoretical (531 ≤ 600), pool ≥ required (780), zero drops; same on a 1024×1366 tablet layout; `setCamera` never shrinks the pool below the requirement. |
| Swept collision | `sweptHit` geometry (stationary, crossing, tunnelling cases) and a fast lane-crosser hit identically at 30 / 60 / 120 Hz. |
| Test C — lane crosser | An enemy scripted across the road is hit only while `|enemy.x − lane| ≤ hitRadius`. |
| Enemy honesty | Enemy parked at x 0.8 with the squad at −0.6 deviates < 0.08 laterally (no drift toward the squad). |
| Test D — +3 gate | 3 → 6 shooters, shot rate ≈ doubles, original timers untouched. |
| Test E — drag after spawn | Projectiles tracked across a drag keep `x, vx, vy, originX` bit-identical. |
| Boss honesty | Squad parked at 0.7, boss at −0.4: no damage, all shots straight; damage only once the lane is dragged onto the hitbox. Patrol stays inside ±0.5, ≤ 0.28 u/s, with dwell, regardless of squad position. |
| Formation 1/5/10/25/50 | Straight symmetric block: every row sums to x = 0, width ≤ 0.6, ≤ 5 columns, rear row ≥ −0.72, anchor limit + footprint half-width ≤ road half-width at every row. 50 = 5 × 10, rear row −0.60. Screen-space: 50 soldiers inside the vertical safe area at both drag extremes, every sprite on the road at its own row, centred block fully on screen (the rear outer column may overflow the *screen* edge by ~87 pt at the clamp extreme because the road is wider than the screen — reported, not asserted). |
| Compact formation | Columns non-decreasing over 1..50 and capped at 5; brief shapes 1 / 2 / 1+2 / 2+2 / 3+2 / 3+3 / 3×3 / 5×4. Test A: 5 soldiers = 3×2, width 0.42, inside road. Tests B/C: dragged fully left/right the outermost soldier stays at |x| ≤ 0.86 and fire stays straight. Tests D/E: 20 and 50 soldiers add rows, width 0.84, safe range ±0.44, 20/50 independent shooters. Perspective: projectile world x constant while its projected screen offset shrinks toward the vanishing point. |
| Formation growth | A 1-soldier squad parked at ±0.72 that grows to 5 is clamped to the 3-column range (±0.65) on the same frame; outermost slot stays inside the margin. Losing a soldier at the edge (20→19, 10→9, 5→4, 2→1) never pushes survivors past the margin during the death animation. |
| Cadence | 1 soldier ≈ 2/s with period 0.5 s; 3 soldiers never fire on the same substep; 10 soldiers ≈ 20/s with ≤ 3 per substep. |
| §44 acceptance | 1 soldier → ~20 shots/10 s; 5 → ~100; +25 % FR → ~12.5 shots/s; five distinct shooters. |
| Muzzle | Shot origin within 0.3 of the owner's x (currently 0.036). |
| Perf sweep | 1/10/25/50 soldiers vs 30/80/150/300 enemies: avg sim step 0.02–0.04 ms/frame. |
| Stress | 50 soldiers, ×2.5 fire rate, 300 clustered immortal enemies: avg 0.09 ms/frame, peak ≈ 1.8 ms, zero pool drops. |
| Perf (max in-flight) | 50 soldiers × capped rate, all misses to the far boundary: avg 0.05 ms/frame, peak 0.16 ms, 531 projectiles active. |

`pnpm run render:preview` — renders opening, mid-game, 25-soldier, boss, gates, debug overlay, alignment at 1/5/10/25/50 (`07-alignment-*`), the off-axis miss (`08-off-axis-miss`), edge drags (`09-edge-*`), long range (`11-long-range`), the compact 5/20/50 blocks centred and at the edge (`12-compact-*`), the 50-soldier full-range miss (`13-full-range-miss-50`, worst-case tracer count) and impact sparks (`14-impact-sparks`) to PNG through CanvasKit. CPU record+raster: ~190 ms opening, ~240–275 ms at 50 soldiers (unchanged from v0.3.5).

`pnpm run typecheck` — must be clean.

## Manual (device / Expo Go) — stages
- Start a run: `STAGE 01` banner, first grunt pair appears, killing it shows **no** banner; after ~10 kills `STAGE CLEAR` then `STAGE 02` with the squad intact.
- Dev panel → Stage 5: after the groups, `BOSS INCOMING` (~1.3 s) then the Warden; clearing the road before the boss dies must not advance; boss death → `STAGE CLEAR` → `STAGE 06`.
- Dev panel → Stage 10: boss name reads HIGH WARDEN, escorts trickle in during the fight.
- Defeat card shows the stage reached; RETRY restarts at Stage 1. Kill the app and relaunch: save persists (`squadfire.campaign`).

## Manual (device / Expo Go)
1. Launch; every soldier faces the vanishing point, the block is straight and symmetric, tracers leave the rifles straight up the road and converge to the horizon.
2. Drag left/right; the formation follows and the tracer streams move with it. No bullet bends toward an enemy. Enemies outside the streams are not hit.
3. Dev panel → "Off-axis wall": zero hits until the squad is dragged under the wall. "Lane crosser": hit sparks only while the grunt is inside a stream.
4. Pass through a squad gate → banner, haptic, count increases, streams double/extend immediately with no synchronized volley.
5. Pass a fire-rate gate → cadence increases without a burst.
6. Boss: bar appears; the boss patrols slowly and never slides under the squad; damage only while streams cross its body; slam telegraph 1.3 s; phase 2 banner at 50 %.
7. Dev panel → 20 / 50 soldiers: 5×4 / 5×10 block (0.60 wide, rear row at −0.60, on screen above the bottom safe area), safe range narrower (overlay shows ±0.62 / ±0.55, red road ticks, orange margin ticks, cyan footprint quad). Drag fully left/right: no soldier over the barrier; at 50 the rear outer column may run off the *screen* edge (the road is wider than the screen there) but never off the road.
9. (v0.3.6) Tracers: short amber dashes, not beams; muzzle flashes stay on the barrel tips; missed shots keep flying past the spawn line and dissolve just below the horizon instead of vanishing mid-air; far-away shots are still readable through the haze. Impacts are small metallic sparks.
10. (v0.3.6) FPS overlay (dev panel → debug overlay): record FPS / frame ms / peak ms / sim ms and `projectiles active/pool peak dropped` at 5 soldiers and at 50 soldiers (dev panel → 50) with the squad parked off-axis so every shot misses (max in-flight ≈ 530). `dropped` must stay 0.
8. Victory and defeat cards; Retry starts a fresh stage. Pause → reduced shake toggle persists for the run.

## Performance protocol (to run on hardware)
Use the dev overlay. Record fps, frame ms, peak ms for: 1, 10, 25, 50 soldiers; 100 and 300 enemies; boss with 50 soldiers (500+ projectiles). Targets: 60 fps sustained, no growth of frame time over 30 minutes (pools are fixed size; watch `peak`).

## Status
Automated: pass (47/47). Typecheck: clean. Headless renders reviewed for alignment at 1/5/10/25/50 and the off-axis miss. Manual device pass: **not yet executed in this environment** (no device attached).
