# SQUADFIRE — HIGH-FIDELITY VISUAL REWORK + PER-SOLDIER FIRE SYSTEM

> **Use this prompt in the existing Replit project.**
>
> Attach the **target/reference image** together with this prompt.
>
> The current build should be treated as **functionally useful but visually rejected**.  
> The objective of this iteration is to preserve the useful architecture while rebuilding the presentation and shooting behavior to reach a much higher visual standard.

---

# 0. ROLE AND EXECUTION MODE

You are acting as all of the following for this iteration:

- Lead Mobile Game Engineer
- Technical Art Director
- Gameplay Engineer
- Rendering Engineer
- VFX Artist
- Animation Engineer
- Performance Engineer
- Combat Systems Designer
- QA Engineer

This task requires production-minded implementation.

Do **not** interpret words such as "beautiful", "realistic", "premium", or "polished" loosely.

Every visual and combat requirement below is intentional and must be implemented or explicitly reported as blocked.

Before making changes:

1. inspect the current project;
2. read all existing project documentation;
3. inspect the current Git state and latest tag;
4. identify the current rendering architecture;
5. identify all graphics-related dependencies;
6. identify the current projectile/shooting implementation;
7. create a safe Git checkpoint before destructive refactoring;
8. document the exact plan before modifying the rendering system.

Do not silently change the mobile stack.

Do not silently add native dependencies.

Do not continue to future features such as Shop, economy, campaign expansion, or monetization during this task.

---

# 1. PRIMARY OBJECTIVE

The current gameplay screen is too flat, too simple, too icon-like, and too close to a technical prototype.

The new gameplay presentation must move decisively toward a:

## HIGH-FIDELITY STYLIZED 3D / 2.5D MOBILE CROWD SHOOTER

The visual target should feel:

- modern;
- premium;
- dimensional;
- polished;
- energetic;
- satisfying;
- commercially presentable;
- visually readable on a phone;
- substantially closer to a polished 3D mobile game than to a flat UI prototype.

The game must no longer look as if the soldiers, enemies, gates, bullets, and boss were assembled from basic circles, rectangles, icons, or generic vector placeholders.

The desired direction is **stylized realism**, not photorealism.

Think:

- convincing three-dimensional volume;
- attractive character proportions;
- real weapon silhouettes;
- visible lighting and shadows;
- depth and perspective;
- polished materials;
- physically believable projectile origins;
- dense crowds that still remain readable.

---

# 2. CRITICAL REFERENCE RULE

The attached target image is the **visual direction reference**.

Use it to understand:

- camera angle;
- scene depth;
- player/enemy scale relationship;
- squad density;
- enemy crowd density;
- road/bridge composition;
- boss scale;
- side-lane readability;
- bright mobile-game lighting;
- satisfying visual hierarchy.

Do **not** directly copy copyrighted characters, exact models, exact textures, logos, UI, or branding.

Create an original visual identity with equivalent goals for:

- quality;
- dimensionality;
- readability;
- scene composition;
- crowd impact;
- combat satisfaction.

---

# 3. VISUAL QUALITY BAR — NON-NEGOTIABLE

The following are NOT acceptable as final gameplay art:

- circles used as heads with rectangles used as bodies;
- simple flat SVG soldiers;
- colored blobs representing units;
- flat red/blue icons;
- rectangular bullets with no visual origin;
- debug-grid battlefield as the final environment;
- generic app UI covering the gameplay;
- characters without visible weapon silhouettes;
- boss made from stacked primitive shapes;
- flat colors with no light/shadow treatment;
- static formations with no run/shoot motion;
- projectiles emitted from the center of the squad;
- one bullet stream representing an entire squad.

If the current rendering technology cannot reasonably meet the required visual quality, **do not fake compliance**.

Instead:

1. explain the limitation;
2. propose the least disruptive rendering upgrade;
3. verify iOS and Android compatibility;
4. verify Replit/Expo compatibility;
5. document dependency impact;
6. then implement the approved or most technically appropriate solution.

---

# 4. TARGET RENDERING STYLE

Target:

## Stylized high-quality 3D appearance with mobile-friendly performance

The final image should visually imply:

- actual character volume;
- actual armor/clothing volume;
- real firearms;
- perspective;
- depth;
- believable scale;
- directional lighting;
- soft contact shadows;
- material highlights;
- dimensional boss model;
- dimensional gates and battlefield elements.

If true real-time 3D is technically appropriate and stable in the current mobile stack, use it.

If true real-time 3D would introduce unacceptable compatibility or performance risk, implement a **high-fidelity 2.5D pipeline** using pre-rendered or high-quality sprite assets with:

- baked lighting;
- baked ambient occlusion;
- directional shading;
- multi-frame animation;
- scale-based perspective;
- contact shadows;
- weapon-specific muzzle anchors;
- depth sorting;
- perspective-aware positioning.

The visible result matters more than the label "2D", "2.5D", or "3D".

---

# 5. CAMERA SPECIFICATION

The gameplay camera is fundamental.

Use a fixed or gently adaptive portrait camera with the following visual behavior:

- aspect ratio target: 9:16;
- camera elevated above the battlefield;
- camera pitched downward;
- NOT orthographic-looking flat top-down;
- NOT side view;
- NOT straight vertical top-down;
- strong forward depth;
- road appears wider near the player and narrower toward the enemy;
- enemy groups appear farther away in upper screen space;
- boss occupies a dramatic amount of upper-middle screen space;
- player squad remains readable near the lower third.

The composition should create a visual funnel from:

PLAYER SQUAD
→ BULLET STREAMS
→ ENEMY FRONT LINE
→ BOSS / LARGE HORDE
→ DISTANT STAGE

The road perspective must visually reinforce forward movement.

Do not use a rectangular flat gameplay card that feels independent from the world.

The battlefield itself should feel like the world.

---

# 6. ENVIRONMENT ART DIRECTION

Rebuild the battlefield so that it feels like a polished environment rather than a panel.

Preferred first-stage concept:

## Elevated coastal combat bridge / causeway

Visual elements:

- light concrete or warm neutral road;
- ocean/water visible on both sides;
- dimensional side barriers or rails;
- clean geometric architecture;
- subtle environmental props;
- soft atmospheric depth;
- occasional debris or impact marks;
- moving water or subtle animated surface;
- visually attractive horizon or upper-background treatment.

### Road

The road must include:

- perspective-consistent lane width;
- subtle surface texture;
- variation in roughness/value;
- lane markings only where useful;
- subtle impact/debris details;
- soft shadows from units;
- no debug grid in production presentation.

### Water

Water should add premium visual value without consuming excessive performance.

Preferred treatment:

- controlled blue/turquoise palette;
- subtle animated highlights;
- low-frequency motion;
- restrained reflections;
- no visually noisy wave simulation.

### Side barriers

Side barriers should have:

- visible volume;
- top surface;
- side surface;
- directional light response;
- perspective;
- repeated modules with enough variation to avoid looking artificial.

---

# 7. PLAYER SOLDIER ART DIRECTION

Every player soldier must read as a **real stylized soldier**, not an icon.

Desired proportions:

- slightly exaggerated mobile-game proportions;
- strong helmet/head silhouette;
- torso armor or combat uniform;
- clearly visible arms;
- clearly visible legs;
- clearly visible firearm;
- strong readable pose;
- compact enough for crowds.

Suggested visual identity:

- cool blue armor/uniform;
- darker blue secondary surfaces;
- metallic or dark weapon;
- small bright accent;
- readable skin/visor/helmet separation where applicable.

Each soldier should have visual states for:

- running;
- aiming;
- firing;
- hit reaction where applicable;
- death/removal where applicable.

At minimum, the animation must create the convincing illusion of those states.

Do not render every soldier in exactly the same frozen pose.

Small phase variation between animation cycles is desirable so a 20-person squad does not look like cloned synchronized statues.

---

# 8. ENEMY ART DIRECTION

Enemies need equivalent dimensional quality.

Enemy visual identity:

- warm red/orange/crimson palette;
- darker armor accents;
- distinct silhouette from player;
- weapons or attack tools must be readable;
- slightly more aggressive posture;
- good readability in large crowds.

The player must identify faction from silhouette and color within a fraction of a second.

Crowds must feel:

- dense;
- threatening;
- three-dimensional;
- alive.

Do not let overlapping sprites/models become an unreadable solid red mass.

Use:

- spacing;
- depth sorting;
- slight scale variation;
- animation phase offsets;
- subtle horizontal offsets;
- controlled formation structure.

---

# 9. BOSS ART DIRECTION

The boss must be a true centerpiece.

The current boss representation must be replaced if it reads like stacked primitive shapes or a UI icon.

Boss requirements:

- approximately 2.5x–5x the visual height/mass of a standard enemy depending on encounter;
- strong silhouette;
- visible limbs/body structure;
- distinctive armor or body features;
- clearly readable weapon/attack apparatus if used;
- unique animation;
- strong contact shadow;
- stronger material highlights;
- strong hit reaction;
- clear telegraphing for major attacks.

The boss must feel physically present in the battlefield.

It must visually occupy space and create threat before the player reads its health bar.

---

# 10. LIGHTING SPECIFICATION

Lighting must contribute directly to quality.

Target:

## Bright stylized daylight with strong form readability

Use a lighting model or baked shading that communicates:

- top/front key light;
- softer opposite-side fill;
- contact shadows;
- soft ambient occlusion;
- controlled rim/separation highlights when useful;
- brighter top-facing surfaces;
- darker undersides;
- clear volume.

Avoid:

- flat unlit colors;
- excessive bloom;
- overly dark environment;
- crushed blacks;
- washed-out low-contrast scene;
- harsh realistic shadows that make mobile readability worse.

Every character must visibly separate from the ground.

---

# 11. SHADOWS

Shadows are required for spatial grounding.

At minimum each active unit requires a lightweight contact shadow:

- soft ellipse or equivalent;
- positioned under the feet/body;
- perspective-aware;
- opacity based on height where relevant;
- subtle enough not to clutter crowds.

Boss shadow should be larger and more dramatic.

Projectiles do not need expensive real-time shadows.

VFX can use fake/baked shadowing when needed.

Performance is important, so prioritize efficient shadow solutions rather than expensive dynamic shadow maps if the stack cannot handle them.

---

# 12. MATERIALS

Characters should visually imply separate materials.

Examples:

### Armor
- semi-gloss;
- clean highlight;
- moderate contrast.

### Fabric
- softer;
- less reflective.

### Weapon
- darker;
- metallic/specular impression;
- crisp silhouette.

### Helmet / visor
- visually distinct;
- controlled highlight.

### Ground
- matte or semi-matte;
- enough detail for visual richness without reducing readability.

### Boss
Use richer contrast and more visually complex material segmentation than common enemies.

---

# 13. SOLDIER FORMATION SYSTEM

The visual squad formation must feel organized but alive.

Do not stack all soldiers directly behind one another.

Use formation positions relative to a SquadAnchor.

Examples by size:

- 1 soldier: centered;
- 2–3 soldiers: compact triangle;
- 4–6: staggered wedge;
- 7–12: compact layered wedge;
- 13–20: wider multi-row formation;
- 20+: dynamically packed formation with controlled spacing.

Each soldier owns:

- its own world/screen position;
- its own visual sprite/model;
- its own weapon;
- its own weapon muzzle anchor;
- its own animation phase;
- its own firing schedule;
- its own assigned target when possible.

The squad anchor moves from player input.

Individual soldiers smoothly converge toward formation slots.

Do not move the squad as one flat image.

---

# 14. CRITICAL COMBAT CHANGE — ONE SOLDIER = ONE WEAPON = ONE PROJECTILE STREAM

This requirement is mandatory.

The current system must never visually behave as if the entire squad shares one central gun.

## Fundamental rule

EVERY alive soldier contributes independently to shooting.

If there is:

```text
1 soldier
```

there is:

```text
1 active firing source
```

If there are:

```text
5 soldiers
```

there are:

```text
5 active firing sources
```

If there are:

```text
12 soldiers
```

there are:

```text
12 active firing sources
```

Each soldier must fire from its own weapon location.

Therefore increasing squad size must visibly increase:

- muzzle flashes;
- projectile count;
- total bullets per second;
- combat density;
- effective squad DPS.

This scaling should be approximately linear before weapon/upgrades modifiers.

---

# 15. WEAPON MUZZLE ANCHOR SYSTEM

Each soldier must have a defined weapon muzzle point.

Example conceptual structure:

```ts
interface SoldierCombatState {
  id: number;
  position: Vec2;
  formationSlot: Vec2;
  aimDirection: Vec2;
  targetId: number | null;
  nextShotAt: number;
  firePhase: number;
  weaponId: string;
}

interface WeaponVisualDefinition {
  muzzleOffsetX: number;
  muzzleOffsetY: number;
  projectileVisualId: string;
  muzzleFlashVisualId: string;
}
```

Projectile spawn position must be calculated from:

```text
soldier position
+
weapon muzzle offset
+
current aim direction / animation state
```

Never spawn bullets from:

- screen center;
- squad center;
- arbitrary fixed Y coordinate;
- one shared global muzzle.

Visually, the player should be able to look at any soldier and understand:

> "that bullet came from that soldier's weapon."

---

# 16. CADENCED FIRING SYSTEM

Do not make all soldiers fire on exactly the same frame unless a weapon or special upgrade explicitly creates synchronized volley fire.

Default behavior should be:

## DISTRIBUTED CADENCE

Each soldier fires at the configured weapon fire rate, but the squad's shots are distributed over time.

For base fire rate:

```text
fireRate = R shots/second per soldier
```

Shot period:

```text
T = 1 / R
```

For a squad of `N` active soldiers, distribute firing phases through the period.

Conceptually:

```text
phaseOffset(i) = (i / N) * T
```

Each soldier still fires approximately once every `T` seconds.

The result is:

```text
totalSquadShotsPerSecond ≈ N * R
```

but visually the bullets come out in a clean cadence rather than one ugly simultaneous wall every T seconds.

Example:

```text
Weapon fire rate:
2 shots/sec per soldier

1 soldier:
~2 projectiles/sec

3 soldiers:
~6 projectiles/sec

8 soldiers:
~16 projectiles/sec

15 soldiers:
~30 projectiles/sec
```

This is the desired base behavior.

---

# 17. CADENCE MUST SURVIVE SQUAD SIZE CHANGES

When a new soldier is added during gameplay:

1. add a new Soldier entity;
2. assign a formation slot;
3. assign a weapon muzzle anchor;
4. assign an independent fire phase;
5. rebalance cadence phase offsets smoothly;
6. do not interrupt currently active firing;
7. do not reset all soldiers' timers to zero;
8. total projectile output must immediately increase.

Example:

```text
Squad before gate:
5 soldiers
2 shots/sec each
≈ 10 total projectiles/sec

Player collects +3 Squad.

Squad after gate:
8 soldiers
2 shots/sec each
≈ 16 total projectiles/sec
```

This increase must be both:

- mathematically true;
- visually obvious.

---

# 18. TARGETING AND PROJECTILE ALIGNMENT

Every soldier must visually aim toward a valid target.

Projectile trajectory must start at the weapon muzzle and travel toward:

- that soldier's target;
- or an aim point associated with the target.

For normal enemies, prefer target distribution to prevent all bullets from unnecessarily converging on the exact same weak enemy.

Use a target assignment strategy based on:

1. enemy inside forward targeting cone;
2. horizontal proximity to the soldier;
3. distance;
4. estimated incoming reserved damage;
5. target priority.

## Overkill reduction

If an enemy has:

```text
2 HP remaining
```

and already has enough incoming projectile damage to kill it, other soldiers should prefer another valid target where practical.

This creates:

- cleaner projectile lanes;
- better crowd-clearing behavior;
- more intelligent-looking combat;
- less wasted DPS.

For bosses:

- all soldiers may target the same boss;
- bullets should originate from each individual soldier and naturally converge toward different points around the boss body/target zone.

---

# 19. PROJECTILE VISUAL SPECIFICATION

Bullets must no longer look like generic bars detached from the soldiers.

Each shot should include:

## At weapon
- muzzle flash;
- brief weapon recoil or pose change;
- optional subtle glow;
- optional tiny smoke puff for suitable weapons.

## Projectile
Use either:

- visible tracer;
- small glowing bullet;
- thin high-speed streak;
- weapon-appropriate projectile.

Projectile must preserve clear source direction.

Recommended visual behavior:

- short bright projectile body;
- subtle trail;
- strong contrast over the battlefield;
- brief lifetime;
- no oversized neon laser unless weapon requires it.

## Impact
On hit:

- compact spark;
- hit flash;
- enemy micro-reaction;
- optional tiny debris;
- optional damage number only where readability permits.

---

# 20. SHOOTING ANIMATION SYNCHRONIZATION

Muzzle flash, weapon recoil, projectile creation, and sound trigger must happen on the same simulation event.

One `ShotEvent` should drive:

```text
soldier firing pose
+
muzzle flash
+
projectile spawn
+
weapon recoil
+
audio event
+
optional haptic aggregation
```

Do not run these systems using unrelated timers.

Conceptual:

```ts
interface ShotEvent {
  soldierId: number;
  weaponId: string;
  targetId: number | null;
  origin: Vec2;
  direction: Vec2;
  timestamp: number;
}
```

Rendering/VFX should consume this event.

This guarantees visible alignment.

---

# 21. HIGH SQUAD COUNT VISUAL CONTROL

With many soldiers, hundreds of projectiles may appear.

The game must remain attractive rather than becoming visual noise.

For large squads:

- preserve real projectile count logically;
- allow subtle visual simplification if required for performance;
- do not merge the entire squad into one fake projectile;
- prioritize foreground projectile clarity;
- reduce redundant particles before reducing combat correctness;
- pool projectiles;
- pool muzzle flashes;
- pool hit particles.

If extreme squad sizes exceed the visual projectile budget, use controlled batching only after profiling.

Any batching solution must preserve the perception that multiple soldiers are independently firing.

---

# 22. FIRE RATE UPGRADES

Fire rate upgrades affect each soldier's weapon cadence.

Example:

```text
Base:
8 soldiers
2 shots/sec each
= 16 shots/sec

+25% Fire Rate:
8 soldiers
2.5 shots/sec each
= 20 shots/sec
```

Do not implement Fire Rate as an unrelated global bullet generator.

It must modify the weapon cadence used by each soldier.

Use configurable caps and diminishing returns where balance requires it.

---

# 23. DAMAGE SCALING RULE

Adding soldiers should initially create approximately linear offensive scaling:

```text
Squad DPS ≈
aliveSoldiers
×
weaponDamage
×
effectiveFireRate
×
hitEfficiency
×
otherModifiers
```

Do not accidentally multiply squad size twice.

Wrong example:

```text
damagePerBullet *= squadSize
AND
bulletCount *= squadSize
```

That would cause quadratic scaling.

Correct default:

- each new soldier adds another firing source;
- damage per projectile stays weapon-based;
- aggregate DPS rises because there are more shooters.

Any squad-wide damage upgrade is applied according to documented balance rules.

---

# 24. BULLET ORIGIN DEBUG MODE

Create a developer-only debug mode that can visualize:

- soldier ID;
- muzzle anchor;
- assigned target;
- aim vector;
- projectile origin;
- shot timestamp;
- fire phase.

This mode must be disabled in normal player-facing gameplay.

Use it to verify that:

- no bullets originate between soldiers;
- no bullet originates from incorrect locations;
- no projectile appears detached from a weapon;
- every soldier contributes shots.

---

# 25. VISUAL FIRE TEST SCENARIOS

Implement dedicated test scenarios.

## TEST A — 1 Soldier

Expected:

- one visible muzzle;
- one projectile stream;
- cadence exactly matches weapon fire rate.

## TEST B — 3 Soldiers

Expected:

- three independent muzzle positions;
- clean staggered cadence;
- approximately 3x aggregate projectile rate versus one soldier.

## TEST C — 10 Soldiers

Expected:

- ten valid firing sources;
- bullets visibly originate across the formation;
- no obvious frame-burst problem;
- clean target distribution.

## TEST D — +5 Gate

Start:

```text
5 soldiers
```

Pass through:

```text
+5 SQUAD
```

Expected immediately after formation stabilization:

```text
10 soldiers
≈ 2x total firing sources
≈ 2x total base projectile rate
```

No reset, freeze, or cadence collapse.

## TEST E — Boss

20 soldiers firing at one boss.

Expected:

- projectile origins remain distributed across the squad;
- trajectories converge naturally;
- boss hit VFX remains readable;
- FPS remains stable.

---

# 26. GATE VISUAL REWORK

Upgrade gates should become actual world objects.

They must have:

- depth;
- perspective;
- visible frame;
- lighting response;
- clean typography;
- high contrast;
- attractive animated energy/material;
- correct occlusion/depth order relative to characters.

Example:

```text
LEFT:
+3 SOLDIERS

RIGHT:
x2 DAMAGE
```

The player should feel physically as if the squad moves through the selected gate.

On `+Soldiers`:

1. trigger gate feedback;
2. spawn new soldiers in a visually satisfying manner;
3. integrate them into formation;
4. immediately add their firing sources;
5. play a compact celebratory VFX;
6. update squad count UI.

---

# 27. ENEMY CROWD QUALITY

The enemy crowd must look closer to a mass of actual animated soldiers.

Requirements:

- visible heads/helmets;
- torso/limbs;
- formation depth;
- multiple rows;
- animation phase variation;
- slight pose/position variation;
- proper shadows;
- perspective scale;
- avoidance of perfect repeated clone pattern.

Enemy crowd should become denser deeper in the stage.

Do not draw a row of identical red icons.

---

# 28. DEPTH AND PERSPECTIVE

Depth cues must be obvious.

Apply where appropriate:

- scale reduction with distance;
- vertical screen-position depth;
- depth sorting;
- reduced shadow size with distance;
- controlled atmospheric fade;
- enemy crowd compression toward vanishing point;
- road/barrier convergence;
- boss positioned consistently in world depth.

Do not scale characters randomly.

All scaling must derive from world depth or defined presentation rules.

---

# 29. VFX QUALITY HIERARCHY

Do not give every action the same effect intensity.

Use hierarchy:

### Common bullet
small muzzle flash + small impact.

### Critical hit
slightly stronger impact + brief accent.

### Enemy death
controlled effect.

### Elite death
stronger effect.

### Boss hit
strong impact but not every frame overwhelming.

### Boss phase transition
large dramatic effect.

### Squad growth
positive visual burst.

### Gate selection
strong but short confirmation.

This hierarchy preserves readability.

---

# 30. SCREEN SHAKE

Use sparingly.

No shake for every normal bullet.

Suggested:

- tiny/no shake for regular shots;
- small shake for shotgun/rocket/heavy attacks;
- stronger but brief shake for boss attacks;
- stronger controlled shake for major boss death.

Respect accessibility setting:

```text
reducedScreenShake
```

---

# 31. UI REWORK

The HUD should not make the game look like a productivity app.

Keep gameplay UI minimal.

Recommended:

### Top
- Level indicator;
- Wave progress;
- currency only if relevant.

### Boss active
- boss name;
- boss HP bar.

### Squad
A small readable count such as:

```text
12
```

with an appropriate squad icon.

Do not use large cards covering battlefield visibility.

Do not put technical text such as:

```text
RENDERING PROOF
SYSTEM STATUS
TARGET FPS
```

in the normal gameplay screen.

FPS/debug info belongs only in developer mode.

---

# 32. TYPOGRAPHY

Use bold, highly readable mobile-game typography.

Requirements:

- short labels;
- strong hierarchy;
- readable at small physical screen sizes;
- no tiny developer text during combat;
- no excessive uppercase paragraphs;
- numbers should be instantly readable.

For gate numbers:

- very large;
- thick;
- centered;
- high contrast.

---

# 33. AUDIO SYNCHRONIZATION PREPARATION

Even if full audio polish is not part of this version, firing architecture must be ready for per-shot sound events.

However, with large squads, do not play 30 identical gunshot sounds at full volume individually.

Use audio aggregation.

Example concept:

- individual shots produce logical ShotEvents;
- audio layer groups shots occurring inside a very short time window;
- sound intensity reflects squad firing density;
- avoid clipping and audio chaos.

Visual projectiles must still remain tied to individual soldiers.

---

# 34. PERFORMANCE TARGETS

Target device behavior:

```text
60 FPS desired
30 FPS absolute minimum under stress
```

Test at least:

```text
1 soldier
10 soldiers
25 soldiers
50 soldiers
```

with increasingly large enemy groups.

Stress scenario target:

```text
50 player soldiers
300 enemies
500+ active/recent projectile visual events
hit VFX
muzzle VFX
contact shadows
```

Measure:

- FPS;
- average frame time;
- peak frame time;
- active soldiers;
- active enemies;
- active projectiles;
- pooled projectile count;
- memory behavior where measurable.

Do not optimize by deleting the per-soldier shooting requirement.

Optimize using:

- pooling;
- batching;
- efficient simulation data;
- reduced allocations;
- spatial partitioning;
- efficient draw calls;
- sprite atlases / instancing where supported;
- VFX budgeting.

---

# 35. ASSET QUALITY POLICY

Do not accept low-quality placeholders as final presentation.

If visual assets are required:

- use consistent art direction;
- optimize them for mobile;
- keep source and runtime assets organized;
- use transparent backgrounds where applicable;
- use high-quality source resolution;
- generate/downsample appropriate mobile sizes;
- avoid blurry scaling;
- avoid mixed incompatible visual styles.

Suggested organization:

```text
assets/
  characters/
    player/
    enemies/
    bosses/
  weapons/
  environment/
  gates/
  vfx/
  ui/
```

If sprite atlases are used:

```text
assets/atlases/
```

Document:

- source resolution;
- runtime resolution;
- animation frames;
- pivot/origin;
- muzzle anchor;
- collision anchor;
- shadow anchor.

---

# 36. CHARACTER VISUAL METADATA

Each character visual definition should support:

```ts
interface CharacterVisualDefinition {
  visualId: string;
  scale: number;

  anchorX: number;
  anchorY: number;

  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowScale: number;

  weaponAnchorX: number;
  weaponAnchorY: number;

  muzzleAnchorX: number;
  muzzleAnchorY: number;

  animationSet: string;
}
```

Exact implementation may differ, but the architecture must preserve these concepts.

This is essential for accurate weapon/projectile alignment.

---

# 37. PROJECTILE POOLING

Use a projectile pool.

Do not create/destroy large numbers of React components during gameplay.

Each projectile should contain compact simulation data similar to:

```ts
interface Projectile {
  active: boolean;
  ownerSoldierId: number;
  weaponId: string;

  x: number;
  y: number;

  vx: number;
  vy: number;

  damage: number;
  targetId?: number;

  spawnTime: number;
  lifetime: number;
}
```

Rendering should efficiently consume active projectile data.

Avoid `setState()` for each projectile frame.

---

# 38. FIRING SYSTEM PSEUDOCODE EXPECTATION

The system should conceptually behave like:

```ts
for (const soldier of activeSoldiers) {
  if (!soldier.isAlive) continue;

  const target = targetingSystem.resolveTarget(soldier);

  if (!target) continue;

  soldier.aimDirection = directionToTarget(
    soldier.weaponMuzzleWorldPosition,
    target.aimPoint
  );

  if (currentTime >= soldier.nextShotAt) {
    fireShot(soldier, target);

    soldier.nextShotAt =
      currentTime +
      weaponShotPeriod +
      cadencePhaseAdjustment;
  }
}
```

The final implementation can be more sophisticated.

The core rule cannot change:

## individual soldier → individual muzzle → individual shot event → individual projectile

---

# 39. TARGET ALLOCATION

For enemy crowds, distribute firing naturally.

Preferred strategy:

```text
candidate enemies in attack cone
↓
sort by threat/distance/horizontal relationship
↓
account for incoming reserved damage
↓
assign targets
```

Nearby soldiers can attack the same stronger enemy.

Avoid visually absurd behavior where:

- soldier on far left constantly fires diagonally to far-right enemy while a close left enemy exists;
- every soldier targets one 1-HP grunt;
- bullets cross chaotically without reason.

Target selection should preserve visually pleasing firing lanes.

---

# 40. PROJECTILE TRAJECTORY

Normal rifle/SMG bullets:

- mostly straight;
- very fast;
- minimal arc;
- subtle tracer.

Shotgun:

- several projectiles;
- spread from that soldier's muzzle.

Rocket:

- slower;
- larger visual;
- stronger trail;
- explosion.

Do not implement all weapons if not currently required.

But architecture must support weapon-specific firing patterns.

---

# 41. HITBOX VS VISUAL

Do not tie collision directly to every visible pixel.

Characters should have simple optimized hit regions.

Example:

- one or two circles/capsules internally;
- complex visual representation externally.

Collision remains efficient while graphics remain high fidelity.

---

# 42. BALANCE PROTECTION

Because every new soldier adds a firing source, squad growth directly increases DPS.

Therefore verify balance.

Base approximation:

```text
Total DPS =
Soldier Count
× Damage Per Projectile
× Shots Per Second Per Soldier
× Accuracy/Hit Efficiency
```

Do not introduce accidental exponential scaling.

Squad modifiers must be centralized in balance configuration.

Run simulations for:

```text
1 soldier
3 soldiers
5 soldiers
10 soldiers
20 soldiers
30 soldiers
50 soldiers
```

Ensure progression remains controllable.

---

# 43. VISUAL ACCEPTANCE CRITERIA

This iteration is NOT complete until all of the following are true.

## Characters

- player soldiers look dimensional;
- enemies look dimensional;
- boss looks substantially more detailed than normal enemies;
- characters have actual readable weapons;
- units have grounding shadows;
- run/shoot states feel alive.

## Battlefield

- no debug-grid presentation in production gameplay;
- visible perspective;
- polished road/bridge;
- attractive side environment;
- water/background adds depth;
- barriers have volume;
- scene feels like a world rather than a panel.

## Lighting

- characters have clear form lighting;
- units separate from ground;
- boss has dramatic visual presence;
- scene remains bright and readable.

## Shooting

- every soldier has its own weapon muzzle;
- every bullet originates from the correct soldier;
- bullets are aligned with the soldier's aim;
- adding soldiers visibly adds firing sources;
- adding soldiers mathematically adds projectile output;
- firing is cadenced;
- muzzle flash and projectile spawn are synchronized.

## VFX

- muzzle flash exists;
- bullet/tracer is attractive;
- hit feedback exists;
- death feedback exists;
- squad growth feedback exists;
- boss hit feedback is stronger.

## UI

- gameplay HUD is minimal;
- no technical dashboard appearance;
- no large debug cards during normal gameplay.

---

# 44. FUNCTIONAL ACCEPTANCE TEST

Use this exact test.

### Scenario

Start stage with:

```text
1 soldier
Base Rifle
2 shots/sec
```

Observe for 10 seconds.

Expected approximate projectile creation:

```text
~20 shots
```

Then apply:

```text
+4 SOLDIERS
```

Total:

```text
5 soldiers
```

Keep same weapon and fire rate.

Observe for another 10 seconds.

Expected approximate projectile creation:

```text
~100 shots total
```

subject to target availability and gameplay pauses.

The increase must come from five independent shooters.

Then apply:

```text
+25% FIRE RATE
```

Expected aggregate rate:

```text
5 soldiers
×
2.5 shots/sec
=
~12.5 shots/sec
```

Validate this using debug counters.

---

# 45. VISUAL COMPARISON REQUIREMENT

At the end of the iteration, compare the new gameplay presentation against the attached reference direction.

Explicitly assess:

- dimensionality;
- camera;
- unit appearance;
- crowd appearance;
- boss presence;
- battlefield quality;
- lighting;
- shadows;
- projectile alignment;
- firing density;
- overall premium feeling.

Do not claim success merely because the application runs.

A technically working build that still looks flat is considered incomplete.

---

# 46. DOCUMENTATION UPDATE

Update:

```text
docs/ARCHITECTURE.md
docs/GAME_DESIGN.md
docs/BALANCE.md
docs/DEPENDENCIES.md
docs/PROJECT_STATE.md
docs/TEST_PLAN.md
```

Create if missing:

```text
docs/VISUAL_DIRECTION.md
docs/FIRING_SYSTEM.md
docs/ASSET_PIPELINE.md
```

`VISUAL_DIRECTION.md` must document:

- camera;
- palette;
- lighting;
- character proportions;
- shadows;
- environment;
- boss;
- VFX hierarchy;
- UI principles.

`FIRING_SYSTEM.md` must document:

- per-soldier firing;
- cadence;
- muzzle anchors;
- target allocation;
- fire-rate formula;
- squad scaling;
- projectile pooling;
- debug validation.

---

# 47. DEPENDENCY SAFETY

Before adding any graphics dependency:

1. explain its purpose;
2. verify compatibility with current Expo SDK;
3. verify React Native version compatibility;
4. verify iOS support;
5. verify Android support;
6. confirm whether Expo Go supports it;
7. confirm whether a Development Build becomes required;
8. estimate performance/bundle impact;
9. document it in `docs/DEPENDENCIES.md`.

Do not blindly install latest versions.

Prefer Expo-compatible package installation where applicable.

If a new dependency would make Expo Go unusable, explicitly report that before proceeding.

---

# 48. VERSION CONTROL

Treat this as a dedicated visual/combat refinement version.

Before implementation:

```text
Create checkpoint commit:
pre-high-fidelity-visual-rework
```

After successful implementation and testing, create a semantic version according to the project's current version sequence.

Suggested form if appropriate:

```text
v0.x.y - High Fidelity Visual and Per-Soldier Firing Rework
```

Do not overwrite previous tags.

---

# 49. FINAL REPORT REQUIRED

When finished, STOP and report:

## Visual
- what was rebuilt;
- what assets changed;
- how dimensionality improved;
- camera changes;
- environment changes;
- soldier changes;
- enemy changes;
- boss changes;
- lighting/shadow changes;
- VFX changes.

## Combat
- how per-soldier firing works;
- exact cadence formula;
- how new soldiers add shots;
- target allocation logic;
- projectile pooling approach;
- muzzle alignment implementation.

## Performance
Report results for:

```text
1 soldier
10 soldiers
25 soldiers
50 soldiers
```

and the largest enemy scenario tested.

Include:

- FPS;
- active projectile count;
- active enemy count;
- known bottlenecks.

## Dependencies
List:
- added;
- removed;
- changed;
- why.

## QA
Report:
- typecheck;
- lint;
- tests;
- iOS test status;
- Android test status;
- Expo Go status;
- Development Build requirement if applicable.

## Remaining issues
Be explicit.

Do not automatically proceed to another feature version.

---

# 50. FINAL DIRECTIVE

The user has explicitly rejected the current flat visual quality.

This iteration must prioritize:

# HIGH-FIDELITY GRAPHICS
# DIMENSIONAL CHARACTERS
# PREMIUM MOBILE PRESENTATION
# TRUE PER-SOLDIER FIRING
# MUZZLE-ALIGNED PROJECTILES
# CADENCED SHOOTING
# SQUAD SIZE = MORE SHOOTERS
# PERFORMANCE-AWARE IMPLEMENTATION

The player must visibly experience this relationship:

```text
MORE SOLDIERS
=
MORE WEAPONS
=
MORE MUZZLE FLASHES
=
MORE PROJECTILES
=
MORE FIREPOWER
```

without losing visual clarity or breaking balance.

Do not settle for a flat placeholder result.

If the current rendering approach fundamentally prevents the requested quality, state that clearly and change the rendering strategy deliberately rather than producing another low-fidelity approximation.

Implement this scope, validate it, document it, commit/tag it, and STOP.
