# SquadFire — Firing System

## Invariant
**One soldier = one muzzle = one ShotEvent = one projectile.** There is no squad-level "fire volley"; the squad's output is the sum of its soldiers.

## Per-soldier state
`nextShotAt`, `firePhase`, `aimAngle`, `recoil`, `targetId`, `retargetAt`.

- New soldiers get `firePhase = (index × 0.618…) mod 1` and `nextShotAt = now + phase × period`. Existing soldiers are never touched when the squad grows, so a +5 gate raises output within one period and never produces a synchronized volley.
- After a shot: `nextShotAt = max(prev + period, now + period / 2)` — keeps the cadence stable while tolerating hitches.
- `period = 1 / (weapon.fireRate × mods.fireRate)`. Fire-rate gates therefore shorten every soldier's period from its *next* shot, with phases preserved.

## Shot pipeline
1. `resolveTarget` (`game/targeting.ts`): forward cone (`coneSlope`), lateral preference (`lateralWeight`), skip fully reserved targets, boss always eligible.
2. Muzzle world position from the shared sprite frame (`game/sprite-geometry.ts`) + the soldier's current sprite rotation.
3. `ShotEvent { soldierId, origin, direction, targetId, damage, time }`.
4. Consumers: projectile pool (spawn), VFX (muzzle flash keyed to the barrel angle), soldier recoil, `onShot` hook → `ShotAudioAggregator` (groups shots per frame into one "burst" descriptor for a future audio layer).
5. Projectile reserves its damage on the target; on hit it applies damage and releases the reservation; on miss/expiry it releases.

## Boss targeting
When the boss is active every soldier targets it, with a deterministic per-soldier aim offset (spread across the hit radius) so tracers fan across the body instead of converging on one pixel.

## Scaling
Cost per frame is O(soldiers + projectiles + enemies). Target resolution is O(soldiers × enemies) at most every 0.35 s per soldier (staggered), measured at 0.05 ms/frame for 50 soldiers vs 300 enemies.

## Debug
The dev overlay shows fps, frame ms, peak, sim ms, soldiers, enemies, projectiles, shots/s. The dev panel scenarios map 1:1 to the automated tests.
