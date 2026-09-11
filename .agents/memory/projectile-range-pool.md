---
name: Projectile range, pool sizing and swept collision
description: Lessons from making bullets fly past the road end with a camera-derived range, sizing the pool from it, and sweeping collisions
---
- Derive the far boundary from a *fraction of screen width* (road narrower than 10 % of width), not an absolute pixel threshold.
  **Why:** an absolute 40 pt threshold gave far ≈ 62 units and a ~1950-slot pool on a 1024-wide tablet; the width fraction is layout-invariant (≈ 23 units, pool 780 everywhere).
  **How to apply:** anything sized from camera depth (pools, LOD cutoffs) should be checked on a tablet layout as well as a phone.
- Targets must move *before* projectiles are swept, otherwise enemy prev→pos describes the previous substep and the "relative" sweep is phase-shifted. The engine step order is enemies → boss → buckets → soldiers → projectiles for this reason; a sim test asserts all three deltas span the same substep.
- The engine runs a fixed 1/120 s substep, so "30/60/120 Hz" host-rate tests do not change the collision interval; they only prove frame-rate independence of the accumulator.
- Pool exhaustion drops the new shot and counts it (visible in the debug overlay as `dropped`); never recycle a live bullet — it produced invisible mid-air disappearances.
- The road is 0.56 × screen width per side near the camera, i.e. wider than the screen. Screen-space "every sprite on screen" assertions cannot hold for a 50-soldier block at the clamp extreme; assert road-space containment per row and report screen overflow instead. A screen-aware clamp would cut 50-soldier drag to ≈ ±0.26.
- Expo Router's native route context also bundles `app/index.web.tsx`; a static import of Skia's web loader there pulls canvaskit-wasm (and Node `fs`) into iOS/Android bundles and Metro 500s. `metro.config.js` resolves those modules to `{ type: 'empty' }` for non-web platforms. Verify native bundles with the manifest's `launchAsset.url`, not just the web preview.
