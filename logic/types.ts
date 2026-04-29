/**
 * Core types for the Capybara pet system.
 *
 * These are intentionally split from the state machine so that future
 * subsystems (personality traits, emotional system, memory system) can
 * extend the `Pet` type without rewriting the reducer.
 */

export type PetState =
  | 'idle'
  | 'happy'
  | 'sad'
  | 'hungry'
  | 'eating'
  | 'swimming';

export type PetStats = {
  /** 0 = stuffed, 100 = starving. Rises over time, falls when fed. */
  hunger: number;
  /** 0 = miserable, 100 = euphoric. Falls over time, rises when played with. */
  happiness: number;
  /** 0 = exhausted, 100 = wide awake. Falls with activity, recovers idle. */
  energy: number;
};

/**
 * Personality traits. Intentionally stubbed — a future system can read these
 * to bias action results (e.g. a "shy" capy gains less happiness from play).
 */
export type PetTrait = 'playful' | 'shy' | 'lazy' | 'curious' | 'gluttonous';

/**
 * High-level emotional summary derived from stats + recent events.
 * The emotional system can compute this from `Pet` to drive richer behavior.
 */
export type PetMood = 'content' | 'excited' | 'lonely' | 'anxious' | 'sleepy';

/** Single entry in the pet's memory log. */
export type PetMemory = {
  id: string;
  /** Short tag describing what happened, e.g. 'fed', 'ignored', 'played'. */
  event: string;
  /** Timestamp the event occurred (ms since epoch). */
  at: number;
  /** Optional emotional weight in [-1, 1]; positive = good memory. */
  valence?: number;
};

export type Pet = {
  name: string;
  state: PetState;
  stats: PetStats;
  traits: PetTrait[];
  mood: PetMood;
  memories: PetMemory[];
  /** When the current transient state (eating/happy/swimming) should end. */
  transientUntil: number | null;
  /** When the user last interacted, in ms since epoch. */
  lastInteractionAt: number;
};
