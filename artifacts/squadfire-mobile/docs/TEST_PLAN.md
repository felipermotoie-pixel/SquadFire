# SquadFire — Test Plan

## Automated (headless)
`pnpm run test:sim` — `game/tests/fire-system.test.ts`, 39 checks:

| Group | What it proves |
| --- | --- |
| Test A — static squad | 10 soldiers fire with no enemies; every shot direction is exactly `ROAD_FORWARD`; each soldier keeps one fixed lane; lane count = formation columns (5); in-flight projectiles never leave their lane. |
| Test B — off-axis | Enemy at x 0.7, squad at 0: 0 hits over 4 s. After `setInputX(0.7)` hits register. |
| Miss lifetime | A missed bullet survives until `ROAD_LENGTH + farExit`. |
| Test C — lane crosser | An enemy scripted across the road is hit only while `|enemy.x − lane| ≤ hitRadius`. |
| Enemy honesty | Enemy parked at x 0.8 with the squad at −0.6 deviates < 0.08 laterally (no drift toward the squad). |
| Test D — +3 gate | 3 → 6 shooters, shot rate ≈ doubles, original timers untouched. |
| Test E — drag after spawn | Projectiles tracked across a drag keep `x, vx, vy, originX` bit-identical. |
| Boss honesty | Squad parked at 0.7, boss at −0.4: no damage, all shots straight; damage only once the lane is dragged onto the hitbox. Patrol stays inside ±0.5, ≤ 0.28 u/s, with dwell, regardless of squad position. |
| Formation 1/5/10/25/50 | Straight symmetric block: every row sums to x = 0, width ≤ 1.0, ≤ 5 columns, rear row ≥ −0.75, anchor limit + half-width ≤ road half-width. |
| Formation growth | 5/6/7/10/11/13 soldiers all keep 5 columns (growth never removes lanes). A 1-soldier squad parked at ±0.72 that grows to 5 is clamped to ±0.45 on the same frame; outermost slot stays ≤ road half-width. |
| Cadence | 1 soldier ≈ 2/s with period 0.5 s; 3 soldiers never fire on the same substep; 10 soldiers ≈ 20/s with ≤ 3 per substep. |
| §44 acceptance | 1 soldier → ~20 shots/10 s; 5 → ~100; +25 % FR → ~12.5 shots/s; five distinct shooters. |
| Muzzle | Shot origin within 0.3 of the owner's x (currently 0.036). |
| Perf sweep | 1/10/25/50 soldiers vs 30/80/150/300 enemies: avg sim step 0.02–0.04 ms/frame. |
| Stress | 50 soldiers, ×2.5 fire rate, 300 clustered immortal enemies, 538 projectiles in flight: avg 0.18 ms/frame, peak ≈ 1.4 ms. |

`pnpm run render:preview` — renders opening, mid-game, 25-soldier, boss, gates, debug overlay, alignment at 1/5/10/25/50 (`07-alignment-*`) and the off-axis miss (`08-off-axis-miss`) to PNG through CanvasKit.

`pnpm run typecheck` — must be clean.

## Manual (device / Expo Go)
1. Launch; every soldier faces the vanishing point, the block is straight and symmetric, tracers leave the rifles straight up the road and converge to the horizon.
2. Drag left/right; the formation follows and the tracer streams move with it. No bullet bends toward an enemy. Enemies outside the streams are not hit.
3. Dev panel → "Off-axis wall": zero hits until the squad is dragged under the wall. "Lane crosser": hit sparks only while the grunt is inside a stream.
4. Pass through a squad gate → banner, haptic, count increases, streams double/extend immediately with no synchronized volley.
5. Pass a fire-rate gate → cadence increases without a burst.
6. Boss: bar appears; the boss patrols slowly and never slides under the squad; damage only while streams cross its body; slam telegraph 1.3 s; phase 2 banner at 50 %.
7. Dev panel → 50 soldiers: 5 × 10 block, rear row on screen, anchor clamp visibly narrower (overlay shows ±0.45).
8. Victory and defeat cards; Retry starts a fresh stage. Pause → reduced shake toggle persists for the run.

## Performance protocol (to run on hardware)
Use the dev overlay. Record fps, frame ms, peak ms for: 1, 10, 25, 50 soldiers; 100 and 300 enemies; boss with 50 soldiers (500+ projectiles). Targets: 60 fps sustained, no growth of frame time over 30 minutes (pools are fixed size; watch `peak`).

## Status
Automated: pass (39/39). Typecheck: clean. Headless renders reviewed for alignment at 1/5/10/25/50 and the off-axis miss. Manual device pass: **not yet executed in this environment** (no device attached).
