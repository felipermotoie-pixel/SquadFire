/**
 * Gameplay screen: Skia battlefield + minimal React HUD.
 *
 * The HUD only shows what the player needs during play (planet · stage, Squad Power,
 * boss health, pause). Progression is planet/stage-based: the engine runs the stage
 * state machine; this screen renders banners and reports stage clears / planet
 * completion upward through callbacks (the campaign wrapper owns persistence).
 * Progress is only reported for runs the engine still marks `progressEligible`.
 * Diagnostics live behind a developer panel that is compiled out of production
 * builds (`__DEV__`).
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Battlefield } from '@/components/battlefield/Battlefield';
import { PALETTE } from '@/components/battlefield/palette';
import { BOSS, MAX_SQUAD_POWER, SQUAD } from '@/game/balance';
import { Game } from '@/game/engine';
import { DEFAULT_PLANET_ID } from '@/game/planets';
import { bossDisplayName } from '@/game/stages';
import type { GameEvent, GamePhase } from '@/game/types';

/** What the run reports upward when the planet's last stage is cleared. */
export interface PlanetRunSummary {
  planetId: string;
  kills: number;
  elapsed: number;
  squadPower: number;
  coins: number;
  /** False when the run used dev tools; the wrapper must not persist it. */
  progressEligible: boolean;
}

export interface GameScreenProps {
  planetId?: string;
  /** Called on every eligible stage clear (never for dev/scripted runs). */
  onStageCleared?: (planetId: string, stage: number) => void;
  /** Called once when the planet's last stage is cleared (eligible or not — see summary). */
  onPlanetComplete?: (summary: PlanetRunSummary) => void;
  /** Leaves the run (victory card → back to the campaign wrapper). */
  onExit?: () => void;
  /** Dev panel "Reset save": the campaign wrapper owns persistence, so it performs the reset. */
  onResetProgress?: () => void;
}

interface HudState {
  phase: GamePhase;
  planetName: string;
  stage: number;
  stageCount: number;
  squadPower: number;
  visible: number;
  progressEligible: boolean;
  bossActive: boolean;
  bossName: string;
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

/** Player-facing stage label, zero-padded like the brief ("STAGE 03"). */
function stageLabel(stage: number): string {
  return stage < 10 ? `0${stage}` : String(stage);
}

function readHud(game: Game): HudState {
  return {
    phase: game.phase,
    planetName: game.planet.displayName,
    stage: game.stage,
    stageCount: game.planet.stages.length,
    squadPower: game.squadPower,
    visible: game.visibleSquadCount,
    progressEligible: game.progressEligible,
    bossActive: game.boss.active && game.boss.alive,
    bossName: bossDisplayName(game.stageConfig.boss ?? { type: game.boss.type, hp: 0, approachDurationTargetSec: 0, attackIntervalMultiplier: 1, escortSize: 0, escortInterval: 0 }),
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
    a.stage === b.stage &&
    a.squadPower === b.squadPower &&
    a.visible === b.visible &&
    a.progressEligible === b.progressEligible &&
    a.bossActive === b.bossActive &&
    a.bossName === b.bossName &&
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
    e.type === 'gate' ? (e.message.includes('SQUAD') ? 'squad' : 'gold') : e.type === 'stage-start' ? 'neutral' : e.type === 'stage-clear' || e.type === 'planet-complete' ? 'squad' : 'danger';
  return { id: Math.random(), text: e.message, tone };
}

const WEB_PHONE_ASPECT = 9 / 19.5;
const WEB_PHONE_MAX_WIDTH = 430;

function gameViewport(windowWidth: number, windowHeight: number): { width: number; height: number } {
  if (Platform.OS !== 'web') return { width: windowWidth, height: windowHeight };
  const width = Math.max(320, Math.min(windowWidth, WEB_PHONE_MAX_WIDTH, windowHeight * WEB_PHONE_ASPECT));
  return { width, height: Math.min(windowHeight, width / WEB_PHONE_ASPECT) };
}

export function GameScreen({ planetId = DEFAULT_PLANET_ID, onStageCleared, onPlanetComplete, onExit, onResetProgress }: GameScreenProps) {
  const windowSize = useWindowDimensions();
  const { width, height } = useMemo(() => gameViewport(windowSize.width, windowSize.height), [windowSize.width, windowSize.height]);
  const insets = useSafeAreaInsets();
  const [seed, setSeed] = useState(1);
  // One Game per run: every run (and every RETRY) starts the planet at Stage 1 with
  // the initial Squad Power — Squad Power is per-run, there is no mid-planet resume.
  // Dimension changes only update its camera (see Battlefield), never the simulation.
  const initialSize = useRef({ width, height });
  const game = useMemo(
    () => new Game({ seed: seed * 7919 + 13, planetId, startStage: 1, initialSquadPower: SQUAD.initialSize, ...initialSize.current }),
    [seed, planetId],
  );
  const callbacks = useRef({ onStageCleared, onPlanetComplete });
  callbacks.current = { onStageCleared, onPlanetComplete };
  const planetReported = useRef(false);
  useEffect(() => {
    planetReported.current = false;
  }, [game]);
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
        if (e.type === 'stage-clear') {
          // Only campaign-legit runs move the save. Dev jumps, presets and cheats latch
          // progressEligible = false inside the engine; nothing here can re-enable it.
          if (g.progressEligible) callbacks.current.onStageCleared?.(g.planet.id, g.stage);
        } else if (e.type === 'planet-complete' && !planetReported.current) {
          planetReported.current = true;
          callbacks.current.onPlanetComplete?.({
            planetId: g.planet.id,
            kills: g.stats.kills,
            elapsed: g.stats.elapsed,
            squadPower: g.squadPower,
            coins: g.run.coins,
            progressEligible: g.progressEligible,
          });
        }
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

  // Horizontal drag anywhere on the battlefield steers the squad anchor. Deltas are
  // applied incrementally against the *current* target, so the control stays
  // responsive when a squad gate narrows the anchor clamp mid-gesture.
  const lastDragX = useRef(0);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2,
        onPanResponderGrant: (evt) => {
          lastDragX.current = evt.nativeEvent.pageX;
        },
        onPanResponderMove: (evt) => {
          const x = evt.nativeEvent.pageX;
          const dx = x - lastDragX.current;
          lastDragX.current = x;
          game.setInputX(game.targetAnchorX + (dx / game.cam.halfWidthBase) * 1.35);
        },
      }),
    [game],
  );

  const restart = () => setSeed((s) => s + 1);
  const bossPct = hud.bossActive ? Math.max(0, hud.bossHp / hud.bossMax) : 0;
  const showDefeat = hud.phase === 'defeat';
  const showVictory = hud.phase === 'victory';
  const bossName = hud.bossName;
  const gameSurfaceStyle = Platform.OS === 'web' ? [styles.webGameSurface, { width, height }] : styles.nativeGameSurface;

  return (
    <View style={[styles.root, Platform.OS === 'web' && styles.webRoot]}>
      <View style={gameSurfaceStyle}>
      <StatusBar style="light" />
      <Battlefield game={game} width={width} height={height} debug={debug} onSync={onSync} />
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />

      {/* ---- Minimal HUD ---- */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8, pointerEvents: 'box-none' }]}>
        <Pressable
          onLongPress={__DEV__ ? () => setDevOpen(true) : undefined}
          delayLongPress={600}
          style={styles.pill}
          accessibilityLabel={`${hud.planetName}, stage ${hud.stage} of ${hud.stageCount}`}
        >
          <Text style={styles.pillLabel}>{hud.planetName} • STAGE</Text>
          <Text style={styles.pillValue}>
            {stageLabel(hud.stage)}
            <Text style={styles.pillDim}>/{stageLabel(hud.stageCount)}</Text>
          </Text>
        </Pressable>
        <View style={styles.pillSquad} accessibilityLabel={`Squad power ${hud.squadPower} of ${MAX_SQUAD_POWER}`}>
          <Ionicons name="people" size={16} color={PALETTE.gateSquad} />
          <Text style={[styles.pillValue, { color: PALETTE.gateSquad }]}>
            {hud.squadPower}
            <Text style={styles.pillDim}> / {MAX_SQUAD_POWER}</Text>
          </Text>
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

      {__DEV__ && !hud.progressEligible && (
        <View style={[styles.devBadge, { top: insets.top + 52, pointerEvents: 'none' }]}>
          <Text style={styles.devBadgeText}>DEV RUN — PROGRESS NOT SAVED</Text>
        </View>
      )}

      {hud.bossActive && (
        <View style={[styles.bossBar, { top: insets.top + (hud.progressEligible ? 60 : 78), pointerEvents: 'none' }]}>
          <Text style={styles.bossName}>{bossName}</Text>
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
              {hud.planetName} · Stage {hud.stage}/{hud.stageCount} · Squad {hud.squadPower} · {hud.kills} kills
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
              <Text style={styles.ghostButtonText}>RESTART RUN</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ---- End states ---- */}
      {showDefeat && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={[styles.cardKicker, { color: PALETTE.bossGlow }]}>SQUAD LOST</Text>
            <Text style={styles.cardTitle}>THE CAUSEWAY HOLDS</Text>
            <View style={styles.statsRow}>
              <Stat label="STAGE" value={`${stageLabel(hud.stage)}/${stageLabel(hud.stageCount)}`} />
              <Stat label="KILLS" value={String(hud.kills)} />
              <Stat label="TIME" value={`${Math.floor(hud.elapsed)}s`} />
            </View>
            <Pressable style={styles.primaryButton} onPress={restart}>
              <Text style={styles.primaryButtonText}>RETRY</Text>
            </Pressable>
            {onExit && (
              <Pressable style={styles.ghostButton} onPress={onExit}>
                <Text style={styles.ghostButtonText}>BACK</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
      {showVictory && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={[styles.cardKicker, { color: PALETTE.gateSquad }]}>{hud.planetName} COMPLETE</Text>
            <Text style={styles.cardTitle}>THE CAUSEWAY IS OURS</Text>
            <View style={styles.statsRow}>
              <Stat label="SQUAD" value={String(hud.squadPower)} />
              <Stat label="KILLS" value={String(hud.kills)} />
              <Stat label="TIME" value={`${Math.floor(hud.elapsed)}s`} />
            </View>
            {!hud.progressEligible && <Text style={styles.cardSub}>Dev run — progress not saved.</Text>}
            <Pressable style={styles.primaryButton} onPress={onExit ?? restart}>
              <Text style={styles.primaryButtonText}>{onExit ? 'CONTINUE' : 'PLAY AGAIN'}</Text>
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
          onResetProgress={onResetProgress}
          bottom={insets.bottom}
        />
      )}
      </View>
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
  onResetProgress,
  bottom,
}: {
  game: Game;
  debug: boolean;
  onToggleDebug: () => void;
  onClose: () => void;
  onRestart: () => void;
  onResetProgress?: () => void;
  bottom: number;
}) {
  const [, bump] = useState(0);
  const refresh = () => bump((n) => n + 1);
  const crosserTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopCrosser = () => {
    if (crosserTimer.current) clearInterval(crosserTimer.current);
    crosserTimer.current = null;
  };
  useEffect(() => stopCrosser, [game]);
  const setPower = (n: number) => {
    game.setSquadPower(n);
    refresh();
  };
  const clearField = () => {
    stopCrosser();
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
    game.setSquadPower(500);
    for (let i = 0; i < 300; i++) game.spawnEnemy(i % 6 === 0 ? 'elite' : 'grunt', -0.9 + (i % 12) * 0.16, 1.4 + Math.floor(i / 12) * 0.18);
  };
  const bossTest = () => {
    game.scripted = true;
    clearField();
    game.setSquadPower(200);
    game.spawnBoss();
    game.boss.pos.y = BOSS.holdY + 0.3;
  };
  // Far boss entry: the real approach from bossSpawnDepth at the stage's pacing.
  const bossFar = () => {
    game.scripted = true;
    clearField();
    game.setSquadPower(200);
    game.spawnBoss();
  };
  // Straight-fire Test B: immortal, motionless enemies parked far right. Bullets must
  // miss until the squad is dragged under them.
  const offAxis = () => {
    game.scripted = true;
    clearField();
    for (let i = 0; i < 6; i++) {
      const e = game.spawnEnemy('grunt', 0.55 + (i % 3) * 0.15, 2.6 + Math.floor(i / 3) * 0.5);
      e.speed = 0;
      e.hp = 1e6;
      e.maxHp = 1e6;
    }
  };
  // Straight-fire Test C: one immortal enemy strafing across every lane. Enemy
  // wander is deliberately tiny, so the crossing is driven from the panel.
  const crosser = () => {
    game.scripted = true;
    clearField();
    const e = game.spawnEnemy('grunt', -0.9, 3.0);
    e.speed = 0;
    e.hp = 1e6;
    e.maxHp = 1e6;
    const start = game.time;
    crosserTimer.current = setInterval(() => {
      if (!e.alive) return stopCrosser();
      const t = game.time - start;
      e.pos.x = -0.9 + 1.8 * ((t / 8) % 1);
    }, 16);
  };
  const Btn = ({ label, onPress, accent }: { label: string; onPress: () => void; accent?: boolean }) => (
    <Pressable style={[styles.devButton, accent && styles.devButtonAccent]} onPress={onPress}>
      <Text style={styles.devButtonText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={[styles.devPanel, { paddingBottom: bottom + 12 }]}>
      <View style={styles.devHeader}>
        <Text style={styles.devTitle}>DEV · POWER {game.squadPower} · VISIBLE {game.visibleSquadCount} · PROGRESS NOT SAVED</Text>
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={20} color="#fff" />
        </Pressable>
      </View>
      <View style={styles.devRow}>
        <Btn label="P1" onPress={() => setPower(1)} />
        <Btn label="P5" onPress={() => setPower(5)} />
        <Btn label="P9" onPress={() => setPower(9)} />
        <Btn label="P10" onPress={() => setPower(10)} accent />
        <Btn label="P13" onPress={() => setPower(13)} />
        <Btn label="P100" onPress={() => setPower(100)} />
        <Btn label="P499" onPress={() => setPower(499)} />
        <Btn label="P500" onPress={() => setPower(500)} accent />
      </View>
      <View style={styles.devRow}>
        <Btn
          label="+1"
          onPress={() => {
            game.devAddSquadPower(1);
            refresh();
          }}
        />
        <Btn
          label="+5"
          onPress={() => {
            game.devAddSquadPower(5);
            refresh();
          }}
        />
        <Btn
          label="−1"
          onPress={() => {
            game.progressEligible = false;
            game.loseSquadPower(1, 'contact');
            refresh();
          }}
        />
        <Btn label="+25% FR" onPress={() => game.devApplyEffect({ kind: 'fireRate', multiplier: 1.25 })} />
        <Btn label="×1.5 DMG" onPress={() => game.devApplyEffect({ kind: 'damage', multiplier: 1.5 })} />
      </View>
      <View style={styles.devRow}>
        <Btn label="Boss near" onPress={bossTest} accent />
        <Btn label="Boss far entry" onPress={bossFar} accent />
        <Btn label="Stress 500/300" onPress={stress} accent />
        <Btn label="Off-axis wall" onPress={offAxis} />
        <Btn label="Lane crosser" onPress={crosser} />
      </View>
      <View style={styles.devRow}>
        <Btn label="Clear enemies" onPress={() => game.debugClearEnemies()} />
        <Btn label="Next stage" onPress={() => game.devJumpToStage(game.stage + 1)} />
        <Btn label="Stage 5" onPress={() => game.devJumpToStage(5)} accent />
        <Btn label="Stage 10" onPress={() => game.devJumpToStage(10)} accent />
        {onResetProgress && <Btn label="Reset save" onPress={onResetProgress} />}
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
      <Text style={styles.devHint}>Long-press the STAGE pill to reopen. Any dev action marks the run ineligible: progress is not saved. Stage jumps keep Squad Power and upgrades.</Text>
    </View>
  );
}

// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a4f7c' },
  webRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#03111f',
  },
  nativeGameSurface: { flex: 1, backgroundColor: '#0a4f7c' },
  webGameSurface: {
    overflow: 'hidden',
    backgroundColor: '#0a4f7c',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
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
  pillDim: { color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter_600SemiBold', fontSize: 13, letterSpacing: 0.5 },
  devBadge: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,196,0,0.18)',
    borderColor: 'rgba(255,196,0,0.6)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  devBadgeText: { color: '#ffd657', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 },
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
