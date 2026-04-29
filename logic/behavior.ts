import type { Pet, PetState, PetStats } from './types';

/**
 * Stat-balance configuration for the pet sim.
 *
 * Numbers were tuned against established mobile pet games (Tamagotchi,
 * Pou, Nintendogs, My Tamagotchi Forever) so the capy doesn't feel
 * "always hungry":
 *
 *   - Stats decay on a per-minute cadence, not per-second. Active play
 *     shows visible drift, but a healthy capy stays content for tens of
 *     minutes before needing care.
 *   - Hunger fills slower than the old rate (~3 hours 0→100 of pure
 *     decay) and starts well-fed.
 *   - State priority is severity-weighted (see derivePassiveState below):
 *     whichever need is in the worst deficit wins, instead of `hungry`
 *     always trumping `sad`.
 */
export const behaviorConfig = {
  /** How often passive decay is applied (ms). Every 5 s feels alive but calm. */
  tickIntervalMs: 5000,

  /**
   * Per-tick stat deltas. With a 5 s tick:
   *   hunger    +0.50/tick  =  +6/min   (~16 min to go 25 → 75)
   *   happiness -0.25/tick  =  -3/min   (~3.9 hours to drop 75 → 0)
   *   energy    -0.15/tick  =  -1.8/min (~9 hours to drain 80 → 0)
   */
  tickDeltas: {
    hunger: +0.5,
    happiness: -0.25,
    energy: -0.15,
  },

  /** "Ignore" simulates this many ticks of decay (≈10 min of real time). */
  ignoreTicks: 120,

  /**
   * Comfort thresholds. Outside the comfort zone, the capy expresses the
   * deficit. Inside, it's content / idle.
   */
  thresholds: {
    /** Hunger above this counts as a real "hungry" deficit. */
    hungerHigh: 75,
    /** Happiness below this counts as a real "sad" deficit. */
    happinessLow: 30,
    /** Energy below this is reserved for a future "tired" state. */
    energyLow: 25,
  },

  /**
   * How long transient (user-triggered or autonomous) states play before
   * reverting. Swimming is intentionally long: the capy wanders through
   * several random pond spots inside one swim session.
   */
  transientDurationMs: {
    eating: 3000,
    happy: 2500,
    swimming: 20000,
  } as Partial<Record<PetState, number>>,

  /** Effects applied immediately when an action is taken. */
  actionEffects: {
    /** A full meal — drops hunger a lot, small mood + energy bumps. */
    feed: { hunger: -45, happiness: +6, energy: +2 },
    /** Playing burns energy and a tiny bit of hunger, big mood lift. */
    play: { hunger: +2, happiness: +30, energy: -12 },
    /** Swimming is the most tiring activity but very fulfilling. */
    swim: { hunger: +3, happiness: +20, energy: -18 },
  },

  /** Autonomous behavior — the capy decides things on its own. */
  autonomy: {
    /** How often the capy considers doing something. */
    decisionIntervalMs: 12_000,
    /** Conditions for spontaneously going for a swim. */
    swim: {
      /** Per-decision probability when conditions are met. */
      chance: 0.4,
      minHappiness: 50,
      maxHunger: 60,
      minEnergy: 30,
    },
    /** How often the capy picks a new spot inside the pond while swimming. */
    pondWanderIntervalMs: 3_000,
  },
};

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

export function applyDelta(stats: PetStats, delta: Partial<PetStats>): PetStats {
  return {
    hunger: clamp(stats.hunger + (delta.hunger ?? 0)),
    happiness: clamp(stats.happiness + (delta.happiness ?? 0)),
    energy: clamp(stats.energy + (delta.energy ?? 0)),
  };
}

/**
 * Severity-weighted state derivation.
 *
 * For each need we compute how far past its comfort threshold it is, then
 * surface the *worst* deficit. If everything is comfortable, the capy is
 * idle. This is the same model The Sims uses (motive decay → strongest
 * unmet need drives behavior) and is what fixes the "always hungry" feel:
 * a capy at hunger 76 / happiness 28 is now sad, not hungry, because the
 * happiness deficit (-2 below 30) is comparable to the hunger deficit
 * (+1 above 75) — and on the next tick the gap widens, sad clearly wins.
 */
export function derivePassiveState(stats: PetStats): PetState {
  const { hungerHigh, happinessLow } = behaviorConfig.thresholds;
  const hungerSeverity = Math.max(0, stats.hunger - hungerHigh);
  const happinessSeverity = Math.max(0, happinessLow - stats.happiness);

  if (hungerSeverity === 0 && happinessSeverity === 0) return 'idle';
  return hungerSeverity >= happinessSeverity ? 'hungry' : 'sad';
}

/**
 * Lightweight mood derivation. Exposed so a future emotional system can
 * replace this with something richer (recent memories, traits, etc).
 */
export function deriveMood(pet: Pick<Pet, 'stats'>): Pet['mood'] {
  const { hunger, happiness, energy } = pet.stats;
  if (energy < behaviorConfig.thresholds.energyLow) return 'sleepy';
  if (hunger > behaviorConfig.thresholds.hungerHigh) return 'anxious';
  if (happiness > 75) return 'excited';
  if (happiness < 40) return 'lonely';
  return 'content';
}
