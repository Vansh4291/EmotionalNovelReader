import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../utils/themeContext';

const PlayerHeader = ({ title, subtitle, onBack, onBookmarks, onSleepTimer }) => {
  const theme = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: theme.surface }]}>
      <Pressable style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]} onPress={onBack}>
        <Text style={[styles.backButtonText, { color: theme.text }]}>←</Text>
      </Pressable>
      <View style={styles.headerInfo}>
        <Text style={[styles.bookTitleLabel, { color: theme.text }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.chapterTitleLabel, { color: theme.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Pressable style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]} onPress={onBookmarks}>
        <Text style={styles.headerIcon}>🔖</Text>
      </Pressable>
      <Pressable style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]} onPress={onSleepTimer}>
        <Text style={styles.headerIcon}>😴</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  backButton: { marginRight: 12 },
  backButtonText: { fontSize: 24 },
  headerInfo: { flex: 1 },
  bookTitleLabel: { fontSize: 16, fontWeight: '600' },
  chapterTitleLabel: { fontSize: 13, marginTop: 2 },
  headerButton: { marginLeft: 16, padding: 4 },
  headerIcon: { fontSize: 22 },
});

export default PlayerHeader;
