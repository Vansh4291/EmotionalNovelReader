import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTheme } from '../utils/themeContext';

const TransportControls = ({
  isPlaying,
  currentSentenceIndex,
  totalSentences,
  currentEmotion,
  speed,
  onPlayPause,
  onPrevSentence,
  onNextSentence,
  onPrevChapter,
  onNextChapter,
  onBookmark,
  onSpeedChange,
  theme: themeProp,
  isFirstChapter,
  isLastChapter,
}) => {
  const contextTheme = useTheme();
  const theme = themeProp || contextTheme;

  const getColor = (emotion) => {
    const map = {
      joy: theme.emotionJoy,
      sadness: theme.emotionSadness,
      anger: theme.emotionAnger,
      fear: theme.emotionFear,
      surprise: theme.emotionSurprise,
      neutral: theme.emotionNeutral,
    };
    return map[emotion] || theme.emotionNeutral;
  };

  return (
    <View style={[styles.controls, { backgroundColor: theme.surface }]}>
      <View style={styles.progressInfo}>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {currentSentenceIndex + 1} / {totalSentences}
        </Text>
        <Text style={[styles.emotionText, { color: getColor(currentEmotion) }]}>
          {currentEmotion}
        </Text>
      </View>

      <View style={styles.mainControls}>
        <Pressable
          style={({ pressed }) => [styles.controlButton, isFirstChapter && styles.controlButtonDisabled, pressed && !isFirstChapter && { opacity: 0.7 }]}
          onPress={onPrevChapter}
          disabled={isFirstChapter}
        >
          <Text style={[styles.controlIcon, { color: theme.textSecondary }, isFirstChapter && { color: theme.textMuted }]}>⏮</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.controlButton, currentSentenceIndex === 0 && styles.controlButtonDisabled, pressed && currentSentenceIndex !== 0 && { opacity: 0.7 }]}
          onPress={onPrevSentence}
          disabled={currentSentenceIndex === 0}
        >
          <Text style={[styles.controlIcon, { color: theme.textSecondary }, currentSentenceIndex === 0 && { color: theme.textMuted }]}>◀</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.playButton, { backgroundColor: theme.primary }, pressed && { opacity: 0.7 }]}
          onPress={onPlayPause}
        >
          <Text style={[styles.playButtonText, { color: theme.background }]}>
            {isPlaying ? '⏸' : '▶'}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.controlButton, currentSentenceIndex >= totalSentences - 1 && styles.controlButtonDisabled, pressed && currentSentenceIndex < totalSentences - 1 && { opacity: 0.7 }]}
          onPress={onNextSentence}
          disabled={currentSentenceIndex >= totalSentences - 1}
        >
          <Text style={[styles.controlIcon, { color: theme.textSecondary }, currentSentenceIndex >= totalSentences - 1 && { color: theme.textMuted }]}>▶</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.controlButton, isLastChapter && styles.controlButtonDisabled, pressed && !isLastChapter && { opacity: 0.7 }]}
          onPress={onNextChapter}
          disabled={isLastChapter}
        >
          <Text style={[styles.controlIcon, { color: theme.textSecondary }, isLastChapter && { color: theme.textMuted }]}>⏭</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.7 }]}
          onPress={onBookmark}
        >
          <Text style={[styles.controlIcon, { color: theme.textSecondary }]}>🔖</Text>
        </Pressable>
      </View>

      <View style={styles.speedControl}>
        <Text style={[styles.speedLabel, { color: theme.textSecondary }]}>Speed: {speed.toFixed(1)}x</Text>
        <Slider
          style={styles.speedSlider}
          minimumValue={0.5}
          maximumValue={2.0}
          step={0.1}
          value={speed}
          onValueChange={onSpeedChange}
          minimumTrackTintColor={theme.primary}
          maximumTrackTintColor={theme.surfaceLight}
          thumbTintColor={theme.primary}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  controls: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
  },
  emotionText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlButton: {
    padding: 12,
    marginHorizontal: 8,
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  controlIcon: {
    fontSize: 20,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  playButtonText: {
    fontSize: 28,
  },
  speedControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedLabel: {
    fontSize: 14,
    width: 80,
  },
  speedSlider: {
    flex: 1,
    height: 40,
  },
});

export default TransportControls;
