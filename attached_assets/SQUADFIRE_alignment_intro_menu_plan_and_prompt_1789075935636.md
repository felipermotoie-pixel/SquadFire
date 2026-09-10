# SQUADFIRE — IMPLEMENTATION REVIEW, ALIGNMENT FIX, INTRO & MAIN MENU PLAN

> **Purpose:** validate and refine the current Straight-Fire plan, lock the player squad into a correct forward-facing orientation, and add a proper application boot flow with a cinematic SquadFire introduction followed by a Main Menu.
>
> **Recommended implementation strategy:** do **not** mix the combat-direction refactor and the application/menu flow into one uncontrolled change. Complete them as two sequential semantic versions, validating each before advancing.

---

# 1. REVIEW OF THE CURRENT REPLIT PLAN

The proposed **Straight-Fire Manual Aiming System** plan is architecturally coherent with the intended gameplay.

The following decisions are correct and should be preserved:

- normal rifle shots have no auto-aim;
- the player's horizontal drag controls where the firing lanes are positioned;
- every living soldier owns its own firing source;
- projectiles originate from each soldier's muzzle;
- projectiles travel independently after being fired;
- damage is collision-based rather than target-selection based;
- missed bullets remain alive until collision, expiration, or leaving the valid battlefield;
- squad growth adds additional firing sources;
- formation width is capped so a large squad does not automatically cover the entire road;
- the boss must not be automatically targeted;
- the boss may patrol horizontally so player repositioning remains relevant;
- debug visualization should prove that projectile vectors are parallel;
- headless tests should cover off-axis misses and drag-to-hit behavior;
- current Skia rendering and performance work should be preserved;
- checkpoint/tag discipline is appropriate.

However, the plan requires several **mandatory refinements** before implementation.

---

# 2. REQUIRED CORRECTION — SOLDIERS MUST FACE STRAIGHT FORWARD

This is a visual invariant.

The player squad currently appears partially sideways/diagonal. That must not remain.

## Required behavior

Every standard player soldier must:

```text
FACE FORWARD
RUN FORWARD
FIRE FORWARD
STRAFE LEFT/RIGHT
```

Horizontal drag must move the soldier's position without changing the soldier's body heading.

The body orientation must NOT be derived from:

- drag direction;
- horizontal velocity;
- target position;
- formation slot angle;
- projectile trajectory;
- enemy position.

## World-space rule

Define a canonical battlefield basis:

```ts
roadForward
roadRight
```

The formation and character headings must use that basis.

Conceptually:

```ts
soldierBodyForward = roadForward;
```

For a 2.5D implementation, the visual representation must be authored or transformed so the rendered soldier **appears to face the road's vanishing direction**.

Do not rotate the complete formation to compensate for an incorrectly authored sprite/model.

If the asset itself is authored at an angle, use a local correction:

```ts
baseVisualRotationOffset
```

or replace the asset with a correctly forward-facing asset.

## Formation geometry

Rows must be:

```text
approximately perpendicular to roadForward
```

Columns must be:

```text
approximately parallel to roadForward
```

Correct visual concept:

```text
             ↑ ROAD FORWARD

          ●     ●     ●
             ●     ●
          ●     ●     ●

             PLAYER
```

Incorrect:

```text
       ●
          ●
             ●
                ●
```

No persistent diagonal squad shape is acceptable.

---

# 3. IMPORTANT FIRING VECTOR CLARIFICATION

Do not interpret "straight forward" as blindly using a screen-space vector such as:

```ts
vx = 0
vy = -speed
```

unless the current renderer's world projection explicitly makes that correct.

The authoritative firing direction must be the **battlefield/world forward vector**.

Then convert/project it correctly for rendering.

Conceptually:

```ts
const direction = normalize(roadForward);
projectile.velocity = direction * projectileSpeed;
```

For a 2.5D renderer:

```text
world forward
→ projection
→ screen-space projectile motion
```

This prevents perspective/camera changes from silently breaking the visual direction of fire.

All standard rifle shots must remain mutually parallel in world space.

---

# 4. REMOVE AUTO-TARGETING COMPLETELY FOR STANDARD FIRE

The proposed plan is correct here, but this requirement must be treated as a hard invariant.

For the standard rifle path, remove/bypass:

```text
resolveTarget
nearestEnemy
targetEnemy
assignTarget
directionToTarget
aimAt
targetId
homing
magnetic aim
target snapping
automatic correction
reserved damage targeting
overkill targeting
```

A standard projectile does not need to know which enemy it intends to hit.

It travels forward and hits whatever its collision path intersects.

Enemy AI may still independently react to the player.

Future weapons may explicitly opt into special behavior, but only through weapon configuration.

Example:

```ts
aimMode: "STRAIGHT"
```

Future possibilities:

```text
SPREAD
HOMING
CONE
AREA
```

The default rifle remains:

```text
STRAIGHT
```

---

# 5. PER-SOLDIER FIRE MUST REMAIN INDEPENDENT

Preserve the current per-soldier cadence system.

The invariant is:

```text
1 living soldier
=
1 weapon
=
1 muzzle
=
1 independent fire timer
=
1 projectile source
```

Therefore:

```text
5 soldiers
=
5 projectile sources
```

and:

```text
10 soldiers
=
10 projectile sources
```

Adding a soldier must never reset the timers of existing soldiers.

Shots should remain distributed over time rather than every soldier firing on the same frame.

Do not accidentally reintroduce a squad-center projectile emitter during the straight-fire refactor.

---

# 6. PROJECTILE INDEPENDENCE AFTER FIRING

A projectile must capture its firing vector at the moment it is created.

Example:

```ts
projectile.position = muzzleWorldPosition;
projectile.velocity = roadForward * projectileSpeed;
```

After that moment, horizontal squad movement must have no influence on that projectile.

Example:

```text
shot fired at X=100
↓
player drags squad to X=180
↓
old shot continues on original trajectory
↓
new shots begin at new muzzle positions
```

This is mandatory.

---

# 7. FORMATION WIDTH CONTROL

The existing plan correctly proposes a maximum formation width.

Keep configurable:

```ts
formationHorizontalSpacing
formationLongitudinalSpacing
formationMaxWidth
formationMaxColumns
formationRowCapacity
```

When additional soldiers would exceed the maximum allowed width:

```text
DO NOT keep widening the formation
```

Instead:

```text
create additional rows
```

This is necessary because manual horizontal alignment must remain important even with 30–50 soldiers.

---

# 8. CURRENT STRAIGHT-FIRE PLAN — RECOMMENDED VERSION

Treat the Straight-Fire + Alignment work as one isolated combat version.

Suggested version:

```text
v0.3.0
Straight Fire + Forward Alignment
```

If the repository has already assigned another semantic version, follow the actual repository sequence instead of forcing this number.

## Scope

- straight fire;
- no auto-aim;
- collision-only damage;
- projectile independence;
- forward-facing soldiers;
- straight formation;
- squad width cap;
- boss patrol;
- debug overlay;
- tests A–E;
- performance regression testing.

## Do NOT add the Main Menu during this version.

Complete, test, commit, tag, and STOP.

Only after this version is stable should the application/menu flow begin.

---

# 9. NEXT VERSION — APPLICATION BOOT FLOW + INTRO + MAIN MENU

Recommended next version:

```text
v0.4.0
Intro Cinematic + Main Menu
```

The game must no longer launch directly into gameplay.

The boot flow must become:

```text
APP LAUNCH
    ↓
BOOT / ASSET PRELOAD
    ↓
SQUADFIRE INTRO
    ↓
MAIN MENU
    ↓
PLAYER SELECTS PLAY
    ↓
GAMEPLAY
```

Returning from a gameplay session must return to the menu/result flow rather than relaunching the introduction unnecessarily.

---

# 10. APPLICATION STATE MACHINE

Implement an explicit high-level application flow.

Recommended conceptual states:

```ts
type AppFlowState =
  | "BOOT"
  | "INTRO"
  | "MAIN_MENU"
  | "SETTINGS"
  | "HELP"
  | "GAME_LOADING"
  | "PLAYING"
  | "PAUSED";
```

If the project already has a navigation architecture, integrate with it.

Do not introduce a large navigation dependency solely for four simple screens unless there is a clear architectural reason.

Frame-level game simulation state must remain separate from application/navigation state.

## Critical invariant

The gameplay engine must NOT automatically start on application mount.

Only:

```text
PLAY / START GAME
```

from the Main Menu may transition the application into gameplay.

---

# 11. BOOT SCREEN

The boot state exists only long enough to load what is required for the intro/menu safely.

Responsibilities:

- initialize save/settings data;
- prepare essential visual assets;
- determine graphics/settings state;
- prepare the intro scene;
- avoid a white flash;
- avoid showing partially initialized gameplay.

Keep this stage fast.

Do not display technical loading information to the player.

A minimal branded loading state is acceptable if loading exceeds a noticeable threshold.

---

# 12. SQUADFIRE INTRO — CREATIVE DIRECTION

Create a short, highly polished cinematic introduction.

## Desired experience

The game opens into a stylized futuristic battlefield.

The visual language should match the existing high-fidelity SquadFire gameplay style:

- cinematic war atmosphere;
- robots/combat units;
- blue-side vs red-side visual language;
- tracer fire;
- muzzle flashes;
- sparks;
- controlled explosions;
- smoke/haze;
- silhouettes moving through the battlefield;
- strong depth;
- dramatic but mobile-friendly lighting.

The intro must feel like:

```text
WAR IS ALREADY HAPPENING
↓
THE PLAYER IS ENTERING THAT WAR
↓
SQUADFIRE IDENTITY IS REVEALED
```

Do not create a generic corporate splash screen.

---

# 13. INTRO SEQUENCE — RECOMMENDED TIMELINE

Target total duration:

```text
approximately 5–7 seconds
```

It must feel fast and premium, not long or annoying.

## Beat 1 — Establishing war scene

Approx:

```text
0.0s – 1.5s
```

Show:

- dark/atmospheric opening;
- battlefield silhouettes;
- blue and red robot forces;
- distant tracer rounds;
- subtle sparks/explosions;
- camera slowly pushing forward.

## Beat 2 — Combat intensifies

Approx:

```text
1.5s – 3.5s
```

Show:

- robots moving through frame;
- multiple straight projectile streaks;
- muzzle flashes;
- one controlled explosion;
- particles;
- a brief near-camera projectile or impact;
- camera movement that creates energy without causing motion sickness.

## Beat 3 — Logo reveal

Approx:

```text
3.5s – 5.5s
```

Use combat action to transition into the title.

Reveal:

# SQUADFIRE

The logo should feel integrated into the scene.

Possible treatment:

- light flash from an explosion;
- smoke clears;
- SQUADFIRE title emerges;
- small sparks/tracers continue in background.

Do not obscure the logo with excessive particles.

## Beat 4 — Transition

Approx:

```text
5.5s – 6.5s
```

Transition smoothly into the Main Menu.

No hard white flash.

No abrupt navigation jump.

---

# 14. INTRO SKIP BEHAVIOR

The intro should appear on a cold application launch.

Allow skipping after the initial branding moment.

Recommended:

```text
skip enabled after approximately 1.0–1.5 seconds
```

A subtle:

```text
TAP TO SKIP
```

may appear.

Do not require watching the full intro every time.

Returning from:

- Settings;
- Help;
- Gameplay;
- Pause;

must NOT replay the intro.

A future setting may allow intro replay from Help/About, but this is not required now.

---

# 15. INTRO PERFORMANCE RULES

The introduction must not create a second heavy game engine if the existing renderer can be reused.

Prefer:

- reuse of the current rendering stack;
- pooled particles;
- lightweight animated battlefield composition;
- controlled number of actors;
- preloaded critical assets;
- deterministic timeline.

Do not create hundreds of robots solely for the intro.

The illusion of war can come from:

- foreground actors;
- background silhouettes;
- particles;
- tracer layers;
- light flashes;
- depth;
- sound when available.

If true 3D/video introduces unnecessary complexity, use the existing high-fidelity 2.5D pipeline.

---

# 16. INTRO AUDIO

If the current project already has a compatible audio layer, the intro may use:

- distant gunfire;
- mechanical movement;
- short explosion;
- cinematic impact;
- short SquadFire logo sting.

If audio is not yet implemented and adding it would expand scope/dependencies significantly:

```text
DO NOT block this version on audio
```

Build the intro architecture with an audio cue interface so sound can be added cleanly later.

Respect saved:

```text
musicEnabled
sfxEnabled
```

when those settings exist.

---

# 17. MAIN MENU — REQUIRED STRUCTURE

After the intro, show the SquadFire Main Menu.

The game must remain on this screen until the player explicitly chooses an action.

Required initial options:

```text
PLAY
SETTINGS
HELP
EXIT
```

Use localization keys from the beginning.

Example:

```text
menu.play
menu.settings
menu.help
menu.exit
```

This prevents hardcoded language from becoming technical debt.

---

# 18. MAIN MENU VISUAL DIRECTION

The menu must look like part of the game, not a standard mobile app.

## Background

Use a polished animated or semi-animated SquadFire war scene.

Examples:

- bridge/battlefield in distance;
- player robots/soldiers standing ready;
- subtle smoke;
- distant tracer fire;
- occasional light flicker/explosion;
- slow camera/parallax movement.

The background must remain less visually intense than gameplay so menu text stays readable.

## Logo

Show:

# SQUADFIRE

Prominently in the upper or upper-middle visual area.

The logo/title must be one of the strongest visual elements.

## Buttons

Recommended hierarchy:

```text
PLAY
SETTINGS
HELP
EXIT
```

`PLAY` must clearly be the primary action.

Buttons should be:

- large;
- touch-friendly;
- game-like;
- dimensional or visually polished;
- consistent with SquadFire's blue/cyan visual language;
- readable on small devices;
- safe-area aware.

Avoid productivity-app cards.

Avoid tiny text buttons.

---

# 19. PLAY BUTTON

Pressing:

```text
PLAY
```

must:

1. prevent duplicate taps;
2. transition to `GAME_LOADING`;
3. initialize/reset the run intentionally;
4. load the appropriate level;
5. transition into `PLAYING`;
6. preserve saved settings;
7. never replay the app intro.

For the current prototype, PLAY may start the existing test/current level.

Future level-selection architecture can be added separately.

---

# 20. SETTINGS SCREEN

Create a dedicated Settings screen/panel.

Initial functional options should be limited to settings that are meaningful now or architecturally safe.

Recommended:

```text
Music
Sound Effects
Haptics
Screen Shake
Graphics Quality
```

Potential values:

```text
Music: On / Off
SFX: On / Off
Haptics: On / Off
Screen Shake: On / Reduced / Off
Graphics Quality: Auto / High / Medium / Low
```

Do not expose a setting that does absolutely nothing unless clearly marked as not yet available.

Persist supported settings in the existing save/settings layer.

Changes should take effect without requiring an application restart when feasible.

Provide:

```text
BACK
```

to return to Main Menu.

---

# 21. GRAPHICS QUALITY SETTING

If the project can safely support it, Graphics Quality should control configurable visual budgets rather than loading completely separate games.

Example configuration concepts:

```ts
qualityPreset
particleBudget
shadowQuality
waterEffectsQuality
maxDecorativeEffects
renderScale
```

Do not reduce gameplay simulation correctness on lower graphics presets.

For example:

```text
LOW GRAPHICS
```

may reduce particles or environment detail, but it must NOT reduce:

- enemy count logically;
- projectile collision;
- soldier count;
- gameplay speed;
- damage calculations.

---

# 22. HELP SCREEN

Create a concise visual Help screen.

Initial sections:

## Movement

```text
DRAG LEFT / RIGHT
```

Explain:

> Move the squad horizontally to align your firing lanes.

## Shooting

Explain:

> Soldiers fire automatically straight forward. There is no normal auto-aim.

## Squad

Explain:

> Adding soldiers increases the number of weapons and projectile streams.

## Gates

Explain:

> Move through a gate to choose its upgrade.

Keep Help concise.

Prefer simple diagrams/icons/animations over large blocks of text where practical.

Provide:

```text
BACK
```

to return to Main Menu.

---

# 23. EXIT BEHAVIOR — PLATFORM SAFETY

The product owner wants an EXIT option.

Implement this carefully because iOS and Android behave differently.

## Android

The Exit button may:

1. show confirmation;
2. if confirmed, use the platform-supported Android application exit/back behavior.

Example confirmation:

```text
Exit SquadFire?
CANCEL | EXIT
```

## iOS

Do NOT programmatically terminate the iOS application.

Do not use unsupported/private APIs.

Recommended production behavior:

- hide the Exit option on iOS;

OR, if product requirements require the label to remain visible:

- explain the platform limitation in a non-disruptive way rather than force-closing the app.

Preferred recommendation:

```text
Android menu:
PLAY
SETTINGS
HELP
EXIT

iOS menu:
PLAY
SETTINGS
HELP
```

Document this platform-specific behavior.

---

# 24. MENU TRANSITIONS

Transitions must feel deliberate and premium.

Use short animations such as:

```text
fade
subtle scale
camera/parallax transition
controlled slide
```

Recommended duration:

```text
150–350 ms for menu interactions
```

Avoid:

- slow 1-second UI animations;
- hard instant cuts everywhere;
- excessive bouncing;
- generic web-page transitions.

The intro-to-menu transition may be longer because it is cinematic.

---

# 25. SAFE AREA AND DEVICE SUPPORT

All Intro/Menu UI must respect:

- iPhone Dynamic Island / notch;
- Android display cutouts;
- top safe area;
- bottom gesture area;
- different 9:16 and taller portrait ratios.

Do not position buttons using one fixed screenshot size.

Use responsive layout constraints.

The visual composition should scale from common phone widths without destroying the logo/button hierarchy.

---

# 26. PAUSE BUTTON IN GAMEPLAY

The existing gameplay pause button should no longer behave like a technical control.

Pressing Pause should open a game-styled pause overlay.

Minimum options:

```text
RESUME
SETTINGS
MAIN MENU
```

Do not add EXIT directly to gameplay unless there is a clear reason.

`MAIN MENU` should request confirmation if leaving would discard the current run:

```text
Leave this run?
Progress in this run will be lost.

CANCEL | MAIN MENU
```

This can be included in the same menu-flow version if the current Pause control already exists.

---

# 27. NAVIGATION / STATE RULES

Required valid transitions:

```text
BOOT → INTRO
INTRO → MAIN_MENU

MAIN_MENU → GAME_LOADING
GAME_LOADING → PLAYING

MAIN_MENU → SETTINGS
SETTINGS → MAIN_MENU

MAIN_MENU → HELP
HELP → MAIN_MENU

PLAYING → PAUSED
PAUSED → PLAYING
PAUSED → SETTINGS
PAUSED → MAIN_MENU
```

Invalid transition examples:

```text
APP LAUNCH → PLAYING
SETTINGS → PLAYING
HELP → PLAYING
```

unless explicitly entered from a paused gameplay context and handled intentionally.

If Settings may be opened from both Main Menu and Pause, preserve a return target:

```ts
settingsReturnTarget: "MAIN_MENU" | "PAUSED"
```

---

# 28. PERSISTENCE

Persist appropriate menu/settings values.

Example:

```ts
interface PlayerSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  hapticsEnabled: boolean;
  screenShakeMode: "ON" | "REDUCED" | "OFF";
  graphicsQuality: "AUTO" | "HIGH" | "MEDIUM" | "LOW";
}
```

Use existing versioned save-data architecture.

If schema changes:

- increment schema version;
- add migration;
- preserve old saves.

Do not wipe progress.

---

# 29. DEPENDENCY POLICY

Before adding any dependency for:

- navigation;
- animation;
- audio;
- cinematic playback;
- graphics;

the Agent must:

1. explain why it is needed;
2. check if the existing stack already provides the capability;
3. verify current Expo compatibility;
4. verify React Native compatibility;
5. verify iOS support;
6. verify Android support;
7. state whether Expo Go still works;
8. state whether a Development Build becomes required;
9. document the dependency.

Do not install a new navigation framework merely to implement four simple screens if the current architecture can handle them cleanly.

---

# 30. IMPLEMENTATION PLAN

## VERSION A — Straight Fire + Alignment

### A1. Pre-change checkpoint

- inspect current Git status;
- commit current stable state;
- create non-destructive checkpoint tag.

### A2. Canonical road basis

Add/confirm:

```text
roadForward
roadRight
```

Use these for:

- formation;
- soldier facing;
- projectile direction;
- debug vectors.

### A3. Soldier orientation

- force forward-facing body orientation;
- fix incorrect local sprite/model yaw;
- remove target/velocity-driven body rotation;
- ensure all soldiers visually face toward the road's vanishing direction.

### A4. Formation

- rows perpendicular to road;
- columns parallel to road;
- cap horizontal width;
- add rows for squad growth;
- maintain road bounds.

### A5. Straight fire

- remove normal auto-targeting;
- preserve per-soldier timers;
- fire continuously;
- spawn at individual muzzle;
- capture forward vector at shot time;
- collision-only damage.

### A6. Boss/enemy honesty

- remove squad-seeking horizontal drift;
- boss uses slow bounded patrol;
- no boss auto-targeting by player weapons.

### A7. Debug overlay

Validate:

- body forward;
- muzzle point;
- forward vector;
- projectile vector/path;
- hitboxes.

### A8. Tests

Run Tests A–E and performance regression.

### A9. Docs + tag

Update documentation.

Commit and semantic-version tag.

STOP.

---

## VERSION B — Intro + Main Menu

### B1. Pre-change checkpoint

Create a checkpoint from the completed stable Straight-Fire version.

### B2. AppFlow state

Implement:

```text
BOOT
INTRO
MAIN_MENU
SETTINGS
HELP
GAME_LOADING
PLAYING
PAUSED
```

Remove automatic start of gameplay.

### B3. Intro

Create the 5–7 second SquadFire war cinematic:

- robots;
- war scene;
- straight tracer fire;
- muzzle flashes;
- sparks;
- explosion;
- atmospheric depth;
- SquadFire logo reveal;
- smooth menu transition;
- skip capability.

### B4. Main Menu

Add:

```text
PLAY
SETTINGS
HELP
EXIT (platform-aware)
```

with polished animated background.

### B5. Settings

Implement functional supported settings with persistence.

### B6. Help

Explain the actual core controls:

```text
Drag to aim by positioning.
Shots travel straight.
More soldiers = more firing lanes.
Choose gates by moving through them.
```

### B7. Pause integration

Add:

```text
Resume
Settings
Main Menu
```

if current pause functionality exists.

### B8. QA

Test:

- cold boot;
- intro complete;
- intro skip;
- menu idle;
- every menu option;
- settings persistence;
- Help return;
- Play starts gameplay only once;
- returning to menu;
- Android Exit;
- iOS platform-safe behavior;
- safe areas;
- iOS/Android;
- Expo Go status;
- performance.

### B9. Docs + tag

Update docs, commit, semantic-version tag, STOP.

---

# 31. ACCEPTANCE CRITERIA — VERSION A

The Straight-Fire/Alignment version is complete only when:

- every soldier visually faces straight forward;
- no player soldier appears persistently sideways;
- body orientation does not change during horizontal drag;
- formation is visually straight and symmetrical;
- formation does not drift diagonally;
- each soldier has an independent muzzle;
- each soldier has an independent firing timer;
- all standard rifle vectors are parallel in world space;
- standard rifle has no auto-aim;
- enemies outside projectile lanes can be missed;
- dragging into alignment creates hits;
- existing projectiles do not follow later drag movement;
- boss requires manual alignment;
- squad growth increases projectile count;
- squad growth stays within formation width limits;
- existing graphics quality is not degraded;
- stress/performance budget remains acceptable.

---

# 32. ACCEPTANCE CRITERIA — VERSION B

The Intro/Menu version is complete only when:

- application never begins directly in gameplay;
- cold launch goes through BOOT → INTRO → MAIN_MENU;
- intro visibly depicts robots/combat in a war setting;
- intro includes believable projectile/tracer action and VFX;
- SQUADFIRE title/logo receives a clear cinematic reveal;
- intro can be skipped after the allowed initial moment;
- returning to menu does not replay intro;
- Main Menu remains idle until user chooses an action;
- PLAY starts gameplay;
- SETTINGS works and persists supported options;
- HELP explains the actual straight-fire/drag gameplay;
- EXIT follows platform rules;
- menu is visually part of the SquadFire universe;
- menu does not look like a generic mobile app;
- all controls respect safe areas;
- no accidental duplicate game initialization occurs;
- no navigation loop occurs;
- existing combat architecture remains intact.

---

# 33. MASTER PROMPT TO SEND TO REPLIT

Copy the full prompt below into Replit after reviewing the current plan.

```text
You are the Lead Mobile Game Engineer, Gameplay Engineer, Technical Art Director, UI/UX Game Designer, Rendering Engineer, QA Engineer and Software Architect for SquadFire.

We have reviewed the current "Straight-Fire Manual Aiming System" implementation plan.

The plan is directionally correct, but it must be refined and executed in TWO SEPARATE VERSIONED PHASES.

DO NOT attempt to perform both phases in one uncontrolled implementation.

==================================================
PHASE A — STRAIGHT FIRE + FORWARD SOLDIER ALIGNMENT
==================================================

First complete the current Straight-Fire work.

PRIMARY GAMEPLAY RULE:

PLAYER DRAG = AIM THROUGH POSITIONING.

There is NO standard player auto-aim.

Standard rifle projectiles do NOT select enemies.

Standard rifle projectiles do NOT rotate toward enemies.

Standard rifle projectiles do NOT home, snap, magnetize, steer, or receive hidden aim correction.

Each living soldier fires continuously STRAIGHT FORWARD from its own weapon muzzle.

Every projectile deals damage only if its actual collision path intersects an enemy.

CRITICAL VISUAL FIX:

The player soldiers currently appear too sideways/diagonal.

This must be corrected.

Every standard player soldier must visually:

FACE FORWARD
RUN FORWARD
FIRE FORWARD
STRAFE LEFT/RIGHT

Horizontal player drag moves the soldier positions but does NOT rotate their bodies.

Do not derive body orientation from:
- drag direction;
- horizontal velocity;
- enemy target;
- formation slot;
- projectile direction.

Create or confirm a canonical battlefield basis:

roadForward
roadRight

Soldier body heading must align with roadForward.

Formation rows must be perpendicular to roadForward.
Formation columns must be parallel to roadForward.

The squad must appear straight, symmetrical and organized.

If the current character asset itself is authored at a sideways angle, do NOT rotate the whole formation to compensate.

Instead fix the asset's local visual orientation using a local rotation/yaw offset or replace the visual with a correctly authored forward-facing variant.

Do not accept a final build where the soldiers still appear persistently sideways.

PROJECTILE DIRECTION:

The authoritative direction is world/battlefield roadForward.

Do not blindly hardcode screen-space vertical unless the current projection guarantees equivalence.

Conceptually:

direction = normalize(roadForward)
projectile.velocity = direction * projectileSpeed

For 2.5D rendering:
world direction → projection → screen rendering.

All standard rifle projectiles must be parallel in WORLD SPACE.

PER-SOLDIER FIRING MUST BE PRESERVED:

1 living soldier
=
1 character
+
1 weapon
+
1 muzzle
+
1 independent firing timer
+
1 independent projectile source

Do not create one shared squad emitter.

Adding new soldiers must add new projectile streams.

Do not reset existing soldiers' firing timers when the squad grows.

Preserve the current cadence phase distribution.

PROJECTILE INDEPENDENCE:

At the moment of firing:

projectile.position = that soldier's muzzle position
projectile.velocity = current roadForward * projectileSpeed

After spawn, later squad drag must NOT modify the projectile.

Old bullets continue along their original path.
New bullets spawn from the squad's new position.

REMOVE NORMAL PLAYER TARGETING:

Search for and remove/bypass normal rifle dependencies on:

resolveTarget
nearestEnemy
targetEnemy
assignTarget
directionToTarget
aimAt
targetId
homing
tracking
magnetic aim
aim correction
reservation / overkill targeting

Do not leave dormant competing targeting logic active in parallel.

Enemy AI may still independently react to the player.

FORMATION WIDTH:

Keep configurable:

formationHorizontalSpacing
formationLongitudinalSpacing
formationMaxWidth
formationMaxColumns / rowCapacity

When the squad becomes large, add rows instead of endlessly widening the squad.

A 50-soldier squad must NOT automatically cover the entire road.

Manual horizontal positioning must remain important.

BOSS:

The boss is not automatically targeted.

Use a bounded, slow, readable horizontal patrol with short dwell periods.

The player must drag left/right to keep projectile lanes aligned with the boss.

Standing off-axis must produce misses.

Do not make patrol speed frustrating.

DEBUG:

Developer-only overlay must visualize:

- roadForward;
- roadRight;
- soldier body forward;
- muzzle points;
- actual projectile vectors and paths;
- enemy/boss hitboxes;
- individual fire timer information where practical.

TESTS:

Preserve and implement the current plan's Tests A–E:

A:
Static multi-soldier squad → parallel fire lanes.

B:
Enemy far right + squad far left → zero damage.
Drag into alignment → damage begins.

C:
Moving enemy → takes damage only while crossing actual firing lanes.

D:
Squad growth → additional soldiers add independent projectile sources without resetting existing timers.

E:
Drag after shot → old projectile path remains unchanged; only future projectile origins move with squad.

Also test:

1 soldier
5 soldiers
10 soldiers
25 soldiers
50 soldiers

Verify visual forward alignment at every size.

Run existing cadence, timer, stress and performance tests.

Do not reduce current graphics quality to make tests pass.

VERSION CONTROL:

Before modifying:
create a safe pre-change checkpoint commit/tag.

After implementation:
update all relevant docs;
commit;
create the next valid semantic version tag according to repository history;
STOP.

Do not begin Phase B until Phase A is stable.

==================================================
PHASE B — APPLICATION INTRO + MAIN MENU
==================================================

Only after Phase A is completed, tested, committed and tagged, proceed when explicitly instructed.

The game must NO LONGER automatically enter gameplay when the application launches.

Implement an explicit application flow:

BOOT
↓
INTRO
↓
MAIN_MENU
↓
GAME_LOADING
↓
PLAYING

Additional states:

SETTINGS
HELP
PAUSED

Recommended conceptual type:

type AppFlowState =
  | "BOOT"
  | "INTRO"
  | "MAIN_MENU"
  | "SETTINGS"
  | "HELP"
  | "GAME_LOADING"
  | "PLAYING"
  | "PAUSED";

Frame-level gameplay simulation state must remain separate from application/navigation state.

Do not install a new navigation dependency unless the current architecture genuinely requires it.

--------------------------------------------------
BOOT
--------------------------------------------------

BOOT initializes only what is necessary:

- saved settings;
- essential assets;
- graphics configuration;
- intro assets.

Avoid:
- white flash;
- partially initialized gameplay;
- technical loading UI.

Keep boot fast.

--------------------------------------------------
SQUADFIRE CINEMATIC INTRO
--------------------------------------------------

Create a premium 5–7 second cinematic opening.

VISUAL CONCEPT:

A futuristic SquadFire war is already underway.

Show:

- original stylized combat robots / robotic soldiers;
- blue-side forces;
- red-side forces;
- battlefield depth;
- muzzle flashes;
- straight tracer fire;
- sparks;
- controlled explosions;
- smoke/haze;
- moving silhouettes;
- cinematic lighting;
- subtle camera push/parallax.

The intro must visually belong to the SAME art direction as gameplay.

Do NOT create a generic corporate splash screen.

TIMELINE:

0.0–1.5 sec:
establish battlefield and opposing robot forces.

1.5–3.5 sec:
combat intensifies with tracer fire, muzzle flashes, sparks and one controlled explosion.

3.5–5.5 sec:
use the combat event/light/smoke to reveal:

SQUADFIRE

Make the title visually strong and readable.

5.5–6.5 sec:
smoothly transition to Main Menu.

Avoid a hard white flash.

INTRO SKIP:

Allow skipping after approximately 1.0–1.5 seconds.

A subtle "Tap to Skip" is acceptable.

Intro should play on cold launch.

Returning from gameplay/settings/help must NOT replay the intro.

PERFORMANCE:

Reuse the current rendering stack wherever possible.

Do not create a second heavyweight rendering engine only for the intro.

Use:
- pooled particles;
- controlled actors;
- layered depth;
- tracer effects;
- silhouettes;
- lighting;
- parallax;

to create the illusion of a larger war.

Do not require hundreds of active actors.

AUDIO:

If a compatible audio system already exists, optionally add:
- distant gunfire;
- mechanical motion;
- explosion;
- short logo sting.

If audio requires significant new scope/dependencies, prepare clean cue interfaces and do not block this version on audio.

--------------------------------------------------
MAIN MENU
--------------------------------------------------

After intro:

show a proper game Main Menu.

The application must stay here until the user explicitly selects an action.

Required actions:

PLAY
SETTINGS
HELP
EXIT

Use localization keys instead of hardcoding user-facing labels.

PLAY must be the primary visual action.

MENU ART DIRECTION:

The menu must look like part of SquadFire.

Use a premium animated/semi-animated battlefield background:

- subtle war environment;
- robots/soldiers ready for battle;
- distant tracers;
- controlled smoke;
- subtle environmental motion;
- restrained explosions/light effects;
- depth/parallax.

Do not make it as visually busy as active gameplay.

Show the SQUADFIRE logo prominently.

Buttons must be:
- large;
- touch friendly;
- polished;
- game-like;
- safe-area aware;
- consistent with the blue/cyan SquadFire identity.

Do NOT create:
- productivity app cards;
- technical panels;
- developer status text;
- generic web navigation.

--------------------------------------------------
PLAY
--------------------------------------------------

PLAY:

1. prevents duplicate activation;
2. enters GAME_LOADING;
3. intentionally creates/resets the run;
4. loads the current/default level;
5. enters PLAYING;
6. does not replay Intro.

The gameplay engine must never initialize a run simply because the root application mounted.

--------------------------------------------------
SETTINGS
--------------------------------------------------

Implement a dedicated Settings screen.

Initial supported options:

Music
Sound Effects
Haptics
Screen Shake
Graphics Quality

Suggested values:

Music: On / Off
SFX: On / Off
Haptics: On / Off
Screen Shake: On / Reduced / Off
Graphics Quality: Auto / High / Medium / Low

Only expose options that can be functional or safely persisted.

Graphics Quality may control visual budgets such as:

particleBudget
shadowQuality
waterEffectsQuality
decorativeEffectBudget
renderScale

Graphics settings must NOT change gameplay simulation correctness.

Do not change:
- logical enemy count;
- collision logic;
- damage;
- game speed;
- logical soldier count.

Persist supported settings using the existing versioned save architecture.

Add schema migration if necessary.

Provide BACK to return to the correct previous state.

If Settings is opened from Pause, preserve the return target.

--------------------------------------------------
HELP
--------------------------------------------------

Create a concise Help screen explaining the real gameplay:

MOVEMENT:
Drag left/right to reposition the squad.

AIMING:
Your position is your aim.
Normal shots travel straight forward.
There is no standard auto-aim.

SQUAD:
Each soldier adds another weapon and projectile stream.

GATES:
Move through a gate to choose its upgrade.

Prefer concise visual explanations/diagrams over text walls.

Provide BACK to Main Menu.

--------------------------------------------------
EXIT
--------------------------------------------------

The product requires Exit.

Handle it safely by platform.

ANDROID:

Show confirmation:

Exit SquadFire?
CANCEL | EXIT

Then use supported Android app-exit/back behavior.

iOS:

Do NOT programmatically terminate the application.

Preferred production behavior:
hide EXIT on iOS.

Therefore:

Android:
PLAY
SETTINGS
HELP
EXIT

iOS:
PLAY
SETTINGS
HELP

Document this platform difference.

Do not use private/unsupported APIs to force-close iOS.

--------------------------------------------------
PAUSE FLOW
--------------------------------------------------

If the current gameplay already has Pause, integrate it.

Pause menu:

RESUME
SETTINGS
MAIN MENU

MAIN MENU should confirm if leaving discards the active run.

Example:

Leave this run?
Progress in this run will be lost.

CANCEL | MAIN MENU

--------------------------------------------------
VALID APPLICATION TRANSITIONS
--------------------------------------------------

BOOT → INTRO
INTRO → MAIN_MENU

MAIN_MENU → GAME_LOADING
GAME_LOADING → PLAYING

MAIN_MENU → SETTINGS
SETTINGS → MAIN_MENU

MAIN_MENU → HELP
HELP → MAIN_MENU

PLAYING → PAUSED
PAUSED → PLAYING
PAUSED → SETTINGS
PAUSED → MAIN_MENU

APP LAUNCH → PLAYING is forbidden.

--------------------------------------------------
SAFE AREA / MOBILE RESPONSIVENESS
--------------------------------------------------

Support:

- iPhone Dynamic Island/notch;
- Android cutouts;
- top safe area;
- bottom gesture area;
- multiple portrait aspect ratios.

Do not position the interface for only one screenshot/device size.

--------------------------------------------------
DEPENDENCIES
--------------------------------------------------

Before adding any dependency:

1. explain why it is required;
2. check whether existing stack already provides it;
3. verify Expo version compatibility;
4. verify React Native compatibility;
5. verify iOS;
6. verify Android;
7. state Expo Go compatibility;
8. state Development Build requirement;
9. update DEPENDENCIES documentation.

Do not install a large navigation/audio/rendering package without justification.

--------------------------------------------------
PHASE B ACCEPTANCE TESTS
--------------------------------------------------

Test:

1. cold application launch;
2. BOOT → INTRO;
3. full Intro playback;
4. Intro skip;
5. smooth Intro → Main Menu;
6. Main Menu idle state;
7. PLAY starts gameplay exactly once;
8. SETTINGS navigation;
9. settings persistence after reload;
10. HELP navigation;
11. Help accurately explains straight-fire drag aiming;
12. return to Main Menu;
13. gameplay Pause;
14. Pause → Settings → Pause;
15. Pause → Main Menu;
16. Android Exit confirmation/behavior;
17. iOS safe behavior;
18. Dynamic Island/notch;
19. Android cutout;
20. Expo Go status;
21. iOS/Android rendering;
22. no performance regression.

--------------------------------------------------
DOCUMENTATION
--------------------------------------------------

Update:

docs/ARCHITECTURE.md
docs/GAME_DESIGN.md
docs/FIRING_SYSTEM.md
docs/BALANCE.md
docs/TEST_PLAN.md
docs/PROJECT_STATE.md
docs/DEPENDENCIES.md
replit.md

Create if useful:

docs/APP_FLOW.md
docs/INTRO_AND_MENU.md

Document:

- application state machine;
- Intro timeline;
- menu hierarchy;
- settings schema;
- platform Exit behavior;
- navigation transitions;
- safe-area behavior.

--------------------------------------------------
VERSION CONTROL
--------------------------------------------------

Create a checkpoint before Phase B.

After all Phase B acceptance tests pass:

commit;
create the next semantic version tag;
do not overwrite existing tags;
STOP.

--------------------------------------------------
FINAL NON-NEGOTIABLES
--------------------------------------------------

1. The game must never auto-start on launch.
2. Cold launch must present SquadFire identity before gameplay.
3. The cinematic must depict robots/combat/war, not a generic splash.
4. Main Menu must exist before gameplay.
5. Player soldiers must remain visually straight and forward-facing.
6. Horizontal drag must never rotate the player soldiers.
7. Normal shots remain straight-forward and collision-based.
8. No standard auto-aim may return during menu/intro work.
9. Every living soldier remains an independent firing source.
10. Existing high-fidelity graphics must not regress.
11. Menu/UI must look like a game, not an app dashboard.
12. iOS must not be force-terminated.
13. Complete one semantic version at a time.
14. Test, document, commit, tag and STOP before continuing.
```

---

# 34. FINAL RECOMMENDATION

Do not ask the Agent to modify the current Straight-Fire implementation and build the entire Intro/Menu system in the same coding pass.

Use this sequence:

```text
CURRENT STABLE VERSION
        ↓
STRAIGHT FIRE + SOLDIER ALIGNMENT
        ↓
TEST
        ↓
COMMIT / TAG
        ↓
INTRO + MAIN MENU
        ↓
TEST
        ↓
COMMIT / TAG
```

The separation matters because the first change touches:

- simulation;
- projectile logic;
- formation;
- rendering alignment;
- collision;
- boss behavior.

The second change touches:

- application lifecycle;
- navigation;
- persistence;
- UI;
- cinematic rendering;
- menu flow.

Keeping them isolated makes regressions much easier to diagnose and preserves the project's version history.
