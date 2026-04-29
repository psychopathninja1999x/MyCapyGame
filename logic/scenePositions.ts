import type { PetState } from './types';

/**
 * Where in the scene the capybara stands for each state.
 *
 * Coordinate system:
 *  - `x` is the horizontal CENTER of the sprite as a fraction of screen width.
 *  - `y` is the BOTTOM of the sprite (its "feet" / ground line) as a fraction
 *    of screen height. This matches how a designer thinks: "Capy stands here
 *    in the painting".
 *  - `size` is the rendered sprite size in dp.
 *  - `flipped` mirrors the sprite horizontally (the base sprite faces right).
 */
export type ScenePosition = {
  x: number;
  y: number;
  size: number;
  flipped: boolean;
};

/**
 * Bounding box of the pond (where swimming happens) in screen fractions.
 * Tuned visually against `bg.png` so the capy stays *in* the water and
 * doesn't paddle onto the grass / stepping stones.
 */
export const POND_BOUNDS = {
  xMin: 0.32,
  xMax: 0.7,
  yMin: 0.72,
  yMax: 0.84,
};

/** Crying on the wooden porch in front of the door — visible, head down. */
const PORCH_CRY: ScenePosition = { x: 0.22, y: 0.62, size: 175, flipped: false };
/** Tucked against the house corner, half-hidden — only triggers when very ignored. */
const HOUSE_HIDE: ScenePosition = { x: 0.08, y: 0.58, size: 155, flipped: false };

/** Static fallback positions per state. Some states override at runtime. */
const STATIC_POSITIONS: Record<PetState, ScenePosition> = {
  idle: { x: 0.30, y: 0.66, size: 190, flipped: false },
  happy: { x: 0.30, y: 0.66, size: 200, flipped: false },
  sad: PORCH_CRY,
  hungry: { x: 0.70, y: 0.58, size: 175, flipped: true },
  eating: { x: 0.72, y: 0.60, size: 180, flipped: true },
  swimming: { x: 0.5, y: 0.78, size: 170, flipped: false },
};

/** Public read-only view in case other code wants the static defaults. */
export const scenePositions: Readonly<Record<PetState, ScenePosition>> = STATIC_POSITIONS;

export type ScenePositionContext = {
  /** Real-time gap since the user last touched the capy. Drives "hiding" bias. */
  msSinceLastInteraction: number;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** A random spot within the pond — different x/y on each call. */
function randomPondSpot(): ScenePosition {
  const x = POND_BOUNDS.xMin + Math.random() * (POND_BOUNDS.xMax - POND_BOUNDS.xMin);
  const y = POND_BOUNDS.yMin + Math.random() * (POND_BOUNDS.yMax - POND_BOUNDS.yMin);
  // Face the direction we travelled: random for now since we don't track prev.
  return { x, y, size: 165, flipped: Math.random() > 0.5 };
}

/**
 * The longer the capy has been ignored, the more likely it retreats from
 * the porch to the house corner.
 *
 *   < 30s ignored → 20% hide chance (mostly cries on porch)
 *   ~2 min ignored → 50% hide chance
 *   > 5 min ignored → 70% hide chance (mostly hiding by the house)
 */
function pickSadPosition(ctx: ScenePositionContext): ScenePosition {
  const minutesIgnored = ctx.msSinceLastInteraction / 60_000;
  const hideChance = clamp(0.2 + minutesIgnored * 0.1, 0.2, 0.7);
  return Math.random() < hideChance ? HOUSE_HIDE : PORCH_CRY;
}

/**
 * Resolve the scene position for a given state. Most states are static;
 * `swimming` and `sad` randomize so the capy feels alive rather than
 * teleporting to identical pixel coordinates every time.
 */
export function resolveScenePosition(
  state: PetState,
  ctx: ScenePositionContext,
): ScenePosition {
  switch (state) {
    case 'swimming':
      return randomPondSpot();
    case 'sad':
      return pickSadPosition(ctx);
    default:
      return STATIC_POSITIONS[state];
  }
}
