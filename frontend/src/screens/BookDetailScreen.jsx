import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getBookById, getOrCreateProgress } from '../database/localDatabase';
import { usePlayerStore } from '../store/playerStore';
import { useTheme } from '../utils/themeContext';

const BookDetailScreen = ({ route, navigation }) => {
  const { bookId } = route.params;
  const { setCurrentBook, setCurrentChapter, setCurrentSentence } = usePlayerStore();
  const theme = useTheme();
  
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadBookDetails();
    }, [bookId])
  );

  const loadBookDetails = async () => {
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
      console.error('Failed to load book:', error);
      Alert.alert('Error', 'Failed to load book details.');
    } finally {
      setLoading(false);
    }
  };

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

  const renderChapterItem = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.chapterItem, { backgroundColor: theme.surface }]}
      onPress={() => handleChapterPress(item, index)}
    >
      <Text style={[styles.chapterNumber, { color: theme.primary }]}>Ch {index + 1}</Text>
      <Text style={[styles.chapterTitle, { color: theme.text }]} numberOfLines={2}>
        {item.title || `Chapter ${index + 1}`}
      </Text>
      <Text style={[styles.chapterWordCount, { color: theme.textMuted }]}>
        {item.wordCount || 0} words
      </Text>
    </TouchableOpacity>
  );

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

  const completionPercent = progress?.completionPercent || 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.bookInfo}>
          <View style={[styles.bookCover, { backgroundColor: theme.surfaceLight }]}>
            <Text style={[styles.bookInitial, { color: theme.primary }]}>
              {book.title ? book.title.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <View style={styles.bookDetails}>
            <Text style={[styles.bookTitle, { color: theme.text }]}>{book.title}</Text>
            <Text style={[styles.bookAuthor, { color: theme.textSecondary }]}>{book.author || 'Unknown Author'}</Text>
            <Text style={[styles.bookStats, { color: theme.textMuted }]}>
              {chapters.length} chapters
            </Text>
          </View>
        </View>

        {completionPercent > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.surfaceLight }]}>
              <View style={[styles.progressFill, { width: `${completionPercent}%`, backgroundColor: theme.primary }]} />
            </View>
            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
              {Math.round(completionPercent)}% complete
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.listenButton, { backgroundColor: theme.primary }]}
          onPress={handleStartListening}
        >
          <Text style={[styles.listenButtonText, { color: theme.background }]}>🎧 Start Listening</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Chapters</Text>

      <FlatList
        data={chapters}
        renderItem={renderChapterItem}
        keyExtractor={(item, index) => `chapter-${index}`}
        contentContainerStyle={styles.chapterList}
      />
    </View>
  );
};

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
  header: {
    padding: 16,
    paddingTop: 8,
  },
  bookInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInitial: {
    fontSize: 36,
    fontWeight: '700',
  },
  bookDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    marginBottom: 8,
  },
  bookStats: {
    fontSize: 12,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    marginTop: 4,
  },
  listenButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  listenButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
    paddingBottom: 8,
  },
  chapterList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  chapterItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  chapterNumber: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  chapterTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  chapterWordCount: {
    fontSize: 12,
  },
});

export default BookDetailScreen;