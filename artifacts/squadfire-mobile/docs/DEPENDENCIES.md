# SquadFire — Dependencies

## Runtime
| Package | Version | Why |
| --- | --- | --- |
| expo | SDK 57 | App runtime, Expo Go preview. |
| react-native | 0.86 | New architecture; `StyleSheet.absoluteFill` only (no `absoluteFillObject`), `pointerEvents` is a style prop. |
| @shopify/react-native-skia | 2.6.2 | Whole battlefield is one Skia canvas. Version pinned to the one bundled in Expo Go SDK 57 — do not bump without switching to a dev build. |
| react-native-reanimated | 4.5.1 | Skia `<Picture>` shared value redraws; required by Skia's reconciler. |
| react-native-gesture-handler | 2.32 | Root view wrapper (input itself uses PanResponder). |
| @expo-google-fonts/inter | — | HUD font and in-canvas display font (Inter Black 900 / Bold 700). |
| expo-haptics | — | Gate / slam / loss haptics on device. |
| @expo/vector-icons | — | HUD icons. |

## Development only
| Package | Version | Why |
| --- | --- | --- |
| canvaskit-wasm | 0.41.0 | CanvasKit build matching Skia 2.6.x. Needed for the web preview (loaded from jsDelivr at the pinned version) and for `render:preview`. |
| esbuild | 0.27.3 | Bundles the headless sim tests and the render harness for Node. |

## Notes
- Web preview requires WebGL. Headless browsers without WebGL show a blank canvas; use `pnpm run render:preview` for image review in that case.
- No native modules beyond what Expo Go ships → Expo Go stays usable on iOS and Android.
