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
import axios from 'axios';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';

const BACKEND_URL = 'http://localhost:3000/api';

const BookDetailScreen = ({ route, navigation }) => {
  const { bookId } = route.params;
  const { books } = useLibraryStore();
  const { setCurrentBook, setCurrentChapter, setCurrentSentence } = usePlayerStore();
  
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
      const [bookResponse, progressResponse] = await Promise.all([
        axios.get(`${BACKEND_URL}/books/${bookId}`),
        axios.get(`${BACKEND_URL}/progress/${bookId}`).catch(() => ({ data: null })),
      ]);
      
      setBook(bookResponse.data);
      setChapters(bookResponse.data.chapters || []);
      setProgress(progressResponse.data);
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
      style={styles.chapterItem}
      onPress={() => handleChapterPress(item, index)}
    >
      <Text style={styles.chapterNumber}>Ch {index + 1}</Text>
      <Text style={styles.chapterTitle} numberOfLines={2}>
        {item.title || `Chapter ${index + 1}`}
      </Text>
      <Text style={styles.chapterWordCount}>
        {item.wordCount || 0} words
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ade80" />
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Book not found</Text>
      </View>
    );
  }

  const completionPercent = progress?.completionPercent || 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.bookInfo}>
          <View style={styles.bookCover}>
            <Text style={styles.bookInitial}>
              {book.title ? book.title.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <View style={styles.bookDetails}>
            <Text style={styles.bookTitle}>{book.title}</Text>
            <Text style={styles.bookAuthor}>{book.author || 'Unknown Author'}</Text>
            <Text style={styles.bookStats}>
              {chapters.length} chapters
            </Text>
          </View>
        </View>

        {completionPercent > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {Math.round(completionPercent)}% complete
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.listenButton}
          onPress={handleStartListening}
        >
          <Text style={styles.listenButtonText}>🎧 Start Listening</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Chapters</Text>

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
    backgroundColor: '#16213e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16213e',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16213e',
  },
  errorText: {
    fontSize: 18,
    color: '#a0aec0',
  },
  header: {
    backgroundColor: '#1a1a2e',
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
    backgroundColor: '#2d3a5c',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInitial: {
    fontSize: 36,
    fontWeight: '700',
    color: '#4ade80',
  },
  bookDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#a0aec0',
    marginBottom: 8,
  },
  bookStats: {
    fontSize: 12,
    color: '#718096',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#2d3a5c',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ade80',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 4,
  },
  listenButton: {
    backgroundColor: '#4ade80',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  listenButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    padding: 16,
    paddingBottom: 8,
  },
  chapterList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  chapterItem: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  chapterNumber: {
    fontSize: 12,
    color: '#4ade80',
    fontWeight: '600',
    marginBottom: 4,
  },
  chapterTitle: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
  },
  chapterWordCount: {
    fontSize: 12,
    color: '#718096',
  },
});

export default BookDetailScreen;