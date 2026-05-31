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

interface MemoryVaultScreenProps {
  navigation: any;
  route?: any;
}

interface MemoryMoment {
  bookId: string;
  text: string;
  emotion: EmotionType;
  timestamp: number;
  type: 'lingered' | 'paused' | 'returned' | 'first_heard';
}

const GOVERNOR = new EventGovernor();

const MOMENT_TEXTS: Record<EmotionType, {
  lingered: string[];
  paused: string[];
  returned: string[];
  first_heard: string[];
}> = {
  joy: {
    lingered: ['A moment of warmth stayed.', 'The light lingered here.'],
    paused: ['You rested in contentment.', 'A gentle pause was felt.'],
    returned: ['You came back to this warmth.', 'The glow remained.'],
    first_heard: ['First light was felt here.'],
  },
  sadness: {
    lingered: ['The weight settled gently.', 'Sorrow found its rest.'],
    paused: ['You paused in the quiet ache.', 'A breath was held here.'],
    returned: ['You returned to the quiet.', 'The sorrow remembered you.'],
    first_heard: ['The weight was first felt here.'],
  },
  anger: {
    lingered: ['The fire left its mark.', 'Heat still lingers.'],
    paused: ['The anger settled briefly.', 'A moment of stillness.'],
    returned: ['The embers stirred again.', 'You returned to the fire.'],
    first_heard: ['The flame first caught here.'],
  },
  fear: {
    lingered: ['The shadows still breathe.', 'Dread left its echo.'],
    paused: ['You paused in the dark.', 'A breath of fear was held.'],
    returned: ['The darkness remembered.', 'You stepped back into shadow.'],
    first_heard: ['The first shadow fell here.'],
  },
  surprise: {
    lingered: ['Wonder still echoes.', 'The world shifted here.'],
    paused: ['You lingered in surprise.', 'A moment of revelation.'],
    returned: ['The echo of surprise remains.', 'You returned to the turning.'],
    first_heard: ['The first surprise bloomed here.'],
  },
  neutral: {
    lingered: ['A quiet moment was felt.', 'Stillness settled here.'],
    paused: ['A gentle pause.', 'The breath between moments.'],
    returned: ['You returned to the quiet.', 'The stillness remained.'],
    first_heard: ['A quiet beginning.'],
  },
};

function getMomentText(emotion: EmotionType, type: MemoryMoment['type']): string {
  const texts = MOMENT_TEXTS[emotion]?.[type] || MOMENT_TEXTS.neutral[type];
  return texts[Math.floor(Date.now() / 100000) % texts.length];
}

function formatTimeSince(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (hours < 1) return 'moments ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)} weeks ago`;
}

export const MemoryVaultScreen: React.FC<MemoryVaultScreenProps> = ({
  navigation,
  route,
}) => {
  const [theme] = useState<NarrativeTheme>(
    new NarrativeThemeEngine().getTheme('neutral')
  );
  const typography = useMemo(() => buildTypography(theme), [theme]);

  const [moments, setMoments] = useState<MemoryMoment[]>([]);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    try {
      const persistence = new NarrativeMemoryPersistence(GOVERNOR);
      const allMemories = await persistence.getAllMemories();

      const extracted: MemoryMoment[] = [];

      for (const memory of allMemories) {
        if (memory.listening.sessionCount > 1) {
          extracted.push({
            bookId: memory.bookId,
            text: getMomentText(memory.emotion, 'returned'),
            emotion: memory.emotion,
            timestamp: memory.timestamp,
            type: 'returned',
          });
        }

        if (memory.listening.lastSessionDuration > 600) {
          extracted.push({
            bookId: memory.bookId,
            text: getMomentText(memory.emotion, 'lingered'),
            emotion: memory.emotion,
            timestamp: memory.timestamp,
            type: 'lingered',
          });
        }

        if (memory.sceneSnapshots.length > 0) {
          extracted.push({
            bookId: memory.bookId,
            text: getMomentText(memory.emotion, 'first_heard'),
            emotion: memory.emotion,
            timestamp: memory.timestamp,
            type: 'first_heard',
          });
        }
      }

      extracted.sort((a, b) => b.timestamp - a.timestamp);
      setMoments(extracted.slice(0, 20));
    } catch (e) {
      console.error('Failed to load memories:', e);
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
          <Text style={[typography.ui.heading, { color: theme.colors.text }]}>
            Memory Vault
          </Text>
          <Text style={[typography.ui.caption, { color: theme.colors.textMuted, marginTop: theme.spacing.xs }]}>
            Moments that stayed
          </Text>
        </View>

        {moments.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[typography.story, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
              No memories yet.
            </Text>
            <Text style={[typography.ui.caption, { color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.sm }]}>
              Stories will leave their marks.
            </Text>
          </View>
        )}

        {moments.map((moment, index) => (
          <TouchableOpacity
            key={`${moment.bookId}_${index}`}
            style={[
              styles.momentCard,
              {
                backgroundColor: theme.colors.surface,
                borderLeftColor: theme.colors.accent,
              },
            ]}
            onPress={() => navigation.navigate('Player', { bookId: moment.bookId })}
          >
            <Text style={[typography.story, { color: theme.colors.textSecondary, fontStyle: 'italic' }]}>
              "{moment.text}"
            </Text>
            <Text style={[typography.ui.tiny, { color: theme.colors.textMuted, marginTop: theme.spacing.sm }]}>
              {formatTimeSince(moment.timestamp)}
            </Text>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
    marginBottom: 16,
  },
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  momentCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderLeftWidth: 2,
  },
});

export default MemoryVaultScreen;
