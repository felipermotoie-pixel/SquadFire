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
  type SkShader,
} from '@shopify/react-native-skia';

import { BOSS, GATES, ROAD_LENGTH } from '@/game/balance';

/** How far (world units) the causeway is drawn toward the horizon. Gameplay stays within ROAD_LENGTH. */
const ROAD_FAR = 40;
const UNIT_RECT = Skia.XYWHRect(0, 0, 1, 1);
import { project, unitPx, type CameraLayout } from '@/game/camera';
import { gateBigNumber, gateSmallLabel, type Game } from '@/game/engine';
import { emptyFrame, spriteFrame, type SpriteFrame } from '@/game/sprite-geometry';
import type { Enemy, Gate, Soldier } from '@/game/types';
import { BOSS_VISUAL, ENEMY_ELITE_VISUAL, ENEMY_GRUNT_VISUAL, PLAYER_SOLDIER_VISUAL, soldierSpriteRotation } from '@/game/visuals';
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
  private roadGrain: SkShader = Skia.Shader.MakeFractalNoise(0.06, 0.06, 2, 4, 0, 0);
  private waterNoise: SkShader = Skia.Shader.MakeFractalNoise(0.008, 0.045, 2, 9, 0, 0);

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
    for (const o of [this.unitGlow, this.softGlow, this.roadGrain, this.waterNoise]) o.dispose();
    for (const f of [this.whiteFlash, this.bossFlash, this.orangeFlash, this.eliteTint, this.enrageTint, this.spawnTint, this.lostTint]) f.dispose();
    for (const pt of [this.paint, this.stroke, this.glowPaint, this.shadowPaint, this.spritePaint, this.flashPaint, this.hazePaint]) pt.dispose();
    this.roadPath.dispose();
    this.tmpPath.dispose();
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
    const hazeEnd = project(cam, 0, 2.4).y;
    this.hazeShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(0, cam.horizonY - 6),
      Skia.Point(0, hazeEnd),
      [Skia.Color('rgba(223,246,255,0.62)'), Skia.Color('rgba(223,246,255,0.28)'), Skia.Color('rgba(223,246,255,0)')],
      [0, 0.4, 1],
      TileMode.Clamp,
    );
    this.hazePaint.setShader(this.hazeShader);
  }

  private drawBackdrop(canvas: SkCanvas, cam: CameraLayout): void {
    const img = this.assets.horizon;
    const p = this.paint;
    p.setShader(null);
    p.setColor(Skia.Color('#8fd5ff'));
    canvas.drawRect(Skia.XYWHRect(0, 0, cam.width, cam.horizonY + 2), p);
    if (!img) return;
    const w = cam.width * 1.25;
    const h = (w * img.height()) / img.width();
    // The generated backdrop keeps its horizon line ~64% down the image.
    const top = cam.horizonY - h * 0.64;
    canvas.save();
    canvas.clipRect(Skia.XYWHRect(0, 0, cam.width, cam.horizonY + 3), ClipOp.Intersect, true);
    canvas.drawImageRectOptions(
      img,
      Skia.XYWHRect(0, 0, img.width(), img.height()),
      Skia.XYWHRect((cam.width - w) / 2, top, w, h),
      FilterMode.Linear,
      MipmapMode.Linear,
      p,
    );
    canvas.restore();
  }

  private drawWater(canvas: SkCanvas, cam: CameraLayout, t: number): void {
    const p = this.paint;
    p.setShader(this.waterShader);
    canvas.drawRect(Skia.XYWHRect(0, cam.horizonY, cam.width, cam.height - cam.horizonY), p);
    p.setShader(null);

    // Low-frequency moving highlights, brighter toward the horizon, restrained near the camera.
    const g = this.glowPaint;
    g.setShader(this.waterNoise);
    g.setAlphaf(0.22);
    canvas.save();
    canvas.clipRect(Skia.XYWHRect(0, cam.horizonY, cam.width, cam.height - cam.horizonY), ClipOp.Intersect, true);
    const drift = (t * 9) % 4000;
    canvas.translate(-drift * 0.35, drift);
    canvas.drawRect(Skia.XYWHRect(-2000 + drift * 0.35, cam.horizonY - drift - 40, cam.width + 4000, cam.height + 80), g);
    canvas.restore();
    g.setShader(null);
    g.setAlphaf(1);

    // Bright horizon band where sky meets sea.
    p.setColor(Skia.Color('rgba(255,255,255,0.55)'));
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

    // Slab seams scrolling toward the player (forward motion cue).
    const s = this.stroke;
    s.setColor(Skia.Color(PALETTE.roadSeam));
    for (let k = -1; k < 26; k++) {
      const y = k * 0.75 + (0.75 - this.scroll);
      if (y < -1.3 || y > ROAD_FAR) continue;
      const pr = project(cam, 0, y);
      if (pr.scale < 0.07) break;
      const half = cam.halfWidthBase * pr.scale;
      s.setStrokeWidth(Math.max(0.6, 1.8 * pr.scale));
      s.setAlphaf(0.35 * Math.min(1, pr.scale + 0.25));
      canvas.drawLine(cam.centerX - half, pr.y, cam.centerX + half, pr.y, s);
    }
    // Two faint longitudinal seams converging to the vanishing point.
    s.setStrokeWidth(1);
    s.setAlphaf(0.22);
    for (const lx of [-0.34, 0.34]) {
      const a = project(cam, lx, -1.4);
      const b = project(cam, lx, ROAD_FAR);
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
      // far → near so nearer modules overlap farther ones.
      for (let k = 26; k >= -3; k--) {
        const y0 = k * (moduleLen + gap) - this.scroll;
        const y1 = y0 + moduleLen;
        if (y1 < -1.4 || y0 > ROAD_FAR) continue;
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
  }

  private drawHaze(canvas: SkCanvas, cam: CameraLayout): void {
    canvas.drawRect(Skia.XYWHRect(0, cam.horizonY - 6, cam.width, project(cam, 0, 2.4).y - cam.horizonY + 6), this.hazePaint);
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
      const w = vis.height * vis.aspect * u * vis.shadowScale * e.sizeVariation * 1.4 * (1 - e.death * 0.8);
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
    const rotation = soldierSpriteRotation(s.aimAngle);
    const frame = spriteFrame(cam, PLAYER_SOLDIER_VISUAL, s.pos.x, s.pos.y, rotation, 1, this.frame);
    const cycle = t * 12 + s.animPhase;
    const run = Math.sin(cycle);
    const bob = -Math.abs(run) * 0.028 * frame.unit;
    const sway = Math.sin(cycle * 0.5) * 0.035;
    let sx = 1 + Math.abs(run) * 0.018;
    let sy = 1 - Math.abs(run) * 0.03 + s.recoil * 0.05;
    let alpha = 1;
    let filter: SkColorFilter | null = null;
    let extraRot = sway;
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
    const frame = spriteFrame(cam, vis, e.pos.x, e.pos.y, 0, e.sizeVariation, this.frame);
    const cycle = t * 11 + e.animPhase;
    const run = Math.sin(cycle);
    const bob = -Math.abs(run) * 0.03 * frame.unit;
    const sway = Math.sin(cycle * 0.5) * 0.05;
    const mirror = e.id % 2 === 0 ? -1 : 1;
    let sx = (1 + Math.abs(run) * 0.02) * mirror;
    let sy = 1 - Math.abs(run) * 0.035;
    let alpha = 1;
    let rot = sway;
    let dropY = 0;
    let filter: SkColorFilter | null = e.kind === 'elite' ? this.eliteTint : null;

    if (e.hitFlash > 0) {
      filter = this.whiteFlash;
      sx *= 1.06;
      sy *= 0.96;
    }
    if (e.death > 0) {
      const d = e.death;
      alpha = 1 - d * d;
      rot += d * 1.4 * e.lastHitDir * mirror;
      dropY = d * frame.height * 0.4;
      sy *= 1 - d * 0.5;
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
      const k = Math.min(1, p.traveled / p.planned);
      const h = p.h0 + (p.h1 - p.h0) * k;
      const head = project(cam, p.x, p.y);
      const hu = unitPx(cam, p.y);
      const tailLen = 0.05;
      const tx = p.x - p.vx * tailLen;
      const ty = p.y - p.vy * tailLen;
      const kt = Math.max(0, p.traveled - Math.hypot(p.vx, p.vy) * tailLen) / p.planned;
      const ht = p.h0 + (p.h1 - p.h0) * Math.min(1, kt);
      const tail = project(cam, tx, ty);
      const tu = unitPx(cam, ty);
      const path = head.scale > 0.5 ? near : far;
      path.moveTo(tail.x, tail.y - ht * tu);
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

  private drawDebug(canvas: SkCanvas, game: Game): void {
    const cam = game.cam;
    const s = this.stroke;
    const p = this.paint;
    const font = this.assets.smallFont;
    s.setStrokeWidth(1);
    for (const sol of game.soldiers) {
      if (!sol.alive) continue;
      const rotation = soldierSpriteRotation(sol.aimAngle);
      const frame = spriteFrame(cam, PLAYER_SOLDIER_VISUAL, sol.pos.x, sol.pos.y, rotation, 1, this.frame);
      // Aim vector to the target.
      const target = sol.targetKind === 'boss' ? game.boss.pos : game.enemies.find((e) => e.id === sol.targetId)?.pos;
      if (target) {
        const tp = project(cam, target.x, target.y);
        s.setColor(Skia.Color(PALETTE.debug));
        s.setAlphaf(0.5);
        canvas.drawLine(frame.muzzleX, frame.muzzleY, tp.x, tp.y - 0.25 * unitPx(cam, target.y), s);
        s.setAlphaf(1);
        s.setColor(Skia.Color(PALETTE.debug));
        canvas.drawCircle(tp.x, tp.y, 6, s);
      }
      // Muzzle anchor.
      p.setColor(Skia.Color(PALETTE.debugMuzzle));
      canvas.drawCircle(frame.muzzleX, frame.muzzleY, 3, p);
      // Sprite bounds + pivot.
      s.setColor(Skia.Color('rgba(255,255,255,0.35)'));
      canvas.drawRect(Skia.XYWHRect(frame.left, frame.top, frame.width, frame.height), s);
      p.setColor(Skia.Color('#ffffff'));
      canvas.drawCircle(frame.footX, frame.footY, 2, p);
      if (font) {
        this.textPaint.setColor(Skia.Color(PALETTE.debugText));
        canvas.drawText(`#${sol.id} φ${sol.firePhase.toFixed(2)} t${sol.nextShotAt.toFixed(2)}`, frame.left, frame.footY + 12, this.textPaint, font);
      }
    }
    // Enemy hitboxes.
    s.setColor(Skia.Color('rgba(255,80,80,0.6)'));
    for (const e of game.enemies) {
      const pr = project(cam, e.pos.x, e.pos.y);
      const u = unitPx(cam, e.pos.y);
      const r = (e.kind === 'elite' ? 0.26 : 0.2) * e.sizeVariation * u;
      canvas.drawOval(Skia.XYWHRect(pr.x - r, pr.y - r * 0.5, r * 2, r), s);
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

