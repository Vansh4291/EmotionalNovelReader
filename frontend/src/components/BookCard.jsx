import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

const BookCard = ({ book, onPress, onLongPress }) => {
  const initial = book?.title?.charAt(0)?.toUpperCase() || '?';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.cover}>
        {book.coverImagePath ? (
          <Image
            source={{ uri: book.coverImagePath }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.initial}>{initial}</Text>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {book.title || 'Untitled'}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {book.author || 'Unknown Author'}
        </Text>
        {book.fileType && (
          <Text style={styles.fileType}>{book.fileType.toUpperCase()}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 8,
    maxWidth: '45%',
  },
  cover: {
    width: '100%',
    aspectRatio: 0.7,
    backgroundColor: '#2d3a5c',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  initial: {
    fontSize: 48,
    fontWeight: '700',
    color: '#4ade80',
  },
  info: {
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  author: {
    fontSize: 12,
    color: '#a0aec0',
    marginBottom: 2,
  },
  fileType: {
    fontSize: 10,
    color: '#4ade80',
    fontWeight: '600',
  },
});

export default BookCard;