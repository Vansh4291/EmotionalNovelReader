import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getBookById, getOrCreateProgress } from '../database/localDatabase';
import { usePlayerStore } from '../store/playerStore';
import { useTheme } from '../utils/themeContext';

// Deterministic cover palette keyed by title hash (stable per book).
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

const BookDetailScreen = ({ route, navigation }) => {
  const { bookId } = route.params;
  const { setCurrentBook, setCurrentChapter, setCurrentSentence } = usePlayerStore();
  const theme = useTheme();

  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadBookDetails = useCallback(async () => {
    try {
      setLoading(true);
      const [bookData, progressData] = await Promise.all([
        getBookById(bookId),
        getOrCreateProgress(bookId),
      ]);

      setBook(bookData);
      setChapters(bookData?.chapters || []);
      setProgress(progressData);
    } catch (error) {
      if (__DEV__) console.error('Failed to load book:', error);
      Alert.alert('Error', 'Failed to load book details.');
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useFocusEffect(
    useCallback(() => {
      loadBookDetails();
    }, [loadBookDetails])
  );

  const handleStartListening = async () => {
    if (!book || chapters.length === 0) {
      Alert.alert('Error', 'No chapters available.');
      return;
    }

    const startChapterIndex = progress?.currentChapterIndex || 0;
    const startSentenceIndex = progress?.currentSentenceIndex || 0;

    setCurrentBook(book);
    setCurrentChapter(startChapterIndex);
    setCurrentSentence(startSentenceIndex);

    navigation.navigate('Player', {
      bookId: book._id,
      chapterIndex: startChapterIndex,
      sentenceIndex: startSentenceIndex,
    });
  };

  const handleChapterPress = (chapter, index) => {
    navigation.navigate('Player', {
      bookId: book._id,
      chapterIndex: index,
      sentenceIndex: 0,
    });
  };

  const getChapterStatus = (index) => {
    if (!progress) return 'upcoming';
    if (index < progress.currentChapterIndex) return 'completed';
    if (index === progress.currentChapterIndex) return 'current';
    return 'upcoming';
  };

  const renderChapterItem = ({ item, index }) => {
    const status = getChapterStatus(index);
    const isCompleted = status === 'completed';
    const isCurrent = status === 'current';

    return (
      <Pressable
        style={({ pressed }) => [styles.chapterItem, { backgroundColor: theme.surface }, pressed && { opacity: 0.7 }]}
        onPress={() => handleChapterPress(item, index)}
        accessibilityRole="button"
        accessibilityLabel={`Chapter ${index + 1}: ${item.title || ''}. ${formatWordCount(item.wordCount || 0)}`}
        accessibilityHint={isCurrent ? 'Continue reading this chapter' : 'Open this chapter'}
      >
        <View style={[styles.chapterBadge, { backgroundColor: isCompleted ? theme.primary : theme.surfaceLight }]}>
          <Text style={[styles.chapterBadgeText, { color: isCompleted ? theme.surface : theme.textSecondary }]} accessible={false}>
            {index + 1}
          </Text>
        </View>
        <View style={styles.chapterInfo}>
          <Text style={[styles.chapterTitle, { color: theme.text }]} numberOfLines={1} allowFontScaling maxFontSizeMultiplier={1.4}>
            {item.title || `Chapter ${index + 1}`}
          </Text>
          <Text style={[styles.chapterWordCount, { color: theme.textMuted }]} allowFontScaling>
            {formatWordCount(item.wordCount || 0)}
          </Text>
        </View>
        {isCompleted ? (
          <View style={[styles.statusIcon, { backgroundColor: theme.primary }]} accessible={false}>
            <Text style={[styles.statusIconText, { color: theme.surface }]}>{'\u2713'}</Text>
          </View>
        ) : (
          <Text style={[styles.playIcon, { color: isCurrent ? theme.primary : theme.textMuted }]} accessible={false}>
            {'\u25B6'}
          </Text>
        )}
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!book) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>Book not found</Text>
      </View>
    );
  }

  const initial = book.title ? book.title.charAt(0).toUpperCase() : '?';
  const completionPercent = Math.min(100, Math.max(0, progress?.completionPercent || 0));
  const totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
  const [topColor, bottomColor] = getCoverColors(book.title || '');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={chapters}
        renderItem={renderChapterItem}
        keyExtractor={(item, index) => `chapter-${index}`}
        contentContainerStyle={styles.chapterList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={[styles.heroSection, { backgroundColor: theme.surface }]}>
            <View style={styles.heroTop}>
              <View style={[styles.heroCover, { backgroundColor: topColor }]} accessible={false}>
                <View style={[styles.heroCoverGradient, { backgroundColor: bottomColor }]} />
                <Text style={styles.heroCoverLetter} accessible={false}>{initial}</Text>
              </View>
              <View style={styles.heroInfo}>
                <Text style={[styles.heroTitle, { color: theme.text }]} numberOfLines={3} allowFontScaling maxFontSizeMultiplier={1.3}>
                  {book.title}
                </Text>
                <Text style={[styles.heroAuthor, { color: theme.textSecondary }]} numberOfLines={1} allowFontScaling>
                  {book.author || 'Unknown Author'}
                </Text>
                <View style={styles.heroStats}>
                  <Text style={[styles.heroStat, { color: theme.textMuted }]} allowFontScaling>
                    {book.fileType ? book.fileType.toUpperCase() : 'TXT'} · {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
                  </Text>
                  <Text style={[styles.heroStatDot, { color: theme.textMuted }]} accessible={false}>{'\u00B7'}</Text>
                  <Text style={[styles.heroStat, { color: theme.textMuted }]} allowFontScaling>
                    {formatWordCount(totalWords)}
                  </Text>
                </View>
              </View>
            </View>

            {completionPercent > 0 && (
              <View style={styles.heroProgressSection}>
                <View style={[styles.heroProgressBar, { backgroundColor: theme.surfaceLight }]}>
                  <View style={[styles.heroProgressFill, { backgroundColor: theme.primary, width: `${Math.min(100, completionPercent)}%` }]} />
                </View>
                <Text style={[styles.heroProgressText, { color: theme.textSecondary }]}>
                  {Math.round(completionPercent)}% complete
                </Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [styles.listenButton, pressed && { opacity: 0.85 }]}
              onPress={handleStartListening}
              accessibilityRole="button"
              accessibilityLabel={completionPercent > 0 ? 'Continue listening' : 'Start listening'}
              accessibilityHint="Opens the narration player"
            >
              <View style={[styles.listenButtonInner, { backgroundColor: theme.primary }]}>
                <Text style={styles.listenButtonIcon} accessible={false}>{'\u25B6'}</Text>
                <Text style={[styles.listenButtonText, { color: theme.surface }]} allowFontScaling>
                  {completionPercent > 0 ? 'Continue' : 'Start reading'}
                </Text>
              </View>
            </Pressable>
          </View>
        }
        ListHeaderComponentStyle={styles.listHeader}
      />
    </View>
  );
};

function formatWordCount(count) {
  if (!count) return '0 words';
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k words`;
  }
  return `${count} words`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
  },
  listHeader: {
    marginBottom: 0,
  },
  heroSection: {
    padding: 20,
    paddingBottom: 24,
    marginBottom: 8,
  },
  heroTop: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  heroCover: {
    width: 100,
    height: 150,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
  },
  heroCoverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    opacity: 0.35,
  },
  heroCoverLetter: {
    fontSize: 52,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroInfo: {
    flex: 1,
    marginLeft: 18,
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroAuthor: {
    fontSize: 15,
    marginBottom: 8,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStat: {
    fontSize: 12,
  },
  heroStatDot: {
    fontSize: 14,
    marginHorizontal: 6,
  },
  heroProgressSection: {
    marginBottom: 16,
  },
  heroProgressBar: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  heroProgressText: {
    fontSize: 12,
  },
  listenButton: {
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
  },
  listenButtonInner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  listenButtonIcon: {
    fontSize: 14,
    color: '#FFFFFF',
    marginRight: 10,
  },
  listenButtonText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  chapterList: {
    paddingBottom: 24,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
  },
  chapterBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chapterInfo: {
    flex: 1,
    marginLeft: 14,
  },
  chapterTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  chapterWordCount: {
    fontSize: 12,
  },
  statusIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIconText: {
    fontSize: 14,
    fontWeight: '700',
  },
  playIcon: {
    fontSize: 16,
    width: 28,
    textAlign: 'center',
  },
});

export default BookDetailScreen;
