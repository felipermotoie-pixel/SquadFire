import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type GateKind = 'add' | 'multiplier';

const BASE_HEIGHT = 844;
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function BobbingUnit({
  x,
  y,
  scale,
  team,
  delay,
  boss = false,
}: {
  x: number;
  y: number;
  scale: number;
  team: 'squad' | 'enemy';
  delay: number;
  boss?: boolean;
}) {
  const colors = useColors();
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: -4,
          duration: 520 + delay * 14,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 520 + delay * 14,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [bob, delay]);

  const isSquad = team === 'squad';
  const unitWidth = boss ? 76 : 33;
  const unitHeight = boss ? 86 : 48;

  return (
    <Animated.View
      style={[
        styles.unit,
        {
          left: x - unitWidth / 2,
          top: y,
          width: unitWidth,
          height: unitHeight,
          transform: [{ translateY: bob }, { scale }],
        },
      ]}
    >
      {boss ? (
        <View style={styles.bossUnit}>
          <View
            style={[
              styles.bossCrown,
              { backgroundColor: colors.bossGlow, borderColor: colors.enemyHighlight },
            ]}
          >
            <View style={[styles.bossEye, { backgroundColor: colors.beam }]} />
            <View style={[styles.bossEye, { backgroundColor: colors.beam }]} />
          </View>
          <View style={[styles.bossBody, { backgroundColor: colors.bossRed }]}>
            <View style={[styles.bossCore, { backgroundColor: colors.bossGlow }]} />
          </View>
          <View style={[styles.bossFoot, { backgroundColor: colors.enemyDeep }]} />
        </View>
      ) : (
        <View style={styles.soldier}>
          <View
            style={[
              styles.helmet,
              {
                backgroundColor: isSquad ? colors.squadDeep : colors.enemyDeep,
                borderColor: isSquad ? colors.squadHighlight : colors.enemyHighlight,
              },
            ]}
          />
          <View
            style={[
              styles.body,
              {
                backgroundColor: isSquad ? colors.squadBlue : colors.enemyRed,
                borderColor: isSquad ? colors.squadHighlight : colors.enemyHighlight,
              },
            ]}
          />
          <View
            style={[
              styles.weapon,
              { backgroundColor: isSquad ? colors.squadHighlight : colors.enemyHighlight },
            ]}
          />
          <View
            style={[
              styles.unitShadow,
              { backgroundColor: colors.shadow, opacity: isSquad ? 0.34 : 0.28 },
            ]}
          />
        </View>
      )}
    </Animated.View>
  );
}

function Spark({ x, y, size, color, delay }: { x: number; y: number; size: number; color: string; delay: number }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(pulse, { toValue: 1, duration: 640, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 640, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [delay, pulse]);

  return (
    <Animated.View
      style={[
        styles.spark,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1.45] }) }],
        },
      ]}
    />
  );
}

function Projectile({ x, y, delay, color }: { x: number; y: number; delay: number; color: string }) {
  const travel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(travel, { toValue: 1, duration: 1080, useNativeDriver: true }),
        Animated.timing(travel, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [delay, travel]);

  return (
    <Animated.View
      style={[
        styles.projectile,
        {
          left: x,
          top: y,
          backgroundColor: color,
          opacity: travel.interpolate({ inputRange: [0, 0.1, 0.95, 1], outputRange: [0, 1, 1, 0] }),
          transform: [{ translateY: travel.interpolate({ inputRange: [0, 1], outputRange: [0, -250] }) }],
        },
      ]}
    />
  );
}

function Gate({
  label,
  detail,
  color,
  kind,
  onPress,
}: {
  label: string;
  detail: string;
  color: string;
  kind: GateKind;
  onPress: () => void;
}) {
  const colors = useColors();
  const press = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(press, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 7 }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: press }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} ${detail}`}
        testID={`gate-${kind}`}
        onPress={handlePress}
        style={({ pressed }) => [styles.gate, pressed && styles.gatePressed]}
      >
        <View style={[styles.gatePost, { backgroundColor: color }]} />
        <View style={[styles.gatePanel, { backgroundColor: color, borderColor: colors.laneAccent }]}>
          <Text style={[styles.gateLabel, { color: colors.primaryForeground }]}>{label}</Text>
          <Text style={[styles.gateDetail, { color: colors.primaryForeground }]}>{detail}</Text>
        </View>
        <View style={[styles.gatePost, { backgroundColor: color }]} />
      </Pressable>
    </Animated.View>
  );
}

export default function SquadFireScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [playerX, setPlayerX] = useState(width / 2);
  const [squadCount, setSquadCount] = useState(8);
  const [score, setScore] = useState(1240);
  const [bossHp, setBossHp] = useState(68);
  const [wave, setWave] = useState(3);
  const [paused, setPaused] = useState(false);
  const [notice, setNotice] = useState('CLEAR THE CAUSEWAY');
  const wavePulse = useRef(new Animated.Value(0)).current;
  const noticeOpacity = useRef(new Animated.Value(0)).current;
  const stageHeight = Math.max(height - insets.top - insets.bottom, 640);
  const scale = clamp(stageHeight / BASE_HEIGHT, 0.84, 1.08);

  const squadPositions = useMemo(() => {
    const positions: Array<{ x: number; y: number; scale: number; delay: number }> = [];
    const rows = Math.min(4, Math.ceil(squadCount / 3));
    for (let row = 0; row < rows; row += 1) {
      const count = Math.min(3, squadCount - row * 3);
      const spread = 36 + row * 5;
      for (let unit = 0; unit < count; unit += 1) {
        positions.push({
          x: playerX + (unit - (count - 1) / 2) * spread,
          y: stageHeight - 138 - row * 30,
          scale: 0.92 + row * 0.04,
          delay: row * 90 + unit * 45,
        });
      }
    }
    return positions;
  }, [playerX, squadCount, stageHeight]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 4,
        onPanResponderMove: (_, gestureState) =>
          setPlayerX(clamp(width / 2 + gestureState.dx, 52, width - 52)),
        onPanResponderRelease: () => Haptics.selectionAsync(),
      }),
    [width],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      if (paused) return;
      setScore((current) => current + 8);
      setBossHp((current) => (current <= 8 ? 72 : current - 1));
      setWave((current) => (current >= 6 ? 1 : current + 1));
    }, 1200);
    return () => clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    if (!notice) return;
    Animated.sequence([
      Animated.timing(noticeOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1450),
      Animated.timing(noticeOpacity, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start(() => setNotice(''));
  }, [notice, noticeOpacity]);

  const triggerGate = (kind: GateKind) => {
    if (kind === 'add') {
      setSquadCount((current) => Math.min(current + 3, 15));
      setNotice('+3 SQUAD REINFORCEMENTS');
    } else {
      setScore((current) => current + 250);
      setBossHp((current) => Math.max(10, current - 12));
      setNotice('DAMAGE BOOST ACTIVE');
    }
    Animated.sequence([
      Animated.timing(wavePulse, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(wavePulse, { toValue: 0, duration: 520, useNativeDriver: true }),
    ]).start();
  };

  const safeTop = insets.top + (Platform.OS === 'web' ? 18 : 0);
  const bossY = stageHeight * 0.19;
  const enemyBaseY = stageHeight * 0.29;
  const squadBaseY = stageHeight - 138;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[colors.skyTop, colors.skyBottom]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.waterLayer}>
        <LinearGradient
          colors={[colors.waterDeep, colors.water, colors.waterDeep]}
          locations={[0, 0.52, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.waveLine, { top: stageHeight * 0.14, backgroundColor: colors.squadHighlight }]} />
        <View style={[styles.waveLine, { top: stageHeight * 0.48, backgroundColor: colors.laneAccent }]} />
        <View style={[styles.waveLine, { top: stageHeight * 0.7, backgroundColor: colors.squadHighlight }]} />
      </View>

      <View
        {...panResponder.panHandlers}
        style={[styles.stage, { paddingTop: safeTop }]}
        accessibilityLabel="Battlefield. Drag left or right to move your squad."
      >
        <View style={[styles.horizonCloud, { left: -40, top: stageHeight * 0.08 }]} />
        <View style={[styles.horizonCloud, { right: -70, top: stageHeight * 0.2, transform: [{ scale: 0.75 }] }]} />

        <View
          style={[
            styles.causeway,
            {
              top: stageHeight * 0.12,
              bottom: 0,
              backgroundColor: colors.ground,
              borderColor: colors.groundLight,
            },
          ]}
        >
          <LinearGradient
            colors={[colors.groundLight, colors.ground, colors.groundShadow]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.causewayEdge, { left: 14, backgroundColor: colors.groundShadow }]} />
          <View style={[styles.causewayEdge, { right: 14, backgroundColor: colors.groundShadow }]} />
          <View style={[styles.centerLane, { backgroundColor: colors.lane }]} />
          <View style={[styles.laneDash, { top: stageHeight * 0.2, backgroundColor: colors.laneAccent }]} />
          <View style={[styles.laneDash, { top: stageHeight * 0.44, backgroundColor: colors.laneAccent }]} />
          <View style={[styles.laneDash, { top: stageHeight * 0.68, backgroundColor: colors.laneAccent }]} />
        </View>

        <View style={[styles.zoneLabel, { top: stageHeight * 0.14, left: 22 }]}>
          <View style={[styles.zoneDot, { backgroundColor: colors.enemyRed }]} />
          <Text style={[styles.zoneText, { color: colors.hud }]}>ENEMY TERRITORY</Text>
        </View>

        {[
          { x: width * 0.29, y: enemyBaseY + 4, scale: 1.12, delay: 40 },
          { x: width * 0.42, y: enemyBaseY + 16, scale: 1.02, delay: 100 },
          { x: width * 0.56, y: enemyBaseY + 5, scale: 1.08, delay: 150 },
          { x: width * 0.7, y: enemyBaseY + 20, scale: 0.96, delay: 230 },
          { x: width * 0.36, y: enemyBaseY + 58, scale: 0.88, delay: 310 },
          { x: width * 0.49, y: enemyBaseY + 72, scale: 0.82, delay: 390 },
          { x: width * 0.63, y: enemyBaseY + 60, scale: 0.9, delay: 450 },
          { x: width * 0.76, y: enemyBaseY + 74, scale: 0.78, delay: 520 },
        ].map((unit) => (
          <BobbingUnit key={`${unit.x}-${unit.y}`} {...unit} team="enemy" />
        ))}

        <View style={[styles.bossAura, { top: bossY - 18, left: width / 2 - 62, borderColor: colors.bossGlow }]} />
        <View style={[styles.bossHealth, { top: bossY - 14, left: width / 2 - 55 }]}>
          <View style={[styles.bossHealthTrack, { backgroundColor: colors.enemyDeep }]}>
            <View style={[styles.bossHealthFill, { width: `${bossHp}%`, backgroundColor: colors.bossGlow }]} />
          </View>
          <Text style={[styles.bossHealthLabel, { color: colors.hud }]}>WARCHIEF</Text>
        </View>
        <BobbingUnit x={width / 2} y={bossY} scale={1} team="enemy" delay={0} boss />

        <View style={[styles.gateRow, { top: stageHeight * 0.49 }]}>
          <Gate label="+3" detail="SQUAD" color={colors.gateCyan} kind="add" onPress={() => triggerGate('add')} />
          <Gate label="×2" detail="DAMAGE" color={colors.gateGold} kind="multiplier" onPress={() => triggerGate('multiplier')} />
        </View>

        {[
          { x: width * 0.42, y: stageHeight * 0.57, color: colors.beam, delay: 0 },
          { x: width * 0.5, y: stageHeight * 0.61, color: colors.enemyHighlight, delay: 340 },
          { x: width * 0.58, y: stageHeight * 0.55, color: colors.beam, delay: 640 },
        ].map((shot) => (
          <Projectile key={`${shot.x}-${shot.y}`} {...shot} />
        ))}

        <Spark x={width * 0.34} y={stageHeight * 0.43} size={8} color={colors.beam} delay={0} />
        <Spark x={width * 0.64} y={stageHeight * 0.47} size={6} color={colors.enemyHighlight} delay={280} />
        <Spark x={width * 0.55} y={stageHeight * 0.39} size={5} color={colors.squadHighlight} delay={520} />

        <Animated.View
          style={[
            styles.hitFlash,
            {
              top: bossY + 20,
              left: width / 2 - 18,
              backgroundColor: colors.beam,
              opacity: wavePulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] }),
              transform: [{ scale: wavePulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2.3] }) }],
            },
          ]}
        />

        <View style={[styles.squadShadow, { left: playerX - 62, top: squadBaseY + 42, backgroundColor: colors.shadow }]} />
        {squadPositions.map((unit, index) => (
          <BobbingUnit key={`${unit.x}-${index}`} {...unit} team="squad" />
        ))}

        <View style={[styles.dragHint, { bottom: insets.bottom + 16 }]}>
          <Ionicons name="swap-horizontal" size={16} color={colors.hud} />
          <Text style={[styles.dragHintText, { color: colors.hud }]}>DRAG TO MOVE</Text>
        </View>
      </View>

      <View style={[styles.hudLayer, { paddingTop: safeTop }]}>
        <View style={styles.topHud}>
          <View style={styles.brandLockup}>
            <View style={[styles.brandMark, { backgroundColor: colors.squadBlue, borderColor: colors.squadHighlight }]}>
              <Ionicons name="flash" size={16} color={colors.squadHighlight} />
            </View>
            <View>
              <Text style={[styles.brandName, { color: colors.hud }]}>SQUADFIRE</Text>
              <Text style={[styles.brandSub, { color: colors.hudSoft }]}>OPERATION: BREAKWATER</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Resume mission' : 'Pause mission'}
            testID="pause-button"
            onPress={() => {
              setPaused((current) => !current);
              Haptics.selectionAsync();
            }}
            style={styles.pauseButton}
          >
            <Ionicons name={paused ? 'play' : 'pause'} size={17} color={colors.hud} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Ionicons name="people" size={15} color={colors.squadBlue} />
            <Text style={[styles.statValue, { color: colors.hud }]}>{squadCount}</Text>
            <Text style={[styles.statCaption, { color: colors.hudSoft }]}>SQUAD</Text>
          </View>
          <View style={styles.wavePill}>
            <Text style={[styles.waveLabel, { color: colors.hudSoft }]}>WAVE</Text>
            <Text style={[styles.waveValue, { color: colors.hud }]}>{String(wave).padStart(2, '0')}</Text>
            <View style={[styles.waveProgress, { backgroundColor: colors.gateGold }]} />
          </View>
          <View style={styles.statPill}>
            <Ionicons name="star" size={15} color={colors.gateGold} />
            <Text style={[styles.statValue, { color: colors.hud }]}>{score.toLocaleString()}</Text>
          </View>
        </View>

        {notice ? (
          <Animated.View style={[styles.notice, { opacity: noticeOpacity, top: stageHeight * 0.42 }]}>
            <Text style={[styles.noticeText, { color: colors.hud }]}>{notice}</Text>
          </Animated.View>
        ) : null}

        {paused ? (
          <View style={styles.pauseScrim}>
            <View style={[styles.pauseCard, { backgroundColor: colors.hud, borderColor: colors.squadBlue }]}>
              <Ionicons name="pause-circle" size={34} color={colors.squadHighlight} />
              <Text style={[styles.pauseTitle, { color: colors.foreground }]}>MISSION PAUSED</Text>
              <Text style={[styles.pauseCopy, { color: colors.mutedForeground }]}>Your squad is holding the line.</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Resume mission"
                onPress={() => setPaused(false)}
                style={[styles.resumeButton, { backgroundColor: colors.squadBlue }]}
              >
                <Text style={[styles.resumeText, { color: colors.primaryForeground }]}>RESUME</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08152a' },
  stage: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  waterLayer: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  waveLine: {
    position: 'absolute',
    height: 2,
    width: '120%',
    left: '-10%',
    opacity: 0.24,
    transform: [{ rotate: '-7deg' }],
  },
  horizonCloud: {
    position: 'absolute',
    width: 150,
    height: 42,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    opacity: 0.2,
  },
  causeway: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    borderRadius: 44,
    borderWidth: 3,
    overflow: 'hidden',
    shadowColor: '#0b3854',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  causewayEdge: { position: 'absolute', top: 0, bottom: 0, width: 6, opacity: 0.45 },
  centerLane: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '46%',
    width: '8%',
    opacity: 0.28,
  },
  laneDash: {
    position: 'absolute',
    height: 8,
    borderRadius: 4,
    left: '46%',
    width: '8%',
    opacity: 0.75,
  },
  zoneLabel: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  zoneDot: { width: 7, height: 7, borderRadius: 4 },
  zoneText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.1 },
  unit: { position: 'absolute', alignItems: 'center', justifyContent: 'flex-start' },
  soldier: { width: 34, height: 50, alignItems: 'center' },
  helmet: {
    width: 19,
    height: 16,
    borderRadius: 9,
    borderWidth: 2,
    zIndex: 2,
  },
  body: {
    marginTop: -2,
    width: 23,
    height: 24,
    borderRadius: 9,
    borderWidth: 2,
    transform: [{ skewX: '-4deg' }],
  },
  weapon: {
    position: 'absolute',
    top: 25,
    right: 1,
    width: 17,
    height: 4,
    borderRadius: 3,
    transform: [{ rotate: '-24deg' }],
  },
  unitShadow: {
    position: 'absolute',
    bottom: 0,
    width: 29,
    height: 8,
    borderRadius: 18,
    transform: [{ scaleX: 1.1 }],
  },
  bossUnit: { alignItems: 'center', width: 78, height: 88 },
  bossCrown: {
    width: 47,
    height: 31,
    borderRadius: 18,
    borderWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    zIndex: 2,
  },
  bossEye: { width: 8, height: 5, borderRadius: 3 },
  bossBody: {
    marginTop: -4,
    width: 64,
    height: 48,
    borderRadius: 23,
    borderWidth: 3,
    borderColor: '#ff9b64',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossCore: { width: 18, height: 18, borderRadius: 10, borderWidth: 3, borderColor: '#fff3ad' },
  bossFoot: { marginTop: -2, width: 47, height: 17, borderRadius: 9 },
  bossAura: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 70,
    borderWidth: 2,
    opacity: 0.35,
  },
  bossHealth: { position: 'absolute', width: 110, alignItems: 'center', gap: 4 },
  bossHealthTrack: { width: 110, height: 6, borderRadius: 4, overflow: 'hidden' },
  bossHealthFill: { height: '100%', borderRadius: 4 },
  bossHealthLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  gateRow: {
    position: 'absolute',
    left: '17%',
    right: '17%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gate: {
    height: 86,
    width: 102,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  gatePressed: { opacity: 0.86 },
  gatePost: { height: 64, width: 8, borderRadius: 4, marginHorizontal: 3, opacity: 0.9 },
  gatePanel: {
    width: 74,
    height: 53,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ perspective: 350 }, { rotateX: '10deg' }],
    shadowColor: '#0b3854',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  gateLabel: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.8 },
  gateDetail: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.1, marginTop: 1 },
  projectile: {
    position: 'absolute',
    width: 4,
    height: 28,
    borderRadius: 4,
    shadowColor: '#fff3ad',
    shadowOpacity: 0.85,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  spark: { position: 'absolute' },
  hitFlash: { position: 'absolute', width: 36, height: 36, borderRadius: 20 },
  squadShadow: { position: 'absolute', width: 124, height: 22, borderRadius: 50, opacity: 0.28 },
  dragHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    opacity: 0.7,
  },
  dragHintText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.4 },
  hudLayer: { ...StyleSheet.absoluteFill, pointerEvents: 'box-none' },
  topHud: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '8deg' }],
  },
  brandName: { fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 1.8 },
  brandSub: { fontSize: 7, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.2, marginTop: 2 },
  pauseButton: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.56)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    marginTop: 15,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statPill: {
    minWidth: 78,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.57)',
  },
  statValue: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  statCaption: { fontSize: 8, fontFamily: 'Inter_700Bold', letterSpacing: 0.7 },
  wavePill: {
    height: 32,
    minWidth: 88,
    borderRadius: 16,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.57)',
  },
  waveLabel: { fontSize: 8, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  waveValue: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  waveProgress: { width: 18, height: 5, borderRadius: 3, marginLeft: 2 },
  notice: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.86)',
  },
  noticeText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.2 },
  pauseScrim: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,18,33,0.28)',
  },
  pauseCard: {
    width: '76%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#04101c',
    shadowOpacity: 0.38,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  pauseTitle: { marginTop: 10, fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: 1.3 },
  pauseCopy: { marginTop: 7, fontSize: 13, fontFamily: 'Inter_400Regular' },
  resumeButton: { marginTop: 19, minWidth: 132, paddingVertical: 12, borderRadius: 15, alignItems: 'center' },
  resumeText: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
});