/** Deterministic early-game balance probe. Real gates, collisions and stage progression. */
import { writeFileSync } from 'node:fs';
import { Game } from '../game/engine';
import { MAX_SQUAD_POWER, MODIFIER_CAPS } from '../game/balance';
import type { GateEffect } from '../game/types';

const rows: unknown[] = [];
const lastStage = Number(process.env.MEASURE_LAST_STAGE ?? 3);
for (const seed of [1337, 17, 29]) for (const policy of ['squad', 'damage', 'idle'] as const) {
  const g = new Game({ seed });
  const stages: unknown[] = [];
  let stageStart = 0, lost = 0, gained = 0, peakAlive = 0;
  const score = (e: GateEffect) => e.kind === 'squad' ? Math.min(MAX_SQUAD_POWER, g.squadPower + e.amount) * g.mods.damage * g.mods.fireRate :
    e.kind === 'damage' ? g.squadPower * Math.min(MODIFIER_CAPS.damageMax, g.mods.damage * e.multiplier) * g.mods.fireRate :
    g.squadPower * g.mods.damage * Math.min(MODIFIER_CAPS.fireRateMax, g.mods.fireRate * e.multiplier);
  for (let i = 0; i < 1800 * 60 && g.stage <= lastStage && g.phase !== 'defeat' && g.phase !== 'victory'; i++) {
    const left = g.gates.find((x) => !x.consumed && x.side === 'left' && x.y < 2.6);
    const right = left && g.gates.find((x) => !x.consumed && x.side === 'right' && Math.abs(x.y - left.y) < 1e-6);
    let target = 0;
    if (policy !== 'idle') {
      const nearest = g.enemies.filter((e) => e.alive && e.death === 0).sort((a,b) => a.pos.y - b.pos.y)[0];
      target = nearest?.pos.x ?? (g.boss.active && g.boss.alive ? g.boss.pos.x : g.targetAnchorX);
      if (left && right) {
        const chooseLeft = policy === 'squad' && (left.effect.kind === 'squad' || right.effect.kind === 'squad') ? left.effect.kind === 'squad' : score(left.effect) >= score(right.effect);
        target = chooseLeft ? -0.6 : 0.6;
      }
    }
    const before = g.squadPower;
    const stage = g.stage;
    g.setInputX(target);
    g.advance(1/60);
    gained += Math.max(0, g.squadPower - before);
    lost += Math.max(0, before - g.squadPower);
    peakAlive = Math.max(peakAlive, g.stats.activeEnemies);
    for (const event of g.drainEvents()) if (event.type === 'stage-clear') {
      stages.push({stage, seconds: +(g.time-stageStart).toFixed(1), power: g.squadPower, gained, lost, peakAlive});
      stageStart = g.time; gained = 0; lost = 0; peakAlive = 0;
    }
  }
  rows.push({seed, policy, outcome: g.stage > lastStage ? 'cleared-opening' : g.phase === 'playing' ? 'timeout' : g.phase, stage: g.stage, power: g.squadPower, stages, exhausted: g.stats.projectilePoolExhausted});
}
const json = JSON.stringify(rows, null, 2);
if (process.env.OPENING_REPORT) writeFileSync(process.env.OPENING_REPORT, json);
console.log(json);
