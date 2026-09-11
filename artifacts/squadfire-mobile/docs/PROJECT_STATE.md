# SquadFire — Project State

Updated: 2026-09-11

## Version
`v0.3.5` — Long-range visual upgrade. History: `v0.3.4` stage-based progression, `pre-visual-upgrade` checkpoint, `v0.3.3` review fix (ranks close the frame a soldier is lost), `pre-stage-system` checkpoint, `v0.3.0` straight-fire rework, `v0.3.1` review fixes, `v0.3.2` projectile-perspective audit + compact formation + whole-formation road clamp. Previous states tagged `pre-straight-fire` (= `v0.2.0`) and `pre-high-fidelity-visual-rework`.

## v0.3.5 — what changed (visual only, no gameplay rules touched)
- Camera reframed for depth: horizon 17.5 %, squad line 71.5 %, `ROAD_LENGTH` 6 → 8 (enemies/gates/boss spawn at the new far end and walk in; focal follows `ROAD_LENGTH` so near-field sizes, hitboxes and muzzles are unchanged). Gates now arrive ~3.5 s later, boss entrance ~3.5 s longer.
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
- Headless sim test suite (47 fire checks + 10 stage checks) and headless CanvasKit render harness.
- Docs set in `docs/`.

## Not done / known gaps
- Coins/score are tracked per run but nothing spends them (shop out of scope). No stage select / continue: every run starts at Stage 1 by design until the menu phase.
- No device FPS measurement yet (only headless sim cost and CPU raster timings). See `TEST_PLAN.md`.
- No audio playback; `ShotAudioAggregator` only batches shot events per frame.
- Enemies do not shoot; pressure is contact + boss slams only.
- Lint not configured in this artifact.
- Web preview needs WebGL (real browsers fine, headless screenshot tools may not be).
- The visual reference image mentioned in the brief was never attached; the direction was built from the written description.

## Next phase (not started — waits for explicit go)
v0.4.0 "Intro Cinematic + Main Menu": BOOT → INTRO → MAIN_MENU → GAME_LOADING → PLAYING state machine, Skia war cinematic with skip, menu/settings/help, pause overlay with main-menu confirm, localization keys.

## Later candidates
Shop/economy, campaign, more weapons/skins, enemy ranged fire, audio, on-device profiling pass.
