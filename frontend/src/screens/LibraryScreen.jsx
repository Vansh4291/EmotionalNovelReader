import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
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
import BookCard from '../components/BookCard';

const LibraryScreen = ({ navigation }) => {
  const theme = useTheme();
  const { books, setBooks, addBook: addBookToStore, removeBook, isLoading, setLoading } = useLibraryStore();
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState('recent'); // 'recent' | 'title' | 'progress'

  const loadBooks = useCallback(async () => {
    try {
      setLoading(true);
      const localBooks = await getAllBooks();
      setBooks(localBooks);
    } catch (error) {
      console.error('Failed to load books:', error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setBooks]);

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [loadBooks])
  );

  const filteredBooks = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    let list = books;
    if (query) {
      list = books.filter(b =>
        (b.title && b.title.toLowerCase().includes(query)) ||
        (b.author && b.author.toLowerCase().includes(query))
      );
    }
    const sorted = [...list];
    if (sortMode === 'title') {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortMode === 'progress') {
      sorted.sort((a, b) => (b.progress?.completionPercent || 0) - (a.progress?.completionPercent || 0));
    } else {
      sorted.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
    }
    return sorted;
  }, [books, searchQuery, sortMode]);

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
      // Prefer the selected-file MIME type (the shim sets this) over the
      // extension, which can be empty for simple picker results.
      const mime = file.type || '';
      const ext = (file.name || '').split('.').pop().toLowerCase();
      const fileType = mime
        ? (mime.startsWith('text/') ? 'txt' : mime.includes('/pdf') ? 'pdf' : mime.includes('epub') ? 'epub' : ext)
        : (ext === 'txt' ? 'txt' : ext);

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

  const handleDeleteBook = useCallback((book) => {
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
  }, [removeBook]);

  const handleBookPress = useCallback((book) => {
    navigation.navigate('BookDetail', {
      bookId: book._id,
      bookTitle: book.title,
    });
  }, [navigation]);

  const renderBookCard = useCallback(({ item }) => (
    <BookCard
      book={item}
      onPress={() => handleBookPress(item)}
      onLongPress={() => handleDeleteBook(item)}
    />
  ), [handleBookPress, handleDeleteBook]);

  const renderEmptyLibrary = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.surfaceLight }]}>
        <Text style={[styles.emptyIcon, { color: theme.textMuted }]} accessible={false}>+</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]} allowFontScaling>No books yet</Text>
      <Text style={[styles.emptySubtext, { color: theme.textSecondary }]} allowFontScaling>
        Tap the + button to import a TXT, PDF or EPUB file
      </Text>
    </View>
  );

  const renderEmptySearch = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No results found</Text>
      <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
        Try a different search term
      </Text>
    </View>
  );

  const keyExtractor = useCallback((item) => item._id, []);

  const showLoadingOverlay = importing || isLoading;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Library</Text>
        <Pressable
          style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.6 }]}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={[styles.settingsIcon, { color: theme.textSecondary }]}>{'\u2699'}</Text>
        </Pressable>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.surfaceLight }]}>
          <Text style={[styles.searchIcon, { color: theme.textMuted }]} accessible={false}>
            {'\u2315'}
          </Text>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search by title or author..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search library"
          />
          {searchQuery.length > 0 && books.length > 0 && (
            <Text style={[styles.resultCount, { color: theme.textMuted }]}>
              {filteredBooks.length}
            </Text>
          )}
        </View>
        <View style={styles.sortRow}>
          {[
            { key: 'recent', label: 'Recent' },
            { key: 'title', label: 'Title' },
            { key: 'progress', label: 'Progress' },
          ].map(({ key, label }) => (
            <Pressable
              key={key}
              style={({ pressed }) => [
                styles.sortChip,
                { backgroundColor: sortMode === key ? theme.primary : theme.surfaceLight },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => setSortMode(key)}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${label}`}
              accessibilityState={{ selected: sortMode === key }}
            >
              <Text
                style={[styles.sortChipText, { color: sortMode === key ? theme.surface : theme.textSecondary }]}
                allowFontScaling
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {showLoadingOverlay ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          {importing && (
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Importing book…
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          renderItem={renderBookCard}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            filteredBooks.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={searchQuery ? renderEmptySearch : renderEmptyLibrary}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}

      <Pressable
        style={({ pressed }) => [styles.fab, { backgroundColor: theme.primary }, pressed && !importing && { opacity: 0.85 }]}
        onPress={handleImportBook}
        disabled={importing}
        accessibilityRole="button"
        accessibilityLabel="Import book"
        accessibilityHint="Opens the document picker to import a TXT, PDF or EPUB file"
      >
        <Text style={[styles.fabIcon, { color: theme.surface }]} accessible={false}>+</Text>
      </Pressable>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 24,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  resultCount: {
    fontSize: 12,
    marginLeft: 8,
  },
  sortRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  sortChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    minHeight: 36,
    justifyContent: 'center',
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 8px rgba(0,0,0,0.25)',
  },
  fabIcon: {
    fontSize: 34,
    fontWeight: '300',
    lineHeight: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 40,
    fontWeight: '300',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default React.memo(LibraryScreen);
