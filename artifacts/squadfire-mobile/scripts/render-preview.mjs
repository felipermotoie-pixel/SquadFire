// Entry: initialise CanvasKit (WASM, CPU raster) then run the bundled harness.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');
const CanvasKit = await CanvasKitInit({
  locateFile: (file) => require.resolve(`canvaskit-wasm/bin/full/${file}`),
});
globalThis.CanvasKit = CanvasKit;
await import('/tmp/squadfire-render-preview.bundle.mjs');
