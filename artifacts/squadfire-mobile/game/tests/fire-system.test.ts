/**
 * Headless verification of the straight-fire per-soldier system.
 * Run: pnpm run test:sim   (bundles with esbuild, executes with node)
 *
 * Scenarios mirror the straight-fire brief:
 *   TEST A  static squad → parallel lanes, no auto-aim
 *   TEST B  off-axis enemy is missed, then hit after the player drags the squad
 *   TEST C  a laterally moving enemy is hit only while it crosses a lane
 *   TEST D  +3 soldiers doubles the projectile streams without resetting timers
 *   TEST E  bullets already in flight are not affected by a later drag
 * plus: boss is never auto-targeted, enemies never drift toward the squad,
 * formation alignment at 1/5/10/25/50, cadence, the section-44 acceptance test,
 * muzzle alignment, performance and the 500-projectile stress case.
 */
import { Game } from '../engine';
import { BOSS, ENEMIES, PROJECTILES, ROAD_FORWARD, ROAD_LENGTH, SQUAD, WEAPONS } from '../balance';
import { anchorLimitFor, formationLayout, formationSlots } from '../formation';
import type { Projectile, ShotEvent } from '../types';

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

/** An immortal, motionless enemy at a fixed position. */
function parkEnemy(g: Game, x: number, y: number, kind: 'grunt' | 'elite' = 'grunt') {
  const e = g.spawnEnemy(kind, x, y);
  e.hp = 1e9;
  e.maxHp = 1e9;
  e.speed = 0;
  e.sizeVariation = 1;
  return e;
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
const FORWARD_EPS = 1e-9;

// TEST A — static squad: parallel lanes straight up the road -----------------
{
  const g = makeGame(10);
  run(g, 1); // settle into formation
  const shots = run(g, 5);
  const layout = formationLayout(10);
  check('A: soldiers fire with no enemies present', shots.length > 0 && distinct(shots.map((s) => s.soldierId)) === 10, `${shots.length} shots from ${distinct(shots.map((s) => s.soldierId))} soldiers`);
  const allForward = shots.every((s) => Math.abs(s.direction.x) < FORWARD_EPS && Math.abs(s.direction.y - 1) < FORWARD_EPS);
  check('A: every shot direction is exactly ROAD_FORWARD', allForward, allForward ? 'direction = (0, 1) for all shots' : 'a shot left the forward axis');
  // Each soldier keeps one fixed lane.
  let laneJitter = 0;
  const bySoldier = new Map<number, number[]>();
  for (const s of shots) bySoldier.set(s.soldierId, [...(bySoldier.get(s.soldierId) ?? []), s.origin.x]);
  for (const xs of bySoldier.values()) laneJitter = Math.max(laneJitter, Math.max(...xs) - Math.min(...xs));
  check('A: each soldier keeps a fixed lane', laneJitter < 1e-3, `max lane drift per soldier = ${laneJitter.toExponential(2)}`);
  const lanes = distinct(shots.map((s) => s.origin.x.toFixed(3)));
  check('A: lane count equals formation columns', lanes === layout.columns, `${lanes} lanes for ${layout.columns} columns × ${layout.rows} rows`);
  // Projectiles in flight never leave their lane.
  let off = 0;
  for (const p of g.projectiles) if (p.active) off = Math.max(off, Math.abs(p.x - p.originX));
  check('A: in-flight projectiles stay on their lane', off < FORWARD_EPS, `max |x - originX| = ${off.toExponential(2)}`);
}

// TEST B — off-axis enemy: miss, then hit after a drag ------------------------
{
  const g = makeGame(1);
  parkEnemy(g, 0.7, 3.0);
  run(g, 4);
  const missedShots = g.stats.shotsFired;
  const hitsBefore = g.stats.hits;
  check('B: bullets miss an enemy outside the lane', missedShots > 4 && hitsBefore === 0, `${missedShots} shots fired, ${hitsBefore} hits (enemy at x=0.7, lane at x≈0)`);
  g.setInputX(0.7);
  run(g, 3);
  check('B: dragging the squad onto the enemy produces hits', g.stats.hits > 0, `${g.stats.hits} hits after drag (anchor ${g.anchorX.toFixed(2)}, limit ±${g.anchorLimit.toFixed(2)})`);
}

// Missed bullets live until they leave the road ------------------------------
{
  const g = makeGame(1);
  run(g, 0.6);
  const p: Projectile | undefined = g.projectiles.find((x) => x.active);
  let lastY = 0;
  let steps = 0;
  while (p && p.active && steps < 2000) {
    lastY = p.y;
    g.advance(1 / 120);
    steps++;
  }
  const flew = lastY >= ROAD_LENGTH + PROJECTILES.farExit - WEAPONS.rifle.projectileSpeed / 120 - 1e-6;
  check('Miss: projectile survives to the road exit', !!p && flew, `last y ${lastY.toFixed(2)} (road end ${ROAD_LENGTH} + ${PROJECTILES.farExit})`);
}

// TEST C — moving enemy is hit only while crossing the lane -------------------
{
  const g = makeGame(1);
  const e = parkEnemy(g, -0.9, 3.0);
  run(g, 1);
  const laneX = g.soldiers[0].pos.x; // one soldier: lane == soldier x (muzzle offset is checked separately)
  const hitXs: number[] = [];
  let lastHits = g.stats.hits;
  let insideFrames = 0;
  let inside = 0;
  const dt = 1 / 60;
  for (let t = 0; t < 6; t += dt) {
    e.pos.x = -0.9 + (1.8 * t) / 6; // scripted lateral crossing
    g.advance(dt);
    if (Math.abs(e.pos.x - laneX) <= ENEMIES.grunt.hitRadius) insideFrames++;
    if (g.stats.hits > lastHits) {
      hitXs.push(e.pos.x);
      lastHits = g.stats.hits;
    }
  }
  const worst = hitXs.reduce((m, x) => Math.max(m, Math.abs(x - laneX)), 0);
  const insideCount = hitXs.filter((x) => Math.abs(x - laneX) <= ENEMIES.grunt.hitRadius + 0.02).length;
  inside = insideCount;
  check('C: moving enemy hit only while inside the lane', hitXs.length > 0 && inside === hitXs.length, `${hitXs.length} hits, worst |enemy.x - lane| = ${worst.toFixed(3)} (hit radius ${ENEMIES.grunt.hitRadius}); inside ${insideFrames} frames`);
}

// Enemies never drift toward the squad --------------------------------------
{
  const g = makeGame(1);
  g.setInputX(-0.6);
  const e = g.spawnEnemy('grunt', 0.8, 5.5);
  e.hp = 1e9;
  const x0 = e.pos.x;
  let maxDev = 0;
  for (let i = 0; i < 240; i++) {
    g.advance(1 / 60);
    maxDev = Math.max(maxDev, Math.abs(e.pos.x - x0));
  }
  check('Enemy: no lateral pressure toward the squad', maxDev < 0.08, `max lateral deviation ${maxDev.toFixed(3)} with squad parked at ${g.anchorX.toFixed(2)}`);
}

// TEST D — +3 soldiers doubles the streams, timers untouched ------------------
{
  const g = makeGame(3);
  run(g, 1);
  const before = run(g, 5);
  const timersBefore = g.soldiers.map((s) => s.nextShotAt);
  g.applyEffect({ kind: 'squad', amount: 3 });
  const timersAfter = g.soldiers.slice(0, 3).map((s) => s.nextShotAt);
  const untouched = timersBefore.every((t, i) => t === timersAfter[i]);
  run(g, 1);
  const after = run(g, 5);
  check('D: +3 doubles firing sources', distinct(after.map((s) => s.soldierId)) === 6, `${distinct(after.map((s) => s.soldierId))} shooters after gate`);
  check('D: +3 ≈ doubles projectile rate', approx(after.length / Math.max(1, before.length), 2, 0.25), `${before.length} → ${after.length} shots per 5s`);
  check('D: existing timers not reset', untouched, untouched ? 'original 3 timers preserved' : 'timers were reset');
  check('D: new soldiers form new lanes/rows', distinct(after.map((s) => s.origin.x.toFixed(3))) >= 3, `${distinct(after.map((s) => s.origin.x.toFixed(3)))} lanes`);
}

// TEST E — in-flight bullets ignore a later drag ------------------------------
{
  const g = makeGame(5);
  run(g, 1);
  const snapshot = g.projectiles
    .filter((p) => p.active)
    .map((p) => ({ ref: p, spawnTime: p.spawnTime, x: p.x, vx: p.vx, vy: p.vy, originX: p.originX }));
  g.setInputX(0.6);
  run(g, 0.25);
  let checked = 0;
  let changed = 0;
  for (const s of snapshot) {
    if (!s.ref.active || s.ref.spawnTime !== s.spawnTime) continue; // already left the road / recycled
    checked++;
    if (s.ref.vx !== s.vx || s.ref.vy !== s.vy || s.ref.x !== s.x || s.ref.originX !== s.originX) changed++;
  }
  const moved = Math.abs(g.anchorX) > 0.2;
  check('E: in-flight projectiles unaffected by drag', snapshot.length > 0 && checked > 0 && changed === 0 && moved, `${checked}/${snapshot.length} tracked projectiles unchanged after anchor moved to ${g.anchorX.toFixed(2)}`);
}

// Boss: never auto-targeted, hit only when a lane crosses its hitbox ---------
{
  const g = makeGame(1);
  g.setInputX(0.7);
  run(g, 1); // park the lane on the right before the boss shows up
  g.spawnBoss();
  g.boss.pos.y = BOSS.holdY;
  g.boss.pos.x = -0.4;
  g.boss.patrolTargetX = -0.4;
  g.boss.patrolDwell = 1e9;
  const shots = run(g, 5);
  const allForward = shots.every((s) => Math.abs(s.direction.x) < FORWARD_EPS);
  check('Boss: not auto-targeted (lane off the boss = no damage)', g.boss.hp === g.boss.maxHp && allForward && shots.length > 4, `boss hp ${g.boss.hp}/${g.boss.maxHp}, ${shots.length} straight shots`);
  g.setInputX(-0.4);
  run(g, 3);
  check('Boss: damaged when the lane crosses its hitbox', g.boss.hp < g.boss.maxHp, `boss hp ${g.boss.hp.toFixed(0)}/${g.boss.maxHp}`);
}

// Boss: slow bounded patrol with dwell, independent of the squad -------------
{
  const g = makeGame(1);
  g.spawnBoss();
  g.boss.pos.y = BOSS.holdY;
  g.setInputX(0.7);
  let minX = 1;
  let maxX = -1;
  let maxStep = 0;
  let dwellFrames = 0;
  let prev = g.boss.pos.x;
  for (let i = 0; i < 60 * 30; i++) {
    g.advance(1 / 60);
    const x = g.boss.pos.x;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    maxStep = Math.max(maxStep, Math.abs(x - prev) * 60);
    if (x === prev) dwellFrames++;
    prev = x;
  }
  const bounded = minX >= -BOSS.patrolRange - 1e-6 && maxX <= BOSS.patrolRange + 1e-6;
  check('Boss: bounded patrol with dwell', bounded && maxX - minX > 0.3 && maxStep <= BOSS.patrolSpeed + 0.02 && dwellFrames > 60, `x ∈ [${minX.toFixed(2)}, ${maxX.toFixed(2)}], speed ≤ ${maxStep.toFixed(2)}, dwell frames ${dwellFrames}, squad at ${g.anchorX.toFixed(2)}`);
}

// Formation alignment at 1 / 5 / 10 / 25 / 50 ---------------------------------
for (const n of [1, 5, 10, 25, 50]) {
  const slots = formationSlots(n);
  const layout = formationLayout(n);
  const rows = new Map<number, number[]>();
  for (const s of slots) rows.set(s.y, [...(rows.get(s.y) ?? []), s.x]);
  let symmetric = true;
  let widest = 0;
  for (const xs of rows.values()) {
    const sum = xs.reduce((a, b) => a + b, 0);
    if (Math.abs(sum) > 1e-9) symmetric = false;
    widest = Math.max(widest, Math.max(...xs) - Math.min(...xs));
  }
  const columns = distinct(slots.map((s) => s.x.toFixed(6)));
  const rearY = Math.min(...slots.map((s) => s.y));
  const onRoad = anchorLimitFor(n) + layout.halfWidth <= SQUAD.roadHalfWidth + 1e-9;
  check(
    `Formation ${n}: straight symmetric block`,
    slots.length === n && symmetric && widest <= SQUAD.formationMaxWidth + 1e-9 && columns <= SQUAD.formationMaxColumns && rows.size === layout.rows && rearY >= -SQUAD.formationMaxRearDepth - 1e-9 && onRoad,
    `${layout.columns} cols × ${layout.rows} rows, width ${widest.toFixed(2)}, rear y ${rearY.toFixed(2)}, anchor limit ±${anchorLimitFor(n).toFixed(2)}`,
  );
}

// Growth never removes a lane; columns unlock gradually and are capped --------------
{
  const cols = Array.from({ length: SQUAD.maxSize }, (_, i) => formationLayout(i + 1).columns);
  const monotonic = cols.every((c, i) => i === 0 || c >= cols[i - 1]);
  check(
    'Formation: growth never narrows the block, columns capped',
    monotonic && Math.max(...cols) === SQUAD.formationMaxColumns && cols[4] === 3 && cols[19] === 5,
    `columns 1..50 = ${cols.filter((_, i) => [0, 1, 2, 3, 4, 5, 8, 9, 18, 19, 24, 49].includes(i)).join('/')} (at 1/2/3/4/5/6/9/10/19/20/25/50)`,
  );
}

// Compact small-squad shapes from the brief -------------------------------------
{
  const shape = (n: number) => {
    const rows = new Map<number, number>();
    for (const s of formationSlots(n)) rows.set(s.y, (rows.get(s.y) ?? 0) + 1);
    return [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, c]) => c).join('+');
  };
  const got = [1, 2, 3, 4, 5, 6, 9, 20].map(shape);
  const want = ['1', '2', '1+2', '2+2', '3+2', '3+3', '3+3+3', '5+5+5+5'];
  check('Formation: small squads are compact (1, 2, wedge, 2×2, 3+2, 3×2, 3×3, 5×4)', got.join(' ') === want.join(' '), `front→back rows: ${got.join('  ')}`);
}

// Test A (compact) — 5 soldiers noticeably tighter than one full-width row --------
{
  const layout = formationLayout(5);
  const g = makeGame(5);
  run(g, 2);
  const xs = g.soldiers.map((s) => s.pos.x);
  const width = Math.max(...xs) - Math.min(...xs);
  check(
    'Test A (compact): 5 soldiers form a two-row block well inside the road',
    layout.rows === 2 && width < 0.5 && Math.max(...xs.map(Math.abs)) < SQUAD.roadHalfWidth - SQUAD.formationRoadMargin,
    `${layout.columns} cols × ${layout.rows} rows, width ${width.toFixed(2)} (was 1.00), outermost |x| ${Math.max(...xs.map(Math.abs)).toFixed(2)}`,
  );
}

// Tests B/C — full drag left/right keeps every soldier on the bridge --------------
for (const [label, dir] of [
  ['B (left edge)', -1],
  ['C (right edge)', 1],
] as const) {
  const g = makeGame(5);
  g.setInputX(dir * 5); // far beyond the clamp
  run(g, 2);
  const outer = Math.max(...g.soldiers.map((s) => Math.abs(s.pos.x)));
  const safe = SQUAD.roadHalfWidth - SQUAD.formationRoadMargin;
  const straight = run(g, 1).every((s) => s.direction.x === ROAD_FORWARD.x && s.direction.y === ROAD_FORWARD.y);
  check(`Test ${label}: outermost soldier stays inside the road, fire still straight`, outer <= safe + 0.02 && straight, `outermost |x| ${outer.toFixed(2)} ≤ ${safe.toFixed(2)}, anchor ${g.anchorX.toFixed(2)}`);
}

// Tests D/E — 20 and 50 soldiers: rows, capped width, meaningful drag --------------
for (const n of [20, 50]) {
  const layout = formationLayout(n);
  const g = makeGame(n);
  g.setInputX(1);
  run(g, 2);
  const outer = Math.max(...g.soldiers.map((s) => Math.abs(s.pos.x)));
  const shooters = distinct(run(g, 2).map((s) => s.soldierId));
  check(
    `Test ${n === 20 ? 'D' : 'E'}: ${n} soldiers add rows, width capped, drag meaningful, ${n} shooters`,
    layout.rows >= 4 && layout.halfWidth * 2 <= SQUAD.formationMaxWidth + 1e-9 && anchorLimitFor(n) >= 0.4 && outer <= SQUAD.roadHalfWidth - SQUAD.formationRoadMargin + 0.02 && shooters === n,
    `${layout.columns}×${layout.rows}, width ${(layout.halfWidth * 2).toFixed(2)}, safe ±${anchorLimitFor(n).toFixed(2)}, outermost |x| ${outer.toFixed(2)}, shooters ${shooters}`,
  );
}

// Perspective: world-straight lanes converge on screen, without steering ---------
{
  const g = makeGame(5);
  g.setInputX(0.4);
  run(g, 3);
  const p = g.projectiles.find((q) => q.active && q.originX > 0.4)!;
  const cam = g.cam;
  const sx0 = (p.originX - 0) * cam.halfWidthBase * (cam.focal / (p.originY + cam.focal));
  const sx1 = p.x * cam.halfWidthBase * (cam.focal / (p.y + cam.focal));
  check(
    'Perspective: projectile keeps world x while its screen x moves toward the vanishing point',
    Math.abs(p.x - p.originX) < 1e-9 && p.y > p.originY + 0.5 && sx1 < sx0 && p.vx === 0,
    `world x ${p.originX.toFixed(3)} → ${p.x.toFixed(3)}; screen offset ${sx0.toFixed(1)}px → ${sx1.toFixed(1)}px after ${(p.y - p.originY).toFixed(2)} units`,
  );
}

// Growth at the road edge clamps the smoothed anchor immediately ----------------
{
  const g = makeGame(1);
  g.setInputX(anchorLimitFor(1));
  run(g, 2);
  const before = g.anchorX;
  g.addSoldiers(4);
  g.advance(1 / 120);
  const limit = anchorLimitFor(5);
  const maxX = Math.max(...g.soldiers.map((s) => s.slot.x + g.anchorX));
  check(
    'Formation: growing at the edge keeps the whole block on the road at once',
    before > limit && Math.abs(g.anchorX) <= limit + 1e-9 && maxX <= SQUAD.roadHalfWidth + 1e-9,
    `anchor ${before.toFixed(2)} → ${g.anchorX.toFixed(2)} (limit ±${limit.toFixed(2)}), outermost slot x ${maxX.toFixed(2)}`,
  );
}

// Cadence ---------------------------------------------------------------------
{
  const g = makeGame(1);
  run(g, 1);
  const shots = run(g, 10);
  check('Cadence: one soldier fires ~2/s', approx(shots.length, 10 * R, 2), `${shots.length} shots in 10s (expected ~${10 * R})`);
  const gaps = shots.slice(1).map((s, i) => s.timestamp - shots[i].timestamp);
  const maxDev = Math.max(...gaps.map((gap) => Math.abs(gap - 1 / R)));
  check('Cadence: period matches the weapon', maxDev < 0.03, `max deviation from ${(1 / R).toFixed(3)}s period = ${maxDev.toFixed(4)}s`);
}
{
  const g = makeGame(3);
  run(g, 1);
  const shots = run(g, 10);
  const byFrame = new Map<number, number>();
  for (const s of shots) byFrame.set(Math.round(s.timestamp * 120), (byFrame.get(Math.round(s.timestamp * 120)) ?? 0) + 1);
  const bursts = [...byFrame.values()].filter((n) => n > 1).length;
  check('Cadence: 3 soldiers staggered (no same-frame volleys)', bursts === 0, `${bursts} simulation frames with >1 shot`);
}
{
  const g = makeGame(10);
  run(g, 1);
  const shots = run(g, 10);
  const byFrame = new Map<number, number>();
  for (const s of shots) byFrame.set(Math.round(s.timestamp * 120), (byFrame.get(Math.round(s.timestamp * 120)) ?? 0) + 1);
  const maxPerFrame = Math.max(...byFrame.values());
  check('Cadence: 10 soldiers ≈ 10× rate, no frame burst', approx(shots.length, 100 * R, 10) && maxPerFrame <= 3, `${shots.length} shots in 10s, max ${maxPerFrame} per 1/120s step`);
}

// Functional acceptance test (section 44) -----------------------------------
{
  const g = makeGame(1);
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
