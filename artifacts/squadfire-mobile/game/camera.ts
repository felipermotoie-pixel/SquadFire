/**
 * Portrait battlefield camera: elevated, pitched down, with a real pinhole
 * perspective along the road. Screen-space scale and vertical position are both
 * derived from world depth, so every unit, shadow, gate and projectile shares the
 * same perspective rules (no ad-hoc scaling).
 */
import { ROAD_LENGTH } from './balance';

export interface CameraLayout {
  width: number;
  height: number;
  /** Screen y of the vanishing horizon. */
  horizonY: number;
  /** Screen y of the squad line (world y = 0). */
  baseY: number;
  /** Screen half-width of the road at the squad line (world x = ±1). */
  halfWidthBase: number;
  centerX: number;
  /** Perspective constant: scale(y) = focal / (y + focal). */
  focal: number;
}

export interface Projected {
  x: number;
  y: number;
  /** Perspective scale (1 at the squad line). */
  scale: number;
}

export function createCamera(width: number, height: number): CameraLayout {
  // Enemies spawn at ROAD_LENGTH and must still read as figures (~22% scale, ≈20 px
  // tall on a phone), while the drawn bridge keeps converging toward the horizon
  // well past that. The focal length is tied to ROAD_LENGTH so the near field
  // (squad, hitboxes, muzzles) keeps the same on-screen size when the road grows.
  const farScale = 0.22;
  const focal = (farScale * ROAD_LENGTH) / (1 - farScale);
  return {
    width,
    height,
    // High horizon + low squad line = the longest possible run of visible road in portrait.
    horizonY: height * 0.175,
    baseY: height * 0.715,
    halfWidthBase: width * 0.56,
    centerX: width / 2,
    focal,
  };
}

export function depthScale(cam: CameraLayout, y: number): number {
  return cam.focal / (y + cam.focal);
}

export function project(cam: CameraLayout, x: number, y: number, out: Projected = { x: 0, y: 0, scale: 1 }): Projected {
  const s = depthScale(cam, y);
  out.scale = s;
  out.x = cam.centerX + x * cam.halfWidthBase * s;
  out.y = cam.horizonY + (cam.baseY - cam.horizonY) * s;
  return out;
}

/** Screen pixels per world unit at depth y (used for heights and radii). */
export function unitPx(cam: CameraLayout, y: number): number {
  return cam.halfWidthBase * depthScale(cam, y);
}

/** Inverse of project() for the ground plane. */
export function unproject(cam: CameraLayout, sx: number, sy: number): { x: number; y: number } {
  const s = Math.max(0.02, (sy - cam.horizonY) / (cam.baseY - cam.horizonY));
  const y = cam.focal / s - cam.focal;
  const x = (sx - cam.centerX) / (cam.halfWidthBase * s);
  return { x, y };
}

/** Screen x for a lateral touch position, mapped to world x at the squad line. */
export function screenXToWorldX(cam: CameraLayout, sx: number): number {
  return (sx - cam.centerX) / cam.halfWidthBase;
}
