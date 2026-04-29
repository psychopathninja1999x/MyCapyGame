import { useEffect, useState } from 'react';

import type { AnimationClip } from './animations';

/**
 * Frame-by-frame sprite animator with optional per-frame durations.
 *
 * - If `clip.frameDurationsMs` is provided (and matches `frames.length`),
 *   each frame is held for its own configured duration. This is what makes
 *   "idle"-style clips feel alive: long pauses on the resting pose, quick
 *   transitions through the breath cycle.
 * - Otherwise every frame uses the default `1000 / fps` interval.
 *
 * The hook resets to frame 0 whenever the clip identity changes, so
 * switching from one animation to another never shows a stale mid-frame.
 */
export function useSpriteAnimation(clip: AnimationClip) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    setFrameIndex(0);
    if (clip.frames.length <= 1) return;

    const defaultMs = Math.max(16, Math.round(1000 / clip.fps));
    const lastIndex = clip.frames.length - 1;

    const durationOf = (index: number) => {
      const override = clip.frameDurationsMs?.[index];
      return override !== undefined ? Math.max(16, override) : defaultMs;
    };

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const schedule = (currentIndex: number) => {
      if (cancelled) return;
      timeoutId = setTimeout(() => {
        if (cancelled) return;

        let nextIndex = currentIndex + 1;
        if (nextIndex > lastIndex) {
          if (!clip.loop) return;
          nextIndex = 0;
        }
        setFrameIndex(nextIndex);
        schedule(nextIndex);
      }, durationOf(currentIndex));
    };

    schedule(0);

    return () => {
      cancelled = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [clip]);

  const safeIndex = Math.min(frameIndex, clip.frames.length - 1);
  return clip.frames[safeIndex];
}
