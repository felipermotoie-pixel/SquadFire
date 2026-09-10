/**
 * Headless verification of the per-soldier fire system.
 * Run: pnpm run test:sim   (bundles with esbuild, executes with node)
 *
 * Scenarios mirror the brief: TEST A (1 soldier), B (3), C (10), D (+5 gate),
 * E (boss with 20), and the functional acceptance test (1 → +4 → +25% fire rate).
 */
import { Game } from '../engine';
import { PROJECTILES, WEAPONS } from '../balance';
import type { ShotEvent } from '../types';

interface Result {
  name: string;
  pass: boolean;
  detail: string;
}

const results: Result[] = [];

function check(name: string, pass: boolean, detail: string): void {
  results.push({ name, pass, detail });
}

function makeGame(squad: number, seed = 7): Game {
  const g = new Game({ seed, initialSquad: squad });
  g.scripted = true;
  return g;
}

/** A wall of very tough enemies parked far away so targets never run out. */
function parkTargets(g: Game, count = 12): void {
  for (let i = 0; i < count; i++) {
    const e = g.spawnEnemy('elite', -0.8 + (1.6 * i) / Math.max(1, count - 1), 3.2 + (i % 3) * 0.3);
    e.hp = 1e9;
    e.maxHp = 1e9;
    e.speed = 0;
  }
}

function run(g: Game, seconds: number, dt = 1 / 60): ShotEvent[] {
  const shots: ShotEvent[] = [];
  const off = g.onShot((s) => shots.push(s));
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) g.advance(dt);
  off();
  return shots;
}

function distinct<T>(xs: T[]): number {
  return new Set(xs).size;
}

function approx(actual: number, expected: number, tolerance: number): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

const R = WEAPONS.rifle.fireRate;

// TEST A — 1 soldier ---------------------------------------------------------
{
  const g = makeGame(1);
  parkTargets(g);
  run(g, 1); // settle
  const shots = run(g, 10);
  check('A: one soldier fires ~2/s', approx(shots.length, 10 * R, 2), `${shots.length} shots in 10s (expected ~${10 * R})`);
  check('A: single muzzle', distinct(shots.map((s) => s.soldierId)) === 1, `${distinct(shots.map((s) => s.soldierId))} distinct shooters`);
  const gaps = shots.slice(1).map((s, i) => s.timestamp - shots[i].timestamp);
  const maxDev = Math.max(...gaps.map((gap) => Math.abs(gap - 1 / R)));
  check('A: cadence matches weapon period', maxDev < 0.03, `max deviation from ${(1 / R).toFixed(3)}s period = ${maxDev.toFixed(4)}s`);
}

// TEST B — 3 soldiers --------------------------------------------------------
{
  const g = makeGame(3);
  parkTargets(g);
  run(g, 1);
  const shots = run(g, 10);
  check('B: three soldiers ≈ 3× rate', approx(shots.length, 30 * R, 4), `${shots.length} shots in 10s (expected ~${30 * R})`);
  check('B: three independent muzzles', distinct(shots.map((s) => s.soldierId)) === 3, `${distinct(shots.map((s) => s.soldierId))} shooters`);
  const origins = distinct(shots.map((s) => s.origin.x.toFixed(2)));
  check('B: origins are spatially distinct', origins >= 3, `${origins} distinct origin x values`);
  // Staggered: count how many frames contained more than one shot.
  const byFrame = new Map<number, number>();
  for (const s of shots) byFrame.set(Math.round(s.timestamp * 120), (byFrame.get(Math.round(s.timestamp * 120)) ?? 0) + 1);
  const bursts = [...byFrame.values()].filter((n) => n > 1).length;
  check('B: cadence staggered (no same-frame volleys)', bursts === 0, `${bursts} simulation frames with >1 shot`);
}

// TEST C — 10 soldiers -------------------------------------------------------
{
  const g = makeGame(10);
  parkTargets(g, 16);
  run(g, 1);
  const shots = run(g, 10);
  check('C: ten soldiers ≈ 10× rate', approx(shots.length, 100 * R, 10), `${shots.length} shots in 10s (expected ~${100 * R})`);
  check('C: ten firing sources', distinct(shots.map((s) => s.soldierId)) === 10, `${distinct(shots.map((s) => s.soldierId))} shooters`);
  const targets = distinct(shots.map((s) => s.targetId));
  check('C: targets distributed', targets >= 4, `${targets} distinct targets`);
  const byFrame = new Map<number, number>();
  for (const s of shots) byFrame.set(Math.round(s.timestamp * 120), (byFrame.get(Math.round(s.timestamp * 120)) ?? 0) + 1);
  const maxPerFrame = Math.max(...byFrame.values());
  check('C: no frame burst', maxPerFrame <= 3, `max shots in a single 1/120s step = ${maxPerFrame}`);
}

// TEST D — +5 gate -----------------------------------------------------------
{
  const g = makeGame(5);
  parkTargets(g, 16);
  run(g, 1);
  const before = run(g, 5);
  const timersBefore = g.soldiers.map((s) => s.nextShotAt);
  g.applyEffect({ kind: 'squad', amount: 5 });
  const timersAfter = g.soldiers.slice(0, 5).map((s) => s.nextShotAt);
  const untouched = timersBefore.every((t, i) => t === timersAfter[i]);
  run(g, 1); // formation stabilizes
  const after = run(g, 5);
  check('D: +5 doubles firing sources', distinct(after.map((s) => s.soldierId)) === 10, `${distinct(after.map((s) => s.soldierId))} shooters after gate`);
  check('D: +5 ≈ doubles projectile rate', approx(after.length / Math.max(1, before.length), 2, 0.25), `${before.length} → ${after.length} shots per 5s`);
  check('D: existing timers not reset', untouched, untouched ? 'original 5 timers preserved' : 'timers were reset');
}

// TEST E — boss with 20 soldiers --------------------------------------------
{
  const g = makeGame(20);
  g.spawnBoss();
  g.boss.pos.y = 3.1;
  run(g, 1);
  const shots = run(g, 10);
  const shooters = distinct(shots.map((s) => s.soldierId));
  const originSpread = Math.max(...shots.map((s) => s.origin.x)) - Math.min(...shots.map((s) => s.origin.x));
  check('E: 20 soldiers all fire at boss', shooters === 20 && shots.every((s) => s.targetKind === 'boss'), `${shooters} shooters, all boss targets`);
  check('E: origins distributed across formation', originSpread > 0.8, `origin x spread = ${originSpread.toFixed(2)} world units`);
  check('E: boss takes damage', g.boss.hp < g.boss.maxHp, `boss hp ${g.boss.hp.toFixed(0)}/${g.boss.maxHp}`);
}

// Functional acceptance test (section 44) -----------------------------------
{
  const g = makeGame(1);
  parkTargets(g, 16);
  run(g, 1);
  const phase1 = run(g, 10);
  g.applyEffect({ kind: 'squad', amount: 4 });
  run(g, 0.5);
  const phase2 = run(g, 10);
  g.applyEffect({ kind: 'fireRate', multiplier: 1.25 });
  run(g, 0.6);
  const phase3 = run(g, 10);
  check('44: 1 soldier → ~20 shots / 10s', approx(phase1.length, 20, 2), `${phase1.length}`);
  check('44: 5 soldiers → ~100 shots / 10s', approx(phase2.length, 100, 8), `${phase2.length}`);
  check('44: +25% fire rate → ~12.5 shots/s', approx(phase3.length / 10, 12.5, 1), `${(phase3.length / 10).toFixed(1)} shots/s`);
  check('44: five independent shooters', distinct(phase2.map((s) => s.soldierId)) === 5, `${distinct(phase2.map((s) => s.soldierId))}`);
}

// Muzzle alignment: origin must sit inside the owning soldier's sprite width --
{
  const g = makeGame(10);
  parkTargets(g, 16);
  run(g, 1);
  const shots = run(g, 3);
  let worst = 0;
  for (const s of shots) {
    const soldier = g.soldiers.find((x) => x.id === s.soldierId);
    if (!soldier) continue;
    worst = Math.max(worst, Math.abs(s.origin.x - soldier.pos.x));
  }
  check('Muzzle: origin within own sprite half-width', worst < 0.3, `max |origin.x - soldier.x| = ${worst.toFixed(3)} world units`);
}

// Performance: simulation step cost ----------------------------------------
{
  const scenarios = [
    { soldiers: 1, enemies: 30 },
    { soldiers: 10, enemies: 80 },
    { soldiers: 25, enemies: 150 },
    { soldiers: 50, enemies: 300 },
  ];
  for (const sc of scenarios) {
    const g = makeGame(sc.soldiers, 3);
    let remaining = sc.enemies;
    while (remaining > 0) {
      const n = Math.min(18, remaining);
      g.spawnEnemyGroup(n, (Math.random() - 0.5) * 1.2, 2.2 + Math.random() * 3.2, 0.15);
      remaining -= n;
    }
    // Keep them alive & on the field for the measurement.
    for (const e of g.enemies) {
      e.hp = 1e9;
      e.speed = 0.05;
    }
    run(g, 1);
    const frames = 600;
    const t0 = performance.now();
    let peak = 0;
    for (let i = 0; i < frames; i++) {
      const a = performance.now();
      g.advance(1 / 60);
      peak = Math.max(peak, performance.now() - a);
    }
    const avg = (performance.now() - t0) / frames;
    check(
      `Perf: ${sc.soldiers} soldiers / ${sc.enemies} enemies`,
      avg < 6,
      `avg sim ${avg.toFixed(2)} ms/frame, peak ${peak.toFixed(2)} ms, projectiles active ${g.stats.activeProjectiles}, shots/s ${g.stats.shotsPerSecond}`,
    );
  }
}

// Stress: 500+ projectiles in flight against a clustered wall of 300 enemies --
// the worst case for collision queries. Slower, longer-lived tracers are used so
// the fixed pool actually fills up (the real weapon never keeps this many alive).
{
  const savedSpeed = WEAPONS.rifle.projectileSpeed;
  const savedLifetime = PROJECTILES.lifetime;
  WEAPONS.rifle.projectileSpeed = 2.4;
  PROJECTILES.lifetime = 2.6;
  const g = makeGame(50, 3);
  g.applyEffect({ kind: 'fireRate', multiplier: 2.5 });
  for (let i = 0; i < 300; i++) g.spawnEnemy(i % 5 === 0 ? 'elite' : 'grunt', -0.3 + (i % 10) * 0.066, 5.0 + Math.floor(i / 10) * 0.027);
  for (const e of g.enemies) {
    e.hp = 1e9;
    e.speed = 0;
  }
  run(g, 3);
  const frames = 600;
  const t0 = performance.now();
  let peak = 0;
  let maxActive = 0;
  for (let i = 0; i < frames; i++) {
    const a = performance.now();
    g.advance(1 / 60);
    peak = Math.max(peak, performance.now() - a);
    maxActive = Math.max(maxActive, g.stats.activeProjectiles);
  }
  const avg = (performance.now() - t0) / frames;
  check(
    'Stress: 50 soldiers / 300 clustered enemies / 500+ projectiles',
    maxActive >= 500 && avg < 6,
    `avg sim ${avg.toFixed(2)} ms/frame, peak ${peak.toFixed(2)} ms, max projectiles active ${maxActive}, shots/s ${g.stats.shotsPerSecond}`,
  );
  WEAPONS.rifle.projectileSpeed = savedSpeed;
  PROJECTILES.lifetime = savedLifetime;
}

let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name} — ${r.detail}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
if (failed > 0) process.exit(1);
