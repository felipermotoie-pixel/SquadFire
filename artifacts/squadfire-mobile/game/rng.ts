/** Small deterministic PRNG shared by the simulation and the spawn scheduler. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mixes a run seed with a stage number into an independent stage seed. */
export function stageSeedFor(runSeed: number, stage: number): number {
  return (Math.imul(runSeed >>> 0, 0x9e3779b1) ^ Math.imul(stage + 1, 0x85ebca6b)) >>> 0;
}
