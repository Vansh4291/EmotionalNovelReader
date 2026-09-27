import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../utils/themeContext';

// Deterministic cover palette — book covers are letter avatars with a stable
// color derived from the title so the same book always looks the same.
const COVER_COLORS = [
  ['#8B6F47', '#5C4A30'],
  ['#5B7B9A', '#3D5468'],
  ['#8B3A3A', '#5E2626'],
  ['#6B4F7A', '#493653'],
  ['#5B8A5B', '#3D5C3D'],
  ['#A3874A', '#6D5A31'],
];

const getCoverColors = (title) => {
  let hash = 0;
  const t = title || '';
  for (let i = 0; i < t.length; i++) {
    hash = (hash * 31 + t.charCodeAt(i)) >>> 0;
  }
  return COVER_COLORS[hash % COVER_COLORS.length];
};

const BookCard = ({ book, onPress, onLongPress = null }) => {
  const theme = useTheme();
  const title = book?.title || 'Untitled';
  const initial = title.charAt(0).toUpperCase() || '?';
  const [topColor, bottomColor] = getCoverColors(title);
  const progress = Math.min(100, Math.max(0, book?.progress?.completionPercent || 0));
  const hasProgress = progress > 0;
  const chapter = book?.progress?.currentChapterIndex;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: theme.surface }, pressed && styles.pressed]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${title} by ${book?.author || 'Unknown Author'}${hasProgress ? `, ${Math.round(progress)} percent read` : ''}`}
      accessibilityHint="Opens book details"
    >
      <View style={[styles.cover, { backgroundColor: topColor }]}>
        <View style={[styles.coverGradient, { backgroundColor: bottomColor }]} />
        <Text style={styles.coverLetter} accessibilityElementsHidden>
          {initial}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2} allowFontScaling maxFontSizeMultiplier={1.4}>
          {title}
        </Text>
        <Text style={[styles.author, { color: theme.textSecondary }]} numberOfLines={1} allowFontScaling maxFontSizeMultiplier={1.4}>
          {book?.author || 'Unknown Author'}
        </Text>
        <View style={styles.spacer} />
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          {book?.totalChapters || 0} chapter{(book?.totalChapters || 0) !== 1 ? 's' : ''}
        </Text>
        {hasProgress ? (
          <View style={styles.progressSection}>
            <View style={[styles.progressBar, { backgroundColor: theme.surfaceLight }]}>
              <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${progress}%` }]} />
            </View>
            <Text style={[styles.progressPercent, { color: theme.textMuted }]}>
              {Math.round(progress)}%
            </Text>
          </View>
        ) : (
          <Text style={[styles.startText, { color: theme.textMuted }]}>Not started</Text>
        )}
        {hasProgress && chapter != null && (
          <Text style={[styles.continueText, { color: theme.primary }]}>
            Chapter {chapter + 1}
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
  },
  pressed: {
    opacity: 0.85,
  },
  cover: {
    width: 78,
    height: 116,
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
    fontSize: 38,
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
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  author: {
    fontSize: 13,
    marginTop: 3,
  },
  spacer: {
    flex: 1,
    minHeight: 8,
  },
  meta: {
    fontSize: 12,
    marginBottom: 6,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
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
    minWidth: 32,
    textAlign: 'right',
  },
  startText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  continueText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default React.memo(BookCard);
