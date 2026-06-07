import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { NarrativeThemeEngine, NarrativeTheme } from '../theme/NarrativeThemeEngine';
import { buildTypography } from '../theme/NarrativeTypography';
import {
  NarrativeFingerprint,
} from '../core/narration/NarrativeIdentityEngine';
import {
  NarrativeMemory,
  NarrativeMemoryPersistence,
} from '../core/narration/NarrativeMemoryPersistence';
import { EmotionType } from '../core/types';
import { EventGovernor } from '../core/events/EventGovernor';
import { spacing, atmosphereOpacity, emotionalInk } from '../design';

interface LibraryScreenProps {
  navigation: any;
  route?: any;
}

interface WorldEntry {
  bookId: string;
  bookName: string;
  authorName: string;
  emotion: EmotionType;
  season: string;
  warmth: number;
  melancholy: number;
  tension: number;
  isLiving: boolean;
  isComplete: boolean;
  isAwaiting: boolean;
  sessionCount: number;
  timestamp: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 180;
const COVER_WIDTH = SCREEN_WIDTH - spacing.xl * 2;

const GOVERNOR = new EventGovernor();

const ARC_SEASON: Record<string, string> = {
  beginning: 'Spring',
  rising: 'Summer',
  peak: 'Autumn',
  falling: 'Winter',
  resolution: 'Thaw',
};

const EMOTION_LABEL: Record<EmotionType, string> = {
  joy: 'Warm',
  sadness: 'Heavy',
  anger: 'Fierce',
  fear: 'Hushed',
  surprise: 'Shifting',
  neutral: 'Quiet',
};

function deriveBookName(bookId: string): string {
  const cleaned = bookId
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\.[^/.]+$/, '')
    .trim();
  if (!cleaned) return 'Untitled World';
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

function deriveAuthor(bookId: string): string {
  const words = bookId.split(/[_\-.]/).filter(Boolean);
  if (words.length === 0) return 'Unknown';
  const initials = words.slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
  return `By ${initials || 'Unknown'}`;
}

function buildWorlds(memories: NarrativeMemory[]): WorldEntry[] {
  return memories.map((memory) => {
    const recent = Date.now() - memory.timestamp < 7 * 24 * 60 * 60 * 1000;
    const isComplete = memory.listening.sessionCount >= 3 && memory.arc.tension < 0.15;
    return {
      bookId: memory.bookId,
      bookName: deriveBookName(memory.bookId),
      authorName: deriveAuthor(memory.bookId),
      emotion: memory.emotion,
      season: ARC_SEASON[memory.arc.position] || ARC_SEASON.beginning,
      warmth: 0,
      melancholy: 0,
      tension: memory.arc.tension,
      isLiving: recent && !isComplete,
      isComplete,
      isAwaiting: !recent && !isComplete,
      sessionCount: memory.listening.sessionCount,
      timestamp: memory.timestamp,
    };
  });
}

function pickCoverColors(world: WorldEntry, theme: NarrativeTheme): [string, string] {
  const emotionToInk: Record<EmotionType, string> = {
    joy: emotionalInk.warmth,
    sadness: emotionalInk.sadness,
    anger: emotionalInk.anger,
    fear: emotionalInk.fear,
    surprise: emotionalInk.awe,
    neutral: emotionalInk.neutral,
  };
  const ink = emotionToInk[world.emotion] || emotionalInk.neutral;
  const base = theme.colors.background;
  return [ink, base];
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  navigation,
  route,
}) => {
  const [theme] = useState<NarrativeTheme>(
    new NarrativeThemeEngine().getTheme('neutral')
  );
  const typography = useMemo(() => buildTypography(theme), [theme]);

  const [living, setLiving] = useState<WorldEntry[]>([]);
  const [completed, setCompleted] = useState<WorldEntry[]>([]);
  const [awaiting, setAwaiting] = useState<WorldEntry[]>([]);

  useEffect(() => {
    loadWorlds();
  }, []);

  const loadWorlds = async () => {
    try {
      const persistence = new NarrativeMemoryPersistence(GOVERNOR);
      const memories = await persistence.getAllMemories();
      const all = buildWorlds(memories);
      all.sort((a, b) => b.timestamp - a.timestamp);

      setLiving(all.filter((w) => w.isLiving));
      setCompleted(all.filter((w) => w.isComplete));
      setAwaiting(all.filter((w) => w.isAwaiting));
    } catch (e) {
      console.error('Failed to load worlds:', e);
    }
  };

  const renderWorld = (world: WorldEntry) => {
    const [accent, base] = pickCoverColors(world, theme);
    return (
      <TouchableOpacity
        key={world.bookId}
        activeOpacity={0.6}
        style={styles.worldEntry}
        onPress={() => navigation.navigate('StorySpace', { bookId: world.bookId })}
      >
        <View
          style={[
            styles.worldCover,
            {
              backgroundColor: base,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.worldCoverAtmosphere,
              {
                backgroundColor: accent,
                opacity: 0.10 + (world.tension * 0.18),
              },
            ]}
          />
          <View style={styles.worldCoverContent}>
            <Text
              style={[
                typography.ui.label,
                styles.worldSeason,
                { color: accent },
              ]}
            >
              {world.season} · {EMOTION_LABEL[world.emotion]}
            </Text>
            <Text
              style={[
                typography.ui.display,
                styles.worldTitle,
                { color: theme.colors.text },
              ]}
              numberOfLines={2}
            >
              {world.bookName}
            </Text>
            <Text
              style={[
                typography.ui.micro,
                styles.worldAuthor,
                { color: theme.colors.textMuted },
              ]}
            >
              {world.authorName}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const totalWorlds = living.length + completed.length + awaiting.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[typography.ui.heading, { color: theme.colors.text }]}>
            Worlds
          </Text>
          <Text
            style={[
              typography.ui.caption,
              styles.headerSub,
              { color: theme.colors.textMuted },
            ]}
          >
            Places you have visited, or might
          </Text>
        </View>

        {totalWorlds === 0 && (
          <View style={styles.emptyState}>
            <Text
              style={[
                typography.story,
                styles.emptyText,
                { color: theme.colors.textSecondary, fontStyle: 'italic' },
              ]}
            >
              No worlds yet.
            </Text>
            <Text
              style={[
                typography.ui.caption,
                styles.emptySubtext,
                { color: theme.colors.textMuted },
              ]}
            >
              The library is patient.
            </Text>
          </View>
        )}

        {living.length > 0 && (
          <View style={styles.section}>
            <Text
              style={[
                typography.ui.label,
                styles.sectionLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              Currently Living In
            </Text>
            {living.map(renderWorld)}
          </View>
        )}

        {completed.length > 0 && (
          <View style={styles.section}>
            <Text
              style={[
                typography.ui.label,
                styles.sectionLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              Completed Worlds
            </Text>
            {completed.map(renderWorld)}
          </View>
        )}

        {awaiting.length > 0 && (
          <View style={styles.section}>
            <Text
              style={[
                typography.ui.label,
                styles.sectionLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              Awaiting Discovery
            </Text>
            {awaiting.map(renderWorld)}
          </View>
        )}
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
  headerSub: {
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionLabel: {
    marginBottom: spacing.lg,
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
  worldEntry: {
    marginBottom: spacing.lg,
  },
  worldCover: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: 0,
    borderWidth: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  worldCoverAtmosphere: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  worldCoverContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.xl,
  },
  worldSeason: {
    marginBottom: spacing.sm,
  },
  worldTitle: {
    marginBottom: spacing.sm,
  },
  worldAuthor: {
    opacity: atmosphereOpacity.proseContext,
  },
});

export default LibraryScreen;
