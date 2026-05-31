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
import { useNarration } from '../core/useNarration';
import { EmotionType } from '../core/types';
import { NarrativeWeatherSystem, WeatherState } from '../core/narration/NarrativeWeatherSystem';
import { NarrativeMemoryPersistence, NarrativeMemory } from '../core/narration/NarrativeMemoryPersistence';
import { EventGovernor } from '../core/events/EventGovernor';

interface HomeScreenProps {
  navigation: any;
}

interface MemoryFragment {
  bookId: string;
  bookTitle: string;
  text: string;
  emotion: EmotionType;
  timestamp: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GOVERNOR = new EventGovernor();

const TIME_GREETINGS: Record<string, string> = {
  morning: 'The morning light settles gently.',
  afternoon: 'The afternoon stretches quietly.',
  evening: 'Evening draws the curtains close.',
  night: 'The night holds its breath.',
};

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getEmotionalGreeting(emotion: EmotionType, weather: WeatherState | null): string {
  if (!weather) return '';

  const timeOfDay = TIME_GREETINGS[getTimeOfDay()] || '';

  if (weather.temperature < 0.3) {
    return `${timeOfDay} The air feels still.`;
  }
  if (weather.temperature > 0.7) {
    return `${timeOfDay} A quiet warmth lingers.`;
  }

  return timeOfDay;
}

function formatTimeSince(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  navigation,
}) => {
  const [theme, setTheme] = useState<NarrativeTheme>(
    new NarrativeThemeEngine().getTheme('neutral')
  );
  const typography = useMemo(() => buildTypography(theme), [theme]);

  const [recentBooks, setRecentBooks] = useState<NarrativeMemory[]>([]);
  const [weather, setWeather] = useState<WeatherState | null>(null);

  const themeEngine = useMemo(() => new NarrativeThemeEngine(), []);

  useEffect(() => {
    loadRecentBooks();
  }, []);

  const loadRecentBooks = async () => {
    try {
      const persistence = new NarrativeMemoryPersistence(GOVERNOR);
      const memories = await persistence.getRecentBooks(5);
      setRecentBooks(memories);
    } catch (e) {
      console.error('Failed to load recent books:', e);
    }
  };

  const continueJourney = recentBooks[0];

  const memoryFragments: MemoryFragment[] = recentBooks.slice(1, 4).map((book) => ({
    bookId: book.bookId,
    bookTitle: `Chapter ${book.sceneSnapshots[book.sceneSnapshots.length - 1]?.sceneIndex || 1}`,
    text: buildMemoryText(book),
    emotion: book.emotion,
    timestamp: book.timestamp,
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingSection}>
          <Text style={[typography.ui.caption, { color: theme.colors.textMuted }]}>
            {getEmotionalGreeting(recentBooks[0]?.emotion || 'neutral', weather)}
          </Text>
        </View>

        {continueJourney && (
          <TouchableOpacity
            style={[
              styles.continueCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => navigation.navigate('Player', {
              bookId: continueJourney.bookId,
              chapterIndex: continueJourney.sceneSnapshots[continueJourney.sceneSnapshots.length - 1]?.sceneIndex,
              sentenceIndex: 0,
            })}
            activeOpacity={0.8}
          >
            <View style={styles.continueCardContent}>
              <Text style={[typography.ui.tiny, { color: theme.colors.textMuted, marginBottom: theme.spacing.xs }]}>
                Continue Journey
              </Text>
              <Text style={[typography.ui.subheading, { color: theme.colors.text, marginBottom: theme.spacing.sm }]}>
                {getAtmosphericDescription(continueJourney)}
              </Text>
              <View style={styles.continueMeta}>
                <Text style={[typography.ui.tiny, { color: theme.colors.textMuted }]}>
                  {formatTimeSince(continueJourney.timestamp)}
                </Text>
                <View style={[styles.emotionDot, { backgroundColor: theme.colors.accent }]} />
              </View>
            </View>
            <View style={[styles.continueAtmosphere, { backgroundColor: theme.colors.emotionMuted }]} />
          </TouchableOpacity>
        )}

        {!continueJourney && (
          <View style={styles.emptyState}>
            <Text style={[typography.ui.body, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
              No stories yet.
            </Text>
            <Text style={[typography.ui.caption, { color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.sm }]}>
              Import a book to begin your journey.
            </Text>
          </View>
        )}

        {memoryFragments.length > 0 && (
          <View style={styles.section}>
            <Text style={[typography.ui.label, { color: theme.colors.textMuted, marginBottom: theme.spacing.md }]}>
              Moments That Lingered
            </Text>
            {memoryFragments.map((fragment, index) => (
              <TouchableOpacity
                key={`${fragment.bookId}_${index}`}
                style={[
                  styles.fragmentCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderLeftColor: theme.colors.accent,
                  },
                ]}
                onPress={() => navigation.navigate('Player', { bookId: fragment.bookId })}
              >
                <Text style={[typography.story, { color: theme.colors.textSecondary, fontStyle: 'italic' }]}>
                  "{fragment.text}"
                </Text>
                <Text style={[typography.ui.tiny, { color: theme.colors.textMuted, marginTop: theme.spacing.xs }]}>
                  {formatTimeSince(fragment.timestamp)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {weather && (
          <View style={styles.section}>
            <Text style={[typography.ui.label, { color: theme.colors.textMuted, marginBottom: theme.spacing.md }]}>
              Narrative Weather
            </Text>
            <View style={[styles.weatherCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.weatherRow}>
                <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>
                  Atmosphere
                </Text>
                <Text style={[typography.ui.caption, { color: theme.colors.accent }]}>
                  {formatSeason(weather.season)}
                </Text>
              </View>
              <View style={styles.weatherBar}>
                <View style={[styles.weatherIndicator, {
                  width: `${weather.temperature * 100}%`,
                  backgroundColor: theme.colors.accent,
                }]} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

function getAtmosphericDescription(memory: NarrativeMemory): string {
  const greetings: Record<string, string> = {
    joy: 'A warm feeling lingers here.',
    sadness: 'The quiet weight remains.',
    anger: 'The fire has not yet faded.',
    fear: 'Shadows still touch the edges.',
    surprise: 'Something shifted unexpectedly.',
    neutral: 'The story continues quietly.',
  };

  return greetings[memory.emotion] || 'The story awaits.';
}

function buildMemoryText(memory: NarrativeMemory): string {
  const lastScene = memory.sceneSnapshots[memory.sceneSnapshots.length - 1];
  if (!lastScene) return 'A moment remembered.';

  const texts: Record<string, string> = {
    joy: 'A moment of light was felt here.',
    sadness: 'The weight settled gently.',
    anger: 'Tension gathered in this place.',
    fear: 'Something stirred in the silence.',
    surprise: 'The world turned unexpectedly.',
    neutral: 'A quiet breath was taken.',
  };

  return texts[memory.emotion] || 'A moment was felt.';
}

function formatSeason(season: string): string {
  const names: Record<string, string> = {
    spring: 'Gentle warmth',
    summer: 'Bright clarity',
    autumn: 'Gathering weight',
    winter: 'Quiet stillness',
    thaw: 'Slow return',
    storm: 'Rising tension',
    stillness: 'Deep calm',
  };
  return names[season] || 'Quiet';
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
  greetingSection: {
    marginBottom: 32,
  },
  continueCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
    borderWidth: 1,
  },
  continueCardContent: {
    padding: 24,
  },
  continueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emotionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  continueAtmosphere: {
    height: 4,
  },
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  section: {
    marginBottom: 32,
  },
  fragmentCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 2,
  },
  weatherCard: {
    padding: 16,
    borderRadius: 12,
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weatherBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  weatherIndicator: {
    height: '100%',
    borderRadius: 2,
  },
});

export default HomeScreen;
