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

interface Scenario {
  name: string;
  seconds: number;
  debug?: boolean;
  setup?: (g: Game) => void;
}

const scenarios: Scenario[] = [
  { name: '01-opening', seconds: 4 },
  { name: '02-midgame', seconds: 26 },
  {
    name: '03-squad-25',
    seconds: 6,
    setup: (g) => {
      g.setSquadSize(25);
    },
  },
  {
    name: '04-boss',
    seconds: 4,
    setup: (g) => {
      g.scripted = true;
      g.setSquadSize(14);
      g.spawnBoss();
      g.boss.pos.y = 3.4;
    },
  },
  {
    name: '06-gates',
    seconds: 2,
    setup: (g) => {
      g.scripted = true;
      g.setSquadSize(8);
      g.spawnGatePair({ kind: 'squad', amount: 5 }, { kind: 'damage', multiplier: 2 }, 3.2);
    },
  },
  {
    name: '05-debug-overlay',
    seconds: 5,
    debug: true,
    setup: (g) => {
      g.setSquadSize(10);
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
      g.setSquadSize(n);
    },
  })),
  {
    // Test B in pictures: squad parked left, enemy wall on the right — lanes miss.
    name: '08-off-axis-miss',
    seconds: 3,
    debug: true,
    setup: (g) => {
      g.scripted = true;
      g.setSquadSize(10);
      g.setInputX(-0.45);
      for (let i = 0; i < 6; i++) {
        const e = g.spawnEnemy('grunt', 0.55 + (i % 3) * 0.15, 2.6 + Math.floor(i / 3) * 0.5);
        e.speed = 0;
      }
    },
  },
];

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
      `${sc.name}: ${file}  soldiers=${game.squadSize} enemies=${game.stats.activeEnemies} projectiles=${game.stats.activeProjectiles} shots/s=${game.stats.shotsPerSecond} record+raster=${(drawMs / 30).toFixed(1)}ms/frame (CPU)`,
    );
  }
}

main();
