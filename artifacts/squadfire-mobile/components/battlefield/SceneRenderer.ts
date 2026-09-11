/**
 * Imperative Skia renderer for the battlefield.
 *
 * Each frame the host records ONE SkPicture using this class (no React
 * reconciliation per entity). Paints, shaders and paths are cached and reused;
 * projectiles, shadows and sparks are batched into shared paths so a 50-soldier
 * squad with hundreds of tracers still costs a handful of draw calls.
 *
 * Draw order (back to front):
 *   backdrop → water → road → barriers → contact shadows → depth-sorted units & gates
 *   → tracers → VFX → haze → popups → (dev) debug overlay
 */
import {
  BlendMode,
  BlurStyle,
  ClipOp,
  FilterMode,
  MipmapMode,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkCanvas,
  type SkColorFilter,
  type SkFont,
  type SkImage,
  type SkPaint,
  type SkShader,
} from '@shopify/react-native-skia';

import { BOSS, ENEMIES, GATES, ROAD_FORWARD, ROAD_LENGTH, ROAD_RIGHT, SQUAD } from '@/game/balance';

/**
 * How far (world units) the causeway is drawn toward the horizon. Gameplay stays within
 * ROAD_LENGTH; the bridge keeps converging until it is a few pixels under the horizon
 * and dissolves in atmosphere, so the road never reads as "cut".
 */
const ROAD_FAR = 90;
/** Barrier modules are drawn individually up to here; beyond, a single simplified strip per side. */
const BARRIER_DETAIL_FAR = 16;
/** Light masts along the bridge: pitch in world units. Their shrinking cadence is the main depth cue. */
const MAST_PITCH = 4;
const UNIT_RECT = Skia.XYWHRect(0, 0, 1, 1);
/** Fraction of the skyline painting's height where its sea horizon sits (measured from the asset). */
const HORIZON_IMAGE_LINE = 0.635;
import { project, unitPx, type CameraLayout } from '@/game/camera';
import { gateBigNumber, gateSmallLabel, type Game } from '@/game/engine';
import { roadHalfWidthAt } from '@/game/formation';
import { emptyFrame, spriteFrame, type SpriteFrame } from '@/game/sprite-geometry';
import type { Enemy, Gate, Soldier } from '@/game/types';
import { BOSS_VISUAL, ENEMY_ELITE_VISUAL, ENEMY_GRUNT_VISUAL, PLAYER_SOLDIER_VISUAL } from '@/game/visuals';
import { PALETTE } from './palette';

export interface SceneAssets {
  soldier: SkImage | null;
  grunt: SkImage | null;
  boss: SkImage | null;
  horizon: SkImage | null;
  /** Bold display font at 64px (scaled on the canvas). */
  displayFont: SkFont | null;
  /** Small UI font at 14px for debug/popups. */
  smallFont: SkFont | null;
}

interface Renderable {
  kind: 0 | 1 | 2 | 3; // 0 enemy, 1 boss, 2 soldier, 3 gate
  index: number;
  y: number;
}

const DEG = 180 / Math.PI;
const byDepthDesc = (a: Renderable, b: Renderable) => b.y - a.y;

export class SceneRenderer {
  private assets: SceneAssets;
  private paint = Skia.Paint();
  private stroke = Skia.Paint();
  private glowPaint = Skia.Paint();
  private shadowPaint = Skia.Paint();
  private spritePaint = Skia.Paint();
  private flashPaint = Skia.Paint();
  private textPaint = Skia.Paint();
  private textShadowPaint = Skia.Paint();
  private tracerCore = Skia.Paint();
  private tracerGlow = Skia.Paint();
  private tracerCoreFar = Skia.Paint();
  private tracerGlowFar = Skia.Paint();
  private hazePaint = Skia.Paint();

  private shadowPath = Skia.Path.Make();
  private tracerPathNear = Skia.Path.Make();
  private tracerPathFar = Skia.Path.Make();
  private tmpPath = Skia.Path.Make();
  private sparkPath = Skia.Path.Make();

  private whiteFlash: SkColorFilter = Skia.ColorFilter.MakeBlend(Skia.Color('rgba(255,255,255,0.8)'), BlendMode.SrcATop);
  /** Softer flash for the boss: it is hit dozens of times per second, so a full white-out would hide the character. */
  private bossFlash: SkColorFilter = Skia.ColorFilter.MakeBlend(Skia.Color('rgba(255,236,214,0.38)'), BlendMode.SrcATop);
  private orangeFlash: SkColorFilter = Skia.ColorFilter.MakeBlend(Skia.Color('rgba(255,140,60,0.55)'), BlendMode.SrcATop);
  private eliteTint: SkColorFilter = Skia.ColorFilter.MakeBlend(Skia.Color('rgba(90,0,50,0.32)'), BlendMode.SrcATop);
  /** Runners share the grunt sprite; a warm amber wash + smaller size + faster gait tell them apart. */
  private runnerTint: SkColorFilter = Skia.ColorFilter.MakeBlend(Skia.Color('rgba(255,150,40,0.3)'), BlendMode.SrcATop);
  private enrageTint: SkColorFilter = Skia.ColorFilter.MakeBlend(Skia.Color('rgba(255,60,30,0.22)'), BlendMode.SrcATop);
  private spawnTint: SkColorFilter = Skia.ColorFilter.MakeBlend(Skia.Color('rgba(140,240,255,0.7)'), BlendMode.SrcATop);
  private lostTint: SkColorFilter = Skia.ColorFilter.MakeBlend(Skia.Color('rgba(255,255,255,0.6)'), BlendMode.SrcATop);

  private unitGlow: SkShader = Skia.Shader.MakeRadialGradient(
    Skia.Point(0, 0),
    1,
    [Skia.Color(PALETTE.muzzleCore), Skia.Color(PALETTE.muzzleWarm), Skia.Color(PALETTE.muzzleEdge)],
    [0, 0.35, 1],
    TileMode.Clamp,
  );
  private softGlow: SkShader = Skia.Shader.MakeRadialGradient(
    Skia.Point(0, 0),
    1,
    [Skia.Color('rgba(255,255,255,0.9)'), Skia.Color('rgba(255,255,255,0)')],
    [0, 1],
    TileMode.Clamp,
  );
  /** Red-orange ground marker under distant enemies so they read as threats at 20 px. */
  private threatMarker: SkShader = Skia.Shader.MakeRadialGradient(
    Skia.Point(0, 0),
    1,
    [Skia.Color('rgba(255,120,70,0.85)'), Skia.Color('rgba(255,70,40,0.35)'), Skia.Color('rgba(255,60,30,0)')],
    [0, 0.45, 1],
    TileMode.Clamp,
  );
  private roadGrain: SkShader = Skia.Shader.MakeFractalNoise(0.06, 0.06, 2, 4, 0, 0);
  private waterNoise: SkShader = Skia.Shader.MakeFractalNoise(0.008, 0.045, 2, 9, 0, 0);
  /** Fine, elongated sparkle for the sun glitter path on the water. */
  private glitterNoise: SkShader = Skia.Shader.MakeFractalNoise(0.02, 0.09, 2, 17, 0, 0);
  private skyShader: SkShader | null = null;
  private glitterShader: SkShader | null = null;
  private roadFadeShader: SkShader | null = null;
  private mastPath = Skia.Path.Make();
  /** Pooled mast-cap records (no per-frame allocation). */
  private mastCaps: { x: number; y: number; r: number; a: number }[] = [];

  private gateShaders = new Map<string, SkShader>();
  private cachedCamKey = '';
  private roadPath = Skia.Path.Make();
  private roadShader: SkShader | null = null;
  private waterShader: SkShader | null = null;
  private hazeShader: SkShader | null = null;
  private debris: { x: number; y: number; w: number; h: number }[] = [];
  private renderables: Renderable[] = [];
  private renderablePool: Renderable[] = [];
  private frame: SpriteFrame = emptyFrame();
  private debugMuzzle = { x: 0, y: 0, h: 0 };
  private scroll = 0;
  private lastTime = 0;

  constructor(assets: SceneAssets) {
    this.assets = assets;
    this.paint.setAntiAlias(true);
    this.stroke.setAntiAlias(true);
    this.stroke.setStyle(PaintStyle.Stroke);
    this.stroke.setStrokeCap(StrokeCap.Round);
    this.stroke.setStrokeJoin(StrokeJoin.Round);
    this.glowPaint.setAntiAlias(true);
    this.glowPaint.setBlendMode(BlendMode.Plus);
    this.shadowPaint.setAntiAlias(true);
    this.shadowPaint.setColor(Skia.Color(PALETTE.shadow));
    this.shadowPaint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 2.2, true));
    this.spritePaint.setAntiAlias(true);
    this.flashPaint.setAntiAlias(true);
    this.textPaint.setAntiAlias(true);
    this.textPaint.setColor(Skia.Color(PALETTE.gateText));
    this.textShadowPaint.setAntiAlias(true);
    this.textShadowPaint.setColor(Skia.Color(PALETTE.gateTextShadow));

    for (const [core, glow, cw, gw] of [
      [this.tracerCore, this.tracerGlow, 2.4, 7],
      [this.tracerCoreFar, this.tracerGlowFar, 1.3, 3.6],
    ] as const) {
      core.setAntiAlias(true);
      core.setStyle(PaintStyle.Stroke);
      core.setStrokeCap(StrokeCap.Round);
      core.setStrokeWidth(cw);
      core.setColor(Skia.Color(PALETTE.tracerCore));
      glow.setAntiAlias(true);
      glow.setStyle(PaintStyle.Stroke);
      glow.setStrokeCap(StrokeCap.Round);
      glow.setStrokeWidth(gw);
      glow.setColor(Skia.Color(PALETTE.tracerGlow));
      glow.setBlendMode(BlendMode.Plus);
    }

    for (let i = 0; i < 26; i++) {
      const r = seeded(i * 7.13);
      this.debris.push({
        x: -0.9 + seeded(i * 3.7) * 1.8,
        y: r * ROAD_LENGTH,
        w: 0.05 + seeded(i * 1.9) * 0.12,
        h: 0.02 + seeded(i * 5.1) * 0.05,
      });
    }
  }

  private gatePanelShader(c1: string, c2: string): SkShader {
    const key = c1 + c2;
    let sh = this.gateShaders.get(key);
    if (!sh) {
      sh = Skia.Shader.MakeLinearGradient(
        Skia.Point(0, 0),
        Skia.Point(0, 1),
        [Skia.Color(withAlpha(c1, 0.3)), Skia.Color(withAlpha(c2, 0.62)), Skia.Color(withAlpha(c1, 0.3))],
        [0, 0.6, 1],
        TileMode.Clamp,
      );
      this.gateShaders.set(key, sh);
    }
    return sh;
  }

  /** Release native Skia objects. The renderer must not be used afterwards. */
  dispose(): void {
    for (const sh of this.gateShaders.values()) sh.dispose();
    this.gateShaders.clear();
    this.roadShader?.dispose();
    this.waterShader?.dispose();
    this.hazeShader?.dispose();
    this.roadShader = this.waterShader = this.hazeShader = null;
    this.cachedCamKey = '';
    this.skyShader?.dispose();
    this.glitterShader?.dispose();
    this.roadFadeShader?.dispose();
    this.skyShader = this.glitterShader = this.roadFadeShader = null;
    for (const o of [this.unitGlow, this.softGlow, this.threatMarker, this.roadGrain, this.waterNoise, this.glitterNoise]) o.dispose();
    for (const f of [this.whiteFlash, this.bossFlash, this.orangeFlash, this.eliteTint, this.runnerTint, this.enrageTint, this.spawnTint, this.lostTint]) f.dispose();
    for (const pt of [
      this.paint, this.stroke, this.glowPaint, this.shadowPaint, this.spritePaint, this.flashPaint, this.hazePaint,
      this.textPaint, this.textShadowPaint, this.tracerCore, this.tracerGlow, this.tracerCoreFar, this.tracerGlowFar,
    ]) pt.dispose();
    for (const path of [this.roadPath, this.tmpPath, this.mastPath, this.shadowPath, this.tracerPathNear, this.tracerPathFar, this.sparkPath]) path.dispose();
  }

  setAssets(assets: SceneAssets): void {
    this.assets = assets;
  }

  // ---------------------------------------------------------------------------

  draw(canvas: SkCanvas, game: Game, shakeX: number, shakeY: number, debug: boolean): void {
    const cam = game.cam;
    this.ensureCamera(cam);
    const t = game.time;
    const dt = Math.max(0, Math.min(0.1, t - this.lastTime));
    this.lastTime = t;
    if (game.phase === 'playing') this.scroll = (this.scroll + GATES.speed * dt) % 0.75;

    canvas.save();
    canvas.translate(shakeX, shakeY);

    this.drawBackdrop(canvas, cam);
    this.drawWater(canvas, cam, t);
    this.drawRoad(canvas, cam);
    this.drawBarriers(canvas, cam);
    this.drawGroundVfx(canvas, game);
    this.drawShadows(canvas, game);
    this.drawUnits(canvas, game, t);
    this.drawTracers(canvas, game);
    this.drawVfx(canvas, game);
    this.drawHaze(canvas, cam);
    this.drawPopups(canvas, game);
    if (debug) this.drawDebug(canvas, game);

    canvas.restore();
  }

  // ---------------------------------------------------------------------------
  // Environment
  // ---------------------------------------------------------------------------

  private ensureCamera(cam: CameraLayout): void {
    const key = `${cam.width}x${cam.height}`;
    if (key === this.cachedCamKey) return;
    this.cachedCamKey = key;
    this.roadShader?.dispose();
    this.waterShader?.dispose();
    this.hazeShader?.dispose();
    this.skyShader?.dispose();
    this.glitterShader?.dispose();
    this.roadFadeShader?.dispose();

    const far = project(cam, 0, ROAD_FAR);
    const near = project(cam, 0, -1.4);
    const farHalf = cam.halfWidthBase * far.scale;
    const nearHalf = cam.halfWidthBase * near.scale;
    this.roadPath.reset();
    this.roadPath.moveTo(cam.centerX - farHalf, far.y);
    this.roadPath.lineTo(cam.centerX + farHalf, far.y);
    this.roadPath.lineTo(cam.centerX + nearHalf, near.y);
    this.roadPath.lineTo(cam.centerX - nearHalf, near.y);
    this.roadPath.close();

    this.roadShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(0, far.y),
      Skia.Point(0, cam.height),
      [Skia.Color(PALETTE.roadFar), Skia.Color(PALETTE.roadMid), Skia.Color(PALETTE.roadNear)],
      [0, 0.45, 1],
      TileMode.Clamp,
    );
    this.waterShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(0, cam.horizonY),
      Skia.Point(0, cam.height),
      [Skia.Color(PALETTE.waterFar), Skia.Color(PALETTE.waterMid), Skia.Color(PALETTE.waterNear), Skia.Color(PALETTE.waterDeep)],
      [0, 0.22, 0.6, 1],
      TileMode.Clamp,
    );
    // Atmosphere: opaque-ish right under the horizon, gone by the enemy spawn line so
    // distant figures stay readable while the far bridge dissolves into the sky.
    const hazeEnd = project(cam, 0, ROAD_LENGTH).y;
    this.hazeShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(0, cam.horizonY - 4),
      Skia.Point(0, hazeEnd),
      [Skia.Color('rgba(226,243,255,0.6)'), Skia.Color('rgba(226,243,255,0.26)'), Skia.Color('rgba(226,243,255,0.07)'), Skia.Color('rgba(226,243,255,0)')],
      [0, 0.22, 0.6, 1],
      TileMode.Clamp,
    );
    this.hazePaint.setShader(this.hazeShader);
    // Far road: cools and lightens toward the vanishing point (aerial perspective on the slab itself).
    this.roadFadeShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(0, far.y),
      Skia.Point(0, project(cam, 0, ROAD_LENGTH * 1.5).y),
      [Skia.Color('rgba(205,228,245,0.9)'), Skia.Color('rgba(205,228,245,0.45)'), Skia.Color('rgba(205,228,245,0)')],
      [0, 0.35, 1],
      TileMode.Clamp,
    );
    this.skyShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(0, 0),
      Skia.Point(0, cam.horizonY),
      [Skia.Color('#2f7fd6'), Skia.Color('#6fb8f2'), Skia.Color('#c9ecff')],
      [0, 0.55, 1],
      TileMode.Clamp,
    );
    // Sun glitter: fine sparkle noise masked (DstIn) by a soft column right of centre.
    const glitterMask = Skia.Shader.MakeLinearGradient(
      Skia.Point(cam.width * 0.5, 0),
      Skia.Point(cam.width * 0.92, 0),
      [Skia.Color('rgba(255,255,255,0)'), Skia.Color('rgba(255,255,255,1)'), Skia.Color('rgba(255,255,255,0)')],
      [0, 0.5, 1],
      TileMode.Clamp,
    );
    this.glitterShader = Skia.Shader.MakeBlend(BlendMode.SrcIn, this.glitterNoise, glitterMask);
    glitterMask.dispose();
  }

  /** Sky gradient + painted skyline. The painting's sea horizon is aligned to the camera horizon. */
  private drawBackdrop(canvas: SkCanvas, cam: CameraLayout): void {
    const img = this.assets.horizon;
    const p = this.paint;
    p.setShader(this.skyShader);
    canvas.drawRect(Skia.XYWHRect(0, 0, cam.width, cam.horizonY + 2), p);
    p.setShader(null);
    if (!img) return;
    const rect = this.backdropRect(cam, img);
    canvas.save();
    canvas.clipRect(Skia.XYWHRect(0, 0, cam.width, cam.horizonY + 2), ClipOp.Intersect, true);
    canvas.drawImageRectOptions(img, Skia.XYWHRect(0, 0, img.width(), img.height()), rect, FilterMode.Linear, MipmapMode.Linear, p);
    canvas.restore();
  }

  /** Screen rect for the skyline painting: horizon line of the image (HORIZON_IMAGE_LINE) lands on cam.horizonY. */
  private backdropRect(cam: CameraLayout, img: SkImage) {
    // The painting is wide; show its central ~70% so the towers stay large in portrait.
    const w = cam.width * 1.45;
    const h = (w * img.height()) / img.width();
    const top = cam.horizonY - h * HORIZON_IMAGE_LINE;
    return Skia.XYWHRect((cam.width - w) / 2, top, w, h);
  }

  private drawWater(canvas: SkCanvas, cam: CameraLayout, t: number): void {
    const p = this.paint;
    const waterRect = Skia.XYWHRect(0, cam.horizonY, cam.width, cam.height - cam.horizonY);
    p.setShader(this.waterShader);
    canvas.drawRect(waterRect, p);
    p.setShader(null);

    canvas.save();
    canvas.clipRect(waterRect, ClipOp.Intersect, true);

    // Skyline reflection: the painting mirrored under the horizon, squashed and faint,
    // broken up by the moving noise so it reads as water rather than a mirror.
    const img = this.assets.horizon;
    if (img) {
      const r = this.backdropRect(cam, img);
      const reflH = (r.y + r.height - cam.horizonY) * 0.55;
      canvas.save();
      canvas.translate(0, cam.horizonY);
      canvas.scale(1, -reflH / (r.y + r.height - cam.horizonY));
      canvas.translate(0, -cam.horizonY);
      p.setAlphaf(0.16);
      canvas.drawImageRectOptions(img, Skia.XYWHRect(0, 0, img.width(), img.height()), r, FilterMode.Linear, MipmapMode.Linear, p);
      p.setAlphaf(1);
      canvas.restore();
    }

    // Low-frequency moving highlights, brighter toward the horizon, restrained near the camera.
    const g = this.glowPaint;
    g.setShader(this.waterNoise);
    g.setAlphaf(0.2);
    const drift = (t * 9) % 4000;
    canvas.save();
    canvas.translate(-drift * 0.35, drift);
    canvas.drawRect(Skia.XYWHRect(-2000 + drift * 0.35, cam.horizonY - drift - 40, cam.width + 4000, cam.height + 80), g);
    canvas.restore();

    // Sun glitter path: sparkle column right of centre, fading with distance from the horizon.
    const glitterH = (cam.baseY - cam.horizonY) * 0.7;
    g.setShader(this.glitterShader);
    for (let band = 0; band < 2; band++) {
      // Two bands with decreasing alpha approximate a vertical fade without a second mask.
      g.setAlphaf(0.4 - band * 0.2);
      const y0 = cam.horizonY + (glitterH / 2) * band;
      canvas.save();
      canvas.clipRect(Skia.XYWHRect(cam.width * 0.5, y0, cam.width * 0.5, glitterH / 2 + 1), ClipOp.Intersect, true);
      canvas.translate(0, (t * 14) % 600);
      canvas.drawRect(Skia.XYWHRect(0, cam.horizonY - 640, cam.width, glitterH + 1300), g);
      canvas.restore();
    }
    g.setShader(null);
    g.setAlphaf(1);

    // Perspective swell lines: thin horizontal highlights that tighten toward the horizon
    // and drift toward the camera — the water itself sells the depth, not just the bridge.
    const s = this.stroke;
    s.setColor(Skia.Color(PALETTE.waterShimmer));
    s.setStrokeWidth(1);
    const phase = (t * 0.35) % 1.6;
    for (let k = 0; k < 22; k++) {
      const y = 0.4 + k * 1.6 - phase;
      const pr = project(cam, 0, y);
      if (pr.scale < 0.06) break;
      const alpha = 0.06 + 0.16 * Math.min(1, pr.scale * 1.4) * (0.5 + 0.5 * Math.sin(k * 1.7 + t * 0.9));
      s.setAlphaf(alpha);
      const halfW = cam.width * (0.35 + 0.6 * pr.scale);
      const cx = cam.width * (k % 2 === 0 ? 0.28 : 0.74) + Math.sin(k * 2.3) * cam.width * 0.12;
      canvas.drawLine(cx - halfW, pr.y + 1, cx + halfW, pr.y + 1, s);
    }
    s.setAlphaf(1);
    canvas.restore();

    // Bright horizon band where sky meets sea.
    p.setColor(Skia.Color('rgba(255,255,255,0.6)'));
    canvas.drawRect(Skia.XYWHRect(0, cam.horizonY - 1, cam.width, 3), p);
  }

  private drawRoad(canvas: SkCanvas, cam: CameraLayout): void {
    const p = this.paint;
    p.setShader(this.roadShader);
    canvas.drawPath(this.roadPath, p);
    p.setShader(null);

    canvas.save();
    canvas.clipPath(this.roadPath, ClipOp.Intersect, true);

    // Surface grain (multiply).
    const grain = this.spritePaint;
    grain.setShader(this.roadGrain);
    grain.setBlendMode(BlendMode.Multiply);
    grain.setAlphaf(0.16);
    canvas.drawRect(Skia.XYWHRect(0, cam.horizonY, cam.width, cam.height - cam.horizonY), grain);
    grain.setShader(null);
    grain.setBlendMode(BlendMode.SrcOver);
    grain.setAlphaf(1);

    // Slab seams scrolling toward the player (forward motion cue). Drawn far past the
    // playable range so the cadence keeps tightening toward the vanishing point.
    const s = this.stroke;
    s.setColor(Skia.Color(PALETTE.roadSeam));
    for (let k = -1; k < 60; k++) {
      const y = k * 0.75 + (0.75 - this.scroll);
      if (y < -1.3 || y > ROAD_FAR) continue;
      const pr = project(cam, 0, y);
      if (pr.scale < 0.045) break;
      const half = cam.halfWidthBase * pr.scale;
      s.setStrokeWidth(Math.max(0.6, 1.8 * pr.scale));
      s.setAlphaf(0.35 * Math.min(1, pr.scale + 0.25));
      canvas.drawLine(cam.centerX - half, pr.y, cam.centerX + half, pr.y, s);
    }
    // Longitudinal seams converging to the vanishing point.
    s.setStrokeWidth(1);
    s.setAlphaf(0.22);
    for (const lx of [-0.34, 0.34]) {
      const a = project(cam, lx, -1.4);
      const b = project(cam, lx, ROAD_FAR);
      canvas.drawLine(a.x, a.y, b.x, b.y, s);
    }
    // Edge guide strips: cool emissive lines just inside the barriers. They stay
    // visible after the seams vanish, so the eye follows them all the way to the horizon.
    s.setColor(Skia.Color(PALETTE.barrierRail));
    for (const lx of [-0.93, 0.93]) {
      const a = project(cam, lx, -1.4);
      const b = project(cam, lx, ROAD_FAR);
      s.setStrokeWidth(2.2);
      s.setAlphaf(0.28);
      canvas.drawLine(a.x, a.y, b.x, b.y, s);
      s.setStrokeWidth(0.8);
      s.setAlphaf(0.6);
      canvas.drawLine(a.x, a.y, b.x, b.y, s);
    }
    s.setAlphaf(1);

    // Debris / impact marks.
    p.setColor(Skia.Color(PALETTE.roadDebris));
    for (const d of this.debris) {
      const y = (d.y + ROAD_LENGTH - this.scroll * 1) % ROAD_LENGTH;
      const pr = project(cam, d.x, y);
      const u = unitPx(cam, y);
      p.setAlphaf(0.28 * Math.min(1, pr.scale + 0.2));
      canvas.drawOval(Skia.XYWHRect(pr.x - (d.w * u) / 2, pr.y - (d.h * u) / 2, d.w * u, d.h * u), p);
    }
    p.setAlphaf(1);

    // Aerial perspective on the slab: the far road cools toward the sky colour.
    p.setShader(this.roadFadeShader);
    canvas.drawRect(Skia.XYWHRect(0, cam.horizonY, cam.width, project(cam, 0, ROAD_LENGTH * 1.5).y - cam.horizonY + 2), p);
    p.setShader(null);
    canvas.restore();
  }

  private drawBarriers(canvas: SkCanvas, cam: CameraLayout): void {
    const p = this.paint;
    const moduleLen = 0.62;
    const gap = 0.08;
    const height = 0.2;
    const thickness = 0.14;
    const path = this.tmpPath;

    for (const side of [-1, 1]) {
      const inner = side * 1.0;
      const outer = side * (1.0 + thickness);

      // Far range: one simplified strip per side (top + inner face merged) from the
      // last detailed module to the vanishing point. Cheap, and it keeps the barrier
      // silhouette continuous instead of stopping mid-air.
      {
        const f0 = project(cam, inner, BARRIER_DETAIL_FAR);
        const f1 = project(cam, inner, ROAD_FAR);
        const o0 = project(cam, outer, BARRIER_DETAIL_FAR);
        const o1 = project(cam, outer, ROAD_FAR);
        const h0 = height * unitPx(cam, BARRIER_DETAIL_FAR);
        const h1 = height * unitPx(cam, ROAD_FAR);
        path.reset();
        path.moveTo(f0.x, f0.y);
        path.lineTo(f1.x, f1.y);
        path.lineTo(o1.x, o1.y - h1);
        path.lineTo(o0.x, o0.y - h0);
        path.close();
        p.setColor(Skia.Color(side > 0 ? PALETTE.barrierFaceLit : PALETTE.barrierTopShade));
        p.setAlphaf(1);
        canvas.drawPath(path, p);
        const s = this.stroke;
        s.setColor(Skia.Color(PALETTE.barrierRail));
        s.setStrokeWidth(1);
        s.setAlphaf(0.7);
        canvas.drawLine(f0.x, f0.y - h0, f1.x, f1.y - h1, s);
        s.setAlphaf(1);
      }

      // far → near so nearer modules overlap farther ones.
      for (let k = Math.ceil(BARRIER_DETAIL_FAR / (moduleLen + gap)); k >= -3; k--) {
        const y0 = k * (moduleLen + gap) - this.scroll;
        const y1 = y0 + moduleLen;
        if (y1 < -1.4 || y0 > BARRIER_DETAIL_FAR) continue;
        const uA = unitPx(cam, y0);
        const uB = unitPx(cam, y1);
        const a0 = project(cam, inner, y0);
        const a1 = project(cam, inner, y1);
        const b0 = project(cam, outer, y0);
        const b1 = project(cam, outer, y1);
        const hA = height * uA;
        const hB = height * uB;
        const variation = ((k % 3) + 3) % 3 === 0 ? 0.92 : 1;

        // Outer face (toward the water) — darker.
        path.reset();
        path.moveTo(b0.x, b0.y);
        path.lineTo(b1.x, b1.y);
        path.lineTo(b1.x, b1.y - hB);
        path.lineTo(b0.x, b0.y - hA);
        path.close();
        p.setColor(Skia.Color(PALETTE.barrierFaceShade));
        p.setAlphaf(0.9);
        canvas.drawPath(path, p);

        // Inner face (toward the road) — lit on the right barrier, shaded on the left.
        path.reset();
        path.moveTo(a0.x, a0.y);
        path.lineTo(a1.x, a1.y);
        path.lineTo(a1.x, a1.y - hB);
        path.lineTo(a0.x, a0.y - hA);
        path.close();
        p.setColor(Skia.Color(side > 0 ? PALETTE.barrierFaceLit : PALETTE.barrierFaceShade));
        p.setAlphaf(variation);
        canvas.drawPath(path, p);

        // Top surface — brightest (key light from above).
        path.reset();
        path.moveTo(a0.x, a0.y - hA);
        path.lineTo(a1.x, a1.y - hB);
        path.lineTo(b1.x, b1.y - hB);
        path.lineTo(b0.x, b0.y - hA);
        path.close();
        p.setColor(Skia.Color(variation < 1 ? PALETTE.barrierTopShade : PALETTE.barrierTop));
        p.setAlphaf(1);
        canvas.drawPath(path, p);

        // Cyan safety rail along the inner top edge.
        const s = this.stroke;
        s.setColor(Skia.Color(PALETTE.barrierRail));
        s.setStrokeWidth(Math.max(1, 2.2 * a0.scale));
        s.setAlphaf(0.9);
        canvas.drawLine(a0.x, a0.y - hA, a1.x, a1.y - hB, s);
        s.setAlphaf(1);

        // Contact shadow on the road along the inner base.
        p.setColor(Skia.Color('rgba(40,40,60,0.18)'));
        path.reset();
        path.moveTo(a0.x, a0.y);
        path.lineTo(a1.x, a1.y);
        path.lineTo(a1.x - side * 0.05 * uB, a1.y);
        path.lineTo(a0.x - side * 0.05 * uA, a0.y);
        path.close();
        canvas.drawPath(path, p);
      }
    }
    p.setAlphaf(1);
    this.drawMasts(canvas, cam);
  }

  /**
   * Light masts on the outer edge of both barriers, every MAST_PITCH units to the
   * horizon. Their steadily shrinking pitch is the strongest single depth cue in the
   * scene, and the warm caps give the distant bridge a visible end direction.
   */
  private drawMasts(canvas: SkCanvas, cam: CameraLayout): void {
    const p = this.paint;
    const path = this.mastPath;
    const mastH = 1.15;
    const capR = 0.045;
    path.reset();
    const caps = this.mastCaps;
    let n = 0;
    for (let k = Math.floor(ROAD_FAR / MAST_PITCH); k >= 0; k--) {
      const y = k * MAST_PITCH + (MAST_PITCH - this.scroll * (MAST_PITCH / 0.75)) % MAST_PITCH - 0.6;
      if (y < -1.2 || y > ROAD_FAR) continue;
      const u = unitPx(cam, y);
      if (u < 4) continue;
      const w = Math.max(1, 0.05 * u);
      for (const side of [-1, 1]) {
        const base = project(cam, side * 1.12, y);
        const top = base.y - mastH * u;
        path.addRect(Skia.XYWHRect(base.x - w / 2, top, w, mastH * u));
        const c = caps[n] ?? (caps[n] = { x: 0, y: 0, r: 0, a: 0 });
        c.x = base.x;
        c.y = top;
        c.r = Math.max(1.2, capR * u);
        c.a = Math.min(1, u / 60);
        n++;
      }
    }
    p.setColor(Skia.Color(PALETTE.barrierEdge));
    p.setAlphaf(0.85);
    canvas.drawPath(path, p);
    const g = this.glowPaint;
    g.setShader(this.softGlow);
    for (let i = 0; i < n; i++) {
      const c = caps[i];
      g.setAlphaf(0.55 * (0.4 + 0.6 * c.a));
      canvas.save();
      canvas.translate(c.x, c.y);
      canvas.scale(c.r * 3.2, c.r * 3.2);
      canvas.drawCircle(0, 0, 1, g);
      canvas.restore();
    }
    g.setShader(null);
    g.setAlphaf(1);
    p.setColor(Skia.Color('#fff4d6'));
    p.setAlphaf(1);
    for (let i = 0; i < n; i++) canvas.drawCircle(caps[i].x, caps[i].y, caps[i].r, p);
  }

  private drawHaze(canvas: SkCanvas, cam: CameraLayout): void {
    canvas.drawRect(Skia.XYWHRect(0, cam.horizonY - 4, cam.width, project(cam, 0, ROAD_LENGTH).y - cam.horizonY + 4), this.hazePaint);
  }

  // ---------------------------------------------------------------------------
  // Units
  // ---------------------------------------------------------------------------

  private drawShadows(canvas: SkCanvas, game: Game): void {
    const cam = game.cam;
    const path = this.shadowPath;
    path.reset();
    for (const e of game.enemies) {
      if (!e.alive) continue;
      const vis = e.kind === 'elite' ? ENEMY_ELITE_VISUAL : ENEMY_GRUNT_VISUAL;
      const pr = project(cam, e.pos.x, e.pos.y);
      const u = unitPx(cam, e.pos.y);
      const spawnIn = e.age < 0.5 ? e.age / 0.5 : 1;
      const w = vis.height * vis.aspect * u * vis.shadowScale * e.sizeVariation * 1.4 * (1 - e.death * 0.8) * spawnIn;
      const h = w * 0.32;
      path.addOval(Skia.XYWHRect(pr.x - w / 2, pr.y - h / 2, w, h));
    }
    for (const s of game.soldiers) {
      if (!s.alive) continue;
      const pr = project(cam, s.pos.x, s.pos.y);
      const u = unitPx(cam, s.pos.y);
      const spawn = Math.min(1, s.age / 0.45);
      const w = PLAYER_SOLDIER_VISUAL.height * PLAYER_SOLDIER_VISUAL.aspect * u * 1.35 * spawn * (1 - s.death);
      const h = w * 0.34;
      path.addOval(Skia.XYWHRect(pr.x - w / 2, pr.y - h / 2, w, h));
    }
    canvas.drawPath(path, this.shadowPaint);

    const b = game.boss;
    if (b.active) {
      const pr = project(cam, b.pos.x, b.pos.y);
      const u = unitPx(cam, b.pos.y);
      const w = BOSS_VISUAL.height * BOSS_VISUAL.aspect * u * 0.78 * (1 - b.death * 0.6);
      const h = w * 0.3;
      const p = this.paint;
      p.setColor(Skia.Color('rgba(20,30,60,0.42)'));
      p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 6, true));
      canvas.drawOval(Skia.XYWHRect(pr.x - w / 2, pr.y - h / 2, w, h), p);
      p.setMaskFilter(null);
    }
  }

  /** Reuses pooled entries; only grows when a frame has more units than ever before. */
  private pushRenderable(count: number, kind: Renderable['kind'], index: number, y: number): void {
    const pool = this.renderablePool;
    let r = pool[count];
    if (!r) {
      r = { kind, index, y };
      pool[count] = r;
    } else {
      r.kind = kind;
      r.index = index;
      r.y = y;
    }
    this.renderables[count] = r;
  }

  private drawUnits(canvas: SkCanvas, game: Game, t: number): void {
    const list = this.renderables;
    let n = 0;
    for (let i = 0; i < game.enemies.length; i++) this.pushRenderable(n++, 0, i, game.enemies[i].pos.y);
    if (game.boss.active && game.boss.death < 1) this.pushRenderable(n++, 1, 0, game.boss.pos.y);
    for (let i = 0; i < game.soldiers.length; i++) this.pushRenderable(n++, 2, i, game.soldiers[i].pos.y);
    for (let i = 0; i < game.gates.length; i++) this.pushRenderable(n++, 3, i, game.gates[i].y - 0.02);
    list.length = n;
    list.sort(byDepthDesc);

    for (const r of list) {
      switch (r.kind) {
        case 0:
          this.drawEnemy(canvas, game, game.enemies[r.index], t);
          break;
        case 1:
          this.drawBoss(canvas, game, t);
          break;
        case 2:
          this.drawSoldier(canvas, game, game.soldiers[r.index], t);
          break;
        case 3:
          this.drawGate(canvas, game, game.gates[r.index], t);
          break;
      }
    }
  }

  private drawSprite(
    canvas: SkCanvas,
    img: SkImage | null,
    frame: SpriteFrame,
    rotation: number,
    scaleX: number,
    scaleY: number,
    bobY: number,
    alpha: number,
    filter: SkColorFilter | null,
    fallbackColor: string,
  ): void {
    const p = this.spritePaint;
    p.setAlphaf(alpha);
    p.setColorFilter(filter);
    canvas.save();
    canvas.translate(frame.pivotX, frame.pivotY + bobY);
    canvas.rotate(rotation * DEG, 0, 0);
    canvas.scale(scaleX, scaleY);
    canvas.translate(-frame.pivotX, -frame.pivotY);
    if (img) {
      canvas.drawImageRectOptions(
        img,
        Skia.XYWHRect(0, 0, img.width(), img.height()),
        Skia.XYWHRect(frame.left, frame.top, frame.width, frame.height),
        FilterMode.Linear,
        MipmapMode.Linear,
        p,
      );
    } else {
      // Asset still loading: draw a soft capsule so the layout is visible for a frame or two.
      const c = this.paint;
      c.setColor(Skia.Color(fallbackColor));
      c.setAlphaf(alpha * 0.8);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(frame.left, frame.top, frame.width, frame.height), frame.width / 2, frame.width / 2), c);
      c.setAlphaf(1);
    }
    canvas.restore();
    p.setColorFilter(null);
    p.setAlphaf(1);
  }

  private drawSoldier(canvas: SkCanvas, game: Game, s: Soldier, t: number): void {
    const cam = game.cam;
    // Soldiers always face ROAD_FORWARD. The only rotation is the asset's local
    // correction — never anything derived from input, targets or formation slots.
    const rotation = PLAYER_SOLDIER_VISUAL.baseVisualRotationOffset;
    const frame = spriteFrame(cam, PLAYER_SOLDIER_VISUAL, s.pos.x, s.pos.y, rotation, 1, this.frame);
    const cycle = t * 12 + s.animPhase;
    const run = Math.sin(cycle);
    const bob = -Math.abs(run) * 0.028 * frame.unit;
    // Run cycle = bob + squash only. No sway: the body (and the barrel) never leaves
    // ROAD_FORWARD while alive, so the drawn muzzle matches the simulated one.
    let sx = 1 + Math.abs(run) * 0.018;
    let sy = 1 - Math.abs(run) * 0.03 + s.recoil * 0.05;
    let alpha = 1;
    let filter: SkColorFilter | null = null;
    let extraRot = 0;
    let dropY = 0;

    if (s.age < 0.45) {
      // Spawn: drop in with a bright overshoot.
      const k = s.age / 0.45;
      const ease = 1 - Math.pow(1 - k, 3);
      const overshoot = 1 + Math.sin(k * Math.PI) * 0.18;
      sx *= ease * overshoot;
      sy *= ease * overshoot;
      alpha = Math.min(1, k * 2);
      dropY = -(1 - ease) * frame.height * 0.6;
      if (k < 0.5) filter = this.spawnTint;
    }
    if (s.death > 0) {
      const d = s.death;
      alpha = 1 - d;
      extraRot += d * 1.1;
      dropY += d * frame.height * 0.35;
      if (d < 0.3) filter = this.lostTint;
    }

    // Recoil kicks the sprite back along the barrel.
    const recoilY = s.recoil * 0.035 * frame.unit;

    if (s.death === 0 && s.age > 0.45) {
      // Rim light under the squad: subtle cool glow that grounds the blue faction.
      const g = this.glowPaint;
      g.setShader(this.softGlow);
      g.setAlphaf(0.16);
      canvas.save();
      canvas.translate(frame.footX, frame.footY);
      canvas.scale(frame.width * 0.75, frame.width * 0.22);
      canvas.drawCircle(0, 0, 1, g);
      canvas.restore();
      g.setShader(null);
      g.setAlphaf(1);
    }

    this.drawSprite(canvas, this.assets.soldier, frame, rotation + extraRot, sx, sy, bob + recoilY + dropY, alpha, filter, '#2a7fe0');
  }

  private drawEnemy(canvas: SkCanvas, game: Game, e: Enemy, t: number): void {
    const cam = game.cam;
    const vis = e.kind === 'elite' ? ENEMY_ELITE_VISUAL : ENEMY_GRUNT_VISUAL;
    const frame = spriteFrame(cam, vis, e.pos.x, e.pos.y, 0, e.kind === 'runner' ? e.sizeVariation * 0.86 : e.sizeVariation, this.frame);
    const cycle = t * (e.kind === 'runner' ? 16 : 11) + e.animPhase;
    const run = Math.sin(cycle);
    const bob = -Math.abs(run) * 0.03 * frame.unit;
    const sway = Math.sin(cycle * 0.5) * 0.05;
    const mirror = e.id % 2 === 0 ? -1 : 1;
    let sx = (1 + Math.abs(run) * 0.02) * mirror;
    let sy = 1 - Math.abs(run) * 0.035;
    let alpha = 1;
    let rot = sway;
    let dropY = 0;
    let filter: SkColorFilter | null = e.kind === 'elite' ? this.eliteTint : e.kind === 'runner' ? this.runnerTint : null;

    // Spawn staging: materialise over 0.5 s at the far end of the bridge instead of popping in.
    if (e.age < 0.5) alpha = e.age / 0.5;

    if (e.hitFlash > 0) {
      filter = this.whiteFlash;
      sx *= 1.06;
      sy *= 0.96;
    }
    if (e.death > 0) {
      const d = e.death;
      alpha *= 1 - d * d;
      rot += d * 1.4 * e.lastHitDir * mirror;
      dropY = d * frame.height * 0.4;
      sy *= 1 - d * 0.5;
    }

    // Long-range readability: below ~45% scale a sprite is a 20 px silhouette, so a
    // warm ground marker (strongest at the spawn line, gone by mid-road) keeps every
    // enemy readable as a threat without faking its size.
    if (e.death === 0 && frame.scale < 0.45 && alpha > 0.05) {
      const k = Math.min(1, (0.45 - frame.scale) / 0.25);
      const g = this.glowPaint;
      g.setShader(this.threatMarker);
      g.setAlphaf((0.35 + 0.45 * k) * alpha);
      canvas.save();
      canvas.translate(frame.footX, frame.footY);
      canvas.scale(Math.max(5, frame.width * (0.9 + k * 0.6)), Math.max(2, frame.width * (0.32 + k * 0.2)));
      canvas.drawCircle(0, 0, 1, g);
      canvas.restore();
      g.setShader(null);
      g.setAlphaf(1);
    }

    if (e.kind === 'elite' && e.death === 0) {
      const g = this.glowPaint;
      g.setShader(this.softGlow);
      g.setAlphaf(0.28);
      canvas.save();
      canvas.translate(frame.footX, frame.footY);
      canvas.scale(frame.width * 0.8, frame.width * 0.26);
      canvas.drawCircle(0, 0, 1, g);
      canvas.restore();
      g.setShader(null);
      g.setAlphaf(1);
    }

    this.drawSprite(canvas, this.assets.grunt, frame, rot, sx, sy, bob + dropY, alpha, filter, '#e0473f');
  }

  private drawBoss(canvas: SkCanvas, game: Game, t: number): void {
    const b = game.boss;
    const cam = game.cam;
    const frame = spriteFrame(cam, BOSS_VISUAL, b.pos.x, b.pos.y, 0, 1, this.frame);
    const breathe = Math.sin(t * 1.6) * 0.012;
    const stomp = Math.abs(Math.sin(t * 2.2)) * 0.012;
    let sx = 1 + breathe;
    let sy = 1 - breathe + stomp;
    let alpha = 1;
    let filter: SkColorFilter | null = b.phase === 2 ? this.enrageTint : null;
    let rot = Math.sin(t * 1.1) * 0.01;

    // Telegraph: crouch + orange pulse + ground ring.
    if (b.telegraph > 0) {
      const k = 1 - b.telegraph / BOSS.telegraphDuration;
      sy *= 1 - k * 0.12;
      sx *= 1 + k * 0.08;
      if (Math.sin(t * 28) > 0) filter = this.orangeFlash;
      const g = this.glowPaint;
      g.setShader(this.softGlow);
      g.setAlphaf(0.35 + k * 0.35);
      canvas.save();
      canvas.translate(frame.footX, frame.footY);
      canvas.scale(frame.width * (0.6 + k * 0.5), frame.width * (0.2 + k * 0.16));
      canvas.drawCircle(0, 0, 1, g);
      canvas.restore();
      g.setShader(null);
      g.setAlphaf(1);
      // Danger zone on the road where the slam will land.
      const zone = project(cam, b.pos.x, 0.5);
      const zoneUnit = unitPx(cam, 0.5);
      const s = this.stroke;
      s.setColor(Skia.Color(PALETTE.bossGlow));
      s.setStrokeWidth(3);
      s.setAlphaf(0.35 + 0.45 * k);
      canvas.drawOval(Skia.XYWHRect(zone.x - BOSS.slamHalfWidth * zoneUnit, zone.y - 0.18 * zoneUnit, BOSS.slamHalfWidth * 2 * zoneUnit, 0.36 * zoneUnit), s);
      s.setAlphaf(1);
    }
    if (b.hitFlash > 0) {
      filter = this.bossFlash;
      sx *= 1.015;
    }
    if (!b.alive) {
      const d = b.death;
      alpha = Math.max(0, 1 - d * 1.2);
      sy *= 1 - d * 0.35;
      sx *= 1 + d * 0.15;
      rot += Math.sin(d * 40) * 0.02 * (1 - d);
      if (Math.sin(d * 60) > 0) filter = this.whiteFlash;
    }

    // Core glow behind the boss.
    const g = this.glowPaint;
    g.setShader(this.softGlow);
    g.setAlphaf(0.22 + (b.phase === 2 ? 0.1 : 0));
    canvas.save();
    canvas.translate(frame.footX, frame.top + frame.height * 0.55);
    canvas.scale(frame.width * 0.7, frame.height * 0.5);
    canvas.drawCircle(0, 0, 1, g);
    canvas.restore();
    g.setShader(null);
    g.setAlphaf(1);

    this.drawSprite(canvas, this.assets.boss, frame, rot, sx, sy, 0, alpha, filter, '#7a1f2e');
  }

  // ---------------------------------------------------------------------------
  // Gates
  // ---------------------------------------------------------------------------

  private drawGate(canvas: SkCanvas, game: Game, g: Gate, t: number): void {
    const cam = game.cam;
    const cx = g.side === 'left' ? -0.5 : 0.5;
    const halfW = 0.42;
    const y = g.y;
    const u = unitPx(cam, y);
    const base = project(cam, cx, y);
    const left = project(cam, cx - halfW, y);
    const right = project(cam, cx + halfW, y);
    const h = GATES.height * u;
    const pillar = Math.max(2, 0.05 * u);
    const [c1, c2] = gateColors(g);
    const chosen = g.triggeredAt !== null;
    const burst = chosen ? Math.min(1, (g.triggeredAt ?? 0) / 0.35) : 0;
    const dim = g.consumed && !chosen ? 0.35 : 1;
    const p = this.paint;

    // Ground glow.
    const gl = this.glowPaint;
    gl.setShader(this.softGlow);
    gl.setAlphaf(0.28 * dim);
    canvas.save();
    canvas.translate(base.x, base.y);
    canvas.scale((right.x - left.x) * 0.6, u * 0.16);
    canvas.drawCircle(0, 0, 1, gl);
    canvas.restore();
    gl.setShader(null);
    gl.setAlphaf(1);

    // Energy panel with animated shimmer. The gradient is a cached unit shader
    // (0..1) mapped onto the panel with a canvas transform — no per-frame shader
    // creation.
    const panel = Skia.XYWHRect(left.x + pillar, base.y - h, right.x - left.x - pillar * 2, h);
    const shimmer = (Math.sin(t * 2.4 + g.id) + 1) / 2;
    p.setShader(this.gatePanelShader(c1, c2));
    p.setAlphaf(dim * (1 - burst * 0.5) * (0.85 + shimmer * 0.15));
    canvas.save();
    canvas.translate(panel.x, panel.y);
    canvas.scale(panel.width, panel.height);
    canvas.drawRect(UNIT_RECT, p);
    canvas.restore();
    p.setShader(null);

    // Scanline highlights inside the panel.
    const s = this.stroke;
    s.setColor(Skia.Color('#ffffff'));
    s.setStrokeWidth(Math.max(1, 1.5 * base.scale));
    for (let i = 0; i < 3; i++) {
      const yy = panel.y + ((t * 0.35 + i / 3 + g.id * 0.1) % 1) * panel.height;
      s.setAlphaf(0.16 * dim);
      canvas.drawLine(panel.x, yy, panel.x + panel.width, yy, s);
    }
    s.setAlphaf(1);

    // Pillars (lit front face + darker side) and top beam.
    for (const px of [left.x, right.x - pillar]) {
      p.setColor(Skia.Color(PALETTE.gateFrameShade));
      p.setAlphaf(dim);
      canvas.drawRect(Skia.XYWHRect(px - pillar * 0.35, base.y - h - pillar * 0.4, pillar * 0.35, h + pillar * 0.4), p);
      p.setColor(Skia.Color(PALETTE.gateFrame));
      canvas.drawRect(Skia.XYWHRect(px, base.y - h, pillar, h), p);
      p.setColor(Skia.Color(c1));
      canvas.drawRect(Skia.XYWHRect(px + pillar * 0.3, base.y - h * 0.9, pillar * 0.4, h * 0.8), p);
    }
    p.setColor(Skia.Color(PALETTE.gateFrame));
    canvas.drawRect(Skia.XYWHRect(left.x - pillar * 0.35, base.y - h - pillar * 0.9, right.x - left.x + pillar * 0.35, pillar * 0.9), p);
    p.setColor(Skia.Color(PALETTE.gateFrameShade));
    canvas.drawRect(Skia.XYWHRect(left.x - pillar * 0.35, base.y - h, right.x - left.x + pillar * 0.35, pillar * 0.35), p);
    p.setAlphaf(1);

    // Labels — big thick number, small caption.
    const font = this.assets.displayFont;
    if (font) {
      const big = gateBigNumber(g.effect);
      const small = gateSmallLabel(g.effect);
      const bigScale = (h * 0.42) / 64;
      const smallScale = (h * 0.15) / 64;
      const bigW = textWidth(font, big) * bigScale;
      const smallW = textWidth(font, small) * smallScale;
      const midX = (left.x + right.x) / 2;
      canvas.save();
      canvas.translate(midX - bigW / 2, panel.y + h * 0.56);
      canvas.scale(bigScale, bigScale);
      this.textShadowPaint.setAlphaf(0.6 * dim);
      canvas.drawText(big, 2.5, 3, this.textShadowPaint, font);
      this.textPaint.setAlphaf(dim);
      canvas.drawText(big, 0, 0, this.textPaint, font);
      canvas.restore();
      canvas.save();
      canvas.translate(midX - smallW / 2, panel.y + h * 0.8);
      canvas.scale(smallScale, smallScale);
      canvas.drawText(small, 2, 2, this.textShadowPaint, font);
      canvas.drawText(small, 0, 0, this.textPaint, font);
      canvas.restore();
      this.textPaint.setAlphaf(1);
      this.textShadowPaint.setAlphaf(1);
    }

    // Pass-through burst.
    if (chosen && burst < 1) {
      const gp = this.glowPaint;
      gp.setColor(Skia.Color(c1));
      gp.setAlphaf((1 - burst) * 0.7);
      canvas.drawRect(Skia.XYWHRect(panel.x - burst * 20, panel.y - burst * 20, panel.width + burst * 40, panel.height + burst * 40), gp);
      gp.setAlphaf(1);
    }
  }

  // ---------------------------------------------------------------------------
  // Projectiles & VFX
  // ---------------------------------------------------------------------------

  private drawTracers(canvas: SkCanvas, game: Game): void {
    const cam = game.cam;
    const near = this.tracerPathNear;
    const far = this.tracerPathFar;
    near.reset();
    far.reset();
    let any = false;
    for (const p of game.projectiles) {
      if (!p.active) continue;
      any = true;
      // Constant flight height; the tail is a short segment back along the velocity.
      const h = p.h;
      const head = project(cam, p.x, p.y);
      const hu = unitPx(cam, p.y);
      const tailLen = Math.min(0.09, p.traveled / Math.max(1e-6, Math.hypot(p.vx, p.vy)));
      const tx = p.x - p.vx * tailLen;
      const ty = p.y - p.vy * tailLen;
      const tail = project(cam, tx, ty);
      const tu = unitPx(cam, ty);
      const path = head.scale > 0.5 ? near : far;
      path.moveTo(tail.x, tail.y - h * tu);
      path.lineTo(head.x, head.y - h * hu);
    }
    if (!any) return;
    canvas.drawPath(far, this.tracerGlowFar);
    canvas.drawPath(far, this.tracerCoreFar);
    canvas.drawPath(near, this.tracerGlow);
    canvas.drawPath(near, this.tracerCore);
  }

  /** Effects that live on the ground plane and must sit under the units. */
  private drawGroundVfx(canvas: SkCanvas, game: Game): void {
    const cam = game.cam;
    const s = this.stroke;
    for (const v of game.vfx) {
      if (!v.active) continue;
      if (v.kind !== 'boss-slam' && v.kind !== 'squad-grow' && v.kind !== 'gate') continue;
      const k = v.age / v.lifetime;
      const pr = project(cam, v.x, v.y);
      const u = unitPx(cam, v.y);
      if (v.kind === 'boss-slam') {
        const r = (0.2 + k * 1.6) * u;
        s.setColor(Skia.Color(PALETTE.bossGlow));
        s.setStrokeWidth(Math.max(2, (1 - k) * 10));
        s.setAlphaf((1 - k) * 0.85);
        canvas.drawOval(Skia.XYWHRect(pr.x - r, pr.y - r * 0.32, r * 2, r * 0.64), s);
        const r2 = (0.1 + k * 1.1) * u;
        s.setAlphaf((1 - k) * 0.5);
        canvas.drawOval(Skia.XYWHRect(pr.x - r2, pr.y - r2 * 0.32, r2 * 2, r2 * 0.64), s);
      } else if (v.kind === 'squad-grow') {
        const r = (0.15 + k * 1.1) * u * v.scale;
        s.setColor(Skia.Color(PALETTE.squadGlow));
        s.setStrokeWidth(Math.max(1.5, (1 - k) * 6));
        s.setAlphaf((1 - k) * 0.9);
        canvas.drawOval(Skia.XYWHRect(pr.x - r, pr.y - r * 0.3, r * 2, r * 0.6), s);
      } else {
        const r = (0.1 + k * 0.9) * u;
        s.setColor(Skia.Color(PALETTE.gateSquad));
        s.setStrokeWidth(Math.max(1.5, (1 - k) * 5));
        s.setAlphaf((1 - k) * 0.7);
        canvas.drawOval(Skia.XYWHRect(pr.x - r, pr.y - r * 0.3, r * 2, r * 0.6), s);
      }
    }
    s.setAlphaf(1);
  }

  private drawVfx(canvas: SkCanvas, game: Game): void {
    const cam = game.cam;
    const g = this.glowPaint;
    const p = this.paint;
    const s = this.stroke;
    const sparks = this.sparkPath;
    sparks.reset();
    let sparkCount = 0;

    for (const v of game.vfx) {
      if (!v.active) continue;
      const k = v.age / v.lifetime;
      const pr = project(cam, v.x, v.y);
      const u = unitPx(cam, v.y);
      const sx = pr.x;
      const sy = pr.y - v.h * u;

      switch (v.kind) {
        case 'muzzle': {
          const r = (0.075 + 0.04 * (1 - k)) * u * v.scale;
          g.setShader(this.unitGlow);
          g.setAlphaf(1 - k * 0.6);
          canvas.save();
          canvas.translate(sx, sy);
          canvas.rotate(v.angle * DEG, 0, 0);
          canvas.scale(r, r * 0.8);
          canvas.drawCircle(0, 0, 1, g);
          // Bright core + two short flares along the barrel direction.
          g.setShader(null);
          g.setColor(Skia.Color(PALETTE.muzzleCore));
          g.setAlphaf(1 - k);
          canvas.drawCircle(0, 0, 0.32, g);
          canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-0.14, -1.6, 0.28, 1.5), 0.14, 0.14), g);
          canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-0.9, -0.12, 1.8, 0.24), 0.12, 0.12), g);
          canvas.restore();
          g.setAlphaf(1);
          break;
        }
        case 'impact':
        case 'impact-boss': {
          const boss = v.kind === 'impact-boss';
          const r = (boss ? 0.13 : 0.075) * u * v.scale * (0.6 + k * 0.8);
          g.setShader(this.unitGlow);
          g.setAlphaf((1 - k) * (boss ? 1 : 0.85));
          canvas.save();
          canvas.translate(sx, sy);
          canvas.scale(r, r);
          canvas.drawCircle(0, 0, 1, g);
          canvas.restore();
          g.setShader(null);
          // Sparks radiating away from the impact (batched).
          const n = boss ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const a = v.seed * 6.283 + (i / n) * 6.283 + Math.PI;
            const len = (boss ? 0.16 : 0.1) * u * (0.4 + k);
            const from = 0.25 * len;
            sparks.moveTo(sx + Math.cos(a) * from, sy + Math.sin(a) * from * 0.7);
            sparks.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len * 0.7);
            sparkCount++;
          }
          break;
        }
        case 'death':
        case 'death-elite': {
          const elite = v.kind === 'death-elite';
          const scale = (elite ? 1.5 : 1) * v.scale;
          // Flash → smoke puff → debris.
          if (k < 0.35) {
            const r = 0.22 * u * scale * (0.5 + k * 2);
            g.setShader(this.unitGlow);
            g.setAlphaf((1 - k / 0.35) * 0.9);
            canvas.save();
            canvas.translate(sx, sy);
            canvas.scale(r, r);
            canvas.drawCircle(0, 0, 1, g);
            canvas.restore();
            g.setShader(null);
          }
          p.setColor(Skia.Color(PALETTE.deathSmoke));
          p.setAlphaf((1 - k) * 0.6);
          const puff = 0.12 * u * scale * (0.6 + k * 1.4);
          canvas.drawCircle(sx - puff * 0.4, sy - k * 0.2 * u, puff * 0.8, p);
          canvas.drawCircle(sx + puff * 0.3, sy - k * 0.3 * u - puff * 0.2, puff * 0.6, p);
          p.setColor(Skia.Color(PALETTE.deathFire));
          for (let i = 0; i < (elite ? 7 : 5); i++) {
            const a = v.seed * 6.283 + i * 1.257;
            const d = (0.08 + k * 0.32) * u * scale;
            const dx = Math.cos(a) * d;
            const dy = Math.sin(a) * d * 0.55 - k * 0.25 * u + k * k * 0.45 * u;
            p.setAlphaf((1 - k) * 0.9);
            canvas.drawCircle(sx + dx, sy + dy, Math.max(1, 0.02 * u * scale * (1 - k * 0.5)), p);
          }
          p.setAlphaf(1);
          break;
        }
        case 'death-boss': {
          // Staggered explosions across the body + final shockwave.
          for (let i = 0; i < 7; i++) {
            const start = i * 0.11;
            const local = (k - start) / 0.3;
            if (local < 0 || local > 1) continue;
            const ox = (seeded(v.seed * 100 + i) - 0.5) * 1.1 * u;
            const oy = -seeded(v.seed * 37 + i) * 1.9 * u;
            const r = (0.2 + local * 0.5) * u;
            g.setShader(this.unitGlow);
            g.setAlphaf(1 - local);
            canvas.save();
            canvas.translate(sx + ox, pr.y + oy);
            canvas.scale(r, r);
            canvas.drawCircle(0, 0, 1, g);
            canvas.restore();
            g.setShader(null);
          }
          if (k > 0.55) {
            const kk = (k - 0.55) / 0.45;
            const r = (0.3 + kk * 3) * u;
            s.setColor(Skia.Color(PALETTE.bossCore));
            s.setStrokeWidth(Math.max(2, (1 - kk) * 14));
            s.setAlphaf(1 - kk);
            canvas.drawOval(Skia.XYWHRect(pr.x - r, pr.y - r * 0.32, r * 2, r * 0.64), s);
            s.setAlphaf(1);
            g.setColor(Skia.Color('#ffffff'));
            g.setAlphaf((1 - kk) * 0.35);
            canvas.drawRect(Skia.XYWHRect(0, 0, cam.width, cam.height), g);
            g.setAlphaf(1);
          }
          break;
        }
        case 'boss-phase': {
          const r = (0.3 + k * 2.2) * u;
          s.setColor(Skia.Color(PALETTE.bossGlow));
          s.setStrokeWidth(Math.max(2, (1 - k) * 10));
          s.setAlphaf(1 - k);
          canvas.drawCircle(sx, sy, r, s);
          s.setAlphaf(1);
          if (k < 0.2) {
            g.setColor(Skia.Color(PALETTE.bossGlow));
            g.setAlphaf((1 - k / 0.2) * 0.25);
            canvas.drawRect(Skia.XYWHRect(0, 0, cam.width, cam.height), g);
            g.setAlphaf(1);
          }
          break;
        }
        case 'squad-grow': {
          // Rising sparkles above the squad (ring is drawn on the ground layer).
          p.setColor(Skia.Color(PALETTE.squadGlow));
          for (let i = 0; i < 9; i++) {
            const a = v.seed * 6.283 + i * 0.698;
            const d = (0.1 + k * 0.6) * u * v.scale;
            p.setAlphaf((1 - k) * 0.95);
            canvas.drawCircle(sx + Math.cos(a) * d, pr.y - k * 0.9 * u - Math.abs(Math.sin(a)) * d * 0.3, Math.max(1.2, 0.018 * u * (1 - k)), p);
          }
          p.setAlphaf(1);
          break;
        }
        case 'gate': {
          // Light column at the gate line.
          const col = (0.5 + k * 0.4) * u;
          g.setShader(this.softGlow);
          g.setAlphaf((1 - k) * 0.5);
          canvas.save();
          canvas.translate(sx, pr.y - col * 0.5);
          canvas.scale(0.35 * u, col * 0.8);
          canvas.drawCircle(0, 0, 1, g);
          canvas.restore();
          g.setShader(null);
          g.setAlphaf(1);
          break;
        }
        case 'boss-slam':
          // Ground ring handled in drawGroundVfx; add dust puffs here.
          p.setColor(Skia.Color('rgba(230,215,190,0.55)'));
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * 6.283 + v.seed;
            const d = (0.3 + k * 1.2) * u;
            p.setAlphaf((1 - k) * 0.5);
            canvas.drawCircle(pr.x + Math.cos(a) * d, pr.y + Math.sin(a) * d * 0.3 - k * 0.15 * u, 0.1 * u * (0.5 + k), p);
          }
          p.setAlphaf(1);
          break;
        case 'soldier-lost': {
          const r = (0.1 + k * 0.5) * u;
          s.setColor(Skia.Color(PALETTE.squadGlow));
          s.setStrokeWidth(Math.max(1.5, (1 - k) * 5));
          s.setAlphaf(1 - k);
          canvas.drawCircle(sx, sy, r, s);
          s.setAlphaf(1);
          p.setColor(Skia.Color('#dff7ff'));
          for (let i = 0; i < 6; i++) {
            const a = v.seed * 6.283 + i * 1.047;
            const d = (0.05 + k * 0.4) * u;
            p.setAlphaf(1 - k);
            canvas.drawCircle(sx + Math.cos(a) * d, sy + Math.sin(a) * d - k * 0.2 * u, 2, p);
          }
          p.setAlphaf(1);
          break;
        }
      }
    }

    if (sparkCount > 0) {
      s.setColor(Skia.Color(PALETTE.impactCore));
      s.setStrokeWidth(1.6);
      s.setAlphaf(0.9);
      canvas.drawPath(sparks, s);
      s.setAlphaf(1);
    }
  }

  private drawPopups(canvas: SkCanvas, game: Game): void {
    const font = this.assets.displayFont;
    if (!font) return;
    const cam = game.cam;
    for (const pop of game.popups) {
      if (!pop.active) continue;
      const k = pop.age / pop.lifetime;
      const pr = project(cam, pop.x, pop.y);
      const u = unitPx(cam, pop.y);
      const text = String(pop.value);
      const scale = ((pop.crit ? 0.26 : 0.2) * u * (1 + Math.sin(Math.min(1, k * 3) * Math.PI) * 0.25)) / 64;
      const w = textWidth(font, text) * scale;
      canvas.save();
      canvas.translate(pr.x - w / 2, pr.y - pop.h * u - k * 0.5 * u);
      canvas.scale(scale, scale);
      this.textShadowPaint.setAlphaf((1 - k) * 0.7);
      canvas.drawText(text, 3, 3, this.textShadowPaint, font);
      this.textPaint.setColor(Skia.Color(pop.crit ? PALETTE.popupCrit : PALETTE.popup));
      this.textPaint.setAlphaf(1 - k * k);
      canvas.drawText(text, 0, 0, this.textPaint, font);
      canvas.restore();
    }
    this.textPaint.setColor(Skia.Color(PALETTE.gateText));
    this.textPaint.setAlphaf(1);
    this.textShadowPaint.setAlphaf(1);
  }

  // ---------------------------------------------------------------------------
  // Developer overlay (never shown in production)
  // ---------------------------------------------------------------------------

  /** Ground-plane rectangle in world coordinates, projected to a perspective quad. */
  private quad(canvas: SkCanvas, cam: CameraLayout, x0: number, x1: number, y0: number, y1: number, s: SkPaint, color: string): void {
    const a = project(cam, x0, y0);
    const b = project(cam, x1, y0);
    const c = project(cam, x1, y1);
    const d = project(cam, x0, y1);
    s.setColor(Skia.Color(color));
    canvas.drawLine(a.x, a.y, b.x, b.y, s);
    canvas.drawLine(b.x, b.y, c.x, c.y, s);
    canvas.drawLine(c.x, c.y, d.x, d.y, s);
    canvas.drawLine(d.x, d.y, a.x, a.y, s);
  }

  private drawDebug(canvas: SkCanvas, game: Game): void {
    const cam = game.cam;
    const s = this.stroke;
    const p = this.paint;
    const font = this.assets.smallFont;
    s.setStrokeWidth(1);

    // Canonical road basis, drawn at the squad anchor: ROAD_FORWARD (green, toward
    // the vanishing point) and ROAD_RIGHT (white). Every soldier's body forward
    // vector and every projectile vector must be parallel to the green one.
    {
      const a0 = project(cam, game.anchorX, 0);
      const af = project(cam, game.anchorX + ROAD_FORWARD.x * 1.2, ROAD_FORWARD.y * 1.2);
      const ar = project(cam, game.anchorX + ROAD_RIGHT.x * 0.6, ROAD_RIGHT.y * 0.6);
      s.setStrokeWidth(2);
      s.setColor(Skia.Color(PALETTE.debug));
      canvas.drawLine(a0.x, a0.y, af.x, af.y, s);
      s.setColor(Skia.Color('rgba(255,255,255,0.8)'));
      canvas.drawLine(a0.x, a0.y, ar.x, ar.y, s);
      s.setStrokeWidth(1);
      // Safe movement bounds for the anchor (road − formation half-width − margin).
      const lim = game.anchorLimit;
      const l0 = project(cam, -lim, 0);
      const l1 = project(cam, lim, 0);
      s.setColor(Skia.Color('rgba(255,255,255,0.35)'));
      canvas.drawLine(l0.x, l0.y + 6, l1.x, l1.y + 6, s);
      canvas.drawLine(l0.x, l0.y, l0.x, l0.y + 12, s);
      canvas.drawLine(l1.x, l1.y, l1.x, l1.y + 12, s);
      // Road left/right limits at the squad's depth (world ±roadHalfWidth), as ticks.
      const road = roadHalfWidthAt(0);
      for (const side of [-1, 1]) {
        const e = project(cam, side * road, 0);
        s.setColor(Skia.Color('rgba(255,90,90,0.9)'));
        canvas.drawLine(e.x, e.y - 14, e.x, e.y + 14, s);
        const m = project(cam, side * (road - SQUAD.formationRoadMargin), 0);
        s.setColor(Skia.Color('rgba(255,200,90,0.9)'));
        canvas.drawLine(m.x, m.y - 8, m.x, m.y + 8, s);
      }
      // Formation footprint: outermost soldier bounds (feet) as a perspective quad.
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const x of game.soldiers) {
        if (!x.alive) continue;
        minX = Math.min(minX, x.pos.x);
        maxX = Math.max(maxX, x.pos.x);
        minY = Math.min(minY, x.pos.y);
        maxY = Math.max(maxY, x.pos.y);
      }
      if (minX <= maxX) {
        const halfSprite = (PLAYER_SOLDIER_VISUAL.height * PLAYER_SOLDIER_VISUAL.aspect) / 2;
        this.quad(canvas, cam, minX - halfSprite, maxX + halfSprite, minY, maxY, s, 'rgba(120,220,255,0.8)');
      }
      if (font) {
        this.textPaint.setColor(Skia.Color(PALETTE.debugText));
        canvas.drawText(`roadForward`, af.x + 4, af.y, this.textPaint, font);
        canvas.drawText(`roadRight  anchor ${game.anchorX.toFixed(2)} / safe ±${lim.toFixed(2)}  road ±${road.toFixed(2)}`, ar.x + 4, ar.y + 4, this.textPaint, font);
      }
    }

    // Per soldier: body forward vector, muzzle point, fire-lane line, sprite bounds, timers.
    const laneTop = project(cam, 0, ROAD_LENGTH).y;
    for (const sol of game.soldiers) {
      if (!sol.alive) continue;
      const frame = spriteFrame(cam, PLAYER_SOLDIER_VISUAL, sol.pos.x, sol.pos.y, PLAYER_SOLDIER_VISUAL.baseVisualRotationOffset, 1, this.frame);
      const m = game.muzzleOf(sol, this.debugMuzzle);
      // Fire lane: the straight world line this soldier's bullets travel (projected, so it
      // converges to the vanishing point on screen while staying parallel in the world).
      const laneEnd = project(cam, m.x, ROAD_LENGTH);
      s.setColor(Skia.Color(PALETTE.debug));
      s.setAlphaf(0.28);
      canvas.drawLine(frame.muzzleX, frame.muzzleY, laneEnd.x, Math.max(laneTop, laneEnd.y), s);
      s.setAlphaf(1);
      // Body forward vector from the feet.
      const bf = project(cam, sol.pos.x + ROAD_FORWARD.x * 0.35, sol.pos.y + ROAD_FORWARD.y * 0.35);
      s.setStrokeWidth(2);
      canvas.drawLine(frame.footX, frame.footY, bf.x, bf.y, s);
      s.setStrokeWidth(1);
      // Muzzle anchor (drawn frame) — the projectile spawn point.
      p.setColor(Skia.Color(PALETTE.debugMuzzle));
      canvas.drawCircle(frame.muzzleX, frame.muzzleY, 3, p);
      // Sprite bounds + foot pivot.
      s.setColor(Skia.Color('rgba(255,255,255,0.35)'));
      canvas.drawRect(Skia.XYWHRect(frame.left, frame.top, frame.width, frame.height), s);
      p.setColor(Skia.Color('#ffffff'));
      canvas.drawCircle(frame.footX, frame.footY, 2, p);
      if (font) {
        this.textPaint.setColor(Skia.Color(PALETTE.debugText));
        canvas.drawText(`#${sol.id} φ${sol.firePhase.toFixed(2)} t${sol.nextShotAt.toFixed(2)}`, frame.left, frame.footY + 12, this.textPaint, font);
      }
    }

    // Projectiles: velocity vector (magenta) + path travelled from the muzzle (faint).
    for (const pr of game.projectiles) {
      if (!pr.active) continue;
      const u = unitPx(cam, pr.y);
      const head = project(cam, pr.x, pr.y);
      const hx = head.x;
      const hy = head.y - pr.h * u;
      const o = project(cam, pr.originX, pr.originY);
      s.setColor(Skia.Color(PALETTE.debugMuzzle));
      s.setAlphaf(0.25);
      canvas.drawLine(o.x, o.y - pr.h * unitPx(cam, pr.originY), hx, hy, s);
      s.setAlphaf(1);
      const ahead = project(cam, pr.x + pr.vx * 0.06, pr.y + pr.vy * 0.06);
      canvas.drawLine(hx, hy, ahead.x, ahead.y - pr.h * unitPx(cam, pr.y + pr.vy * 0.06), s);
      p.setColor(Skia.Color(PALETTE.debugMuzzle));
      canvas.drawCircle(hx, hy, 2, p);
    }

    // Enemy hitboxes (lateral radius × depth tolerance, as the collision test sees them).
    s.setColor(Skia.Color('rgba(255,80,80,0.7)'));
    for (const e of game.enemies) {
      if (!e.alive || e.death > 0) continue;
      const def = ENEMIES[e.kind];
      const r = def.hitRadius * e.sizeVariation;
      const a = project(cam, e.pos.x - r, e.pos.y - def.depthTolerance);
      const b = project(cam, e.pos.x + r, e.pos.y - def.depthTolerance);
      const c = project(cam, e.pos.x + r, e.pos.y + def.depthTolerance);
      const d = project(cam, e.pos.x - r, e.pos.y + def.depthTolerance);
      canvas.drawLine(a.x, a.y, b.x, b.y, s);
      canvas.drawLine(b.x, b.y, c.x, c.y, s);
      canvas.drawLine(c.x, c.y, d.x, d.y, s);
      canvas.drawLine(d.x, d.y, a.x, a.y, s);
    }
    if (game.boss.active && game.boss.alive) {
      const bz = game.boss;
      const a = project(cam, bz.pos.x - BOSS.hitRadius, bz.pos.y - BOSS.depthTolerance);
      const b = project(cam, bz.pos.x + BOSS.hitRadius, bz.pos.y - BOSS.depthTolerance);
      const c = project(cam, bz.pos.x + BOSS.hitRadius, bz.pos.y + BOSS.depthTolerance);
      const d = project(cam, bz.pos.x - BOSS.hitRadius, bz.pos.y + BOSS.depthTolerance);
      s.setColor(Skia.Color('rgba(255,160,60,0.8)'));
      canvas.drawLine(a.x, a.y, b.x, b.y, s);
      canvas.drawLine(b.x, b.y, c.x, c.y, s);
      canvas.drawLine(c.x, c.y, d.x, d.y, s);
      canvas.drawLine(d.x, d.y, a.x, a.y, s);
      const w = project(cam, bz.patrolTargetX, bz.pos.y);
      canvas.drawCircle(w.x, w.y, 5, s);
    }
    // Counters.
    if (font) {
      const st = game.stats;
      const lines = [
        `FPS ${st.fps.toFixed(0)}  frame ${st.frameMs.toFixed(1)}ms  peak ${st.peakFrameMs.toFixed(1)}ms  sim ${st.simMs.toFixed(2)}ms`,
        `soldiers ${st.activeSoldiers}  enemies ${st.activeEnemies}  boss ${game.boss.active ? game.boss.hp.toFixed(0) : '-'}`,
        `projectiles ${st.activeProjectiles}/${st.poolProjectiles}  vfx ${st.poolVfx}`,
        `shots/s ${st.shotsPerSecond}  total ${st.shotsFired}  hits ${st.hits}  kills ${st.kills}`,
        `fireRate ×${game.mods.fireRate.toFixed(2)}  damage ×${game.mods.damage.toFixed(2)}  t ${game.time.toFixed(1)}s`,
        `stage ${game.stage} ${game.stageState}  boss stage ${game.isBossStage}  seq ${game.stageCursor.sequence + 1}/${game.stageConfig.sequences.length}  group ${game.stageCursor.group + 1}  queued ${game.remainingScheduledSpawns}  active ${game.activeEnemyCount}`,
        `coins ${game.run.coins}  score ${game.run.score}  cleared ${game.run.stagesCleared}  difficulty ${game.stageConfig.difficulty.toFixed(1)}`,
      ];
      p.setColor(Skia.Color('rgba(0,0,0,0.55)'));
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(8, cam.height * 0.3, cam.width - 16, 16 * lines.length + 12), 8, 8), p);
      this.textPaint.setColor(Skia.Color(PALETTE.debugText));
      lines.forEach((line, i) => canvas.drawText(line, 16, cam.height * 0.3 + 18 + i * 16, this.textPaint, font));
    }
    this.textPaint.setColor(Skia.Color(PALETTE.gateText));
  }
}

// -----------------------------------------------------------------------------

function gateColors(g: Gate): [string, string] {
  switch (g.effect.kind) {
    case 'squad':
      return [PALETTE.gateSquad, PALETTE.gateSquadDeep];
    case 'damage':
      return [PALETTE.gateDamage, PALETTE.gateDamageDeep];
    case 'fireRate':
      return [PALETTE.gateFire, PALETTE.gateFireDeep];
  }
}

const textWidthCache = new Map<string, number>();

/** Glyph-advance based width (works on native and CanvasKit; measureText is web-unsupported). */
function textWidth(font: SkFont, text: string): number {
  const key = `${font.getSize()}:${text}`;
  const cached = textWidthCache.get(key);
  if (cached !== undefined) return cached;
  const ids = font.getGlyphIDs(text);
  const widths = font.getGlyphWidths(ids);
  let w = 0;
  for (const x of widths) w += x;
  if (textWidthCache.size > 512) textWidthCache.clear();
  textWidthCache.set(key, w);
  return w;
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function seeded(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

