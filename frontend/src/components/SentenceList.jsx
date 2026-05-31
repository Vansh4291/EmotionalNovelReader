import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../utils/themeContext';

const SentenceList = forwardRef(({ sentences, currentSentenceIndex, onSentencePress, theme: themeProp }, ref) => {
  const contextTheme = useTheme();
  const theme = themeProp || contextTheme;
  const flatListRef = useRef(null);

  const getAccent = (emotion) => {
    const map = {
      joy: theme.emotionJoy, sadness: theme.emotionSadness, anger: theme.emotionAnger,
      fear: theme.emotionFear, surprise: theme.emotionSurprise, neutral: theme.textMuted,
    };
    return map[emotion] || theme.textMuted;
  };

  useImperativeHandle(ref, () => ({
    scrollToSentence: (index) => {
      setTimeout(() => {
        if (flatListRef.current && sentences.length > 0) {
          try { flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.3 }); } catch (e) {}
        }
      }, 100);
    },
  }));

  useEffect(() => {
    if (currentSentenceIndex >= 0 && flatListRef.current && sentences.length > 0) {
      setTimeout(() => {
        try { flatListRef.current?.scrollToIndex({ index: currentSentenceIndex, animated: true, viewPosition: 0.3 }); } catch (e) {}
      }, 100);
    }
  }, [currentSentenceIndex, sentences]);

  const renderSentence = ({ item: sentence, index }) => {
    const isActive = index === currentSentenceIndex;
    const accent = getAccent(sentence.emotion || 'neutral');
    return (
      <Pressable
        style={({ pressed }) => [
          styles.sentenceContainer,
          isActive && { borderLeftColor: accent, borderLeftWidth: 1 },
          pressed && { opacity: 0.6 },
        ]}
        onPress={() => onSentencePress(index)}
      >
        <Text style={[
          styles.sentenceText,
          { color: isActive ? theme.text : theme.textSecondary, fontFamily: theme.narrativeFont },
          isActive && { color: theme.text },
        ]}>
          {sentence.text}
        </Text>
        {isActive && <Text style={[styles.activeDot, { backgroundColor: accent }]} />}
      </Pressable>
    );
  };

  return (
    <FlatList
      ref={flatListRef}
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      data={sentences}
      renderItem={renderSentence}
      keyExtractor={(item, index) => `s_${index}`}
      onScrollToIndexFailed={(info) => {
        setTimeout(() => { flatListRef.current?.scrollToIndex({ index: info.index, animated: true }); }, 500);
      }}
      initialNumToRender={20}
    />
  );
});

SentenceList.displayName = 'SentenceList';

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sentenceContainer: {
    paddingVertical: 6,
    paddingLeft: 16,
    marginBottom: 2,
    position: 'relative',
  },
  sentenceText: {
    fontSize: 18,
    lineHeight: 30,
    letterSpacing: 0.2,
  },
  activeDot: {
    position: 'absolute',
    left: 0,
    top: 14,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

export default SentenceList;
