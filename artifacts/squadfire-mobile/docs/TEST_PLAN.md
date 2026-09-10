# SquadFire — Test Plan

## Automated (headless)
`pnpm run test:sim` — `game/tests/fire-system.test.ts`, 27 checks:

| Group | What it proves |
| --- | --- |
| Test A — 1 soldier | ~2 shots/s, all from one soldier id, projectile origin at that soldier's muzzle. |
| Test B — 3 soldiers | ~6 shots/s, no two shots on the same substep (distributed cadence). |
| Test C — 10 soldiers | ~20 shots/s, each soldier ~2/s (max deviation bounded). |
| Test D — +5 gate | Existing soldiers' `nextShotAt` untouched; output rises within 1 s. |
| Test E — 20 vs boss | All 20 soldiers fire at the boss with distinct aim offsets; boss dies. |
| §44 acceptance | 1 soldier → ~20 shots/10 s; 5 → ~100; +25 % FR → ~12.5 shots/s; five distinct shooters. |
| Overkill | Reserved damage keeps the number of shots at a 30 HP grunt near 3. |
| Perf sweep | 1/10/25/50 soldiers vs 30/80/150/300 enemies: average sim step < 0.2 ms/frame (measured 0.01–0.05 ms). |
| Stress | 50 soldiers, ×2.5 fire rate, 300 clustered immortal enemies, 500+ projectiles in flight (slowed tracers to fill the pool): avg 0.17 ms/frame, peak ≈ 0.5 ms. |

`pnpm run render:preview` — renders opening, mid-game, 25-soldier, boss and debug-overlay scenes to PNG through CanvasKit for visual review.

`pnpm run typecheck` — must be clean.

## Manual (device / Expo Go)
1. Launch; confirm the squad fires continuously, tracers leave rifles, flashes align with barrels.
2. Drag left/right; formation follows with slight lag; clamped by barriers.
3. Pass through a squad gate → banner, haptic, count increases, output visibly increases immediately.
4. Pass a fire-rate gate → cadence increases without a synchronized volley.
5. Boss: bar appears, slam telegraph ring shows for 1.3 s, staying in the ring loses a soldier, phase 2 banner at 50 %.
6. Victory and defeat cards; Retry starts a fresh stage.
7. Pause → reduced shake toggle persists for the run.
8. Dev panel (dev build only): Stress 50/300 keeps the frame time acceptable; overlay shows fps/frame/peak/sim counters.

## Performance protocol (to run on hardware)
Use the dev overlay. Record fps, frame ms, peak ms for: 1, 10, 25, 50 soldiers; 100 and 300 enemies; boss with 50 soldiers (500+ projectiles). Targets: 60 fps sustained, no growth of frame time over 30 minutes (pools are fixed size; watch `peak`).

## Status
Automated: pass (27/27). Typecheck: clean. Manual device pass: **not yet executed in this environment** (no device attached). Web preview verified structurally; visual review done via the headless renderer.
