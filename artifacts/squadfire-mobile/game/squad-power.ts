/**
 * Squad Power ↔ visible representation.
 *
 * Squad Power (0..MAX_SQUAD_POWER) is canonical. The visible squad is derived from it
 * with 10:1 compression:
 *
 *   power  1..9   → one normal soldier per power point (keeps the v0.3.6 opening)
 *   power ≥ 10    → floor(power / 10) "Power10" soldiers + at most ONE partial soldier
 *                   whose representedPower is the remainder
 *
 *   5 → 5 normals · 9 → 9 normals · 10 → 1×P10 · 13 → P10 + P3 · 29 → 2×P10 + P9
 *   99 → 9×P10 + P9 · 100 → 10×P10 · 499 → 49×P10 + P9 (50 visible) · 500 → 50×P10
 *
 * A soldier's damage per projectile is weapon damage × modifiers × representedPower;
 * cadence never changes. Ten P1 soldiers and one P10 soldier have identical
 * theoretical DPS.
 *
 * Pure functions only — the engine's roster reconciler consumes `representationFor`.
 */
import { MAX_SQUAD_POWER, POWER_PER_UNIT, SQUAD } from './balance';

export function clampSquadPower(power: number): number {
  const p = Math.floor(power);
  return p < 0 ? 0 : p > MAX_SQUAD_POWER ? MAX_SQUAD_POWER : p;
}

export function visibleUnitCount(power: number): number {
  const p = clampSquadPower(power);
  if (p <= 0) return 0;
  if (p < POWER_PER_UNIT) return p;
  const full = Math.floor(p / POWER_PER_UNIT);
  const rem = p % POWER_PER_UNIT;
  return full + (rem > 0 ? 1 : 0);
}

/**
 * Represented power of each visible soldier, in deterministic visual order: full
 * units first, the single partial (if any) last. Sums to `power`.
 */
export function representationFor(power: number): number[] {
  const p = clampSquadPower(power);
  const out: number[] = [];
  if (p <= 0) return out;
  if (p < POWER_PER_UNIT) {
    for (let i = 0; i < p; i++) out.push(1);
    return out;
  }
  const full = Math.floor(p / POWER_PER_UNIT);
  const rem = p % POWER_PER_UNIT;
  for (let i = 0; i < full; i++) out.push(POWER_PER_UNIT);
  if (rem > 0) out.push(rem);
  return out;
}

/** Summary of a representation for HUD/dev overlay/report. */
export interface PowerDistribution {
  visible: number;
  power10Units: number;
  /** representedPower of the single partial unit (0 = none). */
  partialPower: number;
  /** Normal (P1) soldiers, only non-zero below POWER_PER_UNIT. */
  normalUnits: number;
}

export function powerDistribution(power: number): PowerDistribution {
  const p = clampSquadPower(power);
  const rep = representationFor(p);
  let power10Units = 0;
  let partialPower = 0;
  let normalUnits = 0;
  for (const r of rep) {
    if (r === POWER_PER_UNIT) power10Units++;
    else if (p < POWER_PER_UNIT) normalUnits++;
    else partialPower = r;
  }
  return { visible: rep.length, power10Units, partialPower, normalUnits };
}

/** Compile-time-ish guard: the representation can never exceed the visible cap. */
export function assertRepresentationBounds(): void {
  for (let p = 0; p <= MAX_SQUAD_POWER; p++) {
    const rep = representationFor(p);
    if (rep.length > SQUAD.maxSize) throw new Error(`power ${p}: ${rep.length} visible > ${SQUAD.maxSize}`);
    if (rep.reduce((a, b) => a + b, 0) !== p) throw new Error(`power ${p}: representation does not sum`);
  }
}
