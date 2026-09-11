# SquadFire — Project State

Updated: 2026-09-11 (v0.4.0)

## Version
`v0.4.0` (committed, **not tagged**: balance gate failed → BALANCE REVIEW REQUIRED, see `docs/reports/EARTH_BALANCE_v0.4.0.md`) — Earth planet with 10 fixed stages, far spawns, Squad Power 500 with 10:1 stacking. History: `pre-v0.4.0` checkpoint (= `v0.3.6`), `v0.3.6` projectile range / ultra-compact formation / tracer look, `v0.3.5` long-range visual upgrade, `pre-v0.3.6` checkpoint, `v0.3.4` stage-based progression, `pre-visual-upgrade` checkpoint, `v0.3.3` review fix (ranks close the frame a soldier is lost), `pre-stage-system` checkpoint, `v0.3.0` straight-fire rework, `v0.3.1` review fixes, `v0.3.2` projectile-perspective audit + compact formation + whole-formation road clamp. Previous states tagged `pre-straight-fire` (= `v0.2.0`) and `pre-high-fidelity-visual-rework`.

## v0.4.0 — what changed
- **Planet system:** `game/planets.ts` (Earth only), `game/stages.ts` is a fixed 10-stage table (count 36 → 120, absolute HP 20 → 120, spawn window 60 → 90 s, group size, speed, archetype mix, per-stage boss 4500 / 18 000). No generator, no boss multiplier, no reward multiplier. Stage 10 clear = terminal victory + one `planet-complete`.
- **Spawning:** deterministic per-stage `SpawnSchedule` (exact count, groups spread over the window, last spawn at the window end), `maxAlive` defers instead of dropping. Spawn depth is camera-derived (`computeSpawnGeometry`: enemies at `farVisibleDepth − 1.4` ≈ 21.6, boss at −1.2), collision grid/haze/road fade follow it. Boss enters from the far line with a 10 s approach (`bossTiming` recorded).
- **Squad Power:** canonical `squadPower` 0..500, visible roster derived 10:1 (`game/squad-power.ts`, `docs/SQUAD_STACKING.md`), single reconciler (`syncRosterToPower`) that also reassigns slots and clamps the anchor in the same frame; damage × `representedPower`; gates clamp/swap at caps; overkill/damageDealt/peak stats.
- **Campaign:** schema v3 planet-keyed progress with migration from wave-era and v2 saves; `CampaignScreen` (planet card → run → summary) owns persistence; `GameScreen` only reports; `progressEligible` latches false on any dev/test hook (`DEV RUN — PROGRESS NOT SAVED`). Every run/RETRY starts at Stage 1 / power 5.
- **HUD/renderer:** `EARTH • STAGE 03/10`, `SQUAD n / 500`, boss display names, buffed P10 look (scale, glows, transform pulse), `squad-consolidate` VFX, richer debug overlay.
- **Tooling:** `pnpm run measure:earth` (Profiles A/B/C, seeds 1337 + 5, per-stage/boss records, report + JSON), stage tests rewritten (19 checks), render harness v0.4.0 scenes (20–26).
- **Balance result (unchanged numbers, measured):** run 13.9 min, deferred 0, peak visible ≤ 50, pool never exhausted — but both bosses die during the approach under Profile B (sub 2.1 s, final 7.8 s after spawn; supplemental seeds agree). Root cause: modifier caps ×3 × ×2.5 reached by Stage 4 and bullets that reach the spawn line. Review options in the report; no tuning done without sign-off.

## v0.3.6 — what changed
- **Projectile range:** bullets fly to `camera.farVisibleDepth` (camera-derived, ≈ 23.1 world units = where the road projects narrower than 10 % of the screen width; ~4.8 % of the screen height below the horizon) with a per-shot travel budget so every row terminates at the same boundary; `PROJECTILES.lifetime` / `farExit` removed (lifetime is a 1.15× backstop). Collision lookups stop at `COMBAT_DEPTH` ≈ 8.9 (deepest possible spawn; `spawnEnemy` now clamps to `ENEMIES.maxSpawnDepth`).
- **Pool:** sized from the camera (`projectilePoolRequirement`: 12 per soldier × 50 × 1.3 = 780), grown in place; exhaustion drops the shot and counts it (`stats.projectilePoolExhausted`, shown in the debug overlay) instead of recycling a live bullet. Measured peak 531.
- **Collision:** relative swept segment test (`sweptHit`) against unchanged hitboxes; `prevX/prevY` on projectiles, enemies and the boss. Fast crossers hit identically at 30/60/120 Hz.
- **Formation:** 5 columns × 0.15, rows 0.12, column thresholds 2/5/12/24, 50 = 5 × 10 (0.60 wide, rear −0.60), road margin 0.06 beyond the sprite footprint, clamp evaluated per row. Anchor limits ±0.70 (≤ 10) / ±0.62 (20) / ±0.55 (≥ 25). Autopilot clear times unchanged within 0.3 s.
- **Tracers:** short amber-white dashes with a faint glow (cores drawn above the haze, glow below), width and tail scale with distance, 12 % end fade; compact metallic impact sparks (0.14 s). Muzzle flash unchanged.
- **Metro fix (pre-existing since v0.2.0):** iOS/Android bundles failed with "Unable to resolve module fs from canvaskit-wasm" because Expo Router's native route context also bundles `app/index.web.tsx`; `metro.config.js` now resolves Skia's web loader and `canvaskit-wasm` to an empty module on native. All three platform bundles build.
- Tests: 59 fire checks + 10 stage checks; render harness gained `12-compact-*`, `13-full-range-miss-50`, `14-impact-sparks`.
- Known: at the clamp extreme the rear outer column of a 50-soldier block can extend ~87 pt past the *screen* edge (the road is 0.56 × screen width per side near the camera; v0.3.5 overflowed ~89 pt). It never leaves the road. A screen-aware clamp would cut 50-soldier drag to ≈ ±0.26, so it was not applied.

## v0.3.5 — what changed (visual only, no gameplay rules touched)
- Camera reframed for depth: horizon 17.5 %, squad line 71.5 %, `ROAD_LENGTH` 6 → 8 (enemies/gates/boss spawn at the new far end and walk in; focal follows `ROAD_LENGTH` so near-field sizes, hitboxes and muzzles are unchanged). Not a rules change, but it is a pacing change: enemies walk 33 % farther at unchanged speed (grunt contact ≈ 19 s vs 14 s), gates and the boss arrive ~3.6 s later — see `BALANCE.md` for the retune knob if early stages feel too easy.
- Bridge drawn to `ROAD_FAR` = 90 with LOD: detailed barrier modules to y = 16, merged strips beyond, light masts every 4 units, cyan edge guide strips, seams to the horizon, aerial fade on the slab. Haze reshaped to end at the spawn line.
- Long-range readability: enemies materialise over 0.5 s (`Enemy.age`) and carry a warm ground marker below 45 % scale. No sprite size floor.
- New art (stylized realism): soldier 123×320 rear view (muzzle 0.857/0.005), grunt 154×320 charging pose, 1024² skyline (horizon 63.5 %). Boss art unchanged.
- Environment: sky gradient, skyline reflection, sun glitter, perspective swell lines. Render harness gained `11-long-range`. CPU harness cost ~+15 % (noise shaders; GPU on device).

## v0.3.4 — what changed
- Player-facing progression is now the **Stage** (`docs/STAGE_SYSTEM.md`): data-driven `StageConfig` (1–5 authored, 6+ generated, 100+ supported), state machine INTRO → ACTIVE → (BOSS_WARNING → BOSS_ACTIVE) → CLEARING → COMPLETE, stage completes only when all scheduled spawns are dead. Boss every 5 stages (major every 10) with a `BOSS INCOMING` warning. Squad/upgrades persist; runs are continuous (no victory screen; defeat card shows the stage reached).
- New `runner` enemy kind. Kill counter is no longer the progression driver. Rewards tracked in `Game.run` with boss multipliers.
- Campaign save (`CampaignProgress`, AsyncStorage) with legacy wave-field migration; runs still start at Stage 1 (no menu yet).
- Debug overlay prints the stage cursor; dev panel gained Clear enemies / Next stage / Stage 5 / Stage 10 / Reset save. 10 new stage checks; render harness has stage 3 and stage 5 boss scenes.

## v0.3.2 — what changed
- Audited the projectile coordinate system: projectiles are world-space (constant `ROAD_FORWARD` velocity), convergence on screen comes from the pinhole projection only. Tracer tail lengthened (0.05 → 0.09) so the slant is legible. No steering added.
- Compact formation: spacing 0.25 → 0.21, columns unlock at 2/5/10/20 (`formationColumnThresholds`), max width 0.84; point-man wedge for a lone remainder. 5 soldiers now span 0.42 instead of 1.0.
- Clamp uses the whole formation: `roadHalfWidth (1.0) − halfWidth − formationRoadMargin (0.14)`; `roadHalfWidthAt(y)` documents that world x is depth-independent.
- Debug overlay: road edge ticks, margin ticks, formation footprint quad, safe range label. Dev panel: 20-soldier button. 47 sim checks; render harness has edge-drag scenes.

## v0.3.0 — what changed
- All auto-targeting removed (`targeting.ts`, reservations, boss aim offsets, planned-distance despawn, enemy drift toward the squad, boss tracking). Soldiers fire continuously along `ROAD_FORWARD`; damage is collision-only; the drag is the aim.
- Forward alignment: new rear-view soldier asset with a vertical rifle, `baseVisualRotationOffset` hook on visuals, sprite never rotated by gameplay state.
- Formation rebuilt as a straight symmetric block with a width cap (5 columns) and rows behind; anchor clamp derived from the block width.
- Boss: slow bounded patrol with dwell. Debug overlay: road basis, forward vectors, lanes, projectile vectors/paths, hitboxes.
- Tests rewritten for straight fire (37 checks); render harness gained alignment 1/5/10/25/50 and off-axis scenes; dev panel gained 50 / Off-axis wall / Lane crosser.

## Done
- Skia-rendered 2.5D causeway: perspective road to the horizon, animated water, volumetric barrier modules, painted coastal horizon, haze, contact shadows.
- Generated character art (blue trooper, red grunt / tinted elite, crimson Warden) with per-sprite anchor + muzzle metadata.
- Per-soldier straight firing: independent timers with golden-ratio phase offsets, one ShotEvent → one projectile from the drawn muzzle along the road, pooled projectiles/VFX.
- Gates as world objects (huge numbers, side selection by anchor position), stage director, boss with telegraphed slams and two phases, defeat card.
- Minimal HUD, pause card with reduced-shake toggle, transient event banners, haptics.
- Dev-only panel (long-press STAGE pill): scenarios 1/3/10/+5/25/50 soldiers, +25 % FR, ×1.5 DMG, Boss ×20, Stress 50/300, Off-axis wall, Lane crosser, scripted toggle, on-canvas debug overlay.
- Headless sim test suite (59 fire checks + 19 stage checks), Earth balance harness, headless CanvasKit render harness.
- Docs set in `docs/`.

## Not done / known gaps
- Coins/score are tracked per run but nothing spends them (shop out of scope). No planet select / continue: every run starts at Stage 1 by design; only Earth exists (next planet LOCKED).
- **v0.4.0 balance not signed off**: bosses die in the approach (see report options A–E). Tag `v0.4.0` waits for the balance decision.
- v0.4.0 needs an Expo Go pass (TEST_PLAN manual planet/stages list): far spawn readability, P10 look, consolidation pulse, boss far entry, save migration on a real device.
- No device FPS measurement yet (only headless sim cost and CPU raster timings). v0.3.6 needs an Expo Go pass: FPS overlay at 5 and 50 soldiers (all-miss), tracer look, formation on the road at both edges. See `TEST_PLAN.md` manual items 7, 9, 10.
- No audio playback; `ShotAudioAggregator` only batches shot events per frame.
- Enemies do not shoot; pressure is contact + boss slams only.
- Lint not configured in this artifact.
- Web preview needs WebGL (real browsers fine, headless screenshot tools may not be).
- The visual reference image mentioned in the brief was never attached; the direction was built from the written description.

## Next phase (not started — waits for explicit go)
Balance decision for Earth bosses, then "Intro Cinematic + Main Menu": BOOT → INTRO → MAIN_MENU → GAME_LOADING → PLAYING state machine, Skia war cinematic with skip, menu/settings/help, pause overlay with main-menu confirm, localization keys.

## Later candidates
Shop/economy, campaign, more weapons/skins, enemy ranged fire, audio, on-device profiling pass.
