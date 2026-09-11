# SquadFire — Squad Power & 10:1 stacking (v0.4.0)

## Two numbers, one source of truth
- **Squad Power** (`Game.squadPower`, 0..`MAX_SQUAD_POWER` = 500) is the canonical combat strength
  of the run. Gates add to it, enemy contact / boss slams subtract from it, defeat is power 0. The HUD
  shows `SQUAD n / 500`.
- **Visible soldiers** are *derived* from power by `representationFor(power)` (`game/squad-power.ts`):
  ```
  power 1..9  → one normal (P1) soldier per point
  power ≥ 10  → floor(power/10) "Power10" soldiers + at most ONE partial soldier (remainder)
  5 → 5 · 9 → 9 · 10 → 1×P10 · 13 → P10 + P3 (2 visible) · 100 → 10×P10 · 499 → 49×P10 + P9 (50) · 500 → 50×P10
  ```
  Visible count never exceeds `SQUAD.maxSize` = 50 (`assertRepresentationBounds()` is a test).
- `Soldier.representedPower` (1..10) is the unit's share; a soldier's projectile damage is
  `weapon.damage × mods.damage × representedPower`. Cadence never changes (2 shots/s × fire-rate mod),
  so **10 normals and 1 Power10 have identical theoretical DPS** (200 at base mods). What differs is
  overkill granularity: one 100-damage bullet on a 20-HP grunt wastes 80 (tracked in
  `stats.overkillDamage`; the Earth report shows ~53 % of raw output as overkill at power 13).

## The reconciler
Every power change goes through `syncRosterToPower(mode)`:
1. `target = representationFor(power)`; living soldiers are compared with the target length.
2. Too many → `'loss'` marks the surplus as casualties (death animation, `soldier-lost` event);
   `'gain' | 'preset'` removes them instantly with a cyan `squad-consolidate` pulse (VFX budget-capped).
3. Too few → new soldiers are created behind the anchor with golden-ratio fire phases.
4. Each survivor gets its `representedPower` from the target; a changed value starts a short
   `transformPulse` (renderer swells the sprite and tints it).
5. If the count changed: **formation slots are reassigned and the anchor + target are clamped in the
   same frame** (a 9 → 10 consolidation shrinks the block; the clamp must follow immediately or an
   edge-parked squad ends up off the road — see `formation-clamp-sync` in the agent memory).
6. Projectile pool requirement is recomputed from the visible count (max 50 → 780 bullets).

Entry points: `addSquadPower(n, fromGate)` (gates; clamps to the cap and reports the applied amount
so the gate label matches), `loseSquadPower(n, 'contact' | 'slam')`, `setSquadPower(n)` (presets and
tests; latches `progressEligible = false`). The living roster is only changed there; the only other
write to `soldiers` is `pruneRetiredSoldiers()`, which drops finished casualties (already excluded from
the represented roster).

## Gates and caps
Pairs cycle through `[+3 squad | ×1.25 FR]`, `[×1.5 DMG | +4 squad]`, `[+5 squad | ×2 DMG]`; first at
9 s, then every 12 s (`GATES`), paused while a boss is alive, timer shared across stages. Modifier
caps: damage ×3, fire rate ×2.5 (`MODIFIER_CAPS`); squad cap 500. A +squad gate is clamped to
`500 − power` at pair-creation time so the shown number is the applied number, and at power 500 the
squad side is replaced by the complementary modifier (never a +0 or dead squad gate). Modifier gates
at their cap are **not** swapped (unchanged v0.3.6 behaviour: the multiplier clamps, the gate still
shows its label) — changing that is gate-composition tuning (balance review option C). Side choice: the gate whose side matches the anchor sign
when the pair reaches the squad line (`anchorX < 0` → left).

## Rendering
`drawSoldier` scales a unit by `1 + 0.12 × representedPower / 10`, adds a stronger ground glow and a
cyan chest glow proportional to power, and swells/tints during `transformPulse`. Render harness scenes
`24-power-005/009/010/013/100/499/500`, `25-consolidate-9-to-10`, `26-edge-right-500/left-013`.

## Why 10:1
50 visible soldiers is the pool/formation/raster budget measured in v0.3.6 (≈ 530 bullets in flight,
~330 ms/frame on the CPU harness at 50). Power up to 500 keeps the growth fantasy for a 14-minute run
without drawing 500 sprites or firing 1000 bullets/s. Cost: overkill against low-HP regulars, and a
much steeper effective DPS ramp than v0.3.6 — this is the main input to the v0.4.0 balance verdict.
