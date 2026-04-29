import type { Pet, PetMemory, PetState } from './types';
import { applyDelta, behaviorConfig, derivePassiveState, deriveMood } from './behavior';

export type PetAction =
  | { type: 'FEED'; at: number }
  | { type: 'PLAY'; at: number }
  | { type: 'SWIM'; at: number }
  | { type: 'IGNORE'; at: number }
  | { type: 'TICK'; at: number }
  | { type: 'END_TRANSIENT'; at: number };

const MEMORY_LIMIT = 50;

function remember(pet: Pet, event: string, at: number, valence?: number): PetMemory[] {
  const next: PetMemory = {
    id: `${at}-${event}`,
    event,
    at,
    valence,
  };
  const memories = [next, ...pet.memories];
  return memories.slice(0, MEMORY_LIMIT);
}

function startTransient(pet: Pet, state: PetState, at: number): Pet {
  const duration = behaviorConfig.transientDurationMs[state];
  return {
    ...pet,
    state,
    transientUntil: duration ? at + duration : null,
  };
}

function settleState(pet: Pet, at: number): Pet {
  if (pet.transientUntil && at < pet.transientUntil) return pet;
  const next = derivePassiveState(pet.stats);
  return {
    ...pet,
    state: next,
    transientUntil: null,
    mood: deriveMood(pet),
  };
}

export const initialPet: Pet = {
  name: 'Capy',
  state: 'idle',
  // Tuned so a fresh capy starts well-fed and happy: it'll take ~16 minutes
  // of pure neglect before hunger becomes a real concern.
  stats: { hunger: 25, happiness: 75, energy: 80 },
  traits: ['playful', 'curious'],
  mood: 'content',
  memories: [],
  transientUntil: null,
  lastInteractionAt: Date.now(),
};

export function petReducer(pet: Pet, action: PetAction): Pet {
  switch (action.type) {
    case 'FEED': {
      const stats = applyDelta(pet.stats, behaviorConfig.actionEffects.feed);
      return startTransient(
        {
          ...pet,
          stats,
          memories: remember(pet, 'fed', action.at, +0.6),
          lastInteractionAt: action.at,
        },
        'eating',
        action.at,
      );
    }
    case 'PLAY': {
      const stats = applyDelta(pet.stats, behaviorConfig.actionEffects.play);
      return startTransient(
        {
          ...pet,
          stats,
          memories: remember(pet, 'played', action.at, +0.8),
          lastInteractionAt: action.at,
        },
        'happy',
        action.at,
      );
    }
    case 'SWIM': {
      const stats = applyDelta(pet.stats, behaviorConfig.actionEffects.swim);
      return startTransient(
        {
          ...pet,
          stats,
          memories: remember(pet, 'swam', action.at, +0.5),
          lastInteractionAt: action.at,
        },
        'swimming',
        action.at,
      );
    }
    case 'IGNORE': {
      const { tickDeltas, ignoreTicks } = behaviorConfig;
      const stats = applyDelta(pet.stats, {
        hunger: tickDeltas.hunger * ignoreTicks,
        happiness: tickDeltas.happiness * ignoreTicks,
        energy: tickDeltas.energy * ignoreTicks,
      });
      return settleState(
        {
          ...pet,
          stats,
          memories: remember(pet, 'ignored', action.at, -0.4),
          transientUntil: null,
        },
        action.at,
      );
    }
    case 'TICK': {
      const stats = applyDelta(pet.stats, behaviorConfig.tickDeltas);
      return settleState({ ...pet, stats }, action.at);
    }
    case 'END_TRANSIENT': {
      return settleState({ ...pet, transientUntil: null }, action.at);
    }
    default:
      return pet;
  }
}
