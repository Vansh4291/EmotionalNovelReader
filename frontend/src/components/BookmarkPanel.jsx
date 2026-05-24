import React from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../utils/themeContext';

const BookmarkPanel = ({
  bookmarks,
  visible,
  onJumpToBookmark,
  onDeleteBookmark,
  onClose,
  theme: themeProp,
}) => {
  const contextTheme = useTheme();
  const theme = themeProp || contextTheme;

  if (!visible) return null;

  const renderBookmark = ({ item: bm }) => (
    <Pressable
      style={({ pressed }) => [styles.bookmarkItem, { borderBottomColor: theme.border }, pressed && { opacity: 0.7 }]}
      onPress={() => onJumpToBookmark(bm)}
    >
      <Text style={[styles.bookmarkText, { color: theme.text }]}>
        Ch {bm.chapterIndex + 1} · Sentence {bm.sentenceIndex + 1}
      </Text>
      {bm.note ? <Text style={[styles.bookmarkNote, { color: theme.textSecondary }]}>{bm.note}</Text> : null}
      <Pressable style={({ pressed }) => [pressed && { opacity: 0.7 }]} onPress={() => onDeleteBookmark(bm._id)}>
        <Text style={styles.deleteBookmarkBtn}>✕</Text>
      </Pressable>
    </Pressable>
  );

  return (
    <View style={[styles.bookmarksOverlay, { backgroundColor: theme.surface }]}>
      <View style={styles.bookmarksHeader}>
        <Text style={[styles.bookmarksTitle, { color: theme.text }]}>Bookmarks</Text>
        <Pressable style={({ pressed }) => [pressed && { opacity: 0.7 }]} onPress={onClose}>
          <Text style={[styles.bookmarksClose, { color: theme.textSecondary }]}>Close</Text>
        </Pressable>
      </View>
      {bookmarks.length === 0 ? (
        <Text style={[styles.noBookmarksText, { color: theme.textMuted }]}>No bookmarks yet</Text>
      ) : (
        <FlatList
          data={bookmarks}
          renderItem={renderBookmark}
          keyExtractor={(item) => String(item._id)}
          style={styles.bookmarksList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bookmarksOverlay: {
    position: 'absolute',
    boxShadow: '0 -2px 4px rgba(0,0,0,0.1)',
    top: 80,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 16,
    zIndex: 100,
    maxHeight: 300,
  },
  bookmarksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bookmarksTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  bookmarksClose: {
    fontSize: 16,
  },
  noBookmarksText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  bookmarkItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookmarkText: {
    flex: 1,
    fontSize: 14,
  },
  bookmarkNote: {
    fontSize: 12,
    marginLeft: 8,
  },
  deleteBookmarkBtn: {
    fontSize: 16,
    color: '#ef4444',
    paddingLeft: 8,
  },
  bookmarksList: {
    maxHeight: 240,
  },
});

export default BookmarkPanel;
