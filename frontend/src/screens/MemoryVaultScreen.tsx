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
import { buildTypography } from '../theme/NarrativeTypography';
import {
  NarrativeMemory,
  NarrativeMemoryPersistence,
} from '../core/narration/NarrativeMemoryPersistence';
import { EmotionType } from '../core/types';
import { EventGovernor } from '../core/events/EventGovernor';
import { spacing, atmosphereOpacity } from '../design';

interface MemoryVaultScreenProps {
  navigation: any;
  route?: any;
}

interface ArchiveMoment {
  bookId: string;
  bookName: string;
  text: string;
  emotion: EmotionType;
  weather: string;
  moment: string;
  timestamp: number;
  intensity: number;
}

const GOVERNOR = new EventGovernor();

const MOMENT_VOICES: Record<EmotionType, string[]> = {
  joy: [
    'A moment of warmth stayed.',
    'The light lingered here.',
    'A small brightness returned to you.',
    'Something was savored in passing.',
  ],
  sadness: [
    'The weight settled gently.',
    'A quiet ache was held here.',
    'You paused in the soft dark.',
    'The story grew heavier for a while.',
  ],
  anger: [
    'The fire left its mark.',
    'Heat still lingers in the page.',
    'Tension was carried briefly.',
    'The words burned low.',
  ],
  fear: [
    'The shadows still breathe.',
    'Dread left its echo here.',
    'You stepped back from the edge.',
    'A held breath returned.',
  ],
  surprise: [
    'Wonder still echoes.',
    'The world tilted, briefly.',
    'Something unexpected was found.',
    'A turning was noticed.',
  ],
  neutral: [
    'A quiet moment was felt.',
    'Stillness settled here.',
    'The breath between moments.',
    'A page was simply turned.',
  ],
};

const EMOTION_WEATHER: Record<EmotionType, string> = {
  joy: 'Warm',
  sadness: 'Soft Rain',
  anger: 'Heat',
  fear: 'Shadow',
  surprise: 'Light Break',
  neutral: 'Stillness',
};

const ARC_SEASONS: Record<string, string> = {
  beginning: 'Spring',
  rising: 'Summer',
  peak: 'Autumn',
  falling: 'Winter',
  resolution: 'Thaw',
};

function pickVoice(emotion: EmotionType, seed: number): string {
  const arr = MOMENT_VOICES[emotion] || MOMENT_VOICES.neutral;
  return arr[Math.abs(seed) % arr.length];
}

function deriveBookName(bookId: string): string {
  const cleaned = bookId
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\.[^/.]+$/, '')
    .trim();
  if (!cleaned) return 'An untitled world';
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  const days = Math.floor((now.getTime() - timestamp) / 86400000);
  if (days < 7) {
    return d.toLocaleDateString(undefined, { weekday: 'long' });
  }
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

function buildWeatherLine(memory: NarrativeMemory): string {
  const weather = EMOTION_WEATHER[memory.emotion] || EMOTION_WEATHER.neutral;
  const season = ARC_SEASONS[memory.arc.position] || ARC_SEASONS.beginning;
  return `${season} · ${weather}`;
}

export const MemoryVaultScreen: React.FC<MemoryVaultScreenProps> = ({
  navigation,
  route,
}) => {
  const [theme] = useState<NarrativeTheme>(
    new NarrativeThemeEngine().getTheme('neutral')
  );
  const typography = useMemo(() => buildTypography(theme), [theme]);

  const [moments, setMoments] = useState<ArchiveMoment[]>([]);

  useEffect(() => {
    loadArchive();
  }, []);

  const loadArchive = async () => {
    try {
      const persistence = new NarrativeMemoryPersistence(GOVERNOR);
      const allMemories = await persistence.getAllMemories();

      const extracted: ArchiveMoment[] = [];

      for (const memory of allMemories) {
        const seed = memory.bookId.length + memory.timestamp;
        const voiceType =
          memory.listening.sessionCount > 1 ? 0 :
          memory.listening.lastSessionDuration > 600 ? 1 : 2;

        extracted.push({
          bookId: memory.bookId,
          bookName: deriveBookName(memory.bookId),
          text: pickVoice(memory.emotion, seed + voiceType),
          emotion: memory.emotion,
          weather: buildWeatherLine(memory),
          moment: pickVoice(memory.emotion, seed),
          timestamp: memory.timestamp,
          intensity: memory.arc.tension,
        });
      }

      extracted.sort((a, b) => b.timestamp - a.timestamp);
      setMoments(extracted.slice(0, 30));
    } catch (e) {
      console.error('Failed to load archive:', e);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={[typography.ui.caption, { color: theme.colors.accent }]}>
              Back
            </Text>
          </TouchableOpacity>
          <Text style={[typography.ui.heading, { color: theme.colors.text, marginTop: spacing.xs }]}>
            Emotional Archive
          </Text>
          <Text style={[typography.ui.caption, { color: theme.colors.textMuted, marginTop: spacing.xs }]}>
            Moments that stayed
          </Text>
        </View>

        {moments.length === 0 && (
          <View style={styles.emptyState}>
            <Text
              style={[
                typography.story,
                styles.emptyText,
                { color: theme.colors.textSecondary, fontStyle: 'italic' },
              ]}
            >
              The archive is quiet.
            </Text>
            <Text
              style={[
                typography.ui.caption,
                styles.emptySubtext,
                { color: theme.colors.textMuted },
              ]}
            >
              Stories will leave their marks.
            </Text>
          </View>
        )}

        {moments.map((moment, index) => (
          <TouchableOpacity
            key={`${moment.bookId}_${index}`}
            activeOpacity={0.6}
            style={styles.momentEntry}
            onPress={() => navigation.navigate('Player', { bookId: moment.bookId })}
          >
            <Text
              style={[
                typography.story,
                styles.momentQuote,
                { color: theme.colors.text, fontStyle: 'italic' },
              ]}
            >
              "{moment.text}"
            </Text>
            <View style={styles.momentMetaRow}>
              <Text
                style={[
                  typography.ui.micro,
                  styles.momentBook,
                  { color: theme.colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {moment.bookName}
              </Text>
              <Text
                style={[
                  typography.ui.micro,
                  styles.momentWeather,
                  { color: theme.colors.textMuted },
                ]}
              >
                {moment.weather}
              </Text>
              <Text
                style={[
                  typography.ui.micro,
                  styles.momentDate,
                  { color: theme.colors.textMuted },
                ]}
              >
                {formatDate(moment.timestamp)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? spacing.cinematic : spacing.xxl,
    paddingBottom: spacing.cinematic,
    paddingHorizontal: spacing.xl,
  },
  header: {
    marginBottom: spacing.cinematic,
  },
  backButton: {
    padding: spacing.sm,
  },
  emptyState: {
    paddingVertical: spacing.cinematic,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
  },
  emptySubtext: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  momentEntry: {
    paddingVertical: spacing.xl,
  },
  momentQuote: {
    marginBottom: spacing.md,
    opacity: atmosphereOpacity.proseOpacity,
  },
  momentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  momentBook: {
    fontWeight: '500',
  },
  momentWeather: {
    opacity: 0.72,
  },
  momentDate: {
    opacity: 0.6,
    marginLeft: 'auto',
  },
});

export default MemoryVaultScreen;
