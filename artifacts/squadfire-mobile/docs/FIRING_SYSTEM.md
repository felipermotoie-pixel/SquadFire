# SquadFire — Firing System (straight fire)

## Invariants
1. **One soldier = one muzzle = one ShotEvent = one projectile.** The squad's output is the sum of its soldiers; there is no squad-level volley.
2. **Straight fire.** Every projectile leaves its own muzzle along `ROAD_FORWARD` (`game/balance.ts`: `(0, 1)` in world space, i.e. toward the vanishing point). Nothing in the simulation looks up, tracks, leads, or steers toward a target. `WEAPONS.rifle.aimMode = 'STRAIGHT'` is the only aim mode; `spread` (0 for the rifle) is the only allowed deviation and it is random, never target-seeking.
3. **The player aims by moving the squad.** Dragging moves the anchor; the formation follows; the fire lanes move with it. There is no aim assist, no magnetism, no cone, no "closest enemy".
4. **Collision-only damage.** A projectile damages the first enemy (or the boss) whose hitbox it physically crosses. Missed bullets keep flying until `PROJECTILES.lifetime`, `ROAD_LENGTH + farExit`, or `±sideExit`.
5. **Projectiles are independent after spawn.** Velocity is fixed at spawn; dragging the squad afterwards does not touch bullets already in flight (Test E).

## Per-soldier state
`nextShotAt`, `firePhase`, `recoil`, `shotsFired`. There is no aim angle, target id, or reservation on soldiers, enemies, or the boss.

- New soldiers get `firePhase = (index × 0.618…) mod 1` and `nextShotAt = now + phase × period`. Existing soldiers are never touched when the squad grows, so a +3 gate doubles the streams within one period and never produces a synchronized volley (Test D).
- Soldiers fire continuously — there is no idle state waiting for a target and no timer re-phasing.
- After a shot: `nextShotAt = max(prev + period, now + period / 2)`.
- `period = 1 / (weapon.fireRate × mods.fireRate)`. Fire-rate gates shorten every soldier's period from its *next* shot, phases preserved.

## Shot pipeline (`Game.fireShot`)
1. `muzzleOf(soldier)`: world muzzle from the shared sprite frame (`game/sprite-geometry.ts`) using the visual's `baseVisualRotationOffset` (0 for the current asset). Lateral position and height are read back from the drawn barrel tip, so tracers always leave the drawn rifle.
2. Direction = `ROAD_FORWARD` (+ optional random spread).
3. Projectile: `x/y = muzzle`, `vx/vy = dir × projectileSpeed`, constant flight height `h`, `originX/originY` kept for the debug path.
4. `ShotEvent { soldierId, weaponId, origin, originHeight, direction, timestamp }` → recoil, muzzle flash (oriented along the projected forward direction), stats, `onShot` listeners (audio aggregator, tests).

## Fire lanes and formation
Columns of the formation are parallel to the road, so a squad of N soldiers produces `min(N, formationMaxColumns)` lanes, `formationHorizontalSpacing` apart. Beyond the width cap extra soldiers add rows (more bullets per lane, same lane count), which keeps positioning meaningful at 50 soldiers. See `GAME_DESIGN.md → Squad`.

## Boss and enemies
- The boss is never aimed at. It is hit only when a lane crosses its hitbox. It performs a slow bounded patrol (`BOSS.patrolSpeed/patrolRange/patrolDwell*`) that ignores the squad position, and still telegraphs slams.
- Enemies wander slightly but never drift toward the squad; if the lanes are parked off-axis they walk past.

## Scaling
Cost per frame is O(soldiers + projectiles + enemies) with the 2D collision grid; there is no target search at all. Measured 0.04 ms/frame at 50 soldiers vs 300 enemies, 0.18 ms/frame with 538 projectiles in flight.

## Debug overlay (dev builds)
`roadForward` / `roadRight` axes at the anchor with the current anchor clamp, per-soldier body-forward vector, muzzle point, projected fire lane, sprite bounds and timer labels; projectile velocity vectors and travelled paths; enemy and boss hitboxes as the collision test sees them; boss patrol waypoint; counters.
