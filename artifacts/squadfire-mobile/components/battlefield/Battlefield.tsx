/**
 * Skia surface for the battlefield. Owns the frame loop: every animation frame
 * it advances the simulation, records a single SkPicture through SceneRenderer
 * and hands it to the <Picture> node via a shared value. React never re-renders
 * for gameplay; the HUD is synced through `onSync` at a low cadence.
 */
import { Canvas, Picture, Skia, createPicture, useFont, useImage, type SkPicture } from '@shopify/react-native-skia';
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import type { Game } from '@/game/engine';
import { SceneRenderer, type SceneAssets } from './SceneRenderer';

export interface BattlefieldProps {
  game: Game;
  width: number;
  height: number;
  /** Expensive collision, trajectory and hitbox geometry for diagnosis only. */
  debugGeometry: boolean;
  /** Lightweight runtime counters, usable without the diagnostic geometry. */
  performanceHud: boolean;
  /** Called ~8×/s so the React HUD can read game state without per-frame renders. */
  onSync: (game: Game) => void;
}

const HUD_SYNC_INTERVAL_MS = 120;

export function Battlefield({ game, width, height, debugGeometry, performanceHud, onSync }: BattlefieldProps) {
  const soldier = useImage(require('@/assets/characters/player/soldier_blue.png'));
  const grunt = useImage(require('@/assets/characters/enemies/grunt_red.png'));
  const boss = useImage(require('@/assets/characters/bosses/boss_crimson.png'));
  const horizon = useImage(require('@/assets/environment/horizon_coastal.jpg'));
  const displayFont = useFont(require('@expo-google-fonts/inter/900Black/Inter_900Black.ttf'), 64);
  const smallFont = useFont(require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'), 12);

  const assets = useMemo<SceneAssets>(
    () => ({ soldier, grunt, boss, horizon, displayFont, smallFont }),
    [soldier, grunt, boss, horizon, displayFont, smallFont],
  );

  // The renderer owns native Skia objects, so it is created/disposed in effects
  // (survives StrictMode double-mount, released on unmount).
  const rendererRef = useRef<SceneRenderer | null>(null);
  useEffect(() => {
    if (!rendererRef.current) rendererRef.current = new SceneRenderer(assets);
    else rendererRef.current.setAssets(assets);
  }, [assets]);
  useEffect(() => {
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  const picture = useSharedValue<SkPicture>(useMemo(() => createPicture(() => {}), []));
  const debugGeometryRef = useRef(debugGeometry);
  debugGeometryRef.current = debugGeometry;
  const performanceHudRef = useRef(performanceHud);
  performanceHudRef.current = performanceHud;
  const syncRef = useRef(onSync);
  syncRef.current = onSync;

  useEffect(() => {
    game.setCamera(width, height);
  }, [game, width, height]);

  useEffect(() => {
    let raf = 0;
    let alive = true;
    let last = performance.now();
    let lastSync = 0;
    let shake = 0;
    let fpsEma = 60;
    let frameEma = 16;
    let peak = 0;
    let peakResetAt = last;
    const renderer = rendererRef.current as SceneRenderer;

    const tick = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;

      const t0 = performance.now();
      game.advance(dt);
      const simMs = performance.now() - t0;

      // Screen shake: consume the engine's request, decay exponentially.
      if (game.shake > 0) {
        shake = Math.min(1, shake + game.shake * (game.settings.reducedScreenShake ? 0.25 : 1));
        game.shake = 0;
      }
      shake *= Math.exp(-dt * 7);
      const amp = shake * 9;
      const sx = amp > 0.05 ? (Math.random() - 0.5) * 2 * amp : 0;
      const sy = amp > 0.05 ? (Math.random() - 0.5) * 2 * amp * 0.6 : 0;

      const recorder = Skia.PictureRecorder();
      const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, width, height));
      renderer.draw(canvas, game, sx, sy, debugGeometryRef.current, performanceHudRef.current);
      const next = recorder.finishRecordingAsPicture();
      recorder.dispose();
      // `Picture` is consumed asynchronously by the native Reanimated mapper.
      // Do not dispose the previous value here: there is no presentation-complete
      // callback, so even a one-frame delay can free an object while drawPicture()
      // still reads it on the UI thread. Keep its lifetime with the shared
      // value/container until native code offers a presentation acknowledgment.
      picture.value = next;

      const frameMs = performance.now() - now;
      const inst = dt > 0 ? 1 / dt : 60;
      fpsEma += (inst - fpsEma) * 0.08;
      frameEma += (frameMs - frameEma) * 0.1;
      if (frameMs > peak) peak = frameMs;
      if (now - peakResetAt > 3000) {
        peak = frameMs;
        peakResetAt = now;
      }
      game.stats.simMs = simMs;
      game.stats.fps = fpsEma;
      game.stats.frameMs = frameEma;
      game.stats.peakFrameMs = peak;

      if (now - lastSync >= HUD_SYNC_INTERVAL_MS || game.events.length > 0) {
        lastSync = now;
        syncRef.current(game);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [game, width, height, picture]);


  return (
    <View style={[StyleSheet.absoluteFill, { width, height }]}>
      <Canvas style={{ width, height }}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}
