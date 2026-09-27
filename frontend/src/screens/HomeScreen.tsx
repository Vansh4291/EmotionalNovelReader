import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllBooks } from '../database/localDatabase.js';
import { useTheme } from '../utils/themeContext.js';
import BookCard from '../components/BookCard.jsx';

interface HomeScreenProps {
  navigation: any;
}

interface BookEntry {
  _id: string;
  title: string;
  author: string;
  coverImagePath: string | null;
  fileType: string;
  totalChapters: number;
  addedAt: string;
  progress: { currentChapterIndex: number; completionPercent: number } | null;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Late night reading';
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const [books, setBooks] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBooks = useCallback(async () => {
    try {
      const all = await getAllBooks();
      setBooks((all || []) as BookEntry[]);
    } catch (e) {
      if (__DEV__) console.error('[Home] load failed:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [loadBooks])
  );

  const continueReading = books.filter((b) => b.progress && b.progress.completionPercent > 0 && b.progress.completionPercent < 100);
  const recent = books.slice(0, 6);
  const greeting = getTimeGreeting();

  const renderBook = (book: BookEntry) => (
    <BookCard
      key={book._id}
      book={book}
      onPress={() => navigation.navigate('BookDetail', { bookId: book._id, bookTitle: book.title })}
    />
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBooks(); }} tintColor={theme.primary} />
      }
    >
      <Text style={[styles.greeting, { color: theme.text }]} accessibilityRole="header">
        {greeting}
      </Text>

      {books.length === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Your shelf is empty</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Import a book from the Library tab to begin.
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('Library')}
            accessibilityRole="button"
            accessibilityLabel="Go to Library"
          >
            <Text style={[styles.emptyButtonText, { color: theme.surface }]}>Go to Library</Text>
          </TouchableOpacity>
        </View>
      )}

      {continueReading.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]} accessibilityRole="header">
            CONTINUE READING
          </Text>
          {continueReading.map(renderBook)}
        </View>
      )}

      {recent.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]} accessibilityRole="header">
            RECENTLY ADDED
          </Text>
          {recent.map(renderBook)}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default HomeScreen;
