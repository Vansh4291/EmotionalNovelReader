import React, { useState, useEffect, useCallback } from 'react';
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
import RNFS from 'react-native-fs';
import axios from 'axios';
import { useLibraryStore } from '../store/libraryStore';

const BACKEND_URL = 'http://localhost:3000/api';

const LibraryScreen = ({ navigation }) => {
  const { books, setBooks, addBook, removeBook, isLoading, setLoading } = useLibraryStore();
  const [importing, setImporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [])
  );

  const loadBooks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/books`);
      setBooks(response.data);
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

      const formData = new FormData();
      formData.append('book', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      });

      const response = await axios.post(
        `${BACKEND_URL}/books/import`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        addBook(response.data.book);
        Alert.alert('Success', 'Book imported successfully!');
      }
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
              await axios.delete(`${BACKEND_URL}/books/${book._id}`);
              removeBook(book._id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete book.');
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

  const renderBookCard = ({ item }) => (
    <TouchableOpacity
      style={styles.bookCard}
      onPress={() => handleBookPress(item)}
      onLongPress={() => handleDeleteBook(item)}
    >
      <View style={styles.bookCover}>
        <Text style={styles.bookInitial}>
          {item.title ? item.title.charAt(0).toUpperCase() : '?'}
        </Text>
      </View>
      <Text style={styles.bookTitle} numberOfLines={2}>
        {item.title || 'Untitled'}
      </Text>
      <Text style={styles.bookAuthor} numberOfLines={1}>
        {item.author || 'Unknown Author'}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyLibrary = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No books in your library</Text>
      <Text style={styles.emptySubtext}>
        Tap the + button to import a book
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Library</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {importing ? (
        <View style={styles.importingContainer}>
          <ActivityIndicator size="large" color="#4ade80" />
          <Text style={styles.importingText}>Importing book...</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ade80" />
        </View>
      ) : (
        <FlatList
          data={books}
          renderItem={renderBookCard}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyLibrary}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={handleImportBook}
        disabled={importing}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1a1a2e',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
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
  },
  bookCover: {
    width: '100%',
    aspectRatio: 0.7,
    backgroundColor: '#2d3a5c',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookInitial: {
    fontSize: 48,
    fontWeight: '700',
    color: '#4ade80',
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#a0aec0',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4ade80',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 32,
    color: '#1a1a2e',
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
    color: '#a0aec0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#a0aec0',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#718096',
  },
});

export default LibraryScreen;