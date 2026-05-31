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
import { NarrativeWeatherSystem, WeatherState } from '../core/narration/NarrativeWeatherSystem';
import { BookIntelligenceLayer, ChapterIntelligence } from '../core/narration/BookIntelligenceLayer';
import { EmotionType } from '../core/types';
import { EventGovernor } from '../core/events/EventGovernor';

interface StorySpaceScreenProps {
  navigation: any;
  route?: any;
}

const GOVERNOR = new EventGovernor();

const EMOTION_ATMOSPHERES: Record<EmotionType, {
  greeting: string;
  feeling: string;
}> = {
  joy: { greeting: 'A warm light lives here.', feeling: 'Gentle brightness' },
  sadness: { greeting: 'Quiet weight rests in these pages.', feeling: 'Soft melancholy' },
  anger: { greeting: 'Fire gathers in the stillness.', feeling: 'Simmering tension' },
  fear: { greeting: 'Shadows touch the edges.', feeling: 'Uneasy presence' },
  surprise: { greeting: 'Something shifted here.', feeling: 'Unexpected turns' },
  neutral: { greeting: 'The story breathes quietly.', feeling: 'Calm space' },
};

export const StorySpaceScreen: React.FC<StorySpaceScreenProps> = ({
  navigation,
  route,
}) => {
  const bookId = route?.params?.bookId ?? '';
  const [theme] = useState<NarrativeTheme>(
    new NarrativeThemeEngine().getTheme('neutral')
  );
  const typography = useMemo(() => buildTypography(theme), [theme]);

  const [fingerprint, setFingerprint] = useState<NarrativeFingerprint | null>(null);
  const [memory, setMemory] = useState<NarrativeMemory | null>(null);
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [chapters, setChapters] = useState<ChapterIntelligence[]>([]);

  useEffect(() => {
    loadStorySpace();
  }, [bookId]);

  const loadStorySpace = async () => {
    try {
      const identityEngine = new NarrativeIdentityEngine(GOVERNOR);
      const persistence = new NarrativeMemoryPersistence(GOVERNOR);
      const intelligence = new BookIntelligenceLayer(GOVERNOR);

      setFingerprint(identityEngine.getFingerprint(bookId));
      setMemory(await persistence.getMemory(bookId));

      const timeline = intelligence.getBookTimeline(bookId);
      if (timeline) {
        setChapters(timeline.chapters.filter((c) => c.emotionalArc.length > 0));
      }
    } catch (e) {
      console.error('Failed to load story space:', e);
    }
  };

  const atmosphere = memory ? EMOTION_ATMOSPHERES[memory.emotion] : EMOTION_ATMOSPHERES.neutral;

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
        </View>

        <View style={styles.atmosphereSection}>
          <Text style={[typography.ui.heading, { color: theme.colors.text, marginBottom: theme.spacing.md }]}>
            Story Space
          </Text>
          <Text style={[typography.story, { color: theme.colors.textSecondary, fontStyle: 'italic' }]}>
            {atmosphere.greeting}
          </Text>
        </View>

        {fingerprint && (
          <View style={[styles.identityCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[typography.ui.label, { color: theme.colors.textMuted, marginBottom: theme.spacing.md }]}>
              Emotional Identity
            </Text>
            <View style={styles.identityGrid}>
              <IdentityMetric
                label="Feeling"
                value={atmosphere.feeling}
                theme={theme}
                typography={typography}
              />
              <IdentityMetric
                label="Pacing"
                value={formatPacing(fingerprint.pacingSignature.averageWPM)}
                theme={theme}
                typography={typography}
              />
              <IdentityMetric
                label="Weight"
                value={formatWeight(fingerprint.narrativeWeight)}
                theme={theme}
                typography={typography}
              />
              <IdentityMetric
                label="Atmosphere"
                value={formatAtmosphere(fingerprint.atmosphericProfile)}
                theme={theme}
                typography={typography}
              />
            </View>
          </View>
        )}

        {memory && (
          <View style={[styles.memoryCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[typography.ui.label, { color: theme.colors.textMuted, marginBottom: theme.spacing.md }]}>
              Listening Memory
            </Text>
            <View style={styles.memoryRow}>
              <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>
                Sessions
              </Text>
              <Text style={[typography.ui.body, { color: theme.colors.accent }]}>
                {memory.listening.sessionCount}
              </Text>
            </View>
            <View style={styles.memoryRow}>
              <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>
                Total time
              </Text>
              <Text style={[typography.ui.body, { color: theme.colors.accent }]}>
                {formatTime(memory.listening.totalSeconds)}
              </Text>
            </View>
          </View>
        )}

        {chapters.length > 0 && (
          <View style={styles.chaptersSection}>
            <Text style={[typography.ui.label, { color: theme.colors.textMuted, marginBottom: theme.spacing.md }]}>
              Emotional Arc
            </Text>
            <View style={styles.arcContainer}>
              {chapters.slice(0, 8).map((chapter, index) => (
                <View key={chapter.chapterIndex} style={styles.arcChapter}>
                  <View style={[
                    styles.arcBar,
                    {
                      backgroundColor: theme.colors.accent,
                      height: `${chapter.dialogueRatio * 100}%`,
                    },
                  ]} />
                  <Text style={[typography.ui.tiny, { color: theme.colors.textMuted }]}>
                    {chapter.chapterIndex + 1}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: theme.colors.accent }]}
          onPress={() => navigation.navigate('Player', { bookId })}
        >
          <Text style={[typography.ui.body, { color: theme.colors.background, fontWeight: '600' }]}>
            Continue Journey
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

function IdentityMetric({
  label,
  value,
  theme,
  typography,
}: {
  label: string;
  value: string;
  theme: NarrativeTheme;
  typography: NarrativeTypography;
}) {
  return (
    <View style={styles.identityMetric}>
      <Text style={[typography.ui.tiny, { color: theme.colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[typography.ui.caption, { color: theme.colors.text, marginTop: 4 }]}>
        {value}
      </Text>
    </View>
  );
}

function formatPacing(wpm: number): string {
  if (wpm < 120) return 'Slow burn';
  if (wpm < 160) return 'Steady flow';
  if (wpm < 200) return 'Brisk pace';
  return 'Rapid current';
}

function formatWeight(weight: number): string {
  if (weight < 0.3) return 'Light touch';
  if (weight < 0.6) return 'Moderate weight';
  return 'Deep presence';
}

function formatAtmosphere(profile: NarrativeFingerprint['atmosphericProfile']): string {
  if (profile.darknessIndex > 0.6) return 'Dark undertones';
  if (profile.warmthIndex > 0.6) return 'Warm glow';
  if (profile.moodSwingFrequency > 0.3) return 'Shifting moods';
  return 'Steady climate';
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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
  backButton: {
    padding: 8,
  },
  atmosphereSection: {
    marginBottom: 32,
  },
  identityCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  identityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  identityMetric: {
    width: '45%',
  },
  memoryCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  memoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  chaptersSection: {
    marginBottom: 32,
  },
  arcContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 8,
  },
  arcChapter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  arcBar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  continueButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    alignItems: 'center',
  },
});

export default StorySpaceScreen;
