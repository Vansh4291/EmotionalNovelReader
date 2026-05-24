import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../utils/themeContext';

const COVER_COLORS = [
  ['#FF6B6B', '#EE5A24'],
  ['#A29BFE', '#6C5CE7'],
  ['#55EFC4', '#00B894'],
  ['#FDCB6E', '#E17055'],
  ['#74B9FF', '#0984E3'],
  ['#FD79A8', '#E84393'],
  ['#00CEC9', '#55EFC4'],
  ['#E17055', '#D63031'],
  ['#6C5CE7', '#4834D4'],
  ['#00B894', '#00A381'],
  ['#81ECEC', '#00CEC9'],
  ['#FAB1A0', '#E17055'],
  ['#DFE6E9', '#636E72'],
  ['#DDA0DD', '#6C5CE7'],
  ['#FFEAA7', '#FDCB6E'],
  ['#B8E994', '#00B894'],
];

const getCoverColors = (letter) => {
  const code = (letter || 'A').charCodeAt(0);
  return COVER_COLORS[code % COVER_COLORS.length];
};

const BookCard = ({ book, onPress, onLongPress }) => {
  const theme = useTheme();
  const initial = book?.title?.charAt(0)?.toUpperCase() || '?';
  const [topColor, bottomColor] = getCoverColors(initial);
  const progress = book?.progress?.completionPercent || 0;
  const hasProgress = progress > 0;
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: theme.surface }, pressed && styles.pressed]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={[styles.cover, { backgroundColor: topColor }]}>
        <View style={[styles.coverGradient, { backgroundColor: bottomColor }]} />
        <Text style={styles.coverLetter}>{initial}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {book.title || 'Untitled'}
        </Text>
        <Text style={[styles.author, { color: theme.textSecondary }]} numberOfLines={1}>
          {book.author || 'Unknown Author'}
        </Text>
        <View style={styles.spacer} />
        {hasProgress ? (
          <>
            <View style={styles.progressSection}>
              <View style={[styles.progressBar, { backgroundColor: theme.surfaceLight }]}>
                <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${clampedProgress}%` }]} />
              </View>
              <Text style={[styles.progressPercent, { color: theme.textMuted }]}>
                {Math.round(clampedProgress)}%
              </Text>
            </View>
            <View style={styles.continueRow}>
              <View style={[styles.continueDot, { backgroundColor: theme.primary }]} />
              <Text style={[styles.continueText, { color: theme.primary }]}>Continue</Text>
            </View>
          </>
        ) : (
          <Text style={[styles.startText, { color: theme.textMuted }]} numberOfLines={1}>
            Tap to explore
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  pressed: {
    opacity: 0.85,
  },
  cover: {
    width: 80,
    height: 120,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    opacity: 0.35,
  },
  coverLetter: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  info: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'flex-start',
    paddingVertical: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  },
  author: {
    fontSize: 13,
    marginTop: 3,
  },
  spacer: {
    flex: 1,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressPercent: {
    fontSize: 11,
    marginLeft: 6,
    minWidth: 30,
    textAlign: 'right',
  },
  continueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  continueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  continueText: {
    fontSize: 12,
    fontWeight: '600',
  },
  startText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default BookCard;
