# SQUADFIRE — STRAIGHT-FIRE MANUAL AIMING SYSTEM

> **Purpose:** replace the current enemy auto-targeting behavior with a manual horizontal aiming model where the player uses drag to position the squad while all standard projectiles travel straight forward.
>
> This change is fundamental to the intended gameplay of SquadFire.

---

# 1. FUNDAMENTAL GAMEPLAY RULE

The current automatic targeting behavior is incorrect.

REMOVE automatic aiming at enemies.

REMOVE enemy-targeted projectile trajectories.

REMOVE homing behavior.

REMOVE any logic that rotates normal shots toward a nearby enemy.

The correct gameplay philosophy is:

# PLAYER POSITION DETERMINES WHERE THE SQUAD SHOOTS

The player uses horizontal drag to move the squad left and right.

The soldiers continuously fire STRAIGHT FORWARD.

Therefore:

```text
DRAG LEFT
=
MOVE FIRING LINES LEFT

DRAG RIGHT
=
MOVE FIRING LINES RIGHT
```

The player must manually align the squad with enemies.

This positioning mechanic is one of the primary skill components of the game.

---

# 2. NO AUTO-AIM

For standard weapons, soldiers must NOT automatically calculate a direction toward an enemy.

Do not use logic such as:

```ts
directionToTarget(soldier, enemy)
```

for normal rifle fire.

Do not use:

```text
nearest enemy targeting
closest enemy targeting
smart target allocation
enemy tracking
homing bullets
automatic aim correction
magnetic aim
```

unless a future upgrade explicitly introduces one of those mechanics.

Normal gameplay has:

```text
NO AUTO AIM
```

---

# 3. GLOBAL FIRING DIRECTION

Define a single battlefield forward vector.

Conceptually:

```ts
const FIRE_FORWARD = roadForwardVector;
```

For every standard soldier:

```ts
projectile.direction = FIRE_FORWARD;
```

All standard bullets travel parallel to the road.

Conceptually:

```text
          ↑     ↑     ↑
          ↑     ↑     ↑
          ↑     ↑     ↑

         ENEMIES


          ↑     ↑     ↑
          ↑     ↑     ↑
          ↑     ↑     ↑

        ●   ●   ●
          ●   ●
        PLAYER SQUAD
```

NOT:

```text
       enemy    enemy
          ↖    ↗
           ↖  ↗
            ●●
```

---

# 4. PLAYER DRAG IS THE AIMING MECHANIC

The player's drag gesture is effectively the game's aiming system.

The player does NOT rotate weapons manually.

Instead:

```text
finger moves left
↓
SquadAnchor moves left
↓
all soldier muzzle positions move left
↓
all projectile streams move left
```

And:

```text
finger moves right
↓
SquadAnchor moves right
↓
all soldier muzzle positions move right
↓
all projectile streams move right
```

The firing direction itself remains forward.

This means the player must predict:

- enemy positions;
- enemy movement;
- enemy density;
- boss position;
- upgrade gate position;
- dangerous lanes.

This is intentional gameplay.

---

# 5. SOLDIER FIRING DIRECTION

Each soldier maintains its own projectile source but shares the squad's forward firing direction.

Every soldier still owns:

```text
individual position
individual weapon
individual muzzle anchor
individual fire timer
individual fire phase
individual projectile creation
```

But:

```text
aimDirection = globalForwardDirection
```

for standard fire.

Example:

```text
5 soldiers
=
5 different muzzle positions
=
5 parallel projectile streams
```

---

# 6. PROJECTILE ORIGIN

Every bullet must still originate from the corresponding soldier's weapon muzzle.

Correct:

```text
Soldier A muzzle → straight-forward projectile A
Soldier B muzzle → straight-forward projectile B
Soldier C muzzle → straight-forward projectile C
```

Incorrect:

```text
Squad center → multiple projectiles
```

Incorrect:

```text
Soldier → projectile automatically bends toward enemy
```

Incorrect:

```text
Soldier → projectile spawns already angled toward target
```

---

# 7. PARALLEL FIRE LANES

Standard rifle bullets should form parallel firing lanes.

Example:

```text
             ENEMY WAVE

      X       X       X

      ↑       ↑       ↑
      ↑       ↑       ↑
      ↑       ↑       ↑

     ●       ●       ●
```

If an enemy is outside those trajectories:

```text
DO NOT HIT IT
```

The player must move the squad horizontally to intercept it.

---

# 8. COLLISION-BASED DAMAGE

Enemies are NOT selected as projectile targets.

Instead:

```text
projectile moves forward
↓
collision system checks projectile path
↓
if projectile intersects enemy hitbox
↓
apply damage
```

The projectile should not know which enemy it intends to hit.

Conceptually:

```ts
interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  ownerSoldierId: number;
  penetrationRemaining: number;
}
```

There should normally be NO required:

```ts
targetEnemyId
```

for standard non-homing projectiles.

---

# 9. FIRING VECTOR

Normal bullet velocity should derive only from:

```text
battlefield forward vector
×
projectile speed
```

Conceptually:

```ts
projectile.vx = forward.x * projectileSpeed;
projectile.vy = forward.y * projectileSpeed;
```

In screen-space implementations where upward movement is negative Y:

```ts
projectile.vx = 0;
projectile.vy = -projectileSpeed;
```

after appropriate world/perspective transformation.

Use the actual battlefield coordinate system rather than blindly assuming screen axes.

---

# 10. SOLDIER BODY ORIENTATION

Soldiers should:

```text
FACE FORWARD
SHOOT FORWARD
RUN FORWARD
STRAFE LEFT/RIGHT
```

Horizontal drag should NOT cause:

```text
body rotation
weapon rotation
projectile rotation
```

The whole squad should visually behave like soldiers advancing forward while strafing across the road.

---

# 11. SHOOTING CADENCE

Preserve the previously defined per-soldier cadence.

Example:

```text
1 soldier
2 shots/sec
=
2 straight-forward projectiles/sec
```

```text
5 soldiers
2 shots/sec each
=
approximately 10 straight-forward projectiles/sec
```

```text
10 soldiers
2 shots/sec each
=
approximately 20 straight-forward projectiles/sec
```

Shots should remain temporally distributed between soldiers.

Do not fire the entire squad on exactly the same frame.

Example:

```text
S1 → fire
small delay
S2 → fire
small delay
S3 → fire
small delay
S4 → fire
...
```

while each soldier still respects its own configured fire rate.

---

# 12. NEW SOLDIER BEHAVIOR

When a new soldier joins:

```text
+1 SOLDIER
```

the game must add:

```text
+1 character
+1 weapon
+1 muzzle
+1 independent firing timer
+1 additional straight projectile stream
```

The additional soldiers directly increase the width/density of the squad's firing area.

---

# 13. WHY SQUAD FORMATION NOW MATTERS

Squad formation is part of combat effectiveness.

A wider squad:

```text
covers more horizontal firing area
```

A tighter squad:

```text
concentrates projectile density
```

Therefore formation spacing must be carefully balanced.

Do NOT allow squad growth to expand horizontally without limits.

Create configurable values such as:

```ts
formationHorizontalSpacing
formationMaxWidth
formationRowCapacity
```

When the squad reaches the desired maximum width, additional soldiers should create additional rows rather than endlessly increasing width.

This preserves the importance of player positioning.

---

# 14. BOSS GAMEPLAY

Bosses follow the same principle.

The squad does not automatically target the boss.

If the boss moves horizontally:

```text
boss moves left
↓
player must drag squad left
```

If the player is incorrectly positioned:

```text
bullets miss the boss
```

This creates actual interaction instead of passive automatic DPS.

Boss design should therefore include controlled horizontal movement patterns that encourage player repositioning.

Do not make boss movement so fast that continuous alignment becomes frustrating.

---

# 15. ENEMY MOVEMENT

This firing model makes enemy movement much more important.

Enemy archetypes may later use:

```text
straight advance
horizontal drift
zig-zag
lane switching
charge
formation spread
```

Because the player must physically align shots with enemies.

This creates skill-based difficulty without simply increasing enemy HP.

---

# 16. NO INVISIBLE AIM ASSIST

Do not secretly implement:

```text
5-degree auto correction
magnetic projectile behavior
nearest-target snapping
projectile steering after launch
enemy-biased collision extension
```

Standard bullets must behave honestly according to their visible trajectory.

If aim assistance is ever introduced later, it must be an explicit:

```text
weapon characteristic
upgrade
ability
```

and documented accordingly.

---

# 17. FUTURE SPECIAL WEAPONS

The standard rule is straight fire.

Future weapons may intentionally behave differently.

### Rifle

```text
straight
```

### SMG

```text
straight with small configurable spread
```

### Shotgun

```text
forward cone
```

### Minigun

```text
straight with slight spread
```

### Rocket Launcher

```text
straight projectile + area explosion
```

### Homing Missile

```text
may track enemy
```

BUT ONLY because `HOMING` is an explicit weapon property.

Never give regular bullets hidden homing behavior.

---

# 18. WEAPON SPREAD

If a weapon has spread, calculate spread relative to the global forward vector.

The center direction remains:

```text
FORWARD
```

Spread must be configured by weapon.

Base Rifle should initially have:

```text
very low or zero spread
```

so the player clearly understands the drag-to-aim mechanic.

---

# 19. VISUAL FEEDBACK FOR MISSES

Missed projectiles should continue forward until:

- lifetime expires;
- projectile exits battlefield;
- projectile hits environment;
- projectile hits an enemy.

Do not delete a bullet simply because there is no target.

This makes misses visually meaningful and reinforces manual positioning.

---

# 20. PLAYER SKILL LOOP

The intended gameplay skill loop is:

```text
observe incoming enemies
↓
identify highest-value concentration
↓
drag squad horizontally
↓
align projectile streams
↓
damage enemies
↓
reposition
↓
choose gate
↓
formation grows
↓
manage wider/more powerful firing pattern
```

This must remain central to gameplay.

The game should NOT play itself automatically.

---

# 21. REMOVE PREVIOUS TARGETING LOGIC

Search the current implementation for systems related to:

```text
resolveTarget
targetEnemy
nearestEnemy
assignTarget
aimAt
directionToTarget
homing
tracking
autoAim
targetId
```

Determine whether each is still required.

For normal player bullets:

remove or bypass automatic targeting behavior.

Do not leave old targeting logic active in parallel.

Enemy AI targeting the PLAYER is a separate system and may remain.

---

# 22. DEBUG VALIDATION

Create a developer-only mode showing:

```text
soldier muzzle point
global forward vector
actual projectile vector
projectile path
collision hitbox
```

For standard Rifle shots, all projectile direction vectors should be parallel within perspective/rendering transformations.

---

# 23. REQUIRED TEST A — STATIC SQUAD

Create:

```text
5 soldiers
```

Do not move player.

Expected:

```text
5 parallel projectile streams
```

No projectile should curve toward an enemy.

---

# 24. REQUIRED TEST B — ENEMY OFF AXIS

Place enemy on far right.

Place squad on far left.

Expected:

```text
shots miss
enemy takes zero damage
```

Move squad right using drag.

Once projectile path intersects enemy:

```text
enemy begins taking damage
```

This test is mandatory.

---

# 25. REQUIRED TEST C — MOVING ENEMY

Enemy moves left → right.

Squad remains still.

Expected:

enemy is only damaged while crossing the squad's projectile lanes.

Shots must NOT follow it.

---

# 26. REQUIRED TEST D — SQUAD GROWTH

Start:

```text
3 soldiers
```

Observe firing.

Apply:

```text
+3 SOLDIERS
```

Expected:

```text
6 soldiers
6 individual muzzle sources
approximately 2x projectile generation
wider/denser forward fire pattern
```

Every projectile still travels straight forward.

---

# 27. REQUIRED TEST E — PLAYER DRAG

Continuously fire while dragging:

```text
LEFT → CENTER → RIGHT
```

Expected:

The projectile origins move horizontally together with the squad.

Previously fired bullets continue on their original straight paths.

New bullets originate from the squad's new position.

The projectile itself must NOT move sideways after firing merely because the player continues dragging.

Once fired:

```text
projectile trajectory is independent from future player movement
```

---

# 28. ACCEPTANCE CRITERIA

This correction is complete only when:

- soldiers remain facing forward;
- weapons remain primarily forward;
- standard bullets have no target lock;
- standard bullets have no homing;
- standard bullets travel straight;
- all soldiers produce their own bullets;
- projectile origins match muzzle positions;
- player drag horizontally moves the firing area;
- enemies outside firing lanes can be missed;
- moving into alignment causes enemies to be hit;
- previously fired projectiles do not follow later squad movement;
- squad growth increases projectile count;
- squad growth does not eliminate the need for positioning;
- performance remains acceptable.

---

# 29. FINAL GAMEPLAY DIRECTIVE

The fundamental combat relationship is:

```text
PLAYER DRAG
=
AIM
```

not:

```text
ENEMY POSITION
=
AUTOMATIC AIM
```

And:

```text
SOLDIER POSITION
+
MUZZLE POSITION
+
GLOBAL FORWARD DIRECTION
=
PROJECTILE TRAJECTORY
```

The player's responsibility is to place the squad where its forward projectile streams will intersect enemies.

This manual horizontal alignment mechanic must remain one of the defining gameplay mechanics of SquadFire.

Implement this correction without degrading the current graphics, squad formation, cadence system, or performance.
