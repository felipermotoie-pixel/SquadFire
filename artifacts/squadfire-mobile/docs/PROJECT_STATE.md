# SquadFire — Project State

Updated: 2026-09-10

## Version
`v0.2.0` — High-fidelity visual and per-soldier firing rework. Previous state tagged `pre-high-fidelity-visual-rework`.

## Done
- Skia-rendered 2.5D causeway: perspective road to the horizon, animated water, volumetric barrier modules, painted coastal horizon, haze, contact shadows.
- Generated character art (blue trooper, red grunt / tinted elite, crimson Warden) with per-sprite anchor + muzzle metadata.
- Per-soldier firing: independent timers with golden-ratio phase offsets, one ShotEvent → one projectile from the drawn muzzle, target allocation with reserved damage, boss aim offsets, pooled projectiles/VFX.
- Gates as world objects (huge numbers, side selection by anchor position), wave director, boss with telegraphed slams and two phases, victory/defeat.
- Minimal HUD, pause card with reduced-shake toggle, transient event banners, haptics.
- Dev-only panel (long-press WAVE pill): scenarios 1/3/10/+5/25 soldiers, +25 % FR, ×1.5 DMG, Boss ×20, Stress 50/300, scripted toggle, on-canvas debug overlay.
- Headless sim test suite (27 checks incl. §44 acceptance and perf sweeps) and headless CanvasKit render harness.
- Docs set in `docs/`.

## Not done / known gaps
- No device FPS measurement yet (only headless sim cost and CPU raster timings). See `TEST_PLAN.md`.
- No audio playback; `ShotAudioAggregator` only batches shot events per frame.
- Enemies do not shoot; pressure is contact + boss slams only.
- Lint not configured in this artifact.
- Web preview needs WebGL (real browsers fine, headless screenshot tools may not be).
- The visual reference image mentioned in the brief was never attached; the direction was built from the written description.

## Next candidates (not started, out of scope for this slice)
Shop/economy, campaign, more weapons/skins, enemy ranged fire, audio, on-device profiling pass.
