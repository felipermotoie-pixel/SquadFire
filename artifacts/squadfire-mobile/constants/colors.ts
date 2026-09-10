/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#f7fbff',
    tint: '#62e3ff',
    background: '#08152a',
    foreground: '#f7fbff',
    card: '#102a4c',
    cardForeground: '#f7fbff',
    primary: '#62e3ff',
    primaryForeground: '#071226',
    secondary: '#173a62',
    secondaryForeground: '#d6f7ff',
    muted: '#183456',
    mutedForeground: '#8bb0c9',
    accent: '#ffce5c',
    accentForeground: '#251603',
    destructive: '#ff5c62',
    destructiveForeground: '#fff7f7',
    border: '#315a7b',
    input: '#315a7b',

    // SquadFire visual language
    skyTop: '#81d8ff',
    skyBottom: '#e5fbff',
    water: '#28a4c3',
    waterDeep: '#0b5a87',
    ground: '#d6b997',
    groundLight: '#f1d5a7',
    groundShadow: '#9d765f',
    lane: '#f8e6bf',
    laneAccent: '#fff7dc',
    squadBlue: '#25a9ee',
    squadDeep: '#1155a0',
    squadHighlight: '#a9f4ff',
    enemyRed: '#e74a4f',
    enemyDeep: '#8f283d',
    enemyHighlight: '#ff9b64',
    bossRed: '#5d173d',
    bossGlow: '#ff6a54',
    gateCyan: '#24c6d8',
    gateGold: '#f5ba4e',
    beam: '#fff3ad',
    shadow: '#133b55',
    hud: '#071a32',
    hudSoft: '#123152',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
