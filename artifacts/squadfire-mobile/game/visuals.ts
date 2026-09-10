/**
 * Character visual metadata. All anchors are expressed as fractions of the sprite
 * rectangle (0,0 = top-left, 1,1 = bottom-right) so they stay valid at any
 * perspective scale. Heights are in world units (road half-widths).
 *
 * The renderer places the sprite so that (anchorX, anchorY) lands on the unit's
 * projected ground position. Muzzle/weapon anchors are rotated together with the
 * sprite when a soldier aims, so projectile origins follow the weapon.
 */
export interface CharacterVisualDefinition {
  visualId: string;
  /** World height of the sprite (before perspective). */
  height: number;
  /** Sprite aspect ratio (width / height). */
  aspect: number;
  /** Pivot on the sprite that sits on the ground position. */
  anchorX: number;
  anchorY: number;
  /** Contact shadow placement relative to the ground position (fractions of sprite size). */
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowScale: number;
  /** Weapon grip location (fractions). Used for the recoil pivot. */
  weaponAnchorX: number;
  weaponAnchorY: number;
  /** Weapon muzzle location (fractions). Projectiles spawn here. */
  muzzleAnchorX: number;
  muzzleAnchorY: number;
  /** Aim point other units should shoot at (fraction of height, from the ground). */
  aimHeightFraction: number;
  animationSet: 'soldier' | 'grunt' | 'boss';
}

export const PLAYER_SOLDIER_VISUAL: CharacterVisualDefinition = {
  visualId: 'soldier-blue',
  height: 0.46,
  // assets/characters/player/soldier_blue.png is 140x320 (alpha-trimmed).
  aspect: 0.4375,
  anchorX: 0.45,
  anchorY: 0.985,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowScale: 0.62,
  // Rifle grip / stock, upper right of the torso.
  weaponAnchorX: 0.72,
  weaponAnchorY: 0.3,
  // Rifle tip: top-right corner of the sprite (barrel points up-right, see SOLDIER_BARREL_ANGLE).
  muzzleAnchorX: 0.84,
  muzzleAnchorY: 0.015,
  aimHeightFraction: 0.55,
  animationSet: 'soldier',
};

export const ENEMY_GRUNT_VISUAL: CharacterVisualDefinition = {
  visualId: 'grunt-red',
  height: 0.5,
  // assets/characters/enemies/grunt_red.png is 206x320 (alpha-trimmed).
  aspect: 0.644,
  anchorX: 0.5,
  anchorY: 0.98,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowScale: 0.62,
  weaponAnchorX: 0.5,
  weaponAnchorY: 0.42,
  muzzleAnchorX: 0.95,
  muzzleAnchorY: 0.45,
  aimHeightFraction: 0.55,
  animationSet: 'grunt',
};

export const ENEMY_ELITE_VISUAL: CharacterVisualDefinition = {
  ...ENEMY_GRUNT_VISUAL,
  visualId: 'elite-red',
  height: 0.62,
  shadowScale: 0.7,
};

export const BOSS_VISUAL: CharacterVisualDefinition = {
  visualId: 'boss-crimson',
  height: 1.7,
  // assets/characters/bosses/boss_crimson.png is 730x640 (alpha-trimmed).
  aspect: 1.14,
  anchorX: 0.5,
  anchorY: 0.98,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowScale: 0.85,
  weaponAnchorX: 0.15,
  weaponAnchorY: 0.55,
  muzzleAnchorX: 0.06,
  muzzleAnchorY: 0.62,
  aimHeightFraction: 0.5,
  animationSet: 'boss',
};

/** Inherent tilt of the player rifle in the sprite (radians, positive = right). */
export const SOLDIER_BARREL_ANGLE = 0.32;

/**
 * Sprite rotation for a given aim angle. Shared by the simulation (muzzle origin)
 * and the renderer (drawn pose) so projectiles always leave the drawn muzzle.
 * Only part of the aim is expressed as body rotation so soldiers lean rather
 * than spin; the barrel's built-in tilt is partially compensated.
 */
export function soldierSpriteRotation(aimAngle: number): number {
  return aimAngle * 0.65 - SOLDIER_BARREL_ANGLE * 0.45 * Math.min(1, Math.abs(aimAngle) * 3);
}
