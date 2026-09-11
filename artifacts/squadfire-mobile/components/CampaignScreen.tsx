/**
 * Campaign wrapper: owns the persisted campaign progress and the planet flow around a
 * run. Deliberately small — this is not a menu/shop pass:
 *
 *   PRE_RUN          planet card (EARTH · progress · PLAY · next planet locked)
 *   RUN              <GameScreen> — one Game per run, always Stage 1 / initial power
 *   PLANET_COMPLETE  summary card with the Game unmounted; back to PRE_RUN
 *
 * Persistence rules: the save moves only through the pure reducers in
 * game/campaign-progress.ts, only for eligible runs (the engine latches
 * `progressEligible = false` for anything dev-driven), and a write happens only when
 * a reducer actually changed the record.
 */
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PALETTE } from '@/components/battlefield/palette';
import { GameScreen, type PlanetRunSummary } from '@/components/GameScreen';
import { defaultCampaign, loadCampaign, planetProgress, recordPlanetCompleted, recordStageCleared, resetCampaign, saveCampaign, type CampaignProgress } from '@/game/campaign';
import { PLANETS, planetById } from '@/game/planets';

type Flow = { kind: 'loading' } | { kind: 'pre-run' } | { kind: 'run'; runId: number } | { kind: 'planet-complete'; summary: PlanetRunSummary };

export function CampaignScreen() {
  const insets = useSafeAreaInsets();
  const [flow, setFlow] = useState<Flow>({ kind: 'loading' });
  const [progress, setProgress] = useState<CampaignProgress>(defaultCampaign());
  const progressRef = useRef(progress);
  const runCounter = useRef(0);
  /** Summary of the run in progress once its planet is complete (read when the run exits). */
  const pendingSummary = useRef<PlanetRunSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCampaign().then((p) => {
      if (cancelled) return;
      progressRef.current = p;
      setProgress(p);
      setFlow({ kind: 'pre-run' });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback((next: CampaignProgress) => {
    if (next === progressRef.current) return;
    progressRef.current = next;
    setProgress(next);
    void saveCampaign(next);
  }, []);

  const onStageCleared = useCallback(
    (planetId: string, stage: number) => {
      commit(recordStageCleared(progressRef.current, planetId, stage));
    },
    [commit],
  );

  /** Dev-only reset: state and disk move together so a later commit cannot resurrect old progress. */
  const onResetProgress = useCallback(() => {
    const fresh = defaultCampaign();
    progressRef.current = fresh;
    setProgress(fresh);
    void resetCampaign();
  }, []);

  const onPlanetComplete = useCallback(
    (summary: PlanetRunSummary) => {
      if (summary.progressEligible) commit(recordPlanetCompleted(progressRef.current, summary.planetId));
    },
    [commit],
  );

  const startRun = () => {
    runCounter.current += 1;
    pendingSummary.current = null;
    setFlow({ kind: 'run', runId: runCounter.current });
  };

  const exitRun = () => {
    const summary = pendingSummary.current;
    pendingSummary.current = null;
    setFlow(summary ? { kind: 'planet-complete', summary } : { kind: 'pre-run' });
  };

  const planet = planetById(progress.currentPlanetId);
  const pp = planetProgress(progress, planet.id);
  const next = planet.nextPlanetId ? PLANETS[planet.nextPlanetId] : undefined;

  if (flow.kind === 'run') {
    return (
      <GameScreen
        key={flow.runId}
        planetId={planet.id}
        onStageCleared={onStageCleared}
        onPlanetComplete={(summary) => {
          pendingSummary.current = summary;
          onPlanetComplete(summary);
          // The victory card inside the run shows CONTINUE → exitRun → summary screen (Game unmounted).
        }}
        onExit={exitRun}
        onResetProgress={__DEV__ ? onResetProgress : undefined}
      />
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="light" />
      {flow.kind === 'loading' && <ActivityIndicator color={PALETTE.gateSquad} />}

      {flow.kind === 'pre-run' && (
        <View style={styles.card}>
          <Text style={styles.kicker}>SQUADFIRE</Text>
          <Text style={styles.title}>{planet.displayName}</Text>
          <Text style={styles.sub}>
            {pp.completed ? 'PLANET CLEARED' : `PROGRESS ${pp.highestCompletedStage}/${planet.stages.length}`}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(pp.highestCompletedStage / planet.stages.length) * 100}%` }]} />
          </View>
          <Text style={styles.note}>Every run starts at Stage 1. Squad Power builds inside the run.</Text>
          <Pressable style={styles.primaryButton} onPress={startRun} accessibilityLabel={`Play ${planet.displayName}`}>
            <Text style={styles.primaryButtonText}>PLAY</Text>
          </Pressable>
          <View style={styles.lockedRow}>
            <Text style={styles.lockedLabel}>{next ? next.displayName : 'NEXT PLANET'}</Text>
            <Text style={styles.lockedValue}>LOCKED</Text>
          </View>
        </View>
      )}

      {flow.kind === 'planet-complete' && (
        <View style={styles.card}>
          <Text style={[styles.kicker, { color: PALETTE.gateSquad }]}>{planetById(flow.summary.planetId).displayName} COMPLETE</Text>
          <Text style={styles.title}>THE CAUSEWAY IS OURS</Text>
          <View style={styles.statsRow}>
            <Stat label="SQUAD" value={String(flow.summary.squadPower)} />
            <Stat label="KILLS" value={String(flow.summary.kills)} />
            <Stat label="TIME" value={`${Math.floor(flow.summary.elapsed)}s`} />
          </View>
          {!flow.summary.progressEligible && <Text style={styles.note}>Dev run — progress not saved.</Text>}
          <Pressable style={styles.primaryButton} onPress={() => setFlow({ kind: 'pre-run' })}>
            <Text style={styles.primaryButtonText}>CONTINUE</Text>
          </Pressable>
        </View>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a4f7c', alignItems: 'center', justifyContent: 'center', padding: 24 },
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
  kicker: { color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 3 },
  title: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 32, letterSpacing: 2 },
  sub: { color: PALETTE.gateSquad, fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 2 },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: PALETTE.gateSquad, borderRadius: 4 },
  note: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_500Medium', fontSize: 13 },
  primaryButton: { backgroundColor: PALETTE.gateSquad, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#04283a', fontFamily: 'Inter_700Bold', fontSize: 15, letterSpacing: 2 },
  lockedRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4, opacity: 0.55 },
  lockedLabel: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 13, letterSpacing: 1.5 },
  lockedValue: { color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 24 },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 2 },
});
