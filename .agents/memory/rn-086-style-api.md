---
name: React Native 0.86 style API gotchas
description: Type/API differences in RN 0.86 that broke typecheck or web
---
- StyleSheet.absoluteFillObject no longer exists in the types; use StyleSheet.absoluteFill or spell out position/top/left/right/bottom.
- pointerEvents must be passed as a style property, not a View prop (web warns / types reject).
- Node-only scripts inside the Expo package must be excluded from the app tsconfig (no @types/node there); bundle them with esbuild via package scripts.
