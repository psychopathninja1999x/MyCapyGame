import type { ImageSourcePropType } from 'react-native';

import type { PetState } from './types';

/**
 * All animation clips the capybara can play. Each clip is a list of frame
 * `require()`s plus playback metadata. Adding a new clip is a one-stop edit:
 *  1. Drop frames in /assets/images/Backgrounds/<clip>/<name>_NN.png
 *  2. Add an entry here
 *  3. (Optional) Map a PetState → AnimationName below
 *
 * Pacing notes:
 * - All FPS values are intentionally low (1-3 fps) so frame swaps don't feel
 *   frantic. Pixel-art / cozy games typically live in this range; cycling at
 *   4-8 fps reads as "too fast" for an idle pet.
 * - Use `frameDurationsMs` to give specific frames longer holds (idle's
 *   resting pose, sad's breakdown beat, etc).
 */
export type AnimationName =
  | 'idle'
  | 'happy'
  | 'sad'
  | 'hungry'
  | 'eating'
  | 'swimming'
  | 'walking'
  | 'running'
  | 'turn_around';

export type AnimationClip = {
  frames: ImageSourcePropType[];
  /** Frames per second. Used as the default per-frame duration. */
  fps: number;
  /** If false, the clip plays once and holds on the last frame. */
  loop: boolean;
  /**
   * Optional per-frame duration in ms. When supplied, its length must match
   * `frames.length`; each entry overrides the default `1000/fps` for that
   * specific frame. Useful for clips that should "rest" on a pose for a long
   * beat between micro-motions (idle / sad / sleepy / etc).
   */
  frameDurationsMs?: number[];
};

export const animations: Record<AnimationName, AnimationClip> = {
  idle: {
    // 5 frames (idle_04 isn't on disk in the current asset drop).
    frames: [
      require('@/assets/images/Backgrounds/idle/idle_01.png'),
      require('@/assets/images/Backgrounds/idle/idle_02.png'),
      require('@/assets/images/Backgrounds/idle/idle_03.png'),
      require('@/assets/images/Backgrounds/idle/idle_05.png'),
      require('@/assets/images/Backgrounds/idle/idle_06.png'),
    ],
    fps: 2,
    loop: true,
    // Long hold on the resting pose, slow breath cycle, settled exhale.
    // Whole loop ~6.5 s — the capy reads as deeply relaxed.
    frameDurationsMs: [
      2800, // resting pose — long pause
      650,  // breath in
      650,
      650,
      1700, // settled exhale — medium pause before looping back
    ],
  },
  happy: {
    frames: [
      require('@/assets/images/Backgrounds/happy/happy_01.png'),
      require('@/assets/images/Backgrounds/happy/happy_02.png'),
      require('@/assets/images/Backgrounds/happy/happy_03.png'),
      require('@/assets/images/Backgrounds/happy/happy_04.png'),
      require('@/assets/images/Backgrounds/happy/happy_05.png'),
      require('@/assets/images/Backgrounds/happy/happy_06.png'),
    ],
    fps: 1.8,
    loop: true,
  },
  sad: {
    frames: [
      require('@/assets/images/Backgrounds/sad/sad_01.png'),
      require('@/assets/images/Backgrounds/sad/sad_02.png'),
      require('@/assets/images/Backgrounds/sad/sad_03.png'),
      require('@/assets/images/Backgrounds/sad/sad_04.png'),
      require('@/assets/images/Backgrounds/sad/sad_05.png'),
      require('@/assets/images/Backgrounds/sad/sad_06.png'),
    ],
    fps: 1,
    loop: true,
  },
  hungry: {
    frames: [
      require('@/assets/images/Backgrounds/hungry/hungry_01.png'),
      require('@/assets/images/Backgrounds/hungry/hungry_02.png'),
      require('@/assets/images/Backgrounds/hungry/hungry_03.png'),
      require('@/assets/images/Backgrounds/hungry/hungry_04.png'),
      require('@/assets/images/Backgrounds/hungry/hungry_05.png'),
      require('@/assets/images/Backgrounds/hungry/hungry_06.png'),
    ],
    fps: 1.5,
    loop: true,
  },
  eating: {
    frames: [
      require('@/assets/images/Backgrounds/eating/eating_01.png'),
      require('@/assets/images/Backgrounds/eating/eating_02.png'),
      require('@/assets/images/Backgrounds/eating/eating_03.png'),
      require('@/assets/images/Backgrounds/eating/eating_04.png'),
      require('@/assets/images/Backgrounds/eating/eating_05.png'),
      require('@/assets/images/Backgrounds/eating/eating_06.png'),
    ],
    fps: 1.8,
    loop: true,
  },
  swimming: {
    frames: [
      require('@/assets/images/Backgrounds/swimming/swimming_01.png'),
      require('@/assets/images/Backgrounds/swimming/swimming_02.png'),
      require('@/assets/images/Backgrounds/swimming/swimming_03.png'),
      require('@/assets/images/Backgrounds/swimming/swimming_04.png'),
      require('@/assets/images/Backgrounds/swimming/swimming_05.png'),
      require('@/assets/images/Backgrounds/swimming/swimming_06.png'),
    ],
    fps: 2,
    loop: true,
  },
  walking: {
    frames: [
      require('@/assets/images/Backgrounds/walking/walking_01.png'),
      require('@/assets/images/Backgrounds/walking/walking_02.png'),
      require('@/assets/images/Backgrounds/walking/walking_03.png'),
      require('@/assets/images/Backgrounds/walking/walking_04.png'),
      require('@/assets/images/Backgrounds/walking/walking_05.png'),
    ],
    fps: 2,
    loop: true,
  },
  running: {
    frames: [
      require('@/assets/images/Backgrounds/running/running_01.png'),
      require('@/assets/images/Backgrounds/running/running_02.png'),
      require('@/assets/images/Backgrounds/running/running_03.png'),
      require('@/assets/images/Backgrounds/running/running_04.png'),
      require('@/assets/images/Backgrounds/running/running_05.png'),
    ],
    fps: 3,
    loop: true,
  },
  turn_around: {
    frames: [
      require('@/assets/images/Backgrounds/turn/turn_01.png'),
      require('@/assets/images/Backgrounds/turn/turn_02.png'),
      require('@/assets/images/Backgrounds/turn/turn_03.png'),
      require('@/assets/images/Backgrounds/turn/turn_04.png'),
      require('@/assets/images/Backgrounds/turn/turn_05.png'),
      require('@/assets/images/Backgrounds/turn/turn_06.png'),
    ],
    fps: 2,
    loop: false,
  },
};

/**
 * Maps a logical pet state to which animation should play.
 * Kept separate so designers can swap clips without touching the FSM.
 */
export const stateToAnimation: Record<PetState, AnimationName> = {
  idle: 'idle',
  happy: 'happy',
  sad: 'sad',
  hungry: 'hungry',
  eating: 'eating',
  swimming: 'swimming',
};
