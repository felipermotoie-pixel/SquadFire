# SquadFire — Project State

Updated: 2026-09-10

## Version
`v0.3.1` — Straight Fire + Forward Alignment (`v0.3.0` + review fixes: width-first formation growth, immediate anchor clamp on growth, incremental drag, no sprite sway). Previous states tagged `pre-straight-fire` (= `v0.2.0`) and `pre-high-fidelity-visual-rework`.

## v0.3.0 — what changed
- All auto-targeting removed (`targeting.ts`, reservations, boss aim offsets, planned-distance despawn, enemy drift toward the squad, boss tracking). Soldiers fire continuously along `ROAD_FORWARD`; damage is collision-only; the drag is the aim.
- Forward alignment: new rear-view soldier asset with a vertical rifle, `baseVisualRotationOffset` hook on visuals, sprite never rotated by gameplay state.
- Formation rebuilt as a straight symmetric block with a width cap (5 columns) and rows behind; anchor clamp derived from the block width.
- Boss: slow bounded patrol with dwell. Debug overlay: road basis, forward vectors, lanes, projectile vectors/paths, hitboxes.
- Tests rewritten for straight fire (39 checks); render harness gained alignment 1/5/10/25/50 and off-axis scenes; dev panel gained 50 / Off-axis wall / Lane crosser.

## Done
- Skia-rendered 2.5D causeway: perspective road to the horizon, animated water, volumetric barrier modules, painted coastal horizon, haze, contact shadows.
- Generated character art (blue trooper, red grunt / tinted elite, crimson Warden) with per-sprite anchor + muzzle metadata.
- Per-soldier straight firing: independent timers with golden-ratio phase offsets, one ShotEvent → one projectile from the drawn muzzle along the road, pooled projectiles/VFX.
- Gates as world objects (huge numbers, side selection by anchor position), wave director, boss with telegraphed slams and two phases, victory/defeat.
- Minimal HUD, pause card with reduced-shake toggle, transient event banners, haptics.
- Dev-only panel (long-press WAVE pill): scenarios 1/3/10/+5/25/50 soldiers, +25 % FR, ×1.5 DMG, Boss ×20, Stress 50/300, Off-axis wall, Lane crosser, scripted toggle, on-canvas debug overlay.
- Headless sim test suite (37 checks incl. straight-fire Tests A–E, §44 acceptance and perf sweeps) and headless CanvasKit render harness.
- Docs set in `docs/`.

## Not done / known gaps
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
