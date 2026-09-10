/**
 * Shared sprite placement math used by BOTH the simulation (to compute real
 * muzzle positions) and the renderer (to draw the sprite). Keeping it in one
 * place guarantees the projectile origin is exactly where the weapon is drawn.
 */
import { project, unitPx, type CameraLayout } from './camera';
import type { CharacterVisualDefinition } from './visuals';

export interface SpriteFrame {
  /** Projected ground point. */
  footX: number;
  footY: number;
  scale: number;
  /** Sprite rectangle before rotation. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Rotation pivot (screen). */
  pivotX: number;
  pivotY: number;
  /** Muzzle position after rotation (screen). */
  muzzleX: number;
  muzzleY: number;
  /** Pixels per world unit at this depth. */
  unit: number;
}

const scratch = { x: 0, y: 0, scale: 1 };

export function spriteFrame(
  cam: CameraLayout,
  vis: CharacterVisualDefinition,
  x: number,
  y: number,
  rotation: number,
  sizeMultiplier = 1,
  out: SpriteFrame = emptyFrame(),
): SpriteFrame {
  const p = project(cam, x, y, scratch);
  const unit = unitPx(cam, y);
  const height = vis.height * unit * sizeMultiplier;
  const width = height * vis.aspect;
  const left = p.x - width * vis.anchorX;
  const top = p.y - height * vis.anchorY;
  const pivotX = left + width * vis.weaponAnchorX;
  const pivotY = top + height * vis.weaponAnchorY;
  const mx = left + width * vis.muzzleAnchorX;
  const my = top + height * vis.muzzleAnchorY;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const rx = mx - pivotX;
  const ry = my - pivotY;
  out.footX = p.x;
  out.footY = p.y;
  out.scale = p.scale;
  out.left = left;
  out.top = top;
  out.width = width;
  out.height = height;
  out.pivotX = pivotX;
  out.pivotY = pivotY;
  out.muzzleX = pivotX + rx * cos - ry * sin;
  out.muzzleY = pivotY + rx * sin + ry * cos;
  out.unit = unit;
  return out;
}

export function emptyFrame(): SpriteFrame {
  return {
    footX: 0,
    footY: 0,
    scale: 1,
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    pivotX: 0,
    pivotY: 0,
    muzzleX: 0,
    muzzleY: 0,
    unit: 1,
  };
}
