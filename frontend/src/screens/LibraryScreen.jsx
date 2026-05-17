import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DocumentPicker from 'react-native-document-picker';
import { parseLocalBook } from '../utils/bookProcessor';
import { addBook, getAllBooks, deleteBook } from '../database/localDatabase';
import { useLibraryStore } from '../store/libraryStore';
import { useTheme } from '../utils/themeContext';

const LibraryScreen = ({ navigation }) => {
  const theme = useTheme();
  const { books, setBooks, addBook: addBookToStore, removeBook, isLoading, setLoading } = useLibraryStore();
  const [importing, setImporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [])
  );

  const loadBooks = async () => {
    try {
      setLoading(true);
      const localBooks = await getAllBooks();
      setBooks(localBooks);
    } catch (error) {
      console.error('Failed to load books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportBook = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [
          DocumentPicker.types.plainText,
          DocumentPicker.types.allFiles,
        ],
      });

      const file = result[0];
      setImporting(true);

      const filePath = file.uri;
      const fileName = file.name || 'Unknown';
      const ext = fileName.split('.').pop().toLowerCase();
      const fileType = ext === 'txt' ? 'txt' : ext;

      const bookData = await parseLocalBook(filePath, fileType);
      
      const existing = books.find(b => 
        b.title === bookData.title && b.author === bookData.author
      );
      if (existing) {
        setImporting(false);
        Alert.alert('Duplicate', `"${bookData.title}" is already in your library.`);
        return;
      }
      
      const savedBook = await addBook(bookData);
      
      addBookToStore({
        _id: savedBook._id,
        title: savedBook.title,
        author: savedBook.author,
        coverImagePath: savedBook.coverImagePath,
        fileType: savedBook.fileType,
        totalChapters: savedBook.totalChapters,
        addedAt: savedBook.addedAt.toISOString(),
        isEmotionAnalyzed: true,
      });

      Alert.alert('Success', 'Book imported successfully!');
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert('Error', `Failed to import book: ${error.message}`);
        console.error('Import error:', error);
      }
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteBook = (book) => {
    Alert.alert(
      'Delete Book',
      `Are you sure you want to delete "${book.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBook(book._id);
              removeBook(book._id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete book.');
              console.error('Delete error:', error);
            }
          },
        },
      ]
    );
  };

  const handleBookPress = (book) => {
    navigation.navigate('BookDetail', {
      bookId: book._id,
      bookTitle: book.title,
    });
  };

  const renderBookCard = useCallback(({ item }) => (
    <TouchableOpacity
      style={[styles.bookCard, { backgroundColor: theme.surface }]}
      onPress={() => handleBookPress(item)}
      onLongPress={() => handleDeleteBook(item)}
    >
      <View style={[styles.bookCover, { backgroundColor: theme.surfaceLight }]}>
        <Text style={[styles.bookInitial, { color: theme.primary }]}>
          {item.title ? item.title.charAt(0).toUpperCase() : '?'}
        </Text>
      </View>
      <Text style={[styles.bookTitle, { color: theme.text }]} numberOfLines={2}>
        {item.title || 'Untitled'}
      </Text>
      <Text style={[styles.bookAuthor, { color: theme.textSecondary }]} numberOfLines={1}>
        {item.author || 'Unknown Author'}
      </Text>
      {item.progress && item.progress.completionPercent > 0 && (
        <View style={styles.progressRow}>
          <View style={[styles.progressBarSmall, { backgroundColor: theme.surfaceLight }]}>
            <View style={[styles.progressFillSmall, { backgroundColor: theme.primary, width: `${Math.min(100, item.progress.completionPercent)}%` }]} />
          </View>
          <Text style={[styles.progressPercent, { color: theme.textMuted }]}>{Math.round(item.progress.completionPercent)}%</Text>
        </View>
      )}
    </TouchableOpacity>
  ), [theme]);

  const renderEmptyLibrary = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No books in your library</Text>
      <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
        Tap the + button to import a book
      </Text>
    </View>
  );

  const keyExtractor = useCallback((item) => item._id, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Library</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {importing ? (
        <View style={styles.importingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.importingText, { color: theme.textSecondary }]}>Importing book...</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={books}
          renderItem={renderBookCard}
          keyExtractor={keyExtractor}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyLibrary}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={handleImportBook}
        disabled={importing}
      >
        <Text style={[styles.fabIcon, { color: theme.background }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  bookCard: {
    flex: 1,
    margin: 8,
    maxWidth: '45%',
    borderRadius: 12,
    padding: 8,
  },
  bookCover: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookInitial: {
    fontSize: 48,
    fontWeight: '700',
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  fabIcon: {
    fontSize: 32,
    fontWeight: '300',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  importingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  importingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  progressBarSmall: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFillSmall: {
    height: '100%',
    borderRadius: 2,
  },
  progressPercent: {
    fontSize: 10,
    marginLeft: 4,
    minWidth: 28,
    textAlign: 'right',
  },
});

export default React.memo(LibraryScreen);