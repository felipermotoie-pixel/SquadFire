/**
 * Formation slots relative to the squad anchor, expressed in the canonical road
 * basis: x along ROAD_RIGHT, y along ROAD_FORWARD.
 *
 * The squad is a straight, symmetric block:
 *   - rows are perpendicular to the road (constant y);
 *   - columns are parallel to the road (constant x) — every column is a fire lane;
 *   - width is capped (`formationMaxColumns` × `formationHorizontalSpacing`); once
 *     the cap is reached extra soldiers add rows behind, never more width, so a
 *     50-soldier squad still has to be positioned by the player;
 *   - the last (rear) row is centered when it is not full;
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

export function formationLayout(n: number): FormationLayout {
  const count = Math.max(0, Math.floor(n));
  if (count === 0) {
    return { rows: 0, columns: 0, horizontalSpacing: SQUAD.formationHorizontalSpacing, longitudinalSpacing: SQUAD.formationLongitudinalSpacing, halfWidth: 0, frontY: 0 };
  }
  const maxColumns = Math.max(1, Math.min(SQUAD.formationMaxColumns, Math.floor(SQUAD.formationMaxWidth / SQUAD.formationHorizontalSpacing) + 1));
  // Width grows first (more lanes), then rows: 7 → 5+2, never 4+3. Once the block is
  // at full width, growth must not narrow it — a +3 gate should add fire, not take lanes away.
  const columns = Math.min(count, maxColumns);
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
  const slots: Vec2[] = [];
  let remaining = Math.max(0, Math.floor(n));
  for (let r = 0; r < layout.rows && remaining > 0; r++) {
    const inRow = Math.min(layout.columns, remaining);
    remaining -= inRow;
    const width = (inRow - 1) * layout.horizontalSpacing;
    const y = layout.frontY - r * layout.longitudinalSpacing;
    for (let i = 0; i < inRow; i++) {
      slots.push({ x: -width / 2 + i * layout.horizontalSpacing, y });
    }
  }
  return slots;
}

/** Furthest the anchor may travel so the whole block stays on the road. */
export function anchorLimitFor(n: number): number {
  const layout = formationLayout(n);
  return Math.max(0.1, Math.min(SQUAD.anchorLimit, SQUAD.roadHalfWidth - layout.halfWidth));
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
