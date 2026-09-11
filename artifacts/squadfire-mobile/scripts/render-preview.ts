/**
 * Headless visual check: runs the real simulation + SceneRenderer through
 * CanvasKit (CPU raster) in Node and writes PNG frames. Used to review the look
 * of scenarios (early game, big squad, boss) without a device.
 *
 *   pnpm run render:preview            → /tmp/squadfire-preview/*.png
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { Skia } from '@shopify/react-native-skia';

import { SceneRenderer, type SceneAssets } from '../components/battlefield/SceneRenderer';
import { POWER_PER_UNIT } from '../game/balance';
import { Game } from '../game/engine';

const W = 402;
const H = 874;
const ROOT = process.env.SQUADFIRE_ROOT ?? process.cwd();
const OUT = process.env.OUT_DIR ?? '/tmp/squadfire-preview';

function loadImage(rel: string) {
  const data = Skia.Data.fromBytes(new Uint8Array(readFileSync(path.join(ROOT, rel))));
  const img = Skia.Image.MakeImageFromEncoded(data);
  if (!img) throw new Error(`Could not decode ${rel}`);
  return img;
}

function loadFont(rel: string, size: number) {
  const data = Skia.Data.fromBytes(new Uint8Array(readFileSync(path.join(ROOT, rel))));
  const tf = Skia.Typeface.MakeFreeTypeFaceFromData(data);
  if (!tf) throw new Error(`Could not load font ${rel}`);
  return Skia.Font(tf, size);
}

/**
 * Squad Power that renders exactly `visible` soldiers (1..9 → P1 each, 10+ → one P10
 * per 10 power). Legacy scenes are phrased in visible soldiers; the v0.4.0 scenes below
 * use raw power values.
 */
function pv(visible: number): number {
  return visible < POWER_PER_UNIT ? visible : visible * POWER_PER_UNIT;
}

interface Scenario {
  name: string;
  seconds: number;
  debug?: boolean;
  setup?: (g: Game) => void;
}

const scenarios: Scenario[] = [
  { name: '01-opening', seconds: 4 },
  { name: '02-midgame', seconds: 26 },
  // Stage system: Stage 3 with runners in the mix (director on, overlay shows the cursor).
  { name: '10-stage-03', seconds: 9, debug: true, setup: (g) => g.devJumpToStage(3) },
  // Stage 5 boss flow: enemies cleared instantly so the boss warning/entrance shows within the budget.
  {
    name: '10-stage-05-boss',
    seconds: 12,
    debug: true,
    setup: (g) => {
      g.setSquadPower(pv(12));
      g.devJumpToStage(5);
      // Skip the 75 s regular phase: drain the schedule and go straight to the warning.
      fastForwardToBoss(g);
    },
  },
  {
    name: '03-squad-25',
    seconds: 6,
    setup: (g) => {
      g.setSquadPower(pv(25));
    },
  },
  {
    name: '04-boss',
    seconds: 4,
    setup: (g) => {
      g.scripted = true;
      g.setSquadPower(pv(14));
      g.spawnBoss();
      g.boss.pos.y = 3.4;
    },
  },
  // ---- v0.4.0 scenes (§82) -------------------------------------------------------
  // Earth opening: real Stage 1, first far spawns arriving at the entry line.
  { name: '20-earth-opening', seconds: 6, debug: true },
  // Far spawn readability: a full group parked at the entry line, squad idle on the left.
  {
    name: '21-far-spawn',
    seconds: 1.2,
    debug: true,
    setup: (g) => {
      g.scripted = true;
      g.setSquadPower(5);
      g.setInputX(-0.6);
      const kinds = ['grunt', 'runner', 'elite'] as const;
      for (let i = 0; i < 6; i++) {
        const e = g.spawnEnemy(kinds[i % 3], 0.1 + (i % 3) * 0.28, g.geometry.enemySpawnDepth - Math.floor(i / 3) * 0.6);
        e.speed = 0;
      }
    },
  },
  // Stage 5 / Stage 10 boss warnings (banner + HUD state) and far boss entries.
  { name: '22-stage-05-warning', seconds: 0.9, debug: true, setup: (g) => { g.setSquadPower(60); g.devJumpToStage(5); fastForwardToBoss(g); } },
  { name: '22-stage-10-warning', seconds: 0.9, debug: true, setup: (g) => { g.setSquadPower(200); g.devJumpToStage(10); fastForwardToBoss(g); } },
  { name: '23-boss-far-entry-sub', seconds: 1.0, debug: true, setup: (g) => { g.scripted = true; g.setSquadPower(60); g.devJumpToStage(5); g.spawnBoss(); g.setInputX(-0.7); } },
  { name: '23-boss-far-entry-final', seconds: 1.0, debug: true, setup: (g) => { g.scripted = true; g.setSquadPower(200); g.devJumpToStage(10); g.spawnBoss(); g.setInputX(-0.7); } },
  { name: '23-boss-mid-approach', seconds: 5.0, debug: true, setup: (g) => { g.scripted = true; g.setSquadPower(60); g.devJumpToStage(5); g.spawnBoss(); g.setInputX(-0.7); } },
  // Squad Power representation ladder: 5 / 9 / 10 / 13 / 100 / 499 / 500.
  ...[5, 9, 10, 13, 100, 499, 500].map((power) => ({
    name: `24-power-${String(power).padStart(3, '0')}`,
    seconds: 2.6,
    debug: power >= 10 && power < 100,
    setup: (g: Game) => {
      g.scripted = true;
      g.setSquadPower(power);
    },
  })),
  // Consolidation moment: 9 → 10 caught mid-pulse, and the transform VFX.
  { name: '25-consolidate-9-to-10', seconds: 0.25, setup: (g) => { g.scripted = true; g.setSquadPower(9); for (let i = 0; i < 90; i++) g.advance(1 / 60); g.devAddSquadPower(1); } },
  // Edges at power: 500 dragged right, 13 dragged left.
  { name: '26-edge-right-500', seconds: 2.5, debug: true, setup: (g) => { g.scripted = true; g.setSquadPower(500); g.setInputX(5); } },
  { name: '26-edge-left-013', seconds: 2.5, debug: true, setup: (g) => { g.scripted = true; g.setSquadPower(13); g.setInputX(-5); } },
  {
    name: '06-gates',
    seconds: 2,
    setup: (g) => {
      g.scripted = true;
      g.setSquadPower(pv(8));
      g.spawnGatePair({ kind: 'squad', amount: 5 }, { kind: 'damage', multiplier: 2 }, 3.2);
    },
  },
  {
    name: '05-debug-overlay',
    seconds: 5,
    debug: true,
    setup: (g) => {
      g.setSquadPower(pv(10));
    },
  },
  // Straight-fire alignment checks: static squads at 1/5/10/25/50, no enemies,
  // debug overlay on so lanes, forward vectors and muzzle points are visible.
  ...[1, 5, 10, 25, 50].map((n) => ({
    name: `07-alignment-${String(n).padStart(2, '0')}`,
    seconds: 2.6,
    debug: true,
    setup: (g: Game) => {
      g.scripted = true;
      g.setSquadPower(pv(n));
    },
  })),
  // Edge tests B/C: 5 soldiers dragged fully left / right, and 20 soldiers dragged right.
  { name: '09-edge-left-05', seconds: 2.5, debug: true, setup: (g: Game) => { g.scripted = true; g.setSquadPower(pv(5)); g.setInputX(-5); } },
  { name: '09-edge-right-05', seconds: 2.5, debug: true, setup: (g: Game) => { g.scripted = true; g.setSquadPower(pv(5)); g.setInputX(5); } },
  { name: '09-edge-right-20', seconds: 2.5, debug: true, setup: (g: Game) => { g.scripted = true; g.setSquadPower(pv(20)); g.setInputX(5); } },
  {
    // Test B in pictures: squad parked left, enemy wall on the right — lanes miss.
    name: '08-off-axis-miss',
    seconds: 3,
    debug: true,
    setup: (g) => {
      g.scripted = true;
      g.setSquadPower(pv(10));
      g.setInputX(-0.45);
      for (let i = 0; i < 6; i++) {
        const e = g.spawnEnemy('grunt', 0.55 + (i % 3) * 0.15, 2.6 + Math.floor(i / 3) * 0.5);
        e.speed = 0;
      }
    },
  },
  {
    // Long-range readability: a column of enemies from the spawn line to mid-road,
    // no HUD/debug, squad parked so nothing gets shot before the frame is captured.
    name: '11-long-range',
    seconds: 1.2,
    setup: (g) => {
      g.scripted = true;
      g.setSquadPower(pv(8));
      g.setInputX(-0.6);
      const kinds = ['grunt', 'runner', 'elite'] as const;
      for (let i = 0; i < 9; i++) {
        const e = g.spawnEnemy(kinds[i % 3], 0.25 + (i % 3) * 0.28, 7.8 - i * 0.7);
        e.speed = 0;
      }
    },
  },
  // v0.3.6 compact formation: 5 / 20 / 50 soldiers centred and dragged to the right edge.
  ...[5, 20, 50].flatMap((n) => [
    { name: `12-compact-${String(n).padStart(2, '0')}-centre`, seconds: 2.6, setup: (g: Game) => { g.scripted = true; g.setSquadPower(pv(n)); } },
    { name: `12-compact-${String(n).padStart(2, '0')}-edge`, seconds: 2.6, debug: true, setup: (g: Game) => { g.scripted = true; g.setSquadPower(pv(n)); g.setInputX(5); } },
  ]),
  {
    // Full-range miss: 50 soldiers at the capped cadence, no enemies — every bullet
    // flies to farVisibleDepth. Worst case for tracer draw cost and the end-fade look.
    name: '13-full-range-miss-50',
    seconds: 4,
    setup: (g) => {
      g.scripted = true;
      g.setSquadPower(pv(50));
      g.applyEffect({ kind: 'fireRate', multiplier: 2.5 });
    },
  },
  {
    // Impact sparks: a 10-soldier block firing into a wall of immortal grunts mid-road.
    name: '14-impact-sparks',
    seconds: 2.4,
    setup: (g) => {
      g.scripted = true;
      g.setSquadPower(pv(10));
      for (let i = 0; i < 8; i++) {
        const e = g.spawnEnemy(i % 4 === 0 ? 'elite' : 'grunt', -0.45 + i * 0.13, 3.2 + (i % 2) * 0.3);
        e.speed = 0;
        e.hp = 1e9;
        e.maxHp = 1e9;
      }
    },
  },
];

/**
 * Drains the current stage's regular schedule instantly (spawn + kill) so a preview
 * reaches BOSS_WARNING within its frame budget. Dev-only: the run is already marked
 * ineligible by devJumpToStage.
 */
function fastForwardToBoss(g: Game): void {
  for (let i = 0; i < 60 * 120 && g.stageState !== 'BOSS_WARNING'; i++) {
    g.debugClearEnemies();
    g.advance(1 / 60);
    g.drainEvents();
    if (g.stageState === 'ACTIVE' && g.stageActiveTime < g.stageConfig.spawnWindowSec) {
      // jump the schedule clock forward by skipping frames cheaply
      for (let k = 0; k < 9; k++) {
        g.debugClearEnemies();
        g.advance(1 / 60);
        g.drainEvents();
      }
    }
  }
}

function main() {
  mkdirSync(OUT, { recursive: true });
  const assets: SceneAssets = {
    soldier: loadImage('assets/characters/player/soldier_blue.png'),
    grunt: loadImage('assets/characters/enemies/grunt_red.png'),
    boss: loadImage('assets/characters/bosses/boss_crimson.png'),
    horizon: loadImage('assets/environment/horizon_coastal.jpg'),
    displayFont: loadFont('node_modules/@expo-google-fonts/inter/900Black/Inter_900Black.ttf', 64),
    smallFont: loadFont('node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf', 12),
  };
  const renderer = new SceneRenderer(assets);
  const surface = Skia.Surface.Make(W, H);
  if (!surface) throw new Error('Could not create CPU surface');

  for (const sc of scenarios) {
    const game = new Game({ seed: 42, width: W, height: H });
    sc.setup?.(game);
    const frames = Math.round(sc.seconds * 60);
    let drawMs = 0;
    for (let i = 0; i < frames; i++) {
      game.advance(1 / 60);
      game.drainEvents();
      if (i >= frames - 30) {
        const t0 = performance.now();
        const rec = Skia.PictureRecorder();
        const c = rec.beginRecording(Skia.XYWHRect(0, 0, W, H));
        renderer.draw(c, game, 0, 0, sc.debug ?? false);
        const pic = rec.finishRecordingAsPicture();
        const canvas = surface.getCanvas();
        canvas.clear(Skia.Color('#000000'));
        canvas.drawPicture(pic);
        surface.flush();
        drawMs += performance.now() - t0;
      }
    }
    const img = surface.makeImageSnapshot();
    const bytes = img.encodeToBytes();
    const file = path.join(OUT, `${sc.name}.png`);
    writeFileSync(file, Buffer.from(bytes));
    console.log(
      `${sc.name}: ${file}  power=${game.squadPower} visible=${game.visibleSquadCount} enemies=${game.stats.activeEnemies} projectiles=${game.stats.activeProjectiles} shots/s=${game.stats.shotsPerSecond} record+raster=${(drawMs / 30).toFixed(1)}ms/frame (CPU)`,
    );
  }
}

main();
