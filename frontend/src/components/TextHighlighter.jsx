import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

const EMOTION_COLORS = {
  joy: 'rgba(251, 191, 36, 0.2)',
  sadness: 'rgba(96, 165, 250, 0.2)',
  anger: 'rgba(248, 113, 113, 0.2)',
  fear: 'rgba(167, 139, 250, 0.2)',
  surprise: 'rgba(52, 211, 153, 0.2)',
  neutral: 'transparent',
};

const EMOTION_BORDER_COLORS = {
  joy: '#fbbf24',
  sadness: '#60a5fa',
  anger: '#f87171',
  fear: '#a78bfa',
  surprise: '#34d399',
  neutral: 'transparent',
};

const TextHighlighter = ({
  sentences = [],
  currentSentenceIndex = 0,
  onSentencePress,
  autoScroll = true,
  emotionEffectsEnabled = true,
}) => {
  const scrollViewRef = useRef(null);
  const sentenceRefs = useRef({});

  useEffect(() => {
    if (autoScroll && sentenceRefs.current[currentSentenceIndex]) {
      sentenceRefs.current[currentSentenceIndex].measureLayout(
        scrollViewRef.current,
        (x, y) => {
          scrollViewRef.current.scrollTo({
            y: Math.max(0, y - 100),
            animated: true,
          });
        }
      );
    }
  }, [currentSentenceIndex, autoScroll]);

  const renderSentence = (sentence, index) => {
    const isActive = index === currentSentenceIndex;
    const emotion = sentence?.emotion || 'neutral';
    
    const backgroundColor = emotionEffectsEnabled
      ? (isActive ? EMOTION_COLORS[emotion] : 'transparent')
      : 'transparent';
    
    const borderColor = isActive ? EMOTION_BORDER_COLORS[emotion] : 'transparent';

    return (
      <TouchableOpacity
        key={index}
        ref={(ref) => (sentenceRefs.current[index] = ref)}
        style={[
          styles.sentenceContainer,
          { backgroundColor, borderLeftColor: borderColor },
        ]}
        onPress={() => onSentencePress && onSentencePress(index)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.sentenceText,
            isActive && styles.activeSentenceText,
          ]}
        >
          {sentence.text}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {sentences.map((sentence, index) => renderSentence(sentence, index))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
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
    color: '#a0aec0',
    lineHeight: 28,
  },
  activeSentenceText: {
    color: '#ffffff',
    fontWeight: '500',
  },
});

export default TextHighlighter;