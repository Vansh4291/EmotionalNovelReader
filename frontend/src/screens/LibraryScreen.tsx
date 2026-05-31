import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { NarrativeThemeEngine, NarrativeTheme } from '../theme/NarrativeThemeEngine';
import { buildTypography, NarrativeTypography } from '../theme/NarrativeTypography';
import { NarrativeIdentityEngine, NarrativeFingerprint } from '../core/narration/NarrativeIdentityEngine';
import { NarrativeMemoryPersistence, NarrativeMemory } from '../core/narration/NarrativeMemoryPersistence';
import { EmotionType } from '../core/types';
import { EventGovernor } from '../core/events/EventGovernor';

interface LibraryScreenProps {
  navigation: any;
  route?: any;
}

interface EmotionalGroup {
  id: string;
  label: string;
  description: string;
  books: BookItem[];
}

interface BookItem {
  bookId: string;
  title: string;
  emotion: EmotionType;
  fingerprint: NarrativeFingerprint | null;
  memory: NarrativeMemory | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 60) / 2;

const GOVERNOR = new EventGovernor();

const EMOTION_GROUPS: Record<string, {
  label: string;
  description: string;
  matcher: (fp: NarrativeFingerprint) => boolean;
}> = {
  warm: {
    label: 'Warm Worlds',
    description: 'Stories that carry gentle light.',
    matcher: (fp) => fp.emotionalSignature.warmthIndex > 0.3,
  },
  heavy: {
    label: 'Heavy Stories',
    description: 'Where weight settles quietly.',
    matcher: (fp) => fp.emotionalSignature.melancholyIndex > 0.3,
  },
  quiet: {
    label: 'Quiet Journeys',
    description: 'Stillness speaks softly.',
    matcher: (fp) => fp.pacingSignature.stillnessPreference > 0.4,
  },
  storm: {
    label: 'Storms',
    description: 'Where tension gathers.',
    matcher: (fp) => fp.emotionalSignature.tensionIndex > 0.3,
  },
  dialogue: {
    label: 'Voices',
    description: 'Stories shaped by conversation.',
    matcher: (fp) => fp.dialogueIntensity.dialoguePercentage > 0.4,
  },
  unfinished: {
    label: 'Unfinished Echoes',
    description: 'Waiting to be continued.',
    matcher: (fp) => true,
  },
};

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  navigation,
  route,
}) => {
  const [theme, setTheme] = useState<NarrativeTheme>(
    new NarrativeThemeEngine().getTheme('neutral')
  );
  const typography = useMemo(() => buildTypography(theme), [theme]);

  const [groups, setGroups] = useState<EmotionalGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      const persistence = new NarrativeMemoryPersistence(GOVERNOR);
      const identityEngine = new NarrativeIdentityEngine(GOVERNOR);
      const allMemories = await persistence.getAllMemories();

      const books: BookItem[] = allMemories.map((memory) => ({
        bookId: memory.bookId,
        title: `Book ${memory.bookId.slice(-4)}`,
        emotion: memory.emotion,
        fingerprint: identityEngine.getFingerprint(memory.bookId),
        memory,
      }));

      const emotionalGroups = buildEmotionalGroups(books);
      setGroups(emotionalGroups);
    } catch (e) {
      console.error('Failed to load library:', e);
    }
  };

  const buildEmotionalGroups = (books: BookItem[]): EmotionalGroup[] => {
    const result: EmotionalGroup[] = [];
    const assigned = new Set<string>();

    for (const [groupId, config] of Object.entries(EMOTION_GROUPS)) {
      const matchingBooks = books.filter((book) => {
        if (assigned.has(book.bookId)) return false;
        if (!book.fingerprint) return groupId === 'unfinished';
        if (groupId === 'unfinished') return false;
        return config.matcher(book.fingerprint);
      });

      if (matchingBooks.length > 0) {
        result.push({
          id: groupId,
          label: config.label,
          description: config.description,
          books: matchingBooks,
        });
        matchingBooks.forEach((b) => assigned.add(b.bookId));
      }
    }

    const unassigned = books.filter((b) => !assigned.has(b.bookId));
    if (unassigned.length > 0) {
      result.push({
        id: 'other',
        label: 'Other Stories',
        description: 'Finding their place.',
        books: unassigned,
      });
    }

    return result;
  };

  const displayGroups = selectedGroup
    ? groups.filter((g) => g.id === selectedGroup)
    : groups;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[typography.ui.heading, { color: theme.colors.text }]}>
            Library
          </Text>
          <Text style={[typography.ui.caption, { color: theme.colors.textMuted, marginTop: theme.spacing.xs }]}>
            Stories organized by feeling
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterContainer}
        >
          <TouchableOpacity
            onPress={() => setSelectedGroup(null)}
            style={[
              styles.filterChip,
              {
                backgroundColor: !selectedGroup ? theme.colors.accent : theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[
              typography.ui.caption,
              { color: !selectedGroup ? theme.colors.background : theme.colors.textSecondary }
            ]}>
              All
            </Text>
          </TouchableOpacity>
          {groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              onPress={() => setSelectedGroup(group.id)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedGroup === group.id ? theme.colors.accent : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[
                typography.ui.caption,
                { color: selectedGroup === group.id ? theme.colors.background : theme.colors.textSecondary }
              ]}>
                {group.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {displayGroups.map((group) => (
          <View key={group.id} style={styles.groupSection}>
            <Text style={[typography.ui.subheading, { color: theme.colors.text, marginBottom: theme.spacing.xs }]}>
              {group.label}
            </Text>
            <Text style={[typography.ui.caption, { color: theme.colors.textMuted, marginBottom: theme.spacing.md }]}>
              {group.description}
            </Text>
            <View style={styles.bookGrid}>
              {group.books.map((book) => (
                <TouchableOpacity
                  key={book.bookId}
                  style={[
                    styles.bookCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => navigation.navigate('StorySpace', { bookId: book.bookId })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.bookAtmosphere, {
                    backgroundColor: getEmotionColor(book.emotion, theme),
                  }]} />
                  <View style={styles.bookCardContent}>
                    <Text style={[typography.ui.caption, { color: theme.colors.text }]} numberOfLines={2}>
                      {book.title}
                    </Text>
                    {book.fingerprint && (
                      <Text style={[typography.ui.tiny, { color: theme.colors.textMuted, marginTop: theme.spacing.xs }]}>
                        {formatPacing(book.fingerprint.pacingSignature.averageWPM)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

function getEmotionColor(emotion: EmotionType, theme: NarrativeTheme): string {
  const colors: Record<EmotionType, string> = {
    joy: 'rgba(212, 168, 83, 0.15)',
    sadness: 'rgba(107, 125, 179, 0.15)',
    anger: 'rgba(196, 122, 90, 0.15)',
    fear: 'rgba(122, 143, 160, 0.15)',
    surprise: 'rgba(160, 140, 192, 0.15)',
    neutral: 'rgba(160, 160, 160, 0.08)',
  };
  return colors[emotion] || colors.neutral;
}

function formatPacing(wpm: number): string {
  if (wpm < 120) return 'Slow';
  if (wpm < 160) return 'Moderate';
  if (wpm < 200) return 'Brisk';
  return 'Fast';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 24,
  },
  filterContainer: {
    marginBottom: 24,
  },
  filterRow: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  groupSection: {
    marginBottom: 32,
  },
  bookGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bookCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  bookAtmosphere: {
    height: 4,
  },
  bookCardContent: {
    padding: 16,
  },
});

export default LibraryScreen;
