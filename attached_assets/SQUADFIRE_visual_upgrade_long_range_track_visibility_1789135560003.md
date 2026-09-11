# SQUADFIRE — VISUAL UPGRADE + LONG-RANGE TRACK VISIBILITY

## OBJECTIVE

Upgrade SquadFire's visual presentation significantly.

The goal is to make the game:
- more beautiful;
- more premium;
- more attractive;
- more realistic (stylized realism, not photorealism);
- more captivating;
- more immersive;
- more readable at long distance;
- more visually impressive on mobile.

This task is NOT about changing the core gameplay loop.

This task is about improving:
- visual quality;
- art direction;
- camera;
- perspective;
- scene composition;
- track readability;
- long-range enemy visibility;
- overall visual appeal.

---

# 1. CORE VISUAL GOAL

The current build already has the right gameplay foundation, but the visual presentation still needs to become more premium and more striking.

The game should feel closer to a polished commercial mobile game.

The player should immediately feel:
- strong depth;
- beautiful scenery;
- appealing characters;
- a more dramatic battlefield;
- cleaner perspective;
- better readability of enemies in the distance.

---

# 2. TRACK / ROAD VISIBILITY — MAIN REQUIREMENT

The road / bridge / track must visually extend much farther into the distance.

The player should be able to:
- see much more of the track ahead;
- perceive the end direction / horizon of the track;
- visually understand that enemies are coming from far away;
- see enemies entering from the far part of the road, not only when they are already near.

The scene must create a stronger feeling of:

```text
LONG BATTLEFIELD
DEPTH
DISTANCE
FORWARD ADVANCE
```

---

# 3. CAMERA REWORK

The camera must be adjusted to better show the full battlefield.

Desired behavior:
- portrait orientation preserved;
- elevated camera angle;
- camera looking forward along the bridge;
- stronger perspective depth;
- larger visible forward range;
- more of the distant track visible;
- horizon / vanishing point clearly readable;
- enemies visible much earlier.

The player squad remains readable near the lower area of the screen, but the camera must reveal much more of the road ahead.

The player should feel:

```text
"I can see far ahead."
"I can see enemies coming from the distance."
"I understand the whole battlefield better."
```

---

# 4. TRACK COMPOSITION

The bridge / road should feel longer and more premium.

Improve:
- road length perception;
- perspective convergence;
- depth layering;
- lane readability;
- environment scale.

The bridge should feel like it truly stretches into the horizon.

The visual end of the road should not feel abruptly cut.

Use the current environment direction, but increase the sense of scale.

---

# 5. ENEMY LONG-RANGE READABILITY

Enemies must be visible earlier.

The player should be able to see enemies appearing from far away at the upper portion of the track.

This requires:
- improved render/readability at long range;
- proper scale for distant enemies;
- good contrast against the road;
- visual silhouettes that remain readable even when small;
- clean spawn staging.

Enemies coming from far away should look intentional, not like tiny noise blobs.

---

# 6. CHARACTER VISUAL UPGRADE

## Player soldiers

Upgrade them to feel:
- more polished;
- more premium;
- more heroic;
- more readable;
- slightly more realistic while still stylized.

Improve:
- armor detail;
- silhouette;
- proportions;
- weapon readability;
- materials;
- shading;
- highlights;
- color separation;
- animation quality.

## Enemies

Improve:
- silhouette clarity;
- faction distinction;
- materials;
- visual personality;
- readability at distance.

The player must instantly distinguish allied blue squad from hostile red enemies.

---

# 7. STYLIZED REALISM

The visual direction should move toward stylized realism.

Meaning:
- not cartoon-flat;
- not primitive-shape characters;
- not overly toy-like;
- not photorealistic;
- but more believable and premium.

Use:
- stronger lighting;
- better materials;
- subtle shading variation;
- improved detail;
- controlled realism in surfaces and characters.

---

# 8. ENVIRONMENT BEAUTY PASS

Improve:
- water;
- sky;
- skyline;
- bridge surface;
- side rails;
- atmosphere;
- distant scenery.

## Water
- cleaner shading;
- subtle motion;
- premium color treatment;
- gentle reflections/highlights.

## Skyline / horizon
Make the far city / distant environment more attractive and believable.

It should enhance depth and scale, not just sit as a flat background.

---

# 9. DEPTH ENHANCEMENT

Increase the sense of depth using:
- perspective;
- atmospheric fade;
- controlled scale falloff;
- shadow scaling;
- clearer vanishing point;
- environment layering;
- long-range road convergence.

The player must immediately feel that the road extends far ahead.

---

# 10. SPAWN PRESENTATION

Enemy spawns should visually support the idea that enemies are coming from the far side of the battlefield.

Enemies should not just suddenly exist too close to the playable center.

Improve spawn presentation so enemies can begin appearing from the distant track area and move into the combat zone.

This means:
- better anticipation;
- clearer long-range visibility;
- improved battlefield readability.

---

# 11. RESPONSIVENESS / READABILITY GOAL

Visual responsiveness means:
- the player sees more of what is happening ahead;
- battlefield information becomes clearer sooner;
- threats can be read earlier;
- the track composition supports decision-making;
- the game feels more fluid and intentional.

---

# 12. PRESERVE GAMEPLAY

Do NOT break or redesign:
- straight-fire manual aiming;
- drag-to-position control;
- per-soldier firing;
- compact formation direction;
- collision-based damage;
- stage-based progression;
- boss milestones.

This task is primarily a visual/camera/world-presentation enhancement.

---

# 13. UI / HUD CLEANUP

Keep the HUD clean.

Ensure:
- stage label stays readable;
- pause button stays readable;
- instruction text does not overpower the visuals.

The battlefield should remain the visual focus.

---

# 14. TECHNICAL DIRECTION

Investigate and improve:
- camera distance / framing;
- vertical field of view;
- projection tuning;
- world-to-screen composition;
- render distance;
- long-range enemy scaling/readability;
- background layering;
- road geometry/perspective;
- spawn placement visibility;
- character detail level.

If necessary, adjust:
- road length illusion;
- visible combat lane depth;
- horizon composition;
- camera anchor position;
- environment scale.

Do NOT fake the result with only a background image.

The actual playable scene must feel deeper and longer.

---

# 15. ACCEPTANCE CRITERIA

## Battlefield visibility
1. the player can see much farther up the track;
2. the bridge feels longer;
3. the horizon / vanishing point is more readable;
4. the scene clearly communicates forward depth;
5. enemies can be seen earlier in the distance.

## Character appeal
6. player soldiers look more premium and attractive;
7. enemies look more polished and readable;
8. both factions are visually distinct;
9. character materials / shading are improved.

## Environmental quality
10. water looks better;
11. sky / skyline / distance look better;
12. bridge and rails look more premium;
13. the world feels more beautiful and immersive.

## Overall experience
14. the scene feels more realistic and captivating;
15. the game feels more visually impressive;
16. the player can better anticipate incoming enemies;
17. current gameplay mechanics still work correctly;
18. performance remains acceptable on target devices.

---

# 16. IMPLEMENTATION SEQUENCE

1. Inspect the current camera setup and determine why forward visibility is too limited.
2. Adjust camera framing / projection so more track is visible while preserving squad readability.
3. Improve road / bridge composition so the scene feels longer and more dramatic.
4. Improve distant enemy readability and spawn visibility.
5. Upgrade player soldier visuals.
6. Upgrade enemy visuals.
7. Apply environment beauty pass:
   - water
   - skyline
   - atmosphere
   - bridge
   - rails
8. Verify:
   - enemies visible earlier;
   - player still easy to control;
   - track easier to understand.
9. Run performance checks.
10. Update docs if needed, commit, and create the next valid semantic version tag.

Then STOP.

---

# 17. FINAL CREATIVE SUMMARY

The target experience is:

```text
Beautiful futuristic battlefield
+
Long visible bridge into the horizon
+
Premium stylized-realistic soldiers
+
Enemies visible from far away
+
Strong depth and perspective
+
More immersive and attractive presentation
```

The player should feel that they are advancing through a large battlefield, not just fighting in a short local segment of road.

The world should feel bigger, more beautiful, more polished, and more alive.
