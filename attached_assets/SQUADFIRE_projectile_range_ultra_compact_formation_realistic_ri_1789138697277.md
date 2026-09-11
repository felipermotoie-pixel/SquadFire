# SQUADFIRE — PROJECTILE RANGE, ULTRA-COMPACT FORMATION & REALISTIC RIFLE SHOT

> **Objective:** apply a focused combat-visual refinement to SquadFire without changing the core gameplay model.
>
> This pass must fix three things:
>
> 1. Projectiles must travel all the way through the visible battlefield instead of disappearing too early.
> 2. The soldier formation must become much more compact so dozens of soldiers remain visually contained.
> 3. Standard rifle fire must look like believable rifle/tracer gunfire, not like laser beams.

---

# 1. CORE GAMEPLAY RULES THAT MUST NOT CHANGE

Preserve all of the following:

```text
PLAYER DRAG = AIM THROUGH POSITIONING
```

```text
NO STANDARD AUTO-AIM
NO HOMING
NO MAGNETIC TARGETING
NO TARGET-BASED CURVING
```

And preserve:

```text
1 living soldier
=
1 weapon
+
1 muzzle
+
1 firing timer
+
1 projectile source
```

Do not collapse the system into one shared squad emitter.

Do not change the current firing cadence.

---

# 2. CURRENT PROBLEM — PROJECTILES STOP TOO EARLY

The current bullets/tracers disappear too early, before visually reaching the far end of the visible road.

This is incorrect.

The player should feel that the squad is firing across the whole battlefield.

A standard projectile must continue until one of these conditions occurs:

1. enemy collision;
2. valid environment collision, if such collision exists;
3. projectile exits the valid forward battlefield boundary;
4. maximum lifetime expires, but only after allowing travel through the full visible road.

The projectile must NOT despawn near the middle or upper-middle of the road merely because it has no target.

---

# 3. PROJECTILE RANGE REQUIREMENT

The projectile travel budget must be based on the actual visible forward range of the camera.

Conceptually:

```ts
projectileMaxTravelDistance >= visibleRoadForwardDistance
```

or, if lifetime-based:

```ts
projectileLifetime =
  visibleRoadForwardDistance / projectileSpeed
```

plus a reasonable safety margin.

Do not use an arbitrary short lifetime.

Inspect and correct:
- projectile lifetime;
- planned-distance despawn;
- road-depth culling;
- screen clipping;
- tracer render length;
- any visual-only cutoff that makes the shot appear shorter than the actual projectile.

The logical projectile and the rendered tracer must agree.

---

# 4. STRAIGHT-FIRE BEHAVIOR MUST REMAIN

Even with increased range, standard shots still travel straight forward in world space.

Do NOT introduce:
- target selection;
- enemy steering;
- homing;
- aim assist;
- hidden hitbox magnetism.

If the player is misaligned with an enemy:

```text
THE SHOT MUST MISS
```

The player still aims by dragging the squad horizontally.

---

# 5. PERSPECTIVE MUST REMAIN CORRECT

Projectiles should continue to use the battlefield forward direction.

The visible convergence toward the road center / vanishing point must come from world projection, not from aiming toward enemies.

Conceptually:

```text
world-space straight shot
↓
camera projection
↓
visually converges toward vanishing point
```

Do not replace this with a fake screen-center targeting system.

---

# 6. CURRENT PROBLEM — FORMATION TOO LARGE

The soldier group is still too spread out.

At higher soldier counts, the squad becomes excessively wide and occupies too much of the screen.

This creates problems when:
- the player reaches 20+ soldiers;
- the player reaches 30+ soldiers;
- the player reaches 50+ soldiers;
- the squad is dragged toward the road edges.

The squad must become significantly more compact.

---

# 7. ULTRA-COMPACT FORMATION GOAL

The formation should favor:

```text
MAXIMUM PRACTICAL COMPACTION
+
READABILITY
+
ROAD SAFETY
```

Reduce:
- horizontal spacing significantly;
- row spacing moderately;
- maximum practical width.

Increase:
- row usage;
- density;
- visual cohesion.

The formation should grow backward in rows much sooner instead of expanding sideways.

---

# 8. FORMATION VISUAL TARGET

Avoid:

```text
●       ●       ●       ●       ●
```

Prefer compact structures such as:

```text
  ● ● ●
   ● ●
```

or:

```text
 ● ● ●
 ● ● ●
```

For larger groups, favor compact platoon-style blocks:

```text
● ● ● ●
● ● ● ●
● ● ● ●
● ● ● ●
```

rather than a very wide formation.

The exact number of columns should be tuned to character width and road width.

---

# 9. FORMATION PARAMETERS

Centralize and tune:

```ts
formationHorizontalSpacing
formationLongitudinalSpacing
formationMaxWidth
formationMaxColumns
formationRowCapacity
formationRoadMargin
```

Recommended direction:

```text
formationHorizontalSpacing:
reduce substantially

formationLongitudinalSpacing:
reduce moderately

formationMaxColumns:
keep relatively low

formation growth:
prefer rows over width
```

Do not scatter these values across rendering code.

---

# 10. LARGE-SQUAD SCALING

Test formation behavior at:

```text
5 soldiers
10 soldiers
20 soldiers
30 soldiers
50 soldiers
```

Expected:
- width remains controlled;
- squad becomes denser rather than wider;
- outer soldiers remain on the road;
- soldier count can grow without occupying almost the entire screen width.

The player should be able to collect dozens of soldiers without the formation becoming visually broken.

---

# 11. ROAD-BOUND SAFETY

The horizontal movement clamp must consider the entire formation footprint.

Wrong:

```text
clamp only squad center
```

Correct:

```text
road left/right bounds
-
formation half-width
-
safe margin
```

Conceptually:

```ts
const safeMinX =
  roadLeft +
  formationHalfWidth +
  formationRoadMargin;

const safeMaxX =
  roadRight -
  formationHalfWidth -
  formationRoadMargin;

squadAnchorX = clamp(
  squadAnchorX,
  safeMinX,
  safeMaxX
);
```

If road width changes with depth/perspective, use the road width at the squad's current world depth.

---

# 12. COMPACT DOES NOT MEAN BROKEN

The formation may allow mild visual overlap, but must not become unreadable.

Acceptable:
- tightly packed soldiers;
- close shoulder spacing;
- mild silhouette overlap;
- dense tactical grouping.

Not acceptable:
- soldiers fully clipping through each other;
- weapons becoming visually detached;
- muzzles overlapping so badly that firing appears to come from one point;
- unreadable pile of characters.

The result should look intentionally dense.

---

# 13. CURRENT PROBLEM — SHOTS LOOK LIKE LASERS

The current projectile visual reads too much like:

```text
laser
beam
energy ray
long glowing line
```

This is wrong for the default rifle.

The standard weapon must feel like a firearm.

Target:

# STYLIZED-REALISTIC RIFLE / TRACER FIRE

---

# 14. RIFLE SHOT VISUAL MODEL

A standard shot should combine:

## Muzzle flash
- short duration;
- bright but compact;
- attached precisely to the weapon muzzle;
- visible only at shot time.

## Bullet / tracer body
- small;
- fast;
- directional;
- visually readable;
- not a long static beam.

## Tracer
- thin;
- short to medium length;
- appears to follow the projectile;
- communicates high velocity;
- disappears quickly.

## Impact
- compact spark;
- brief hit flash;
- optional tiny debris;
- visually appropriate for hitting robot/armored enemies.

---

# 15. REALISTIC RIFLE FEEL

The default rifle should visually communicate:

```text
gunpowder / firearm shot
```

not:

```text
continuous sci-fi energy beam
```

Desired characteristics:
- bright muzzle flash;
- fast tracer;
- short luminous streak;
- slight glow only around the tracer core;
- rapid disappearance;
- small metallic impact.

Avoid:
- thick white lines;
- huge glowing beams;
- long persistent trails;
- constant luminous rods;
- oversized bloom;
- projectiles that look connected to the gun for too long.

---

# 16. CADENCE MUST NOT CHANGE

The user explicitly wants projectile style changed, NOT firing cadence.

Therefore:

Do NOT change:
- shots per second;
- per-soldier timer logic;
- phase offsets;
- staggered timing;
- fire-rate upgrades.

Only change:
- projectile appearance;
- projectile travel range;
- tracer rendering;
- impact rendering.

---

# 17. PER-SOLDIER MUZZLE MUST REMAIN

Even after formation compaction:

Every soldier still owns:
- its own muzzle point;
- its own muzzle flash;
- its own projectile spawn;
- its own shot timing.

Do not create one visual flash at squad center.

Do not merge individual rifle fire into a single super-beam.

---

# 18. PROJECTILE ORIGIN ALIGNMENT

For every soldier verify:

```text
weapon barrel
↓
muzzle point
↓
muzzle flash
↓
projectile spawn
```

They must line up.

The compact formation may require recalibration of:
- muzzle offsets;
- depth ordering;
- sprite/model anchors.

Do not allow projectiles to spawn from:
- torso;
- head;
- ground;
- gaps between soldiers.

---

# 19. PROJECTILE TRAIL LENGTH

The projectile itself may travel across the entire road, but the **visible tracer behind it must remain short**.

Important distinction:

```text
projectile travel distance = long
tracer visual length = short
```

Do not render one giant line from the soldier all the way to the horizon.

That would still look like a laser.

Instead:

```text
fast bullet moves forward
+
small moving tracer segment follows it
```

The tracer moves through the battlefield with the bullet.

---

# 20. PROJECTILE SPEED

The rifle shot should feel fast.

Do not make the projectile so slow that the player watches a glowing object slowly crossing the road.

Use a speed that visually communicates a high-speed rifle shot while still allowing:
- collision detection;
- readable tracer;
- mobile rendering stability.

If needed, use swept collision / segment collision to avoid tunneling at high speed.

Do not reduce projectile speed simply to make collisions easier.

---

# 21. COLLISION ACCURACY

Because projectiles may now move faster and farther, verify collision reliability.

If current frame-based point collision can miss enemies at high projectile speed, use an appropriate method such as:

```text
previous projectile position
→
current projectile position
→
segment/swept collision test
```

Do not increase enemy hitboxes artificially just to compensate.

Visible collision and logical collision should remain honest.

---

# 22. VISUAL EFFECT HIERARCHY

Use different effect strengths:

## Rifle shot
small muzzle flash + short tracer.

## Critical hit
slightly stronger impact.

## Enemy death
controlled death effect.

## Boss hit
stronger impact effect, but still not a laser.

This keeps standard rifle fire believable and readable.

---

# 23. AUDIO PREPARATION

If rifle audio already exists:
- synchronize sound with the existing shot event.

If audio is not implemented yet:
- preserve an event hook for rifle-shot audio.

Do not play one loud full-volume gunshot per soldier when 50 soldiers fire.

Future audio layer may aggregate nearby shot events, but visual projectile ownership remains individual.

---

# 24. ACCEPTANCE CRITERIA — PROJECTILE RANGE

The implementation is incomplete unless:

1. shots visibly travel through nearly the full visible road;
2. shots do not disappear in the upper-middle section without reason;
3. a missed shot continues toward the far battlefield boundary;
4. logical projectile lifetime matches visual range;
5. the tracer remains visible at long distance enough to read the trajectory;
6. no auto-aim is introduced.

---

# 25. ACCEPTANCE CRITERIA — FORMATION

The implementation is incomplete unless:

1. 5 soldiers are visibly closer together than before;
2. 10 soldiers remain compact;
3. 20 soldiers use additional rows rather than excessive width;
4. 30 soldiers remain manageable;
5. 50 soldiers remain visually contained;
6. horizontal footprint is substantially reduced;
7. drag to the far left/right keeps the whole squad on the bridge;
8. soldier orientation remains forward.

---

# 26. ACCEPTANCE CRITERIA — RIFLE SHOT

The implementation is incomplete unless:

1. standard fire no longer reads as a laser beam;
2. muzzle flashes are short and believable;
3. tracer segments are thin and short;
4. the projectile itself travels far;
5. impacts look like bullet/metal impacts;
6. cadence remains unchanged;
7. each soldier still has its own projectile stream.

---

# 27. TEST A — FULL-RANGE MISS

Fire with no enemy in the current firing path.

Expected:
- bullet travels toward the far end of the visible road;
- it disappears only near valid world/boundary/lifetime limits;
- no premature mid-road deletion.

---

# 28. TEST B — PROJECTILE VISUAL STYLE

Observe one soldier firing.

Expected:
- short muzzle flash;
- fast moving tracer bullet;
- no long persistent beam.

Record or inspect multiple shots.

The projectile should visually read as rifle gunfire.

---

# 29. TEST C — 5 SOLDIERS

Use 5 soldiers.

Expected:
- substantially tighter formation;
- individual muzzle flashes remain readable;
- formation no longer looks like a wide line.

---

# 30. TEST D — 20 SOLDIERS

Expected:
- more rows;
- compact width;
- no screen-width explosion;
- all soldiers remain logically independent shooters.

---

# 31. TEST E — 50 SOLDIERS

Expected:
- dense compact block;
- manageable screen footprint;
- road-bound safety;
- performance remains acceptable.

---

# 32. TEST F — EDGE DRAG

Drag full formation to:
- far left;
- far right.

Expected:
- no outer soldier leaves the valid bridge;
- no clipping into water;
- no formation collapse;
- all new shots still originate correctly.

---

# 33. TEST G — CADENCE REGRESSION

Compare before and after.

Expected:
- same firing rate;
- same per-soldier timing;
- same phase behavior;
- only projectile rendering/travel changed.

---

# 34. PERFORMANCE REQUIREMENTS

Test at least:

```text
10 soldiers
20 soldiers
30 soldiers
50 soldiers
```

with active enemies and rifle projectiles.

Measure:
- FPS;
- projectile count;
- muzzle flash count;
- active VFX;
- frame time;
- memory behavior if available.

Do not solve performance problems by reverting to one shared projectile beam.

Use:
- projectile pooling;
- VFX pooling;
- efficient tracer rendering;
- batching where safe;
- compact simulation structures.

---

# 35. IMPLEMENTATION SEQUENCE

Perform the work in this order:

## Step 1
Inspect projectile despawn/lifetime/range logic.

## Step 2
Make projectile travel distance match the visible battlefield length.

## Step 3
Fix any render-only tracer cutoff.

## Step 4
Replace long laser-style visuals with:
- short muzzle flash;
- moving bullet/tracer;
- compact impact.

## Step 5
Verify high projectile speed collision.

## Step 6
Reduce formation horizontal spacing significantly.

## Step 7
Reduce longitudinal spacing where visually safe.

## Step 8
Reduce practical maximum column count / width.

## Step 9
Make squad growth create rows earlier.

## Step 10
Update road-bound clamp using full formation footprint.

## Step 11
Revalidate muzzle offsets after compaction.

## Step 12
Run Tests A–G.

## Step 13
Run stress/performance tests.

## Step 14
Update relevant documentation.

## Step 15
Commit and create the next valid semantic version tag.

Then STOP.

Do not implement unrelated:
- shop;
- economy;
- campaign redesign;
- new weapon types;
- new menu systems;
during this pass.

---

# 36. FINAL NON-NEGOTIABLES

1. Projectiles must travel to the far visible battlefield range.
2. Missed bullets must not disappear prematurely.
3. Standard rifle fire must not look like a laser.
4. Tracer visual length must remain short even though projectile travel is long.
5. Cadence must remain unchanged.
6. Every soldier remains an independent shooter.
7. Formation must become much more compact.
8. Large squads must grow mainly by rows, not width.
9. Full squad must stay inside road bounds.
10. No standard auto-aim.
11. No homing.
12. No hidden aim correction.
13. Collision-based damage remains.
14. Current visual quality must not regress.
15. Performance must remain acceptable.

---

# 37. FINAL TARGET EXPERIENCE

The final result should feel like:

```text
A DENSE, ORGANIZED RIFLE SQUAD
+
DOZENS OF INDIVIDUAL WEAPONS
+
SHORT, FAST, REALISTIC TRACER SHOTS
+
PROJECTILES TRAVELING THROUGH THE FULL BATTLEFIELD
+
COMPACT FORMATION THAT SCALES TO LARGE SOLDIER COUNTS
+
NO LASER-BEAM LOOK
```

The player should visually understand:

> These are many soldiers firing rifles across a long battlefield.

Not:

> These are characters emitting long energy beams.
