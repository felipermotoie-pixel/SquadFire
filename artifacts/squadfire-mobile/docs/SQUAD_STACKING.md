# SquadFire — Squad Power & 10:1 stacking (updated 2026-09-15)

Current user correction supersedes the former partial-unit representation and slow heavy bullets.
New runs and RETRY start with one normal blue soldier (`SQUAD.initialSize = 1`, 2026-09-15).

## Two numbers, one source of truth
- **Squad Power** (`Game.squadPower`, 0..`MAX_SQUAD_POWER` = 500) is the canonical combat strength
  of the run. Gates add to it, enemy contact / boss slams subtract from it, defeat is power 0. The HUD
  shows `SQUAD n / 500`.
- **Visible soldiers** are *derived* from power by `representationFor(power)` (`game/squad-power.ts`):
  ```
  power 1..9  → one normal (P1) soldier per point
  power ≥ 10  → floor(power/10) red "Power10" soldiers + power % 10 individual blue P1 soldiers
  5 → 5 · 9 → 9 · 10 → 1×P10 · 19 → P10 + 9×P1 (10 visible) · 29 → 2×P10 + 9×P1 (11 visible)
  499 → 49×P10 + 9×P1 (58 visible) · 500 → 50×P10
  ```
  Visible count never exceeds `SQUAD.maxSize` = 58 (`assertRepresentationBounds()` checks all 0..500).
- `Soldier.representedPower` is either 1 or 10. Cadence is
  `weapon.fireRate × mods.fireRate × representedPower`; projectile damage is `weapon.damage × mods.damage`.
  **10 normals and 1 Power10 have identical theoretical DPS** (200 at base mods).
  A normal fires 2 shots/s; P10 fires 20 shots/s, each dealing 10 damage before modifiers.
  At the fire-rate cap, P10 fires 50 shots/s. Power enters the calculation once, through cadence.
  All shots originate from the visible unit's muzzle and retain straight trajectories. Consolidation
  still changes the distribution of firing lanes. Old overkill and boss measurements are historical.

## The reconciler
Every power change goes through `syncRosterToPower(mode)`:
1. `target = representationFor(power)`; living soldiers are compared with the target length.
2. Too many → `'loss'` marks the surplus as casualties (death animation, `soldier-lost` event);
   `'gain' | 'preset'` removes them instantly with a cyan `squad-consolidate` pulse (VFX budget-capped).
3. Too few → new soldiers are created behind the anchor with golden-ratio fire phases.
4. Each survivor gets its `representedPower` from the target; a changed value starts a short
   `transformPulse` (renderer swells the sprite and tints it). Its remaining firing-cycle time scales
   by old represented power / new represented power; unchanged soldiers keep their timers.
5. If the count changed: **formation slots are reassigned and the anchor + target are clamped in the
   same frame** (a 9 → 10 consolidation shrinks the block; the clamp must follow immediately or an
   edge-parked squad ends up off the road — see `formation-clamp-sync` in the agent memory).
6. The camera determines the projectile pool budget using the conservative upper bound of 58 sources
   at P10 capped cadence. No active bullet is recycled. Formation still uses five columns and the
   same 0.72 depth budget; rows compress enough to fit all 58 visible units at power 499.

Entry points: `addSquadPower(n, fromGate)` (gates; clamps to the cap and reports the applied amount
so the gate label matches), `loseSquadPower(n, 'contact' | 'slam')`, `setSquadPower(n)` (presets and
tests; latches `progressEligible = false`). The living roster is only changed there; the only other
write to `soldiers` is `pruneRetiredSoldiers()`, which drops finished casualties (already excluded from
the represented roster).

## Gates and caps
Pairs are selected from `[+1 squad | ×1.15 FR]`, `[×1.2 DMG | +2 squad]`, `[+3 squad | ×1.3 DMG]`; first at
9 s, then every 18 s (`GATES`), paused while a boss is alive, timer shared across stages. Modifier
caps: damage ×3, fire rate ×2.5 (`MODIFIER_CAPS`); squad cap 500. A +squad gate is clamped to
`500 − power` at pair-creation time so the shown number is the applied number, and at power 500 the
squad side is replaced by the complementary modifier (never a +0 or dead squad gate). Modifier gates
at their cap are **not** swapped (unchanged v0.3.6 behaviour: the multiplier clamps, the gate still
shows its label) — changing that is gate-composition tuning (balance review option C). Side choice: the gate whose side matches the anchor sign
when the pair reaches the squad line (`anchorX < 0` → left).

## Rendering
`drawSoldier` uses a persistent red colour matrix for P10 armour and lights, preserving the original
sprite texture, transparency and silhouette. P1 keeps its blue appearance. P10 also keeps the existing
12% size boost and stronger glow. Splitting back to P1 restores blue immediately.
Render harness includes `24-power-019/020/029/499/500` and `25-consolidate-9-to-10`.

## Why 10:1
Only complete groups merge. This preserves the user's expected remainder count while reducing
500 soldiers to 50 sprites. The requested rapid fire increases projectile volume: up to 2500 shots/s
at power 500 and the fire-rate cap. Automated simulation tests verify pool capacity, cadence and
performance; actual device frame rate must be checked on the phone.

## Verification (2026-09-15)

- Typecheck passed; 67 firing/formation checks and 19 stage checks passed.
- Every power from 0 through 500 preserves the sum and the correct normal remainder.
- 9↔10 and 19↔20 merge/split regressions preserve cycle progress.
- Power 19 at 30/60/120 Hz, with base and capped cadence, produces one fast P10 plus nine P1 streams.
- Worst-case all-miss stress at power 500 produced 2500 shots/s, peak 5272 live projectiles,
  zero pool exhaustion. These are headless simulation results, not phone FPS.
