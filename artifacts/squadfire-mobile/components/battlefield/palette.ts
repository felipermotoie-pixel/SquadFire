/**
 * Battlefield rendering palette. Bright stylized daylight: warm concrete road,
 * turquoise water, cool blue squad, warm crimson enemies. Kept separate from the
 * HUD tokens in constants/colors.ts because the renderer is not a React component.
 */
export const PALETTE = {
  // Water
  waterFar: '#9fe6ef',
  waterMid: '#2fb7d2',
  waterNear: '#0f6f9e',
  waterDeep: '#0a4f7c',
  waterShimmer: '#e8fdff',

  // Road / concrete
  roadFar: '#e9ded0',
  roadMid: '#d9c9b5',
  roadNear: '#c9b499',
  roadSeam: '#9b846c',
  roadLane: '#f6ecd8',
  roadDebris: '#8a7360',

  // Barriers
  barrierTop: '#f3ede4',
  barrierTopShade: '#d9d0c3',
  barrierFaceLit: '#e2d8cb',
  barrierFaceShade: '#a99d8f',
  barrierRail: '#5cc9dd',
  barrierEdge: '#6b6055',

  // Atmosphere
  haze: '#dff6ff',
  shadow: 'rgba(20,45,70,0.34)',

  // Squad
  squadGlow: '#7fe8ff',
  tracerCore: '#fff7d6',
  tracerGlow: 'rgba(255,205,110,0.55)',
  muzzleCore: '#ffffff',
  muzzleWarm: '#ffc857',
  muzzleEdge: 'rgba(255,140,40,0)',

  // Enemies
  enemyGlow: '#ff8a5b',
  impactCore: '#fff2b0',
  impactWarm: '#ff9f43',
  deathSmoke: 'rgba(60,20,20,0.35)',
  deathFire: '#ff6a3d',
  eliteRing: 'rgba(255,120,60,0.55)',

  // Boss
  bossGlow: '#ff5a3c',
  bossTelegraph: 'rgba(255,90,40,0.55)',
  bossCore: '#ffd36b',

  // Gates
  gateSquad: '#33d6f2',
  gateSquadDeep: '#0f7fa8',
  gateDamage: '#ffb547',
  gateDamageDeep: '#c96a10',
  gateFire: '#c77dff',
  gateFireDeep: '#7a35c9',
  gateFrame: '#f4f7fb',
  gateFrameShade: '#9aa7b8',
  gateText: '#ffffff',
  gateTextShadow: 'rgba(0,30,60,0.55)',

  popup: '#ffe27a',
  popupCrit: '#ff7a5c',

  debug: '#00ff9c',
  debugMuzzle: '#ff2bd6',
  debugText: '#ffffff',
} as const;
