# SquadFire — Firing System (straight fire)

## Invariants
1. **One soldier = one muzzle = one ShotEvent = one projectile.** The squad's output is the sum of its *visible* soldiers; there is no squad-level volley. Since v0.4.0 a soldier carries `representedPower` (1..10) and its bullet deals `damage × mods.damage × representedPower` — cadence is never scaled (`SQUAD_STACKING.md`).
2. **Straight fire.** Every projectile leaves its own muzzle along `ROAD_FORWARD` (`game/balance.ts`: `(0, 1)` in world space, i.e. toward the vanishing point). Nothing in the simulation looks up, tracks, leads, or steers toward a target. `WEAPONS.rifle.aimMode = 'STRAIGHT'` is the only aim mode; `spread` (0 for the rifle) is the only allowed deviation and it is random, never target-seeking.
3. **The player aims by moving the squad.** Dragging moves the anchor; the formation follows; the fire lanes move with it. There is no aim assist, no magnetism, no cone, no "closest enemy".
4. **Collision-only damage.** A projectile damages the first enemy (or the boss) whose hitbox it physically crosses. Missed bullets keep flying until they reach `camera.farVisibleDepth` (their travel budget, see below) or exit the road sideways (`±PROJECTILES.sideExit`); lifetime is only a backstop (flight time × 1.15).
5. **Projectiles are independent after spawn.** Velocity is fixed at spawn; dragging the squad afterwards does not touch bullets already in flight (Test E).

## Per-soldier state
`nextShotAt`, `firePhase`, `recoil`, `shotsFired`. There is no aim angle, target id, or reservation on soldiers, enemies, or the boss.

- New soldiers get `firePhase = (index × 0.618…) mod 1` and `nextShotAt = now + phase × period`. Existing soldiers keep their timers when power changes (a consolidation 9 → 10 keeps the front soldier and its phase), so a +3 gate adds streams within one period and never produces a synchronized volley (Test D).
- Soldiers fire continuously — there is no idle state waiting for a target and no timer re-phasing.
- After a shot: `nextShotAt = max(prev + period, now + period / 2)`.
- `period = 1 / (weapon.fireRate × mods.fireRate)`. Fire-rate gates shorten every soldier's period from its *next* shot, phases preserved.

## Shot pipeline (`Game.fireShot`)
1. `muzzleOf(soldier)`: world muzzle from the shared sprite frame (`game/sprite-geometry.ts`) using the visual's `baseVisualRotationOffset` (0 for the current asset). Lateral position and height are read back from the drawn barrel tip, so tracers always leave the drawn rifle.
2. Direction = `ROAD_FORWARD` (+ optional random spread).
3. Projectile: `x/y = muzzle`, `vx/vy = dir × projectileSpeed`, constant flight height `h`, `originX/originY` kept for the debug path, `maxTravel = farVisibleDepth − forwardDepth(muzzle)` and `prevX/prevY` for the swept collision test. If the pool is full the shot is **dropped** (`stats.projectilePoolExhausted++`, one dev warning) — bullets in flight are never recycled.
4. `ShotEvent { soldierId, weaponId, origin, originHeight, direction, timestamp }` → recoil, muzzle flash (oriented along the projected forward direction), stats, `onShot` listeners (audio aggregator, tests).

## Range, travel budget and the combat band (v0.3.6)
- `camera.farVisibleDepth` (`game/camera.ts`) is the depth where the projected road is narrower than `PROJECTILES.minReadableRoadWidthFraction` (10 % of the screen width). It is camera-derived, ≈ 23.1 world units on every layout (the road is 8 long, so bullets fly ~3× past the spawn line and fade about 5 % of the screen height below the horizon). Floor: `ROAD_LENGTH + 1`.
- Every projectile gets `maxTravel = farVisibleDepth − forwardDepth(spawn)`, so rear-row and front-row bullets terminate at the same on-screen boundary. It expires when `traveled > maxTravel`; `lifetime = maxTravel / speed × 1.15` exists only as a backstop.
- `COMBAT_DEPTH` (`game/balance.ts`, = deepest enemy/boss/gate spawn + depth tolerance ≈ 8.9) bounds the collision lookups: a projectile with `prevY > COMBAT_DEPTH` skips the grid entirely (nothing can be there — `spawnEnemy` clamps to `ENEMIES.maxSpawnDepth`). Cost past the combat band is integration only.
- Pool: `projectilePoolRequirement(camera)` = ceil(rear-muzzle flight time × capped rate (2 × 2.5 /s)) + 1 per soldier (12) × 50 soldiers = 600 theoretical, × 1.3 safety = **780**. `ensureProjectilePool` grows in place at construction and on `setCamera`; measured peak with 50 soldiers all missing at the capped cadence is 531.
- Collision is a **relative swept test** (`sweptHit`): the projectile's prev→current segment against the target's prev→current motion, in the target's frame, against the hitbox half-extents. Hitboxes and speeds are unchanged; the test exists so fast bullets (16 u/s) and fast crossers cannot tunnel at 30 Hz. Enemies and the boss keep `prevX/prevY` from the start of their movement step.

## Coordinate system and perspective
Projectiles live in **world space** (`x` in road half-widths, `y` forward along the road, `h` height) and are integrated with a constant world velocity `ROAD_FORWARD × projectileSpeed`. They are never moved in screen space. The renderer projects head and tail through `game/camera.ts` (`project()`: a pinhole model, `scale = focal / (y + focal)`), which is why lanes that are parallel in the world converge toward the vanishing point on screen — left-hand soldiers appear to fire slightly right, right-hand soldiers slightly left, centre soldiers straight up. This convergence is geometry only; a projectile's world `x` never changes (asserted by the "Perspective" sim check).

## Fire lanes and formation
Columns of the formation are parallel to the road, so a squad produces `formationColumns(N)` lanes (1 → 2 → 3 → 4 → 5 as the squad passes 2/5/10/20 soldiers), `formationHorizontalSpacing` (0.15) apart. The block is deliberately compact (v0.3.6 ultra-compact): a 5-soldier squad covers 0.30 of the road, a 50-soldier block 0.60 (5 × 10 rows, 0.12 apart, rear row at −0.60), so the player must position the fire area instead of getting free road coverage. Columns unlock at 2/5/12/24 so rows fill before width. Projectile hitboxes were **not** widened to compensate. See `GAME_DESIGN.md → Squad`.

## Boss and enemies
- The boss is never aimed at. It is hit only when a lane crosses its hitbox. It performs a slow bounded patrol (`BOSS.patrolSpeed/patrolRange/patrolDwell*`) that ignores the squad position, and still telegraphs slams.
- Enemies wander slightly but never drift toward the squad; if the lanes are parked off-axis they walk past.

## Scaling
Cost per frame is O(soldiers + projectiles + enemies) with the 2D collision grid; there is no target search at all. Measured 0.09 ms/frame at 50 soldiers × 2.5 rate vs 300 enemies, 0.05 ms/frame with 531 projectiles in flight to the far boundary (v0.3.6 headless numbers, Node).

## Debug overlay (dev builds)
`roadForward` / `roadRight` axes at the anchor with the current anchor clamp, per-soldier body-forward vector, muzzle point, projected fire lane, sprite bounds and timer labels; projectile velocity vectors and travelled paths; enemy and boss hitboxes as the collision test sees them; boss patrol waypoint; counters.
