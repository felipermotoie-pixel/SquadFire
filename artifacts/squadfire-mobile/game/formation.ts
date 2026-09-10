/**
 * Formation slots relative to the squad anchor.
 *
 *  1        → centered
 *  2–3      → compact triangle (point man + two behind)
 *  4–6      → staggered wedge
 *  7–15     → layered wedge (1,2,3,4,5)
 *  16+      → wider multi-row block (5 rows, widened per row)
 *
 * Slots are returned front-to-back so the lowest soldier ids keep the front line
 * when the squad grows, which keeps growth visually stable.
 */
import { SQUAD } from './balance';
import type { Vec2 } from './types';

const WEDGE_ROWS = [1, 2, 3, 4, 5];

export function rowCapacities(n: number): number[] {
  if (n <= 0) return [];
  if (n === 2) return [2];
  if (n <= 15) {
    const rows: number[] = [];
    let remaining = n;
    for (const cap of WEDGE_ROWS) {
      if (remaining <= 0) break;
      const take = Math.min(cap, remaining);
      rows.push(take);
      remaining -= take;
    }
    return rows;
  }
  const rowCount = SQUAD.maxRowsBeforeWidening;
  const base = Math.floor(n / rowCount);
  let extra = n - base * rowCount;
  const rows = new Array<number>(rowCount).fill(base);
  // Put extras on the back rows so the front stays narrower than the back (wedge feel).
  for (let r = rowCount - 1; r >= 0 && extra > 0; r--) {
    rows[r] += 1;
    extra -= 1;
  }
  // Slightly narrow the very front row for a wedge silhouette on big squads.
  if (rows[0] > 3 && rows[rows.length - 1] < 12) {
    rows[0] -= 1;
    rows[rows.length - 1] += 1;
  }
  return rows;
}

export function formationSlots(n: number): Vec2[] {
  const rows = rowCapacities(n);
  const slots: Vec2[] = [];
  const widest = rows.reduce((m, c) => Math.max(m, c), 1);
  // Compress spacing a little for very wide rows so the squad stays inside the lane.
  const lateral = Math.min(SQUAD.lateralSpacing, 1.5 / Math.max(1, widest));
  rows.forEach((count, r) => {
    const y = -r * SQUAD.rowSpacing;
    // Rows with the same count as the previous row are offset by half a spacing so
    // soldiers never stand directly behind one another.
    const prev = r > 0 ? rows[r - 1] : -1;
    const stagger = prev === count ? lateral * 0.5 * (r % 2 === 1 ? 1 : -1) : 0;
    const width = (count - 1) * lateral;
    for (let i = 0; i < count; i++) {
      const x = -width / 2 + i * lateral + stagger;
      slots.push({ x: clamp(x, -0.9, 0.9), y });
    }
  });
  return slots;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
