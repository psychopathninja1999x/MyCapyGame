import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  type ImageSourcePropType,
  type ViewStyle,
} from 'react-native';

/**
 * Pixel-art image button. The label/icon are part of the bitmap (no text or
 * emoji is drawn on top), so this renders a single `<Image>` and swaps its
 * source between normal/pressed/disabled states.
 *
 * Buttons are authored at 384×144 (8:3 aspect). We let flex pick the width
 * inside its parent row and use `aspectRatio` to keep the height correct on
 * any screen size — no hard-coded pixel sizes.
 */
export type ActionButtonVariant = 'feed' | 'play';

type ButtonStateAssets = {
  normal: ImageSourcePropType;
  pressed: ImageSourcePropType;
  disabled: ImageSourcePropType;
};

const BUTTON_ASSETS: Record<ActionButtonVariant, ButtonStateAssets> = {
  feed: {
    normal: require('@/assets/images/Backgrounds/Buttons/btn_feed_normal.png'),
    pressed: require('@/assets/images/Backgrounds/Buttons/btn_feed_pressed.png'),
    disabled: require('@/assets/images/Backgrounds/Buttons/btn_feed_disabled.png'),
  },
  play: {
    normal: require('@/assets/images/Backgrounds/Buttons/btn_play_normal.png'),
    pressed: require('@/assets/images/Backgrounds/Buttons/btn_play_pressed.png'),
    disabled: require('@/assets/images/Backgrounds/Buttons/btn_play_disabled.png'),
  },
};

const VARIANT_LABELS: Record<ActionButtonVariant, string> = {
  feed: 'Feed',
  play: 'Play',
};

/** Native aspect ratio of the bitmap buttons (384 / 144). */
const BUTTON_ASPECT_RATIO = 384 / 144;

type ActionButtonProps = {
  variant: ActionButtonVariant;
  onPress: () => void;
  disabled?: boolean;
  /** Override the auto-derived screen-reader label. */
  accessibilityLabel?: string;
  style?: ViewStyle;
};

export function ActionButton({
  variant,
  onPress,
  disabled = false,
  accessibilityLabel,
  style,
}: ActionButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const assets = BUTTON_ASSETS[variant];
  const source = disabled ? assets.disabled : isPressed ? assets.pressed : assets.normal;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? VARIANT_LABELS[variant]}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => {
        if (!disabled) setIsPressed(true);
      }}
      onPressOut={() => setIsPressed(false)}
      onPress={() => {
        if (disabled) return;
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPress();
      }}
      style={[styles.pressable, style]}>
      <Image source={source} style={styles.image} resizeMode="contain" fadeDuration={0} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    aspectRatio: BUTTON_ASPECT_RATIO,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
