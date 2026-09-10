/**
 * Bundling shim: replaces `@shopify/react-native-skia` when the renderer runs
 * headlessly in Node (scripts/render-preview.ts). CanvasKit must already be
 * initialised on globalThis.CanvasKit before this module is evaluated.
 */
import { JsiSkApi } from '../node_modules/@shopify/react-native-skia/lib/module/skia/web/JsiSkia.js';
export * from '../node_modules/@shopify/react-native-skia/lib/module/skia/types/index.js';
export const Skia = JsiSkApi(globalThis.CanvasKit);
