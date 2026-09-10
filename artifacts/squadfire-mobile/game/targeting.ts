/**
 * Target allocation.
 *
 *  1. candidates = enemies inside the soldier's forward cone
 *  2. score by forward distance + weighted lateral offset (keeps firing lanes tidy:
 *     a left-flank soldier prefers left-side enemies)
 *  3. skip enemies whose reserved incoming damage already kills them (overkill
 *     reduction) unless nothing else is available
 *  4. while the boss is alive every soldier targets the boss, with a per-soldier aim
 *     offset so streams converge on different points of the body
 */
import { TARGETING } from './balance';
import type { Boss, Enemy, Soldier, TargetKind } from './types';

export interface TargetResolution {
  kind: TargetKind;
  id: number | null;
}

export function resolveTarget(
  soldier: Soldier,
  enemies: Enemy[],
  boss: Boss,
  out: TargetResolution = { kind: null, id: null },
): TargetResolution {
  if (boss.active && boss.alive && boss.death === 0) {
    out.kind = 'boss';
    out.id = 0;
    return out;
  }

  let best: Enemy | null = null;
  let bestScore = Infinity;
  let fallback: Enemy | null = null;
  let fallbackScore = Infinity;

  const sx = soldier.pos.x;
  const sy = soldier.pos.y;

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.alive || e.death > 0) continue;
    const dy = e.pos.y - sy;
    if (dy < TARGETING.minForward) continue;
    const dx = e.pos.x - sx;
    const adx = dx < 0 ? -dx : dx;
    // Forward cone: allowed lateral offset grows with distance, plus a small base width.
    if (adx > 0.25 + dy * TARGETING.coneSlope) continue;
    const score = dy + adx * TARGETING.lateralWeight;
    const lethalReserved = e.reserved >= e.hp;
    if (lethalReserved) {
      if (score < fallbackScore) {
        fallbackScore = score;
        fallback = e;
      }
      continue;
    }
    if (score < bestScore) {
      bestScore = score;
      best = e;
    }
  }

  const pick = best ?? fallback;
  if (!pick) {
    out.kind = null;
    out.id = null;
    return out;
  }
  out.kind = 'enemy';
  out.id = pick.id;
  return out;
}
