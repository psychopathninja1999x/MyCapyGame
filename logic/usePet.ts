import { useCallback, useEffect, useMemo, useReducer } from 'react';

import { stateToAnimation, type AnimationName } from './animations';
import { behaviorConfig } from './behavior';
import { initialPet, petReducer } from './petReducer';
import type { Pet } from './types';

export type PetController = {
  pet: Pet;
  animation: AnimationName;
  feed: () => void;
  play: () => void;
  swim: () => void;
  ignore: () => void;
};

/**
 * Owns the pet's state, runs the passive decay tick, and ends transient
 * animations when their timer elapses. Components consume `pet` for read-only
 * data and call the action functions to interact.
 */
export function usePet() {
  const [pet, dispatch] = useReducer(petReducer, initialPet);

  useEffect(() => {
    const id = setInterval(() => {
      dispatch({ type: 'TICK', at: Date.now() });
    }, behaviorConfig.tickIntervalMs);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!pet.transientUntil) return;
    const remaining = pet.transientUntil - Date.now();
    if (remaining <= 0) {
      dispatch({ type: 'END_TRANSIENT', at: Date.now() });
      return;
    }
    const id = setTimeout(() => {
      dispatch({ type: 'END_TRANSIENT', at: Date.now() });
    }, remaining);
    return () => clearTimeout(id);
  }, [pet.transientUntil]);

  const feed = useCallback(() => dispatch({ type: 'FEED', at: Date.now() }), []);
  const play = useCallback(() => dispatch({ type: 'PLAY', at: Date.now() }), []);
  const swim = useCallback(() => dispatch({ type: 'SWIM', at: Date.now() }), []);
  const ignore = useCallback(() => dispatch({ type: 'IGNORE', at: Date.now() }), []);

  const animation = useMemo(() => stateToAnimation[pet.state], [pet.state]);

  return { pet, animation, feed, play, swim, ignore };
}
