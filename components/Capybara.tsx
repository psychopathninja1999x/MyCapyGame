import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { animations, type AnimationName } from '@/logic/animations';
import { useSpriteAnimation } from '@/logic/useSpriteAnimation';

type CapybaraProps = {
  animation: AnimationName;
  size?: number;
  style?: ViewStyle;
  /** Flip horizontally — useful when wiring up movement. */
  flipped?: boolean;
  /** Disable the breathing pulse (defaults to enabled). */
  pulse?: boolean;
};

/** How big the breathing pulse gets at peak (1.0 = no pulse, 1.01 = +1%). */
const PULSE_PEAK_SCALE = 1.01;
/** Time for one breath in/out (a full cycle is 2x this). */
const PULSE_HALF_PERIOD_MS = 1100;

/**
 * Frame-by-frame sprite renderer. Each tick of `useSpriteAnimation` swaps the
 * `<Image>` source instantly, with no blending — preserving the crisp pixel-art
 * look. Pacing is controlled by the `fps` field of each clip in `animations.ts`.
 *
 * On top of the frame swap, a *very* gentle scale pulse runs continuously so
 * the capy looks like it's breathing even when held on a single rest frame.
 * The pulse is native-driven (no JS bridge per frame) and capped at +2.5 %
 * so it doesn't visibly degrade the pixel art.
 */
export function Capybara({
  animation,
  size = 240,
  style,
  flipped = false,
  pulse = true,
}: CapybaraProps) {
  const clip = animations[animation];
  const frame = useSpriteAnimation(clip);

  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) {
      pulseScale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: PULSE_PEAK_SCALE,
          duration: PULSE_HALF_PERIOD_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: PULSE_HALF_PERIOD_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, pulseScale]);

  return (
    <View style={[styles.wrapper, { width: size, height: size }, style]}>
      <Animated.View style={[styles.pulseLayer, { transform: [{ scale: pulseScale }] }]}>
        <Image
          source={frame}
          style={[
            styles.sprite,
            { width: size, height: size },
            flipped ? styles.flipped : null,
          ]}
          resizeMode="contain"
          fadeDuration={0}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseLayer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sprite: {},
  flipped: {
    transform: [{ scaleX: -1 }],
  },
});
