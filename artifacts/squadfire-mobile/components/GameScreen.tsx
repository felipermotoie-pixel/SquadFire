/**
 * Gameplay screen: Skia battlefield + minimal React HUD.
 *
 * The HUD only shows what the player needs during play (wave, squad size, boss
 * health, pause). Diagnostics live behind a developer panel that is compiled out
 * of production builds (`__DEV__`).
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Battlefield } from '@/components/battlefield/Battlefield';
import { PALETTE } from '@/components/battlefield/palette';
import { BOSS } from '@/game/balance';
import { Game } from '@/game/engine';
import type { GameEvent, GamePhase } from '@/game/types';

interface HudState {
  phase: GamePhase;
  wave: number;
  squad: number;
  bossActive: boolean;
  bossHp: number;
  bossMax: number;
  bossPhase: 1 | 2;
  kills: number;
  elapsed: number;
  fireRate: number;
  damage: number;
}

interface Notice {
  id: number;
  text: string;
  tone: 'squad' | 'danger' | 'neutral' | 'gold';
}

const BOSS_NAME = 'WARDEN OF THE CAUSEWAY';

function readHud(game: Game): HudState {
  return {
    phase: game.phase,
    wave: game.wave,
    squad: game.squadSize,
    bossActive: game.boss.active && game.boss.alive,
    bossHp: game.boss.hp,
    bossMax: game.boss.maxHp,
    bossPhase: game.boss.phase,
    kills: game.stats.kills,
    elapsed: game.stats.elapsed,
    fireRate: game.mods.fireRate,
    damage: game.mods.damage,
  };
}

function hudEqual(a: HudState, b: HudState): boolean {
  return (
    a.phase === b.phase &&
    a.wave === b.wave &&
    a.squad === b.squad &&
    a.bossActive === b.bossActive &&
    Math.abs(a.bossHp - b.bossHp) < 1 &&
    a.bossPhase === b.bossPhase &&
    a.kills === b.kills &&
    Math.floor(a.elapsed) === Math.floor(b.elapsed) &&
    a.fireRate === b.fireRate &&
    a.damage === b.damage
  );
}

function noticeFor(e: GameEvent): Notice | null {
  if (!e.message) return null;
  const tone: Notice['tone'] =
    e.type === 'gate' ? (e.message.includes('SQUAD') ? 'squad' : 'gold') : e.type === 'wave' ? 'neutral' : e.type === 'victory' ? 'squad' : 'danger';
  return { id: Math.random(), text: e.message, tone };
}

export function GameScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [seed, setSeed] = useState(1);
  // One Game per run. Dimension changes only update its camera (see Battlefield),
  // they never recreate the simulation.
  const initialSize = useRef({ width, height });
  const game = useMemo(() => new Game({ seed: seed * 7919 + 13, ...initialSize.current }), [seed]);
  const [hud, setHud] = useState<HudState>(() => readHud(game));
  const [notices, setNotices] = useState<Notice[]>([]);
  const [debug, setDebug] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [reducedShake, setReducedShake] = useState(false);
  const hudRef = useRef(hud);
  const hintOpacity = useRef(new Animated.Value(1)).current;
  const noticeTimers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    setHud(readHud(game));
    setNotices([]);
    hintOpacity.setValue(1);
    const hint = Animated.sequence([Animated.delay(3500), Animated.timing(hintOpacity, { toValue: 0, duration: 600, useNativeDriver: true })]);
    hint.start();
    const timers = noticeTimers.current;
    return () => {
      hint.stop();
      for (const t of timers) clearTimeout(t);
      timers.clear();
    };
  }, [game, hintOpacity]);

  useEffect(() => {
    game.settings.reducedScreenShake = reducedShake;
  }, [game, reducedShake]);

  const pushNotice = useCallback((n: Notice) => {
    setNotices((prev) => [...prev.slice(-2), n]);
    const timer = setTimeout(() => {
      noticeTimers.current.delete(timer);
      setNotices((prev) => prev.filter((x) => x.id !== n.id));
    }, 1500);
    noticeTimers.current.add(timer);
  }, []);

  const onSync = useCallback(
    (g: Game) => {
      const events = g.drainEvents();
      for (const e of events) {
        const n = noticeFor(e);
        if (n) pushNotice(n);
        if (Platform.OS !== 'web') {
          if (e.type === 'gate') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          else if (e.type === 'boss-slam' || e.type === 'boss-defeated') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          else if (e.type === 'soldier-lost') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }
      }
      const next = readHud(g);
      if (!hudEqual(hudRef.current, next)) {
        hudRef.current = next;
        setHud(next);
      }
    },
    [pushNotice],
  );

  // Horizontal drag anywhere on the battlefield steers the squad anchor.
  const dragStart = useRef({ x: 0, anchor: 0 });
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2,
        onPanResponderGrant: (evt) => {
          dragStart.current = { x: evt.nativeEvent.pageX, anchor: game.targetAnchorX };
        },
        onPanResponderMove: (evt) => {
          const dx = evt.nativeEvent.pageX - dragStart.current.x;
          game.setInputX(dragStart.current.anchor + (dx / game.cam.halfWidthBase) * 1.35);
        },
      }),
    [game],
  );

  const restart = () => setSeed((s) => s + 1);
  const bossPct = hud.bossActive ? Math.max(0, hud.bossHp / hud.bossMax) : 0;
  const showEnd = hud.phase === 'victory' || hud.phase === 'defeat';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Battlefield game={game} width={width} height={height} debug={debug} onSync={onSync} />
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />

      {/* ---- Minimal HUD ---- */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8, pointerEvents: 'box-none' }]}>
        <Pressable
          onLongPress={__DEV__ ? () => setDevOpen(true) : undefined}
          delayLongPress={600}
          style={styles.pill}
          accessibilityLabel={`Wave ${hud.wave}`}
        >
          <Text style={styles.pillLabel}>WAVE</Text>
          <Text style={styles.pillValue}>{hud.wave}</Text>
        </Pressable>
        <View style={styles.pillSquad} accessibilityLabel={`${hud.squad} soldiers`}>
          <Ionicons name="people" size={16} color={PALETTE.gateSquad} />
          <Text style={[styles.pillValue, { color: PALETTE.gateSquad }]}>{hud.squad}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => {
            game.togglePause();
            setHud(readHud(game));
          }}
          style={styles.iconButton}
          accessibilityLabel={hud.phase === 'paused' ? 'Resume' : 'Pause'}
          hitSlop={10}
        >
          <Ionicons name={hud.phase === 'paused' ? 'play' : 'pause'} size={18} color="#ffffff" />
        </Pressable>
      </View>

      {hud.bossActive && (
        <View style={[styles.bossBar, { top: insets.top + 60, pointerEvents: 'none' }]}>
          <Text style={styles.bossName}>{BOSS_NAME}</Text>
          <View style={styles.bossTrack}>
            <View
              style={[
                styles.bossFill,
                { width: `${bossPct * 100}%`, backgroundColor: hud.bossPhase === 2 ? PALETTE.bossGlow : PALETTE.gateDamage },
              ]}
            />
          </View>
        </View>
      )}

      <View style={[styles.noticeStack, { top: height * 0.3, pointerEvents: 'none' }]}>
        {notices.map((n) => (
          <NoticeBanner key={n.id} notice={n} />
        ))}
      </View>

      <Animated.View style={[styles.hint, { bottom: insets.bottom + 26, opacity: hintOpacity, pointerEvents: 'none' }]}>
        <Ionicons name="swap-horizontal" size={16} color="rgba(255,255,255,0.85)" />
        <Text style={styles.hintText}>Drag to steer the squad</Text>
      </Animated.View>

      {/* ---- Pause ---- */}
      {hud.phase === 'paused' && !devOpen && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>PAUSED</Text>
            <Text style={styles.cardSub}>
              Wave {hud.wave} · {hud.squad} soldiers · {hud.kills} kills
            </Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Reduced screen shake</Text>
              <Switch value={reducedShake} onValueChange={setReducedShake} trackColor={{ true: PALETTE.gateSquad }} />
            </View>
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                game.resume();
                setHud(readHud(game));
              }}
            >
              <Text style={styles.primaryButtonText}>RESUME</Text>
            </Pressable>
            <Pressable style={styles.ghostButton} onPress={restart}>
              <Text style={styles.ghostButtonText}>RESTART STAGE</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ---- End states ---- */}
      {showEnd && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={[styles.cardKicker, { color: hud.phase === 'victory' ? PALETTE.gateSquad : PALETTE.bossGlow }]}>
              {hud.phase === 'victory' ? 'STAGE CLEAR' : 'SQUAD LOST'}
            </Text>
            <Text style={styles.cardTitle}>{hud.phase === 'victory' ? 'CAUSEWAY SECURED' : 'THE WARDEN HOLDS'}</Text>
            <View style={styles.statsRow}>
              <Stat label="KILLS" value={String(hud.kills)} />
              <Stat label="SQUAD" value={String(hud.squad)} />
              <Stat label="TIME" value={`${Math.floor(hud.elapsed)}s`} />
            </View>
            <Pressable style={styles.primaryButton} onPress={restart}>
              <Text style={styles.primaryButtonText}>{hud.phase === 'victory' ? 'PLAY AGAIN' : 'RETRY'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ---- Developer panel (dev builds only) ---- */}
      {__DEV__ && devOpen && (
        <DevPanel
          game={game}
          debug={debug}
          onToggleDebug={() => setDebug((d) => !d)}
          onClose={() => {
            setDevOpen(false);
            setHud(readHud(game));
          }}
          onRestart={restart}
          bottom={insets.bottom}
        />
      )}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function NoticeBanner({ notice }: { notice: Notice }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const seq = Animated.sequence([
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }),
      Animated.delay(800),
      Animated.timing(anim, { toValue: 2, duration: 350, useNativeDriver: true }),
    ]);
    seq.start();
    return () => seq.stop();
  }, [anim]);
  const color =
    notice.tone === 'squad' ? PALETTE.gateSquad : notice.tone === 'gold' ? PALETTE.gateDamage : notice.tone === 'danger' ? PALETTE.bossGlow : '#ffffff';
  return (
    <Animated.View
      style={[
        styles.notice,
        {
          opacity: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
          transform: [
            { scale: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [0.7, 1, 1.08] }) },
            { translateY: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [14, 0, -18] }) },
          ],
        },
      ]}
    >
      <Text style={[styles.noticeText, { color }]}>{notice.text}</Text>
    </Animated.View>
  );
}

// -----------------------------------------------------------------------------
// Developer panel — scenario buttons mirror game/tests/fire-system.test.ts.
// -----------------------------------------------------------------------------

function DevPanel({
  game,
  debug,
  onToggleDebug,
  onClose,
  onRestart,
  bottom,
}: {
  game: Game;
  debug: boolean;
  onToggleDebug: () => void;
  onClose: () => void;
  onRestart: () => void;
  bottom: number;
}) {
  const [, bump] = useState(0);
  const refresh = () => bump((n) => n + 1);
  const setSquad = (n: number) => {
    game.setSquadSize(n);
  };
  const clearField = () => {
    for (const e of game.enemies) {
      e.alive = false;
      e.death = 1;
    }
    game.enemies = [];
    game.boss.active = false;
  };
  const stress = () => {
    game.scripted = true;
    clearField();
    game.setSquadSize(50);
    for (let i = 0; i < 300; i++) game.spawnEnemy(i % 6 === 0 ? 'elite' : 'grunt', -0.9 + (i % 12) * 0.16, 1.4 + Math.floor(i / 12) * 0.18);
  };
  const bossTest = () => {
    game.scripted = true;
    clearField();
    game.setSquadSize(20);
    game.spawnBoss();
    game.boss.pos.y = BOSS.holdY + 0.3;
  };
  const Btn = ({ label, onPress, accent }: { label: string; onPress: () => void; accent?: boolean }) => (
    <Pressable style={[styles.devButton, accent && styles.devButtonAccent]} onPress={onPress}>
      <Text style={styles.devButtonText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={[styles.devPanel, { paddingBottom: bottom + 12 }]}>
      <View style={styles.devHeader}>
        <Text style={styles.devTitle}>DEV · FIRING SYSTEM</Text>
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={20} color="#fff" />
        </Pressable>
      </View>
      <View style={styles.devRow}>
        <Btn label="1 soldier" onPress={() => setSquad(1)} />
        <Btn label="3" onPress={() => setSquad(3)} />
        <Btn label="10" onPress={() => setSquad(10)} />
        <Btn label="+5" onPress={() => game.addSoldiers(5)} />
        <Btn label="25" onPress={() => setSquad(25)} />
      </View>
      <View style={styles.devRow}>
        <Btn label="+25% FR" onPress={() => game.applyEffect({ kind: 'fireRate', multiplier: 1.25 })} />
        <Btn label="×1.5 DMG" onPress={() => game.applyEffect({ kind: 'damage', multiplier: 1.5 })} />
        <Btn label="Boss ×20" onPress={bossTest} accent />
        <Btn label="Stress 50/300" onPress={stress} accent />
      </View>
      <View style={styles.devRow}>
        <Btn
          label={game.scripted ? 'Scripted ON' : 'Scripted OFF'}
          accent={game.scripted}
          onPress={() => {
            game.scripted = !game.scripted;
            refresh();
          }}
        />
        <Btn label={debug ? 'Overlay ON' : 'Overlay OFF'} onPress={onToggleDebug} accent={debug} />
        <Btn
          label={game.phase === 'paused' ? 'Resume' : 'Pause'}
          onPress={() => {
            game.togglePause();
            refresh();
          }}
        />
        <Btn label="Restart" onPress={onRestart} />
      </View>
      <Text style={styles.devHint}>Long-press the WAVE pill to reopen. Debug counters render on the canvas when the overlay is on.</Text>
    </View>
  );
}

// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a4f7c' },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    backgroundColor: 'rgba(6,20,40,0.55)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  pillSquad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(6,20,40,0.55)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(51,214,242,0.35)',
  },
  pillLabel: { color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.5 },
  pillValue: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: 0.5 },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(6,20,40,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  bossBar: { position: 'absolute', left: 24, right: 24, alignItems: 'center', gap: 6 },
  bossName: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 2.5,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
  bossTrack: {
    alignSelf: 'stretch',
    height: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(6,20,40,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  bossFill: { height: '100%', borderRadius: 5 },
  noticeStack: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 6 },
  notice: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(6,20,40,0.5)',
  },
  noticeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 2 },
  },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(6,20,40,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  hintText: { color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(4,14,30,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(10,28,52,0.96)',
    borderRadius: 22,
    padding: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cardKicker: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 3 },
  cardTitle: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 26, letterSpacing: 1 },
  cardSub: { color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_500Medium', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { color: '#fff', fontFamily: 'Inter_500Medium', fontSize: 15 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 24 },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 2 },
  primaryButton: {
    backgroundColor: PALETTE.gateSquad,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#04283a', fontFamily: 'Inter_700Bold', fontSize: 15, letterSpacing: 2 },
  ghostButton: { paddingVertical: 10, alignItems: 'center' },
  ghostButtonText: { color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_600SemiBold', fontSize: 13, letterSpacing: 1.5 },
  devPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6,16,30,0.94)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 14,
    gap: 8,
  },
  devHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  devTitle: { color: PALETTE.debug, fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2 },
  devRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  devButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  devButtonAccent: { borderColor: PALETTE.debug, backgroundColor: 'rgba(0,255,156,0.12)' },
  devButtonText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  devHint: { color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_400Regular', fontSize: 11 },
});
