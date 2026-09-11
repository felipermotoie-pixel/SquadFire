---
name: Squad Power vs visible roster
description: Why strength and drawn soldiers are two numbers with one reconciler, and the traps around it (v0.4.0+).
---
Rule: `squadPower` (0..500) is canonical; the drawn roster is derived 10:1 (1–9 → normals, then P10 units + one partial, ≤ 50 visible). Only the engine reconciler may change the living roster; formation, clamp, pool sizing and renderer keep using the *visible* count.

**Why:** 50 sprites / ~530 bullets in flight is the measured raster+pool budget; power 500 keeps the growth fantasy without 500 entities. A P10 unit fires the same cadence with 10× bullet damage — identical theoretical DPS to 10 normals, but heavy overkill on 20–120 HP regulars (≈ 53 % of output in the measured run).

**How to apply:** any new power source/sink must call the reconciler (never touch `soldiers` directly); a change in visible count must reassign slots and clamp the anchor in the same frame (see formation-clamp-sync). Dev/test presets latch `progressEligible = false` — the campaign wrapper is the only writer of the save and only for eligible runs. Spec quirk: representation 13 → P10 + P3 (2 visible), not 1×P10 + 3 normals.
