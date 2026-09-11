import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PALETTE } from '@/components/battlefield/palette';

/**
 * Web entry: CanvasKit (Skia's WebAssembly build) must be loaded before any
 * module that touches the Skia API is evaluated, so the game screen is imported
 * lazily behind <WithSkiaWeb />. The .wasm binary is fetched from the jsDelivr
 * CDN pinned to the exact canvaskit-wasm version Skia 2.6.x was built against.
 */
const CANVASKIT_VERSION = '0.41.0';

export default function IndexScreen() {
  return (
    <WithSkiaWeb
      opts={{ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${CANVASKIT_VERSION}/bin/full/${file}` }}
      getComponent={async () => {
        const mod = await import('@/components/CampaignScreen');
        return { default: mod.CampaignScreen };
      }}
      fallback={
        <View style={styles.loading}>
          <ActivityIndicator color={PALETTE.gateSquad} />
          <Text style={styles.loadingText}>Loading renderer…</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a4f7c', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_500Medium', fontSize: 13, letterSpacing: 1 },
});
