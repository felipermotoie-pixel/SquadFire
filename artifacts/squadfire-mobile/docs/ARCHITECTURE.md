# SquadFire — Architecture

Expo (SDK 57) portrait mobile squad shooter. One artifact: `artifacts/squadfire-mobile`.

## Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Simulation | `game/` | Pure TypeScript, no React/Skia imports. Deterministic (seeded RNG), fixed 1/120 s substeps. |
| Renderer | `components/battlefield/SceneRenderer.ts` | Imperative Skia drawing of a full frame from a `Game` snapshot. No React state. |
| Host | `components/battlefield/Battlefield.tsx` | One Skia `<Canvas>` + `<Picture>`; requestAnimationFrame loop steps the sim, records a picture per frame, publishes stats. |
| Stage data | `game/stages.ts`, `game/planets.ts` | Earth's 10 fixed `StageConfig`s (absolute HP, spawn windows, per-stage boss), planet registry (`PLANET_SYSTEM.md`). |
| Spawning | `game/spawn-schedule.ts`, `game/spawn-geometry.ts`, `game/rng.ts` | Pure deterministic per-stage schedule; camera-derived spawn/collision envelope (far spawn just below the horizon). |
| Squad Power | `game/squad-power.ts` | Pure 10:1 representation (`SQUAD_STACKING.md`); the engine's reconciler is the only writer of the roster. |
| Campaign save | `game/campaign-progress.ts`, `game/campaign.ts` | Pure planet-keyed progress model (schema v3) + migration; AsyncStorage wrapper. |
| Campaign flow | `components/CampaignScreen.tsx` | Pre-run planet card → run → planet summary; loads/saves progress (only eligible runs, one write per change). |
| HUD / input | `components/GameScreen.tsx` | React HUD (`EARTH • STAGE 03/10`, `SQUAD n / 500`, boss bar, pause, `DEV RUN` badge), drag input, notices, pause/end cards, dev panel (`__DEV__` only); reports stage-clear / planet-complete upward, never persists. |
| Routes | `app/index.tsx`, `app/index.web.tsx` | Mount `CampaignScreen`; web wraps it in `WithSkiaWeb` so CanvasKit loads before the renderer module is evaluated. |

## Data flow per frame

1. `Battlefield` rAF tick → `game.advance(dt)` (clamped, split into fixed substeps).
2. Engine updates: input/anchor → formation slots (built from *visible* soldiers) → soldiers (cadence × `representedPower`, `fireShot` straight along `ROAD_FORWARD`, normal weapon damage) → projectiles (swept grid collision inside `geometry.combatDepth`, travel budget to `farVisibleDepth`) → enemies/boss → gates (cap-aware pairs, +power through the reconciler) → VFX/popups → stage director (spawn schedule + state machine, see `STAGE_SYSTEM.md`) → stats.
3. Each `fireShot` creates one `ShotEvent` (soldier id, muzzle world position, direction = road forward). The event spawns a projectile, muzzle flash VFX, recoil, and is forwarded to `onShot` (audio hook / tests). There is no targeting module.
4. Renderer records a `SkPicture` from the game state; the shared value swap redraws the canvas without a React render.
5. Every ~120 ms (or immediately when events are pending) `onSync(game)` lets the HUD drain events and refresh its state.

## World model

- Coordinates: `x` lateral in road half-widths (±1 = barrier inner faces), `y` forward (0 = squad line; enemies spawn at `geometry.enemySpawnDepth` ≈ 21.6, the boss at ≈ 21.9 — `ROAD_LENGTH` = 8 only sizes the camera focal), `h` height in the same units.
- Camera (`game/camera.ts`): perspective scale `focal / (y + focal)`, horizon at 17.5 % of the screen height, squad line at 71.5 %, road half-width at the squad line = 0.56 × screen width (wider than the screen: a squad clamped to the road edge can have its rear outer column past the screen edge). `farVisibleDepth` (≈ 23.1) is derived here: the depth where the road projects narrower than 10 % of the screen width; projectiles die there. Focal is derived from `ROAD_LENGTH` so the spawn line reads at ≈ 0.22 scale; the renderer draws the bridge to `ROAD_FAR` = 90 with LOD (detailed barriers to y = 16, then merged strips).
- Sprite geometry (`game/sprite-geometry.ts`) is shared by the sim (muzzle position) and renderer (draw rect) so projectiles always leave the drawn muzzle.

## Pools and limits

- Projectiles: pool sized from the camera (`projectilePoolRequirement`: 50 soldiers × capped rate × rear-muzzle flight time to `farVisibleDepth`, × 1.3 → 780; floor `PROJECTILES.poolSize` 640), grown in place on `setCamera`. When exhausted the new shot is dropped and counted (`stats.projectilePoolExhausted`), never recycled.
- VFX: 320 particles, 40 damage popups.
- Enemies: hard cap 300 alive (`ENEMIES.maxAlive`).
- Collision uses a 2D grid (0.5 depth × 0.5 lateral cells, 3×3 neighbourhood query) rebuilt each substep; projectile checks stay O(projectiles × local density) and are skipped entirely once a projectile is past `COMBAT_DEPTH` (≈ 8.9). Each candidate is tested with a relative swept segment (`sweptHit`).
- No per-frame allocations in the hot loop apart from Skia picture recording; the renderer pools its depth-sort entries and caches every shader (camera gradients rebuilt only on resize, gate gradients per colour pair). Pictures/recorders are disposed explicitly, one frame late.

## Events

`game.drainEvents()` returns `GameEvent`s (`gate`, `stage-start`, `stage-clear`, `boss-warning`, `boss-spawn`, `boss-phase`, `boss-slam`, `boss-defeated`, `soldier-lost`, `defeat`) with optional `message` (banner text) and `shake` (screen shake magnitude). The HUD turns them into notices and haptics; the renderer never reads them.

## Tooling

- `pnpm run typecheck` — TypeScript.
- `pnpm run test:sim` — headless simulation tests (esbuild bundle → Node).
- `pnpm run render:preview` — headless CanvasKit render of five scenarios to `/tmp/squadfire-preview/*.png` for visual review without a device.
