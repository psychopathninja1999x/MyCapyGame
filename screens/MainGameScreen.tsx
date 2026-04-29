import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  LayoutChangeEvent,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ActionButton';
import { Capybara } from '@/components/Capybara';
import { StatBar } from '@/components/StatBar';
import { behaviorConfig } from '@/logic/behavior';
import { resolveScenePosition, type ScenePosition } from '@/logic/scenePositions';
import { useAutonomy } from '@/logic/useAutonomy';
import { usePet } from '@/logic/usePet';

const STATE_COPY: Record<string, { title: string; subtitle: string }> = {
  idle: { title: 'Just chilling', subtitle: 'Capy is enjoying the porch.' },
  happy: { title: 'So happy!', subtitle: 'Capy is bouncing with joy.' },
  sad: { title: 'A little blue', subtitle: 'Capy could use some attention.' },
  hungry: { title: 'Tummy rumbling', subtitle: 'Capy is eyeing the orange tree.' },
  eating: { title: 'Yum yum yum', subtitle: 'Capy is munching by the tree.' },
  swimming: { title: 'Splash time', subtitle: 'Capy is paddling around the pond.' },
};

/** Reference phone width (dp) the scene was authored against. */
const REFERENCE_WIDTH = 380;
/** Smallest scale factor the sprite is allowed to shrink to. */
const MIN_SCALE = 0.65;

export function MainGameScreen() {
  const { pet, animation, feed, play, swim } = usePet();

  const [showStatsBubble, setShowStatsBubble] = useState(false);

  // Autonomy: the capy decides to swim on its own when content + full + rested.
  useAutonomy(pet, { swim });

  /**
   * Measure the *actually rendered area* of the screen via onLayout instead
   * of trusting useWindowDimensions(). This is what fixes the "missing on
   * small phones" class of bugs — see screen history.
   */
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const onStageLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setStage({ width: w, height: h });
  };

  /**
   * Resolved scene position. Stored in state so it survives re-renders
   * without re-randomising on every passive tick. Positions change
   * INSTANTLY (no glide) — the capy hard-cuts to each new anchor, which is
   * the correct convention for pixel-art games.
   */
  const [target, setTarget] = useState<ScenePosition>(() =>
    resolveScenePosition('idle', { msSinceLastInteraction: 0 }),
  );

  // When the pet's state changes, pick a fresh scene anchor. Sad uses
  // pet.lastInteractionAt to bias toward "hiding by the house" the longer
  // the user has been gone.
  useEffect(() => {
    setTarget(
      resolveScenePosition(pet.state, {
        msSinceLastInteraction: Date.now() - pet.lastInteractionAt,
      }),
    );
  }, [pet.state, pet.lastInteractionAt]);

  // While swimming, pick a new random pond spot every few seconds so the
  // capy hops between spots in the water.
  useEffect(() => {
    if (pet.state !== 'swimming') return;
    const id = setInterval(() => {
      setTarget(resolveScenePosition('swimming', { msSinceLastInteraction: 0 }));
    }, behaviorConfig.autonomy.pondWanderIntervalMs);
    return () => clearInterval(id);
  }, [pet.state]);

  const copy = STATE_COPY[pet.state] ?? STATE_COPY.idle;

  /** Scale the sprite proportionally so it never overflows a small phone. */
  const scale = stage.width
    ? Math.min(1, Math.max(MIN_SCALE, stage.width / REFERENCE_WIDTH))
    : MIN_SCALE;
  const renderSize = Math.round(target.size * scale);

  // Position is now plain numeric — no Animated.timing, just a hard cut.
  const targetLeft = target.x * stage.width - renderSize / 2;
  const targetTop = target.y * stage.height - renderSize;

  /**
   * The only thing left in Animated land is a one-shot fade-in on first
   * mount, so the capybara doesn't pop in from nothing when the screen
   * first becomes ready.
   */
  const opacity = useRef(new Animated.Value(0)).current;
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!stage.width || !stage.height) return;
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [stage.width, stage.height, opacity]);

  const stageReady = stage.width > 0 && stage.height > 0;

  return (
    <View style={styles.root} onLayout={onStageLayout}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require('@/assets/images/Backgrounds/bg.png')}
        style={styles.bg}
        resizeMode="cover">
        {/* Stage layer: the capybara hard-cuts to each new anchor. No glide. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {stageReady && (
            <Animated.View
              style={[
                styles.spriteAnchor,
                {
                  width: renderSize,
                  height: renderSize,
                  opacity,
                  transform: [
                    { translateX: targetLeft },
                    { translateY: targetTop },
                  ],
                },
              ]}>
              <Pressable
                onPress={() => setShowStatsBubble((prev) => !prev)}
                style={StyleSheet.absoluteFill}
                hitSlop={10}>
                <Capybara animation={animation} size={renderSize} flipped={target.flipped} />
              </Pressable>
              {showStatsBubble && (
                <View style={[styles.statsBubble, { bottom: renderSize + 12 }]}>
                  <Text style={styles.statsBubbleTitle}>Stats</Text>
                  <Text style={styles.statsBubbleLine}>Hunger: {Math.round(pet.stats.hunger)}</Text>
                  <Text style={styles.statsBubbleLine}>
                    Happiness: {Math.round(pet.stats.happiness)}
                  </Text>
                  <Text style={styles.statsBubbleLine}>Energy: {Math.round(pet.stats.energy)}</Text>
                </View>
              )}
            </Animated.View>
          )}
        </View>

        {/* UI layer: HUD on top, dialog + Feed/Play buttons pinned to bottom. */}
        <SafeAreaView style={styles.ui} edges={['top', 'bottom']} pointerEvents="box-none">
          <View style={styles.hud}>
            <View style={styles.hudHeader}>
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.mood}>{pet.mood}</Text>
            </View>
          </View>

          <View style={styles.bottomDock} pointerEvents="box-none">
            <View style={styles.dialog}>
              <Text style={styles.dialogTitle}>{copy.title}</Text>
              <Text style={styles.dialogSubtitle}>{copy.subtitle}</Text>
            </View>

            <View style={styles.actionsRow}>
              <ActionButton variant="feed" onPress={feed} />
              <ActionButton variant="play" onPress={play} />
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  ui: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  spriteAnchor: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  hud: {
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  statsBubble: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  statsBubbleTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
  },
  statsBubbleLine: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 10,
  },
  hudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  petName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mood: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bottomDock: {
    gap: 10,
    paddingBottom: 4,
  },
  dialog: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    maxWidth: '94%',
    marginBottom: 4,
  },
  dialogTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  dialogSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
