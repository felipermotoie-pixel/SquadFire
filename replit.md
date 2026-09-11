# SquadFire

Portrait mobile squad shooter (Expo, iOS/Android, premium casual): steer a growing squad of armored troopers along a sunlit coastal causeway, pass gates to grow, beat the Warden of the Causeway.

## Run & Operate

- Workflow `artifacts/squadfire-mobile: expo` — Expo dev server (Expo Go + web preview). Web needs WebGL.
- `pnpm --filter @workspace/squadfire-mobile run typecheck` — TypeScript for the game.
- `pnpm --filter @workspace/squadfire-mobile run test:sim` — headless simulation/firing tests (47 checks: straight-fire Tests A–E, compact-formation/edge/perspective checks, boss/enemy honesty, formation alignment 1–50, cadence, brief §44 acceptance, perf sweeps and a 500-projectile stress case).
- `pnpm --filter @workspace/squadfire-mobile run render:preview` — renders 15 scenario PNGs (incl. alignment at 1/5/10/25/50, off-axis miss, edge drags) to `/tmp/squadfire-preview/` through CanvasKit; use this for visual review when a screenshot tool lacks WebGL.
- `pnpm run typecheck` — full workspace typecheck.
- The `api-server` / `api-spec` / `db` packages are the untouched monorepo template; the game is fully client-side (no `DATABASE_URL` needed).

## Stack

- pnpm workspaces, Node 24, TypeScript 5.9
- Expo SDK 57, React Native 0.86 (new arch), expo-router
- `@shopify/react-native-skia` 2.6.2 (pinned to the Expo Go bundled version), reanimated 4.5, canvaskit-wasm 0.41.0 (dev, web + headless render)

## Where things live

- `artifacts/squadfire-mobile/game/` — pure TS simulation (`engine.ts` = `Game` class; `balance.ts` = all tuning incl. the `ROAD_FORWARD`/`ROAD_RIGHT` basis; `formation.ts`, `camera.ts`, `visuals.ts` sprite metadata, `sprite-geometry.ts` shared draw/muzzle geometry, `audio.ts` shot aggregation hook, `tests/`).
- `components/battlefield/` — `SceneRenderer.ts` (imperative Skia frame), `Battlefield.tsx` (canvas + rAF loop), `palette.ts`.
- `components/GameScreen.tsx` — HUD, drag input, pause/end cards, dev panel (`__DEV__`).
- `app/index.tsx` (native) / `app/index.web.tsx` (web, `WithSkiaWeb` lazy import).
- `assets/characters`, `assets/environment` runtime art; `assets/source` originals.
- `docs/` — ARCHITECTURE, GAME_DESIGN, BALANCE, DEPENDENCIES, PROJECT_STATE, TEST_PLAN, VISUAL_DIRECTION, FIRING_SYSTEM, ASSET_PIPELINE.
- `scripts/` — headless render harness (Node-only, excluded from the app tsconfig).

## Architecture decisions

- Whole battlefield is one Skia `<Canvas>` with a `<Picture>` re-recorded each frame from a rAF loop; React never re-renders per frame. HUD syncs at ~8 Hz via `onSync`.
- Simulation is deterministic (seeded RNG, fixed 1/120 s substeps) and has no React/Skia imports so it runs headless in Node for tests.
- One soldier = one muzzle = one ShotEvent = one projectile. Squad size is applied exactly once (as shooter count); damage/fire-rate come only from capped gate multipliers.
- **Straight fire (v0.3.0):** no auto-targeting anywhere. Every projectile leaves its muzzle along `ROAD_FORWARD`; the drag is the aim; damage is collision-only; enemies/boss never drift toward the squad. Do not reintroduce target lookup, aim assist, or homing.
- Soldiers always face the vanishing point; sprite heading is never derived from drag/target/slot. Asset tilt is corrected with `baseVisualRotationOffset` in `visuals.ts`, never by rotating the formation. Formation = compact straight symmetric block: spacing 0.21, columns unlock at 2/5/10/20 soldiers, cap 5 (0.84 wide), rows added behind, growth never removes a lane. Drag clamp = road − formation half-width − margin. Projectiles are world-space; screen convergence is projection only — never widen hitboxes or steer to "fix" perspective.
- Sprite geometry is shared by sim and renderer so projectiles always leave the drawn muzzle.
- World units: x in road half-widths (±1 = barriers), y forward (0 squad line, 6 spawn), perspective camera in `game/camera.ts`.

## Product

Continuous run of **Stages** (`artifacts/squadfire-mobile/docs/STAGE_SYSTEM.md`): each stage = several spawn groups, cleared only when all scheduled enemies are dead; boss every 5th stage (major every 10th) after a `BOSS INCOMING` warning; squad/upgrades persist between stages; defeat card shows the stage reached. Enemy kinds grunt/runner/elite, gate pairs keep coming across stages. Campaign progress saved via AsyncStorage (stage terminology only — never "wave"). No shop/economy/stage-select yet (explicitly out of scope); runs start at Stage 1.

## User preferences

- Single Expo mobile artifact; keep HUD minimal, no debug text in gameplay (dev-only overlay is fine).
- Always create a git checkpoint/tag before large reworks and a semantic version tag after; never overwrite tags.
- Stop after delivering the requested scope; do not start Shop/economy/campaign work unasked. Phase B (intro cinematic + main menu, v0.4.0) only starts on explicit instruction.

## Gotchas

- Skia on web: `font.measureText` is not implemented — use glyph widths (`textWidth` helper in SceneRenderer). Headless screenshot browsers without WebGL show a blank canvas; that is not an app bug.
- RN 0.86: use `StyleSheet.absoluteFill` (no `absoluteFillObject`), pass `pointerEvents` via style.
- Do not bump `@shopify/react-native-skia` beyond the Expo Go bundled version unless moving to a dev build.
- `scripts/` is excluded from the app `tsconfig` (Node types); bundle with esbuild via the package scripts.
