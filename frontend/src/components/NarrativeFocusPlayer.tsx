import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  StatusBar,
  Platform,
  Dimensions,
  Easing,
} from 'react-native';
import { NarrativeThemeEngine, NarrativeTheme } from '../theme/NarrativeThemeEngine';
import { buildTypography, getDialogueStyle } from '../theme/NarrativeTypography';
import { useNarration } from '../core/useNarration';
import { NarrativeArc } from '../core/narration/NarrativeContextManager';
import { isDialogueSentence } from '../core/parser/dialogue';
import { useSettingsStore } from '../store/settingsStore';
import {
  spacing,
  atmosphereOpacity,
  measure,
  emotionalInk,
  narrativeBreath,
} from '../design';

interface NarrativeFocusPlayerProps {
  bookId: string;
  initialChapterIndex?: number;
  initialSentenceIndex?: number;
  onBack?: () => void;
}

interface Sentence {
  text: string;
  emotion?: string;
  [key: string]: any;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PROSE_NARRATION_WIDTH = Math.min(measure.proseColumnPx, SCREEN_WIDTH - spacing.xl * 2);
const PROSE_DIALOGUE_WIDTH = Math.min(measure.proseColumnPx - 80, PROSE_NARRATION_WIDTH);
const PROSE_SIDE_GUTTER = Math.max((SCREEN_WIDTH - PROSE_NARRATION_WIDTH) / 2, spacing.lg);

const VIGNETTE_INTENSITY: Record<string, number> = {
  joy: 0.04,
  neutral: 0.10,
  surprise: 0.16,
  anger: 0.24,
  sadness: 0.30,
  fear: 0.36,
};

const ARC_VIGNETTE_BONUS: Record<string, number> = {
  beginning: 0,
  rising: 0.04,
  peak: 0.09,
  falling: 0.05,
  resolution: 0.02,
};

const VIGNETTE_MAX = 0.45;

export const NarrativeFocusPlayer: React.FC<NarrativeFocusPlayerProps> = ({
  bookId,
  initialChapterIndex = 0,
  initialSentenceIndex = 0,
  onBack,
}) => {
  const {
    state: playbackState,
    chapterIndex,
    sentenceIndex,
    sentences,
    chapters,
    speed,
    isPlaying,
    currentEmotion,
    play,
    pause,
    nextSentence,
    previousSentence,
    nextChapter,
    previousChapter,
    setSpeed,
    engine,
  } = useNarration({ bookId, initialChapterIndex, initialSentenceIndex });

  const [focusMode, setFocusMode] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentArc, setCurrentArc] = useState<NarrativeArc | null>(null);
  const [lastLineRitual, setLastLineRitual] = useState<{ text: string } | null>(null);

  const themeEngine = useMemo(() => new NarrativeThemeEngine(), []);
  const [theme, setTheme] = useState<NarrativeTheme>(
    themeEngine.getTheme('neutral')
  );
  const typography = useMemo(() => buildTypography(theme), [theme]);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const controlsFade = useRef(new Animated.Value(1)).current;
  const breathAnim = useRef(new Animated.Value(0)).current;
  const columnWidthAnim = useRef(new Animated.Value(PROSE_NARRATION_WIDTH)).current;
  const lastLineOpacity = useRef(new Animated.Value(0)).current;
  const vignetteOpacity = useRef(new Animated.Value(0)).current;

  const lastSeenSentenceRef = useRef<Sentence | null>(null);
  const lastChapterIndexRef = useRef(chapterIndex);
  const ritualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastLineRitualEnabled = useSettingsStore((s) => s.lastLineRitualEnabled);

  useEffect(() => {
    const unsub = themeEngine.subscribe((t) => {
      Animated.timing(fadeAnim, {
        toValue: 0.7,
        duration: theme.animation.durationSlow,
        useNativeDriver: true,
      }).start(() => {
        setTheme(t);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: theme.animation.durationSlow,
          useNativeDriver: true,
        }).start();
      });
    });
    return unsub;
  }, [themeEngine, theme.animation.durationSlow, fadeAnim]);

  useEffect(() => {
    const eng = engine.current;
    if (!eng) return;

    const unsub = eng.subscribe(() => {
      const arc = eng.getCurrentArc();
      if (arc) {
        setCurrentArc(arc);
        themeEngine.updateFromNarration(currentEmotion, arc);
      }
    });
    return unsub;
  }, [engine, currentEmotion, themeEngine]);

  useEffect(() => {
    if (!focusMode || !isPlaying) return;

    const timer = setTimeout(() => {
      Animated.timing(controlsFade, {
        toValue: 0,
        duration: theme.animation.durationAtmospheric,
        useNativeDriver: true,
      }).start();
      setControlsVisible(false);
    }, theme.animation.focusIdleMs);

    return () => clearTimeout(timer);
  }, [focusMode, isPlaying, theme.animation.durationAtmospheric, theme.animation.focusIdleMs, controlsFade, controlsVisible]);

  const currentSentence: Sentence | undefined = sentences[sentenceIndex];
  const previousSentence_ = sentenceIndex > 0 ? sentences[sentenceIndex - 1] : null;
  const nextSentence_ = sentenceIndex < sentences.length - 1 ? sentences[sentenceIndex + 1] : null;
  const currentChapter = chapters[chapterIndex];

  useEffect(() => {
    lastSeenSentenceRef.current = currentSentence ?? null;
  });

  const emotionIntensity = useMemo(() => {
    if (!currentArc) return 0.5;
    return currentArc.currentTension;
  }, [currentArc]);

  const isDialogue = useMemo(() => {
    return isDialogueSentence(currentSentence?.text);
  }, [currentSentence]);

  const proseColor = useMemo(() => {
    if (currentSentence?.emotion && currentSentence.emotion !== 'neutral') {
      return emotionalInk[currentSentence.emotion as keyof typeof emotionalInk] || theme.colors.text;
    }
    return theme.colors.text;
  }, [currentSentence, theme.colors.text]);

  // Last Line Ritual
  useEffect(() => {
    if (lastChapterIndexRef.current === chapterIndex) return;

    const oldLastSentence = lastSeenSentenceRef.current;
    lastChapterIndexRef.current = chapterIndex;

    if (!oldLastSentence?.text) return;

    if (ritualTimerRef.current) {
      clearTimeout(ritualTimerRef.current);
      ritualTimerRef.current = null;
    }

    if (!lastLineRitualEnabled) return;

    setLastLineRitual({ text: oldLastSentence.text });
    Animated.timing(lastLineOpacity, {
      toValue: 1,
      duration: theme.animation.durationAtmospheric,
      useNativeDriver: true,
      easing: Easing.bezier(0.2, 0, 0, 1),
    }).start();

    ritualTimerRef.current = setTimeout(() => {
      Animated.timing(lastLineOpacity, {
        toValue: 0,
        duration: theme.animation.durationAtmospheric,
        useNativeDriver: true,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }).start(({ finished }) => {
        if (finished) setLastLineRitual(null);
      });
    }, theme.animation.lastLineHoldMs);

    return () => {
      if (ritualTimerRef.current) {
        clearTimeout(ritualTimerRef.current);
        ritualTimerRef.current = null;
      }
    };
  }, [chapterIndex, lastLineRitualEnabled, theme.animation.durationAtmospheric, theme.animation.lastLineHoldMs, lastLineOpacity]);

  // Narrative Breathing — driven by tension
  useEffect(() => {
    const target = emotionIntensity * narrativeBreath.paragraphExpandRatio;
    Animated.timing(breathAnim, {
      toValue: target,
      duration: theme.animation.durationSlow,
      useNativeDriver: false,
      easing: Easing.bezier(0.45, 0, 0.55, 1),
    }).start();
  }, [emotionIntensity, theme.animation.durationSlow, breathAnim]);

  // Dialogue Presence — column width
  useEffect(() => {
    Animated.timing(columnWidthAnim, {
      toValue: isDialogue ? PROSE_DIALOGUE_WIDTH : PROSE_NARRATION_WIDTH,
      duration: theme.animation.durationNormal,
      useNativeDriver: false,
      easing: Easing.bezier(0.2, 0, 0, 1),
    }).start();
  }, [isDialogue, theme.animation.durationNormal, columnWidthAnim]);

  // Dynamic Vignette
  useEffect(() => {
    const emotionFactor = VIGNETTE_INTENSITY[currentEmotion] ?? 0.10;
    const arcFactor = ARC_VIGNETTE_BONUS[currentArc?.arcPosition || 'beginning'] ?? 0;
    const target = Math.min(VIGNETTE_MAX, emotionFactor + arcFactor);
    Animated.timing(vignetteOpacity, {
      toValue: target,
      duration: theme.animation.durationSlow,
      useNativeDriver: true,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }).start();
  }, [currentEmotion, currentArc, theme.animation.durationSlow, vignetteOpacity]);

  const handleScreenTap = useCallback(() => {
    if (lastLineRitual) return;
    if (!controlsVisible) {
      Animated.timing(controlsFade, {
        toValue: 1,
        duration: theme.animation.durationNormal,
        useNativeDriver: true,
      }).start();
      setControlsVisible(true);
    }
  }, [controlsVisible, controlsFade, theme.animation.durationNormal, lastLineRitual]);

  const handlePlayPause = useCallback(() => {
    if (lastLineRitual) return;
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause, lastLineRitual]);

  const activeSentenceMargin = breathAnim.interpolate({
    inputRange: [0, narrativeBreath.paragraphExpandRatio],
    outputRange: [spacing.lg, spacing.xl + spacing.sm],
    extrapolate: 'clamp',
  });

  const nextSentenceMargin = breathAnim.interpolate({
    inputRange: [0, narrativeBreath.paragraphExpandRatio],
    outputRange: [spacing.xl, spacing.cinematic],
    extrapolate: 'clamp',
  });

  if (playbackState === 'LOADING_BOOK') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
        <View style={styles.loadingContainer}>
          <Animated.View
            style={[
              styles.loadingPulse,
              { backgroundColor: theme.colors.accentSubtle },
            ]}
          />
          <Text style={[typography.ui.caption, { color: theme.colors.textMuted }]}>
            Entering story...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleScreenTap}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.atmosphereLayer,
          {
            backgroundColor: theme.colors.emotionGlow,
            opacity: fadeAnim,
          },
        ]}
      />

      <EdgeVignette
        opacity={vignetteOpacity}
        edgeColor={theme.colors.background}
      />

      <Animated.View
        style={[
          styles.contentContainer,
          { opacity: Animated.multiply(fadeAnim, controlsFade) },
        ]}
      >
        {!focusMode && !lastLineRitual && (
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={[typography.ui.caption, { color: theme.colors.accent }]}>
                Back
              </Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text
                style={[typography.ui.caption, { color: theme.colors.textMuted }]}
                numberOfLines={1}
              >
                {currentChapter?.title || `Chapter ${chapterIndex + 1}`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setFocusMode(true)}
              style={styles.focusToggle}
            >
              <Text style={[typography.ui.tiny, { color: theme.colors.accent }]}>
                Focus
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.storyContainer}>
          {focusMode && !lastLineRitual && (
            <TouchableOpacity
              onPress={() => setFocusMode(false)}
              style={styles.exitFocusButton}
            >
              <Text style={[typography.ui.tiny, { color: theme.colors.textMuted }]}>
                Exit Focus
              </Text>
            </TouchableOpacity>
          )}

          <Animated.View style={[styles.proseColumn, { width: columnWidthAnim }]}>
            {!lastLineRitual && previousSentence_ && (
              <Text
                style={[
                  typography.storyDimmed,
                  styles.contextSentence,
                  { opacity: atmosphereOpacity.proseContext },
                ]}
                numberOfLines={3}
              >
                {previousSentence_.text}
              </Text>
            )}

            {!lastLineRitual && (
              <Animated.View style={[styles.activeSentenceContainer, { marginVertical: activeSentenceMargin }]}>
                <Text
                  style={[
                    isDialogue
                      ? getDialogueStyle(theme, emotionIntensity)
                      : typography.story,
                    { color: proseColor },
                  ]}
                >
                  {currentSentence?.text || ''}
                </Text>
              </Animated.View>
            )}

            {!lastLineRitual && nextSentence_ && (
              <Animated.Text
                style={[
                  typography.storyDimmed,
                  styles.contextSentence,
                  {
                    opacity: atmosphereOpacity.proseNext,
                    marginTop: nextSentenceMargin,
                  },
                ]}
                numberOfLines={2}
              >
                {nextSentence_.text}
              </Animated.Text>
            )}
          </Animated.View>
        </View>

        {!lastLineRitual && (
          <Animated.View
            style={[
              styles.controlsContainer,
              { opacity: controlsFade },
            ]}
          >
            <View style={styles.emotionBar}>
              <View
                style={[
                  styles.emotionIndicator,
                  {
                    backgroundColor: theme.colors.accent,
                    width: `${emotionIntensity * 100}%`,
                  },
                ]}
              />
            </View>

            <View style={styles.metaRow}>
              <Text style={[typography.ui.tiny, { color: theme.colors.textMuted }]}>
                {currentEmotion !== 'neutral' ? currentEmotion : ''}{currentArc ? `  ·  ${currentArc.arcPosition}` : ''}
              </Text>
              <Text style={[typography.ui.tiny, { color: theme.colors.textMuted }]}>
                {sentenceIndex + 1} / {sentences.length}
              </Text>
            </View>

            <View style={styles.transportRow}>
              <TouchableOpacity onPress={previousChapter} style={styles.transportButton}>
                <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>
                  Prev Ch
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={previousSentence} style={styles.transportButton}>
                <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>
                  Prev
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePlayPause}
                style={[styles.playButton, { backgroundColor: theme.colors.accent }]}
              >
                <Text style={[typography.ui.body, { color: theme.colors.background, fontWeight: '600' }]}>
                  {isPlaying ? 'Pause' : 'Play'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={nextSentence} style={styles.transportButton}>
                <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>
                  Next
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={nextChapter} style={styles.transportButton}>
                <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>
                  Next Ch
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.speedRow}>
              <Text style={[typography.ui.tiny, { color: theme.colors.textMuted, marginRight: spacing.sm }]}>
                {speed.toFixed(1)}x
              </Text>
              <TouchableOpacity
                onPress={() => setSpeed(Math.max(0.5, speed - 0.1))}
                style={styles.speedButton}
              >
                <Text style={[typography.ui.tiny, { color: theme.colors.textSecondary }]}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSpeed(Math.min(2.0, speed + 0.1))}
                style={styles.speedButton}
              >
                <Text style={[typography.ui.tiny, { color: theme.colors.textSecondary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </Animated.View>

      {lastLineRitual && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ritualOverlay,
            {
              backgroundColor: theme.colors.background,
              opacity: lastLineOpacity,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.ritualVignette,
              {
                backgroundColor: theme.colors.background,
                opacity: vignetteOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.4],
                }),
              },
            ]}
          />
          <Animated.View style={[styles.ritualColumn, { width: PROSE_DIALOGUE_WIDTH }]}>
            <Text
              style={[
                typography.story,
                styles.ritualText,
                { color: theme.colors.text },
              ]}
            >
              {lastLineRitual.text}
            </Text>
          </Animated.View>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};

interface EdgeVignetteProps {
  opacity: Animated.Value;
  edgeColor: string;
}

const EdgeVignette: React.FC<EdgeVignetteProps> = ({ opacity, edgeColor }) => {
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.vignetteTop,
          {
            backgroundColor: edgeColor,
            opacity: opacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, atmosphereOpacity.vignetteEdge],
            }),
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.vignetteBottom,
          {
            backgroundColor: edgeColor,
            opacity: opacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, atmosphereOpacity.vignetteEdge],
            }),
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.vignetteLeft,
          {
            backgroundColor: edgeColor,
            opacity: opacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, atmosphereOpacity.vignetteEdge * 0.6],
            }),
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.vignetteRight,
          {
            backgroundColor: edgeColor,
            opacity: opacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, atmosphereOpacity.vignetteEdge * 0.6],
            }),
          },
        ]}
      />
    </>
  );
};

const VIGNETTE_EDGE_THICKNESS = Math.max(SCREEN_HEIGHT * 0.18, 120);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingPulse: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: spacing.lg,
    opacity: 0.6,
  },
  atmosphereLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: VIGNETTE_EDGE_THICKNESS,
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: VIGNETTE_EDGE_THICKNESS,
  },
  vignetteLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: Math.max(SCREEN_WIDTH * 0.15, 60),
  },
  vignetteRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: Math.max(SCREEN_WIDTH * 0.15, 60),
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? spacing.cinematic : spacing.xxl,
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  focusToggle: {
    padding: spacing.sm,
  },
  storyContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: PROSE_SIDE_GUTTER,
    paddingVertical: spacing.xl,
  },
  proseColumn: {
    alignSelf: 'center',
  },
  exitFocusButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    padding: spacing.sm,
  },
  contextSentence: {
    paddingHorizontal: 0,
    marginBottom: spacing.sm,
  },
  activeSentenceContainer: {},
  controlsContainer: {
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  emotionBar: {
    height: 2,
    backgroundColor: 'rgba(231, 226, 218, 0.06)',
    borderRadius: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  emotionIndicator: {
    height: '100%',
    borderRadius: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  transportRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  transportButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  playButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md + 2,
    borderRadius: 28,
  },
  speedRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  ritualOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ritualVignette: {
    ...StyleSheet.absoluteFillObject,
  },
  ritualColumn: {
    paddingHorizontal: spacing.xl,
  },
  ritualText: {
    textAlign: 'center',
    opacity: atmosphereOpacity.proseOpacity,
  },
});

export default NarrativeFocusPlayer;
