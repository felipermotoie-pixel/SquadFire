---
name: Skia on Expo Go + web quirks
description: Constraints discovered while rendering the game with react-native-skia in Expo Go and the web preview
---
- Keep @shopify/react-native-skia at the version bundled in Expo Go for the current SDK (2.6.2 for SDK 57). Bumping breaks Expo Go preview.
  **Why:** Expo Go ships a fixed native Skia binary. **How to apply:** only bump when moving to a dev build.
- Web preview needs canvaskit-wasm at the exact version Skia was built against (0.41.0 for 2.6.x) and the game screen must be lazy-imported behind WithSkiaWeb, otherwise Skia globals are undefined at module evaluation.
- SkFont.measureText is not implemented on the web (CanvasKit) backend; sum getGlyphWidths(getGlyphIDs(text)) instead. It fails at runtime, not typecheck.
- The Replit screenshot browser has no WebGL, so a Skia canvas renders blank there ("failed to create webgl context"). Use the headless CanvasKit render harness (render:preview script) to review visuals instead of fighting the screenshot.
- Renderer path: one Canvas + Picture shared value re-recorded per rAF frame; React never re-renders per frame. Reanimated mapper redraws the picture on web too.
