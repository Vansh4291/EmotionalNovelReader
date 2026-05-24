import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../utils/themeContext';

const EmotionBadge = ({ emotion = 'neutral' }) => {
  const theme = useTheme();

  const getColor = (e) => {
    const map = {
      joy: theme.emotionJoy,
      sadness: theme.emotionSadness,
      anger: theme.emotionAnger,
      fear: theme.emotionFear,
      surprise: theme.emotionSurprise,
      neutral: theme.emotionNeutral,
    };
    return map[e] || theme.emotionNeutral;
  };

  const backgroundColor = getColor(emotion);

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.badgeText, { color: theme.background }]}>{emotion}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    alignSelf: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

export default React.memo(EmotionBadge);