import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
} from 'react-native';
import EmotionBadge from './EmotionBadge';
import { useTheme } from '../utils/themeContext';

const SentenceList = forwardRef(({
  sentences,
  currentSentenceIndex,
  onSentencePress,
  emotionColors,
  theme: themeProp,
}, ref) => {
  const contextTheme = useTheme();
  const theme = themeProp || contextTheme;
  const flatListRef = useRef(null);

  const getColor = (emotion) => {
    if (emotionColors) return emotionColors(emotion);
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

  useImperativeHandle(ref, () => ({
    scrollToSentence: (index) => {
      setTimeout(() => {
        if (flatListRef.current && sentences.length > 0) {
          try {
            flatListRef.current.scrollToIndex({
              index,
              animated: true,
              viewPosition: 0.3,
            });
          } catch (e) {}
        }
      }, 100);
    },
  }));

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentSentenceIndex >= 0 && flatListRef.current && sentences.length > 0) {
        try {
          flatListRef.current.scrollToIndex({
            index: currentSentenceIndex,
            animated: true,
            viewPosition: 0.3,
          });
        } catch (e) {}
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentSentenceIndex, sentences]);

  const renderSentence = ({ item: sentence, index }) => {
    const isActive = index === currentSentenceIndex;
    const emotion = sentence.emotion || 'neutral';
    const emotionColor = getColor(emotion);
    const bgColor = isActive ? emotionColor + '30' : 'transparent';
    const borderColor = isActive ? emotionColor : 'transparent';

    return (
      <Pressable
        style={({ pressed }) => [
          styles.sentenceContainer,
          { backgroundColor: bgColor, borderLeftColor: borderColor },
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => onSentencePress(index)}
      >
        <Text style={[styles.sentenceText, { color: theme.textSecondary }, isActive && { color: theme.text }]}>
          {sentence.text}
        </Text>
        {isActive && <EmotionBadge emotion={emotion} />}
      </Pressable>
    );
  };

  return (
    <FlatList
      ref={flatListRef}
      style={styles.textContainer}
      contentContainerStyle={styles.textContent}
      showsVerticalScrollIndicator={false}
      data={sentences}
      renderItem={renderSentence}
      keyExtractor={(item, index) => `sentence_${index}`}
      onScrollToIndexFailed={(info) => {
        const timer = setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
        }, 500);
        return () => clearTimeout(timer);
      }}
      initialNumToRender={20}
    />
  );
});

SentenceList.displayName = 'SentenceList';

const styles = StyleSheet.create({
  textContainer: {
    flex: 1,
  },
  textContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sentenceContainer: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  sentenceText: {
    fontSize: 18,
    lineHeight: 28,
  },
});

export default SentenceList;
