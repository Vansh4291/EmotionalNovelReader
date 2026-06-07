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
import {
  NarrativeFingerprint,
  NarrativeIdentityEngine,
} from '../core/narration/NarrativeIdentityEngine';
import { EmotionType } from '../core/types';
import { EventGovernor } from '../core/events/EventGovernor';
import { spacing, atmosphereOpacity, emotionalInk } from '../design';

interface EchoScreenProps {
  navigation: any;
  route?: any;
}

const GOVERNOR = new EventGovernor();

const FAREWELL_OPENINGS = [
  'Some stories leave quietly.',
  'Some stories leave quietly. Others linger.',
];

const FAREWELL_CLOSINGS = [
  'It rests now, in the place you keep such things.',
  'You may return, or you may not. Either is right.',
  'The story has folded itself away.',
  'It will be there, in the part of you it touched.',
];

const EMOTION_RESONANCE: Record<EmotionType, string> = {
  joy: 'a warmth you can still feel',
  sadness: 'a quiet weight, gentler now',
  anger: 'an ember, cooling slowly',
  fear: 'a shadow, lighter at the edges',
  surprise: 'a turning, still resonating',
  neutral: 'a stillness, complete',
};

const EMOTION_INK: Record<EmotionType, string> = {
  joy: emotionalInk.warmth,
  sadness: emotionalInk.sadness,
  anger: emotionalInk.anger,
  fear: emotionalInk.fear,
  surprise: emotionalInk.awe,
  neutral: emotionalInk.neutral,
};

function pickOpening(): string {
  return FAREWELL_OPENINGS[Math.floor(Math.random() * FAREWELL_OPENINGS.length)];
}

function pickClosing(): string {
  return FAREWELL_CLOSINGS[Math.floor(Math.random() * FAREWELL_CLOSINGS.length)];
}

function formatEmotionalFingerprint(fp: NarrativeFingerprint): string {
  const es = fp.emotionalSignature;
  const presence: string[] = [];
  if (es.warmthIndex > 0.25) presence.push('warmth');
  if (es.melancholyIndex > 0.25) presence.push('melancholy');
  if (es.tensionIndex > 0.25) presence.push('tension');
  if (es.volatility > 0.25) presence.push('shifting currents');

  if (presence.length === 0) return 'A quiet presence. The story moved gently.';
  return `Carries ${presence.join(', ')}.`;
}

function formatRelationshipArc(memory: NarrativeMemory): string {
  const sessions = memory.listening.sessionCount;
  if (sessions === 1) return 'You arrived once, and stayed until the end.';
  if (sessions === 2) return 'You came back, twice, to finish what was started.';
  if (sessions <= 4) return `${sessions} visits, each one a return.`;
  return `${sessions} visits. You came back often.`;
}

function deriveBookName(bookId: string): string {
  const cleaned = bookId
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\.[^/.]+$/, '')
    .trim();
  if (!cleaned) return 'The Untitled World';
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

function pickLingeringSentence(memory: NarrativeMemory): string {
  const resonance = EMOTION_RESONANCE[memory.emotion] || EMOTION_RESONANCE.neutral;
  return `What remains: ${resonance}.`;
}

export const EchoScreen: React.FC<EchoScreenProps> = ({
  navigation,
  route,
}) => {
  const bookId = route?.params?.bookId ?? '';
  const [theme] = useState<NarrativeTheme>(
    new NarrativeThemeEngine().getTheme('neutral')
  );
  const typography = useMemo(() => buildTypography(theme), [theme]);

  const [memory, setMemory] = useState<NarrativeMemory | null>(null);
  const [fingerprint, setFingerprint] = useState<NarrativeFingerprint | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const persistence = new NarrativeMemoryPersistence(GOVERNOR);
        const identity = new NarrativeIdentityEngine(GOVERNOR);
        setMemory(await persistence.getMemory(bookId));
        setFingerprint(identity.getFingerprint(bookId));
      } catch (e) {
        console.error('Failed to load echo:', e);
      }
    };
    load();
  }, [bookId]);

  const loadEcho = async () => {
    try {
      const persistence = new NarrativeMemoryPersistence(GOVERNOR);
      const identity = new NarrativeIdentityEngine(GOVERNOR);

      setMemory(await persistence.getMemory(bookId));
      setFingerprint(identity.getFingerprint(bookId));
    } catch (e) {
      console.error('Failed to load echo:', e);
    }
  };

  const opening = useMemo(() => pickOpening(), []);
  const closing = useMemo(() => pickClosing(), []);

  if (!memory) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <Text
            style={[
              typography.story,
              styles.silenceText,
              { color: theme.colors.textMuted, fontStyle: 'italic' },
            ]}
          >
            No echo remains.
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.silenceReturn}>
            <Text style={[typography.ui.caption, { color: theme.colors.accent }]}>
              Return
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const accentInk = EMOTION_INK[memory.emotion] || emotionalInk.neutral;
  const bookName = deriveBookName(bookId);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.openingSection}>
          <Text
            style={[
              typography.ui.label,
              styles.openingLabel,
              { color: theme.colors.textMuted },
            ]}
          >
            Farewell
          </Text>
          <Text
            style={[
              typography.story,
              styles.openingText,
              { color: theme.colors.text, fontStyle: 'italic' },
            ]}
          >
            {opening}
          </Text>
          <Text
            style={[
              typography.ui.label,
              styles.bookAttribution,
              { color: accentInk },
            ]}
          >
            {bookName}
          </Text>
        </View>

        <View style={styles.fingerprintSection}>
          <Text
            style={[
              typography.ui.label,
              styles.sectionLabel,
              { color: theme.colors.textMuted },
            ]}
          >
            Emotional Fingerprint
          </Text>
          <Text
            style={[
              typography.story,
              styles.sectionText,
              { color: theme.colors.textSecondary, fontStyle: 'italic' },
            ]}
          >
            {fingerprint
              ? formatEmotionalFingerprint(fingerprint)
              : 'A presence that did not announce itself.'}
          </Text>
        </View>

        <View style={styles.relationshipSection}>
          <Text
            style={[
              typography.ui.label,
              styles.sectionLabel,
              { color: theme.colors.textMuted },
            ]}
          >
            Relationship
          </Text>
          <Text
            style={[
              typography.story,
              styles.sectionText,
              { color: theme.colors.textSecondary },
            ]}
          >
            {formatRelationshipArc(memory)}
          </Text>
        </View>

        <View style={styles.lingeringSection}>
          <Text
            style={[
              typography.ui.label,
              styles.sectionLabel,
              { color: theme.colors.textMuted },
            ]}
          >
            What Lingers
          </Text>
          <Text
            style={[
              typography.story,
              styles.sectionText,
              { color: theme.colors.text, fontStyle: 'italic' },
            ]}
          >
            {pickLingeringSentence(memory)}
          </Text>
        </View>

        <View style={styles.closingSection}>
          <Text
            style={[
              typography.story,
              styles.closingText,
              { color: theme.colors.textMuted, fontStyle: 'italic' },
            ]}
          >
            {closing}
          </Text>
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Player', { bookId })}
            style={styles.returnLink}
          >
            <Text style={[typography.ui.micro, { color: theme.colors.textMuted }]}>
              Return to this world
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            style={styles.returnLink}
          >
            <Text style={[typography.ui.micro, { color: theme.colors.accent }]}>
              Return to the foyer
            </Text>
          </TouchableOpacity>
        </View>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  silenceText: {
    textAlign: 'center',
  },
  silenceReturn: {
    marginTop: spacing.xl,
    padding: spacing.sm,
  },
  openingSection: {
    marginBottom: spacing.cinematic,
  },
  openingLabel: {
    marginBottom: spacing.lg,
  },
  openingText: {
    marginBottom: spacing.lg,
    lineHeight: 32,
  },
  bookAttribution: {
    marginTop: spacing.sm,
  },
  fingerprintSection: {
    marginBottom: spacing.xxl,
  },
  relationshipSection: {
    marginBottom: spacing.xxl,
  },
  lingeringSection: {
    marginBottom: spacing.xxl,
  },
  sectionLabel: {
    marginBottom: spacing.md,
  },
  sectionText: {
    opacity: atmosphereOpacity.proseOpacity,
  },
  closingSection: {
    marginTop: spacing.xl,
    marginBottom: spacing.cinematic,
  },
  closingText: {
    textAlign: 'center',
    opacity: 0.72,
  },
  actionsSection: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  returnLink: {
    paddingVertical: spacing.md,
  },
});

export default EchoScreen;
