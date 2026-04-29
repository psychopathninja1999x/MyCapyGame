import { useEffect, useRef } from 'react';

import { behaviorConfig } from './behavior';
import type { Pet } from './types';

type AutonomyActions = {
  swim: () => void;
};

/**
 * Drives the capybara's emergent behavior. Right now the only autonomous
 * decision is "go for a swim when conditions are right", but this is the
 * extension point for richer self-driven behavior in the future
 * (wandering, napping, foraging, etc).
 *
 * Implementation note: the pet object changes on every passive tick, so we
 * read it through a ref and keep the decision interval stable across
 * re-renders. Otherwise the interval would reset every 5 s and never fire.
 */
export function useAutonomy(pet: Pet, actions: AutonomyActions) {
  const petRef = useRef(pet);
  petRef.current = pet;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    const { decisionIntervalMs, swim } = behaviorConfig.autonomy;

    const id = setInterval(() => {
      const p = petRef.current;

      // Don't interrupt anything in flight (eating, playing, already swimming).
      if (p.state !== 'idle') return;
      if (p.transientUntil && p.transientUntil > Date.now()) return;

      const { hunger, happiness, energy } = p.stats;
      const wantsToSwim =
        happiness >= swim.minHappiness &&
        hunger <= swim.maxHunger &&
        energy >= swim.minEnergy;

      if (wantsToSwim && Math.random() < swim.chance) {
        actionsRef.current.swim();
      }
    }, decisionIntervalMs);

    return () => clearInterval(id);
  }, []);
}
