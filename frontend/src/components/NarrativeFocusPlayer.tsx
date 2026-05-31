import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { NarrativeThemeEngine, NarrativeTheme, NarrativeColors } from '../theme/NarrativeThemeEngine';
import { buildTypography, NarrativeTypography, getDialogueStyle } from '../theme/NarrativeTypography';
import { useNarration } from '../core/useNarration';
import { EmotionType } from '../core/types';
import { NarrativeArc } from '../core/narration/NarrativeContextManager';

interface NarrativeFocusPlayerProps {
  bookId: string;
  initialChapterIndex?: number;
  initialSentenceIndex?: number;
  onBack?: () => void;
}

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

  const themeEngine = useMemo(() => new NarrativeThemeEngine(), []);
  const [theme, setTheme] = useState<NarrativeTheme>(
    themeEngine.getTheme('neutral')
  );
  const typography = useMemo(() => buildTypography(theme), [theme]);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const controlsFade = useRef(new Animated.Value(1)).current;

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
    }, 4000);

    return () => clearTimeout(timer);
  }, [focusMode, isPlaying, theme.animation.durationAtmospheric, controlsFade, controlsVisible]);

  const handleScreenTap = useCallback(() => {
    if (!controlsVisible) {
      Animated.timing(controlsFade, {
        toValue: 1,
        duration: theme.animation.durationNormal,
        useNativeDriver: true,
      }).start();
      setControlsVisible(true);
    }
  }, [controlsVisible, controlsFade, theme.animation.durationNormal]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const currentSentence = sentences[sentenceIndex];
  const previousSentence_ = sentenceIndex > 0 ? sentences[sentenceIndex - 1] : null;
  const nextSentence_ = sentenceIndex < sentences.length - 1 ? sentences[sentenceIndex + 1] : null;
  const currentChapter = chapters[chapterIndex];

  const emotionIntensity = useMemo(() => {
    if (!currentArc) return 0.5;
    return currentArc.currentTension;
  }, [currentArc]);

  const isLoading = playbackState === 'LOADING_BOOK' || playbackState === 'TRANSITIONING_CHAPTER';

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
        <View style={styles.loadingContainer}>
          <Animated.View
            style={[
              styles.loadingPulse,
              {
                backgroundColor: theme.colors.accentSubtle,
              },
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
        style={[
          styles.atmosphereLayer,
          {
            backgroundColor: theme.colors.emotionGlow,
            opacity: fadeAnim,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.tensionOverlay,
          {
            backgroundColor: currentArc?.arcPosition === 'peak'
              ? 'rgba(200, 50, 30, 0.03)'
              : 'transparent',
            opacity: glowAnim,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.contentContainer,
          { opacity: Animated.multiply(fadeAnim, controlsFade) },
        ]}
      >
        {!focusMode && (
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
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
          {focusMode && (
            <TouchableOpacity
              onPress={() => setFocusMode(false)}
              style={styles.exitFocusButton}
            >
              <Text style={[typography.ui.tiny, { color: theme.colors.textMuted }]}>
                Exit Focus
              </Text>
            </TouchableOpacity>
          )}

          {previousSentence_ && (
            <Text
              style={[
                focusMode ? typography.storyDimmed : typography.storyDimmed,
                styles.contextSentence,
                { opacity: 0.4 },
              ]}
              numberOfLines={2}
            >
              {previousSentence_.text}
            </Text>
          )}

          <Animated.View
            style={[
              styles.activeSentenceContainer,
              {
                borderLeftColor: theme.colors.accent,
                borderLeftWidth: 2,
                paddingLeft: theme.spacing.md,
              },
            ]}
          >
            <Text
              style={
                currentSentence?.emotion === 'neutral'
                  ? typography.story
                  : getDialogueStyle(theme, emotionIntensity)
              }
            >
              {currentSentence?.text || ''}
            </Text>
          </Animated.View>

          {nextSentence_ && (
            <Text
              style={[
                typography.storyDimmed,
                styles.contextSentence,
                { opacity: 0.25, marginTop: theme.spacing.lg },
              ]}
              numberOfLines={2}
            >
              {nextSentence_.text}
            </Text>
          )}
        </View>

        <Animated.View
          style={[
            styles.controlsContainer,
            {
              borderTopColor: theme.colors.border,
              opacity: controlsFade,
              backgroundColor: theme.colors.surface,
            },
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

          <Text style={[typography.ui.tiny, { color: theme.colors.textMuted, marginBottom: theme.spacing.sm }]}>
            {currentEmotion !== 'neutral' ? currentEmotion : ''} {currentArc ? `· ${currentArc.arcPosition}` : ''}
          </Text>

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
              style={[
                styles.playButton,
                {
                  backgroundColor: theme.colors.accent,
                  shadowColor: theme.colors.accent,
                },
              ]}
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

          <View style={styles.progressRow}>
            <Text style={[typography.ui.tiny, { color: theme.colors.textMuted }]}>
              {sentenceIndex + 1} / {sentences.length}
            </Text>
            <View style={styles.speedControl}>
              <Text style={[typography.ui.tiny, { color: theme.colors.textMuted, marginRight: theme.spacing.xs }]}>
                {speed.toFixed(1)}x
              </Text>
              <TouchableOpacity
                onPress={() => setSpeed(Math.max(0.5, speed - 0.1))}
                style={styles.speedButton}
              >
                <Text style={[typography.ui.tiny, { color: theme.colors.textSecondary }]}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSpeed(Math.min(2.0, speed + 0.1))}
                style={styles.speedButton}
              >
                <Text style={[typography.ui.tiny, { color: theme.colors.textSecondary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

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
    marginBottom: 16,
    opacity: 0.6,
  },
  atmosphereLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  tensionOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  focusToggle: {
    padding: 8,
  },
  storyContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  exitFocusButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  contextSentence: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  activeSentenceContainer: {
    marginVertical: 16,
  },
  controlsContainer: {
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 24,
    borderTopWidth: 1,
  },
  emotionBar: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  emotionIndicator: {
    height: '100%',
    borderRadius: 1,
  },
  transportRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  transportButton: {
    padding: 12,
  },
  playButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  speedControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});

export default NarrativeFocusPlayer;
