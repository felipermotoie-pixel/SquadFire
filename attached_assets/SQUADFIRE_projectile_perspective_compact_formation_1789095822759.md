# SQUADFIRE — PROJECTILE PERSPECTIVE + COMPACT FORMATION CORRECTION

> **Goal:** fix two specific issues without changing the core gameplay:
>
> 1. Projectiles must travel **straight forward in world space** while visually converging toward the **road/bridge vanishing point** because of perspective.
> 2. The squad formation must be **more compact**, especially with 5+ soldiers, so the group stays cohesive and does not visually overflow or bug near the road edges.

---

# 1. CURRENT PROBLEMS

## 1.1 Projectile perspective

The current shots appear as straight vertical lines in screen space.

This is visually incorrect for the current camera and bridge perspective.

The result currently looks like:

```text
|   |   |   |   |
|   |   |   |   |
|   |   |   |   |
```

But the desired visual result is:

```text
 \   \   |   /   /
  \   \  |  /   /
   \   \ | /   /
      VANISHING POINT
```

The bullets must still travel **straight**.

They must NOT:
- auto-aim;
- home toward enemies;
- bend toward enemies;
- snap toward enemies;
- receive hidden aim correction.

The apparent convergence happens only because the battlefield is rendered in perspective.

---

# 2. CORRECT PROJECTILE MODEL

The authoritative projectile direction is:

```text
STRAIGHT FORWARD IN BATTLEFIELD / WORLD SPACE
```

NOT:

```text
STRAIGHT UP IN SCREEN SPACE
```

Use the battlefield forward axis:

```ts
const roadForward = getRoadForwardVector();
```

Standard rifle projectiles should use:

```ts
projectile.velocity =
  normalize(roadForward) * projectileSpeed;
```

Then let the existing perspective/world-to-screen projection create the correct visual trajectory.

Do not fake perspective by simply steering bullets toward an arbitrary screen-center point.

The projectile should move correctly in world space first.

---

# 3. NO AUTO-AIM

This correction must preserve the manual aiming philosophy.

The rule remains:

```text
PLAYER DRAG = AIM THROUGH POSITIONING
```

The squad moves horizontally.

The soldiers fire forward.

The player must position the squad so the forward projectile paths intersect the enemies.

For standard fire, do not use:

```text
nearestEnemy
resolveTarget
targetEnemy
directionToTarget
aimAt
homing
magneticAim
targetSnapping
aimCorrection
```

If an enemy is outside the projectile lanes:

```text
THE SHOT MUST MISS
```

---

# 4. PER-SOLDIER FIRING MUST REMAIN

Every living soldier must still have:

```text
1 character
1 weapon
1 muzzle
1 firing timer
1 independent projectile source
```

Example:

```text
5 soldiers
=
5 firing sources
```

and:

```text
10 soldiers
=
10 firing sources
```

Do not replace this with a single squad-center emitter.

Every projectile must originate from the correct soldier's muzzle.

---

# 5. VISUAL TRAJECTORY

With 5 soldiers:

- left-side soldiers appear to fire slightly toward the center because of perspective;
- center soldiers appear to fire almost directly toward the top-center;
- right-side soldiers appear to fire slightly toward the center because of perspective.

This must come from world projection, not enemy targeting.

Expected visual concept:

```text
        TOP / ROAD DEPTH

            \ | /
          \   |   /
        \     |     /

      ●   ●   ●   ●   ●
```

The visible shot lines should naturally narrow as they move farther into the road.

---

# 6. PROJECTILE INDEPENDENCE AFTER FIRING

Once a projectile is spawned:

```text
its trajectory is fixed
```

Later player movement must NOT affect it.

Example:

```text
shot fired
↓
player drags squad to the right
↓
old projectile continues on original path
↓
new projectiles start from the new soldier positions
```

Do not attach in-flight projectile X coordinates to the moving squad.

---

# 7. COMPACT FORMATION — REQUIRED CHANGE

The current squad is too horizontally spread.

With 5 soldiers, the soldiers should be **noticeably closer together**.

The formation must feel:

- compact;
- cohesive;
- centered;
- military/tactical;
- visually organized;
- safe near road boundaries.

Avoid:

```text
●       ●       ●       ●       ●
```

Prefer something closer to:

```text
  ●   ●   ●
    ●   ●
```

or:

```text
   ●   ●
 ●   ●   ●
```

The exact formation may depend on the current character size and perspective, but lateral spacing must be reduced.

---

# 8. FORMATION PARAMETERS

Create or refine centralized configuration such as:

```ts
formationHorizontalSpacing
formationLongitudinalSpacing
formationMaxWidth
formationMaxColumns
formationRowCapacity
formationRoadMargin
```

Do not hardcode formation spacing throughout the renderer.

---

# 9. SMALL-SQUAD FORMATIONS

Recommended visual layouts:

## 1 soldier

```text
●
```

## 2 soldiers

```text
● ●
```

## 3 soldiers

```text
  ●
●   ●
```

## 4 soldiers

```text
● ●
● ●
```

## 5 soldiers

```text
● ● ●
 ● ●
```

## 6 soldiers

```text
● ● ●
● ● ●
```

## 7–9 soldiers

Use 3 compact columns with additional rows.

The squad should start adding rows earlier rather than expanding horizontally too aggressively.

---

# 10. LARGE SQUAD RULE

For larger squads:

```text
DO NOT CONTINUE EXPANDING WIDTH INDEFINITELY
```

After reaching the configured maximum column count or width:

```text
ADD MORE ROWS
```

Example philosophy:

```text
3–5 columns maximum
+
additional rows as squad grows
```

Tune this based on actual character size and road width.

The purpose is to keep a 20–50 soldier squad controllable and visually contained.

---

# 11. ROAD BOUNDARY SAFETY

The current horizontal drag clamp must consider the **entire formation**, not just the SquadAnchor.

Wrong:

```text
clamp squad center to road bounds
```

Correct:

```text
clamp squad center based on:

road bounds
-
formation half-width
-
safe road margin
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

The exact implementation must account for perspective and current road width at the squad's world depth.

---

# 12. PERSPECTIVE-AWARE ROAD WIDTH

Because the road narrows toward the vanishing point, do not assume one constant road width for every world Y/depth.

Use the actual road bounds at the squad's current depth.

Conceptually:

```ts
const roadBounds =
  getRoadBoundsAtWorldDepth(squadDepth);
```

Then calculate safe movement based on those bounds.

This prevents:
- clipping;
- soldiers appearing outside the bridge;
- outer units visually floating over the water;
- edge bugs during drag.

---

# 13. SOLDIER BODY ALIGNMENT

All player soldiers must remain visually aligned forward.

Keep:

```text
FACE FORWARD
RUN FORWARD
FIRE FORWARD
STRAFE LEFT/RIGHT
```

Horizontal drag must NOT rotate them sideways.

Formation changes must not reintroduce diagonal character orientation.

If the soldier asset has an incorrect local rotation, fix the asset/local visual offset rather than rotating the squad formation.

---

# 14. MUZZLE ALIGNMENT

After tightening the formation and correcting projectile perspective, revalidate muzzle anchors.

For every soldier:

```text
weapon muzzle
↓
muzzle flash
↓
projectile origin
```

must visually align.

Do not allow projectiles to appear from:
- torso;
- head;
- ground;
- squad center;
- space between soldiers.

---

# 15. COLLISION

The projectile remains collision-based.

A projectile should:

```text
move forward
↓
intersect enemy hitbox
↓
apply damage
```

There is no target identity required for normal rifle fire.

Standard projectiles should normally die only because of:

- enemy collision;
- environment collision if applicable;
- road/world bounds;
- lifetime expiration.

Do not despawn simply because no target exists.

---

# 16. GAMEPLAY EFFECT OF TIGHTER FORMATION

The compact formation intentionally makes the firing area more concentrated.

This is desirable.

It means:

```text
tighter squad
=
denser fire lanes
=
less automatic road coverage
=
more meaningful drag positioning
```

Do not compensate for tighter spacing by secretly increasing projectile hitbox width.

The visible trajectory and actual collision should remain honest.

---

# 17. DEBUG MODE

Update the developer-only overlay to show:

- SquadAnchor;
- formation footprint;
- outermost soldier bounds;
- road left/right limits at squad depth;
- safe movement bounds;
- muzzle points;
- roadForward vector;
- projectile world vector;
- projected screen trajectory;
- enemy hitboxes.

The debug overlay must make it easy to verify that:

1. the squad never leaves the valid road area;
2. projectile motion is correct in perspective;
3. no projectile is target-steered;
4. each projectile originates from a valid muzzle.

Hide the overlay in normal gameplay.

---

# 18. TEST A — 5 SOLDIERS

Start with:

```text
5 soldiers
```

Expected:

- noticeably tighter formation than the current implementation;
- all soldiers inside the road;
- compact two-row or equivalent layout;
- 5 independent firing sources;
- visible projectile paths respecting road perspective.

---

# 19. TEST B — LEFT EDGE

Drag the 5-soldier squad fully left.

Expected:

- outermost left soldier remains inside the valid bridge;
- no character clips outside;
- no character appears over water;
- formation remains intact;
- projectiles still follow world-forward perspective.

---

# 20. TEST C — RIGHT EDGE

Drag the 5-soldier squad fully right.

Expected:

- outermost right soldier remains inside the valid bridge;
- no clipping;
- no formation distortion;
- no visual bug.

---

# 21. TEST D — 20 SOLDIERS

Create:

```text
20 soldiers
```

Expected:

- formation adds rows;
- width stays controlled;
- squad does not occupy the complete road;
- drag remains meaningful;
- no edge clipping;
- 20 independent firing sources remain logically active.

---

# 22. TEST E — 50 SOLDIERS

Create:

```text
50 soldiers
```

Expected:

- controlled multi-row formation;
- configured maximum width respected;
- no units outside road bounds;
- movement clamp still works;
- performance remains within the existing project budget.

If rendering all 50 visible units requires optimized visual treatment, preserve logical per-soldier combat behavior.

---

# 23. TEST F — OFF-AXIS ENEMY

Place an enemy away from the current firing lanes.

Expected:

```text
enemy receives zero damage
```

Drag the squad until projectile lanes intersect it.

Expected:

```text
enemy begins receiving damage
```

This proves that perspective correction did not accidentally reintroduce auto-aim.

---

# 24. TEST G — PROJECTILES DURING DRAG

Fire continuously and perform:

```text
LEFT → CENTER → RIGHT
```

Expected:

- previously fired projectiles preserve their trajectories;
- new projectiles originate from updated muzzle positions;
- visible projectile paths remain perspective-correct;
- no projectile bends because of squad movement.

---

# 25. NON-NEGOTIABLES

The implementation is incomplete if any of these are violated:

1. No auto-aim for standard rifle fire.
2. No homing for standard rifle fire.
3. No enemy snapping.
4. Every living soldier remains an independent firing source.
5. Projectile origins remain muzzle-aligned.
6. Projectiles move straight in world space.
7. Perspective causes the correct visual centerward convergence.
8. The convergence must NOT be target-driven.
9. The 5-soldier formation becomes visibly tighter.
10. Large squads add rows instead of expanding width indefinitely.
11. Full formation width is considered when clamping player movement.
12. Soldiers remain inside bridge bounds.
13. Soldiers remain forward-facing.
14. Existing graphics must not regress.
15. Existing cadence behavior must not regress.
16. Collision-based damage must remain.
17. Performance must remain acceptable.

---

# 26. IMPLEMENTATION SEQUENCE

Perform this correction in the following order:

## Step 1
Inspect the current projectile coordinate system.

Determine whether projectile movement is:
- world-space;
- pseudo-world-space;
- screen-space.

Document the current behavior.

## Step 2
Define or confirm:

```ts
roadForward
```

as the authoritative standard firing direction.

## Step 3
Make standard rifle projectile movement use world/battlefield forward motion.

## Step 4
Verify world-to-screen projection produces the desired visual narrowing toward the vanishing point.

Do NOT fake this using enemy locations.

## Step 5
Revalidate muzzle origin and tracer rendering.

## Step 6
Reduce formation horizontal spacing.

## Step 7
Introduce/refine maximum formation width / column count.

## Step 8
Make larger squads add rows earlier.

## Step 9
Update horizontal drag clamp to use:
- current formation width;
- road width at squad depth;
- safe margin.

## Step 10
Run Tests A–G.

## Step 11
Run existing performance/stress tests.

## Step 12
Update relevant documentation.

## Step 13
Commit and create the next valid semantic version tag.

Then STOP.

Do not move to unrelated gameplay, shop, campaign, economy, or menu work in this pass.

---

# 27. FINAL EXPECTED RESULT

The final gameplay should visually communicate:

```text
SQUAD IS COMPACT
+
EVERY SOLDIER HAS ITS OWN GUN
+
SHOTS MOVE STRAIGHT FORWARD IN THE WORLD
+
PERSPECTIVE MAKES SHOTS VISUALLY CONVERGE TOWARD THE ROAD CENTER
+
PLAYER DRAG MOVES THE ENTIRE FIRING AREA
+
PLAYER MUST ALIGN WITH ENEMIES
```

The player should never feel that bullets are magically targeting enemies.

The player should also never see the squad spread so widely that outer soldiers appear outside or unstable near the bridge boundaries.

This is a focused projectile-perspective and formation-safety correction.
