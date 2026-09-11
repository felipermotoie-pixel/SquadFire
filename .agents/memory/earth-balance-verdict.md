---
name: Earth balance verdict and harness
description: Why v0.4.0 was committed but not tagged, what the balance harness measures, and what not to change silently.
---
Rule: the Earth boss numbers (4500 / 18 000 HP), gate cadence (9 s + 12 s), modifier caps (×3 / ×2.5) and gate composition are **authored values under review** — do not tune them without the user's explicit choice among the report options (A boss HP, B gate frequency, C gate composition, D boss mechanics, E leave). Tag `v0.4.0` only after that decision.

**Why:** the harness (`pnpm run measure:earth`) showed both bosses dying during the far approach under the "balanced" Profile B (sub 2.1 s, final 7.8 s after spawn; 5 extra seeds agree). Root cause is structural: modifier caps are reached by Stage 4 and bullets reach the spawn line, so HP vs 7.5× DPS is the lever, not the approach speed (which hits its 10 s target). Stage pacing (run ≈ 13.9 min, deferred 0) is fine and should not be collateral damage.

**How to apply:** Profiles A/B/C in the harness are measurement-only policies (never player AI); keep the applied-effect assertion (exit code 2 on mismatch) when touching gates. Spawns are camera-derived (`computeSpawnGeometry`), never `ROAD_LENGTH`-based — a spawn line change must go through geometry so haze/road fade/grid follow. The scheduler defers on `maxAlive` and never drops; tests force that path via `maxAliveOverride` (which latches progress-ineligible).
