import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { NarrativeThemeEngine, NarrativeTheme } from '../theme/NarrativeThemeEngine';
import { buildTypography, NarrativeTypography } from '../theme/NarrativeTypography';
import { NarrativeMemoryPersistence, NarrativeMemory } from '../core/narration/NarrativeMemoryPersistence';
import { EmotionType } from '../core/types';
import { EventGovernor } from '../core/events/EventGovernor';

interface JourneyScreenProps {
  navigation: any;
  route?: any;
}

interface TimelineEntry {
  period: string;
  description: string;
  books: NarrativeMemory[];
  dominantEmotion: EmotionType;
}

const GOVERNOR = new EventGovernor();

const EMOTION_DESCRIPTIONS: Record<EmotionType, string> = {
  joy: 'warmth and light',
  sadness: 'quiet weight',
  anger: 'building fire',
  fear: 'gathering shadows',
  surprise: 'unexpected turns',
  neutral: 'stillness',
};

export const JourneyScreen: React.FC<JourneyScreenProps> = ({
  navigation,
  route,
}) => {
  const [theme] = useState<NarrativeTheme>(
    new NarrativeThemeEngine().getTheme('neutral')
  );
  const typography = useMemo(() => buildTypography(theme), [theme]);

  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [totalListening, setTotalListening] = useState(0);
  const [totalBooks, setTotalBooks] = useState(0);

  useEffect(() => {
    loadJourney();
  }, []);

  const loadJourney = async () => {
    try {
      const persistence = new NarrativeMemoryPersistence(GOVERNOR);
      const allMemories = await persistence.getAllMemories();

      setTotalBooks(allMemories.length);
      setTotalListening(
        allMemories.reduce((sum, m) => sum + m.listening.totalSeconds, 0)
      );

      const entries = buildTimeline(allMemories);
      setTimeline(entries);
    } catch (e) {
      console.error('Failed to load journey:', e);
    }
  };

  const buildTimeline = (memories: NarrativeMemory[]): TimelineEntry[] => {
    if (memories.length === 0) return [];

    const sorted = [...memories].sort((a, b) => b.timestamp - a.timestamp);
    const entries: TimelineEntry[] = [];

    const now = Date.now();
    const dayMs = 86400000;

    const periods = [
      { label: 'Tonight', maxAge: dayMs },
      { label: 'This Week', maxAge: dayMs * 7 },
      { label: 'This Month', maxAge: dayMs * 30 },
      { label: 'Earlier', maxAge: Infinity },
    ];

    for (const period of periods) {
      const periodBooks = sorted.filter((m) => {
        const age = now - m.timestamp;
        return age < period.maxAge;
      });

      if (periodBooks.length > 0) {
        const dominantEmotion = getMostFrequentEmotion(periodBooks);
        entries.push({
          period: period.label,
          description: buildPeriodDescription(period.label, periodBooks, dominantEmotion),
          books: periodBooks,
          dominantEmotion,
        });
      }
    }

    return entries;
  };

  const getMostFrequentEmotion = (books: NarrativeMemory[]): EmotionType => {
    const counts = new Map<EmotionType, number>();
    for (const book of books) {
      counts.set(book.emotion, (counts.get(book.emotion) || 0) + 1);
    }
    let dominant: EmotionType = 'neutral';
    let max = 0;
    for (const [emotion, count] of counts) {
      if (count > max) {
        max = count;
        dominant = emotion;
      }
    }
    return dominant;
  };

  const buildPeriodDescription = (
    period: string,
    books: NarrativeMemory[],
    emotion: EmotionType
  ): string => {
    const count = books.length;
    const emotionWord = EMOTION_DESCRIPTIONS[emotion];

    if (period === 'Tonight') {
      return `You've been exploring stories of ${emotionWord}.`;
    }
    if (period === 'This Week') {
      return `${count} stories touched by ${emotionWord}.`;
    }
    if (period === 'This Month') {
      return `A month of ${emotionWord} narratives.`;
    }
    return `Earlier journeys through ${emotionWord}.`;
  };

  const formatListeningTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[typography.ui.heading, { color: theme.colors.text }]}>
            Journey
          </Text>
          <Text style={[typography.ui.caption, { color: theme.colors.textMuted, marginTop: theme.spacing.xs }]}>
            Your emotional reading history
          </Text>
        </View>

        <View style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.statRow}>
            <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>
              Stories explored
            </Text>
            <Text style={[typography.ui.body, { color: theme.colors.accent }]}>
              {totalBooks}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.statRow}>
            <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>
              Time spent
            </Text>
            <Text style={[typography.ui.body, { color: theme.colors.accent }]}>
              {formatListeningTime(totalListening)}
            </Text>
          </View>
        </View>

        {timeline.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[typography.ui.body, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
              No stories yet.
            </Text>
            <Text style={[typography.ui.caption, { color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.sm }]}>
              Your journey begins with the first page.
            </Text>
          </View>
        )}

        {timeline.map((entry, index) => (
          <View key={entry.period} style={styles.timelineSection}>
            <View style={styles.timelineHeader}>
              <View style={[styles.timelineDot, { backgroundColor: theme.colors.accent }]} />
              <Text style={[typography.ui.subheading, { color: theme.colors.text }]}>
                {entry.period}
              </Text>
            </View>
            <Text style={[typography.ui.caption, { color: theme.colors.textSecondary, marginBottom: theme.spacing.md, marginLeft: 12 }]}>
              {entry.description}
            </Text>
            {entry.books.map((book) => (
              <TouchableOpacity
                key={book.bookId}
                style={[
                  styles.bookEntry,
                  {
                    backgroundColor: theme.colors.surface,
                    borderLeftColor: theme.colors.accent,
                  },
                ]}
                onPress={() => navigation.navigate('Player', { bookId: book.bookId })}
              >
                <Text style={[typography.ui.caption, { color: theme.colors.text }]}>
                  {getMemoryGreeting(book)}
                </Text>
                <Text style={[typography.ui.tiny, { color: theme.colors.textMuted, marginTop: theme.spacing.xs }]}>
                  {book.listening.sessionCount} sessions
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

function getMemoryGreeting(memory: NarrativeMemory): string {
  const greetings: Record<string, string> = {
    joy: 'A warm moment was felt here.',
    sadness: 'Quiet weight was carried.',
    anger: 'Fire gathered in this place.',
    fear: 'Shadows touched the edges.',
    surprise: 'The world turned unexpectedly.',
    neutral: 'A quiet breath was taken.',
  };
  return greetings[memory.emotion] || 'A story was felt.';
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
  statsCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  timelineSection: {
    marginBottom: 32,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bookEntry: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    marginLeft: 12,
    borderLeftWidth: 2,
  },
});

export default JourneyScreen;
