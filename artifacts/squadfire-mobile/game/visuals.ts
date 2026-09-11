/**
 * Character visual metadata. All anchors are expressed as fractions of the sprite
 * rectangle (0,0 = top-left, 1,1 = bottom-right) so they stay valid at any
 * perspective scale. Heights are in world units (road half-widths).
 *
 * The renderer places the sprite so that (anchorX, anchorY) lands on the unit's
 * projected ground position. Player soldiers are never rotated by gameplay state:
 * they always face ROAD_FORWARD (the vanishing point). If an asset is authored at
 * an angle, correct it locally with `baseVisualRotationOffset` — never by turning
 * the formation, the anchor, or the projectile direction.
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
  /** How far in front of the foot line (world units, along ROAD_FORWARD) the barrel tip sits. */
  muzzleForwardOffset: number;
  /** Weapon grip location (fractions). Used for the recoil pivot. */
  weaponAnchorX: number;
  weaponAnchorY: number;
  /** Weapon muzzle location (fractions). Projectiles spawn here. */
  muzzleAnchorX: number;
  muzzleAnchorY: number;
  /** Aim point other units should shoot at (fraction of height, from the ground). */
  aimHeightFraction: number;
  /**
   * Local yaw correction (radians, screen space, positive = clockwise) applied to
   * the sprite so its body reads as facing straight up the road. 0 for assets that
   * are already authored facing the vanishing point.
   */
  baseVisualRotationOffset: number;
  animationSet: 'soldier' | 'grunt' | 'boss';
}

export const PLAYER_SOLDIER_VISUAL: CharacterVisualDefinition = {
  visualId: 'soldier-blue',
  height: 0.46,
  // assets/characters/player/soldier_blue.png is 123x320 (alpha-trimmed, v0.3.5 art):
  // straight rear view, shoulders square to the camera, rifle vertical above the right
  // shoulder. Anchors were measured from the alpha mask (see docs/ASSET_PIPELINE.md).
  aspect: 0.384,
  anchorX: 0.465,
  anchorY: 0.995,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowScale: 0.62,
  muzzleForwardOffset: 0.03,
  // Rifle grip, beside the right shoulder.
  weaponAnchorX: 0.857,
  weaponAnchorY: 0.28,
  // Barrel tip: top edge of the sprite, directly above the grip (vertical barrel = ROAD_FORWARD).
  muzzleAnchorX: 0.857,
  muzzleAnchorY: 0.005,
  aimHeightFraction: 0.55,
  baseVisualRotationOffset: 0,
  animationSet: 'soldier',
};

export const ENEMY_GRUNT_VISUAL: CharacterVisualDefinition = {
  visualId: 'grunt-red',
  height: 0.5,
  // assets/characters/enemies/grunt_red.png is 154x320 (alpha-trimmed, v0.3.5 art):
  // charging pose, rifle across the chest, orange visor/core for long-range contrast.
  aspect: 0.481,
  anchorX: 0.46,
  anchorY: 0.995,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowScale: 0.62,
  muzzleForwardOffset: 0.03,
  weaponAnchorX: 0.5,
  weaponAnchorY: 0.42,
  muzzleAnchorX: 0.95,
  muzzleAnchorY: 0.45,
  aimHeightFraction: 0.55,
  baseVisualRotationOffset: 0,
  animationSet: 'grunt',
};

export const ENEMY_ELITE_VISUAL: CharacterVisualDefinition = {
  ...ENEMY_GRUNT_VISUAL,
  visualId: 'elite-red',
  height: 0.62,
  shadowScale: 0.7,
  muzzleForwardOffset: 0.03,
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
  muzzleForwardOffset: 0.03,
  weaponAnchorX: 0.15,
  weaponAnchorY: 0.55,
  muzzleAnchorX: 0.06,
  muzzleAnchorY: 0.62,
  aimHeightFraction: 0.5,
  baseVisualRotationOffset: 0,
  animationSet: 'boss',
};
