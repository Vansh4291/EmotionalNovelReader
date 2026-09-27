import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { Text, Pressable, StyleSheet, FlatList, View } from 'react-native';
import { useTheme } from '../utils/themeContext';

/**
 * Reader sentence list.
 *
 * Renders each narration sentence with its emotion accent. Accepts fontSize
 * and lineHeight from reader settings so users can control typography.
 * Paragraph breaks are rendered as extra spacing via `isParagraphStart`.
 */
const SentenceList = forwardRef(({ sentences, currentSentenceIndex, onSentencePress, theme: themeProp, fontSize = 18, lineHeight = 1.6 }, ref) => {
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
    const paragraphGap = sentence.isParagraphStart ? 18 : 2;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.sentenceContainer,
          { marginTop: paragraphGap },
          isActive && { borderLeftColor: accent, borderLeftWidth: 2 },
          pressed && { opacity: 0.6 },
        ]}
        onPress={() => onSentencePress(index)}
        accessible
        accessibilityRole="text"
        accessibilityLabel={sentence.text}
        accessibilityState={{ selected: isActive }}
      >
        <Text
          style={[
            styles.sentenceText,
            {
              color: isActive ? theme.text : theme.textSecondary,
              fontFamily: theme.narrativeFont,
              fontSize,
              lineHeight: Math.round(fontSize * lineHeight),
            },
            isActive && { color: theme.text, fontWeight: '500' },
          ]}
          allowFontScaling
          maxFontSizeMultiplier={1.5}
        >
          {sentence.text}
        </Text>
        {isActive && <View style={[styles.activeDot, { backgroundColor: accent }]} />}
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
      maxToRenderPerBatch={12}
      windowSize={7}
      removeClippedSubviews
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
    paddingVertical: 4,
    paddingLeft: 14,
    position: 'relative',
  },
  sentenceText: {
    letterSpacing: 0.2,
  },
  activeDot: {
    position: 'absolute',
    left: 0,
    top: 14,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});

export default SentenceList;
