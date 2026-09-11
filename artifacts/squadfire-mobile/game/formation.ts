/**
 * Formation slots relative to the squad anchor, expressed in the canonical road
 * basis: x along ROAD_RIGHT, y along ROAD_FORWARD.
 *
 * The squad is a compact, straight, symmetric block:
 *   - rows are perpendicular to the road (constant y);
 *   - columns are parallel to the road (constant x) — every column is a fire lane;
 *   - columns are unlocked gradually (`formationColumnThresholds`) and hard-capped
 *     (`formationMaxColumns` / `formationMaxWidth`); beyond that extra soldiers add
 *     rows behind, never more width, so a 50-soldier squad still has to be positioned;
 *   - growth never removes a column (lanes are only ever added);
 *   - a lone remainder leads as a point man; a larger partial row trails, centred;
 *   - row depth is compressed for very deep squads so the back rows stay on screen.
 */
import { SQUAD } from './balance';
import type { Vec2 } from './types';

export interface FormationLayout {
  rows: number;
  columns: number;
  /** Lateral distance between columns (world units). */
  horizontalSpacing: number;
  /** Forward distance between rows (world units). */
  longitudinalSpacing: number;
  /** Half of the outer lateral extent of the block (0 for one column). */
  halfWidth: number;
  /** Forward position of the front row. */
  frontY: number;
}

/**
 * Half-width of the drivable road at world depth `y`. World x is measured in road
 * half-widths, so this is constant: the road's on-screen narrowing is produced by the
 * perspective projection, not by the world geometry. Kept as a function so every
 * consumer (clamp, debug overlay, tests) asks the same question the same way.
 */
export function roadHalfWidthAt(_y: number): number {
  return SQUAD.roadHalfWidth;
}

/** Number of columns (fire lanes) a squad of `n` soldiers spreads across. */
export function formationColumns(n: number): number {
  const count = Math.max(0, Math.floor(n));
  if (count === 0) return 0;
  const byWidth = Math.floor(SQUAD.formationMaxWidth / SQUAD.formationHorizontalSpacing) + 1;
  const cap = Math.max(1, Math.min(SQUAD.formationMaxColumns, byWidth));
  let columns = 1;
  for (const threshold of SQUAD.formationColumnThresholds) if (count >= threshold) columns++;
  return Math.min(count, columns, cap);
}

export function formationLayout(n: number): FormationLayout {
  const count = Math.max(0, Math.floor(n));
  if (count === 0) {
    return { rows: 0, columns: 0, horizontalSpacing: SQUAD.formationHorizontalSpacing, longitudinalSpacing: SQUAD.formationLongitudinalSpacing, halfWidth: 0, frontY: 0 };
  }
  const columns = formationColumns(count);
  const rows = Math.ceil(count / columns);
  const horizontalSpacing = SQUAD.formationHorizontalSpacing;
  const longitudinalSpacing = rows > 1 ? clamp(SQUAD.formationMaxDepth / (rows - 1), SQUAD.formationMinLongitudinalSpacing, SQUAD.formationLongitudinalSpacing) : SQUAD.formationLongitudinalSpacing;
  const depth = (rows - 1) * longitudinalSpacing;
  // Deep blocks creep forward a little so the rear rows do not fall off the screen.
  const frontY = clamp(depth - SQUAD.formationMaxRearDepth, 0, SQUAD.formationMaxFrontAdvance);
  return { rows, columns, horizontalSpacing, longitudinalSpacing, halfWidth: ((columns - 1) * horizontalSpacing) / 2, frontY };
}

export function formationSlots(n: number): Vec2[] {
  const layout = formationLayout(n);
  const count = Math.max(0, Math.floor(n));
  if (count === 0) return [];
  const remainder = count % layout.columns;
  // Row sizes front → back. A single leftover soldier takes point; a wider partial
  // row trails so the front stays a solid line.
  const rowSizes: number[] = [];
  const fullRows = Math.floor(count / layout.columns);
  if (remainder === 1 && fullRows > 0) rowSizes.push(1);
  for (let r = 0; r < fullRows; r++) rowSizes.push(layout.columns);
  if (remainder > 1) rowSizes.push(remainder);
  const slots: Vec2[] = [];
  rowSizes.forEach((inRow, r) => {
    const width = (inRow - 1) * layout.horizontalSpacing;
    const y = layout.frontY - r * layout.longitudinalSpacing;
    for (let i = 0; i < inRow; i++) slots.push({ x: -width / 2 + i * layout.horizontalSpacing, y });
  });
  return slots;
}

/**
 * Furthest the anchor may travel so the whole block — not just its centre — stays on
 * the road with `formationRoadMargin` to spare:
 *   limit = roadHalfWidth(at squad depth) − formationHalfWidth − margin.
 */
export function anchorLimitFor(n: number): number {
  const layout = formationLayout(n);
  const road = roadHalfWidthAt(0);
  return Math.max(0.1, Math.min(SQUAD.anchorLimit, road - layout.halfWidth - SQUAD.formationRoadMargin));
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
