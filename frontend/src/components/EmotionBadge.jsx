import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const EMOTION_COLORS = {
  joy: '#fbbf24',
  sadness: '#60a5fa',
  anger: '#f87171',
  fear: '#a78bfa',
  surprise: '#34d399',
  neutral: '#94a3b8',
};

const EmotionBadge = ({ emotion = 'neutral', showLabel = true }) => {
  const backgroundColor = EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={styles.badgeText}>{emotion}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a2e',
    textTransform: 'capitalize',
  },
});

export default EmotionBadge;