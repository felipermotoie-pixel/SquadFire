const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Expo Router's native route context also matches `app/index.web.tsx`, whose
 * static import of Skia's web loader drags `canvaskit-wasm` (and its Node `fs`
 * require) into the iOS/Android bundles, which then fail to resolve. The web
 * loader is meaningless on native, so it resolves to an empty module there.
 */
const WEB_ONLY = ['@shopify/react-native-skia/lib/module/web', 'canvaskit-wasm'];
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web' && WEB_ONLY.some((m) => moduleName === m || moduleName.startsWith(`${m}/`))) {
    return { type: 'empty' };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
