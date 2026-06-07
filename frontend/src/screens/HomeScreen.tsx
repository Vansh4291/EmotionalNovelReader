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
import { EmotionType } from '../core/types';
import {
  NarrativeMemory,
  NarrativeMemoryPersistence,
} from '../core/narration/NarrativeMemoryPersistence';
import { EventGovernor } from '../core/events/EventGovernor';
import { spacing, atmosphereOpacity } from '../design';

interface HomeScreenProps {
  navigation: any;
}

const GOVERNOR = new EventGovernor();

const TIME_GREETINGS: Record<string, string> = {
  morning: 'Good morning.',
  afternoon: 'Good afternoon.',
  evening: 'Good evening.',
  night: 'The night is quiet.',
};

const RETURN_INVITATIONS: Record<string, string[]> = {
  morning: [
    'The world stirs softly.',
    'Light finds the unwritten pages.',
    'Something waits to be remembered.',
  ],
  afternoon: [
    'The world stretches, unhurried.',
    'A still hour for the story.',
    'Quiet holds the afternoon.',
  ],
  evening: [
    'The forest still waits.',
    'The city has dimmed its lamps.',
    'The evening settles in.',
  ],
  night: [
    'The story keeps its vigil.',
    'The night remembers what the day forgot.',
    'Some stories prefer darkness.',
  ],
};

const EMOTIONAL_HUES: Record<EmotionType, string> = {
  joy: 'a warmth lingers',
  sadness: 'a quiet weight remains',
  anger: 'the fire has not faded',
  fear: 'shadows still touch the edges',
  surprise: 'something shifted unexpectedly',
  neutral: 'the world is patient',
};

const ARC_ATMOSPHERES: Record<string, string> = {
  beginning: 'the world is opening',
  rising: 'tension is gathering',
  peak: 'the moment holds its breath',
  falling: 'the air is settling',
  resolution: 'something has come to rest',
};

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function pickInvitation(): string {
  const time = getTimeOfDay();
  const arr = RETURN_INVITATIONS[time] || RETURN_INVITATIONS.evening;
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatTimeSince(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 60) return 'recently';
  if (hours < 24) return 'earlier today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return 'a while ago';
}

function buildWorldTitle(memory: NarrativeMemory): string {
  const lastScene = memory.sceneSnapshots?.[memory.sceneSnapshots.length - 1];
  if (lastScene) {
    return `Chapter ${lastScene.sceneIndex + 1}`;
  }
  return 'The current chapter';
}

function buildWorldAtmosphere(memory: NarrativeMemory): string {
  const emotionHue = EMOTIONAL_HUES[memory.emotion] || EMOTIONAL_HUES.neutral;
  const arcPhrase = ARC_ATMOSPHERES[memory.arc.position] || ARC_ATMOSPHERES.beginning;
  return `${arcPhrase.charAt(0).toUpperCase()}${arcPhrase.slice(1)}, and ${emotionHue}.`;
}

function buildLingeredAtmosphere(memory: NarrativeMemory): string {
  const emotionHue = EMOTIONAL_HUES[memory.emotion] || EMOTIONAL_HUES.neutral;
  return `You remember when ${emotionHue}.`;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [theme] = useState<NarrativeTheme>(
    new NarrativeThemeEngine().getTheme('neutral')
  );
  const typography = useMemo(() => buildTypography(theme), [theme]);

  const [currentWorld, setCurrentWorld] = useState<NarrativeMemory | null>(null);
  const [lingeringMoment, setLingeredMoment] = useState<NarrativeMemory | null>(null);

  useEffect(() => {
    loadFoyer();
  }, []);

  const loadFoyer = async () => {
    try {
      const persistence = new NarrativeMemoryPersistence(GOVERNOR);
      const recent = await persistence.getRecentBooks(2);
      setCurrentWorld(recent[0] || null);
      setLingeredMoment(recent[1] || null);
    } catch (e) {
      console.error('[Foyer] load failed:', e);
    }
  };

  const invitation = useMemo(() => pickInvitation(), []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingSection}>
          <Text
            style={[
              typography.ui.heading,
              styles.greeting,
              { color: theme.colors.text },
            ]}
          >
            {TIME_GREETINGS[getTimeOfDay()]}
          </Text>
          <Text
            style={[
              typography.story,
              styles.invitation,
              { color: theme.colors.textSecondary },
            ]}
          >
            {invitation}
          </Text>
        </View>

        {currentWorld && (
          <TouchableOpacity
            activeOpacity={0.6}
            style={styles.currentWorldSection}
            onPress={() => navigation.navigate('Player', {
              bookId: currentWorld.bookId,
              chapterIndex: currentWorld.sceneSnapshots?.[currentWorld.sceneSnapshots.length - 1]?.sceneIndex,
              sentenceIndex: 0,
            })}
          >
            <Text
              style={[
                typography.ui.label,
                styles.sectionLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              Current World
            </Text>
            <Text
              style={[
                typography.ui.display,
                styles.worldTitle,
                { color: theme.colors.text },
              ]}
              numberOfLines={2}
            >
              {buildWorldTitle(currentWorld)}
            </Text>
            <Text
              style={[
                typography.story,
                styles.worldAtmosphere,
                { color: theme.colors.textSecondary, fontStyle: 'italic' },
              ]}
            >
              {buildWorldAtmosphere(currentWorld)}
            </Text>
            <Text
              style={[
                typography.ui.micro,
                styles.worldTimestamp,
                { color: theme.colors.textMuted },
              ]}
            >
              Last visited {formatTimeSince(currentWorld.timestamp)}
            </Text>
          </TouchableOpacity>
        )}

        {lingeringMoment && (
          <View style={styles.momentSection}>
            <Text
              style={[
                typography.ui.label,
                styles.sectionLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              A Moment That Stayed
            </Text>
            <Text
              style={[
                typography.story,
                styles.momentAtmosphere,
                { color: theme.colors.textSecondary, fontStyle: 'italic' },
              ]}
            >
              {buildLingeredAtmosphere(lingeringMoment)}
            </Text>
            <Text
              style={[
                typography.ui.micro,
                styles.momentMeta,
                { color: theme.colors.textMuted },
              ]}
            >
              {formatTimeSince(lingeringMoment.timestamp)}
            </Text>
          </View>
        )}

        {!currentWorld && !lingeringMoment && (
          <View style={styles.emptyFoyer}>
            <Text
              style={[
                typography.story,
                styles.emptyText,
                { color: theme.colors.textSecondary, fontStyle: 'italic' },
              ]}
            >
              A story is waiting to be found.
            </Text>
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
  greetingSection: {
    marginBottom: spacing.cinematic,
  },
  greeting: {
    marginBottom: spacing.sm,
  },
  invitation: {
    opacity: 0.78,
  },
  currentWorldSection: {
    marginBottom: spacing.cinematic,
  },
  worldTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  worldAtmosphere: {
    marginBottom: spacing.md,
    opacity: 0.82,
  },
  worldTimestamp: {
    marginTop: spacing.xs,
  },
  momentSection: {
    marginBottom: spacing.cinematic,
  },
  momentAtmosphere: {
    marginTop: spacing.md,
    opacity: 0.72,
  },
  momentMeta: {
    marginTop: spacing.md,
  },
  sectionLabel: {
    marginBottom: spacing.xs,
  },
  emptyFoyer: {
    marginTop: spacing.xxl,
  },
  emptyText: {
    textAlign: 'center',
    opacity: atmosphereOpacity.proseContext,
  },
});

export default HomeScreen;
