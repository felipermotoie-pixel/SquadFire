/**
 * Audio aggregation bus.
 *
 * Every soldier produces a logical ShotEvent. Playing one gunshot sample per
 * event would clip and turn into noise with 30+ shooters, so the audio layer
 * groups shots that land inside a short window and emits ONE aggregated event
 * whose intensity reflects firing density. Playback itself is not wired yet
 * (no audio dependency in this iteration) — the bus is the integration point.
 */
import type { ShotEvent } from './types';

export interface AggregatedShotBurst {
  /** Simulation time at which the window closed. */
  at: number;
  /** Number of individual shots inside the window. */
  count: number;
  /** 0..1 intensity derived from count (log curve so 30 shots ≠ 30× volume). */
  intensity: number;
  /** Distinct soldiers that fired inside the window. */
  shooters: number;
}

export type BurstListener = (burst: AggregatedShotBurst) => void;

export class ShotAudioAggregator {
  private windowSeconds: number;
  private windowStart = -1;
  private count = 0;
  private shooters = new Set<number>();
  private listeners: BurstListener[] = [];

  constructor(windowSeconds = 0.045) {
    this.windowSeconds = windowSeconds;
  }

  subscribe(listener: BurstListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /** Feed a ShotEvent (call from Game.onShot). */
  push(shot: ShotEvent): void {
    if (this.windowStart < 0) this.windowStart = shot.timestamp;
    if (shot.timestamp - this.windowStart >= this.windowSeconds) {
      this.flush(shot.timestamp);
      this.windowStart = shot.timestamp;
    }
    this.count++;
    this.shooters.add(shot.soldierId);
  }

  /** Close the current window (call once per frame with the current sim time). */
  flush(now: number): void {
    if (this.count === 0) return;
    if (now - this.windowStart < this.windowSeconds) return;
    const burst: AggregatedShotBurst = {
      at: now,
      count: this.count,
      shooters: this.shooters.size,
      intensity: Math.min(1, Math.log2(1 + this.count) / 5),
    };
    this.count = 0;
    this.shooters.clear();
    this.windowStart = now;
    for (const l of this.listeners) l(burst);
  }
}
