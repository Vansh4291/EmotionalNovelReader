import React, { useState, useMemo, useEffect } from 'react';
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
import { NarrativeIdentityEngine, NarrativeFingerprint } from '../core/narration/NarrativeIdentityEngine';
import { EmotionType } from '../core/types';
import { EventGovernor } from '../core/events/EventGovernor';

interface EchoScreenProps {
  navigation: any;
  route?: any;
}

const GOVERNOR = new EventGovernor();

const ECHO_MESSAGES: Record<EmotionType, {
  immediate: string[];
  fading: string[];
  distant: string[];
}> = {
  joy: {
    immediate: ['The warmth still radiates.', 'Light lingers in these pages.'],
    fading: ['The glow softens gently.', 'A gentle warmth remains.'],
    distant: ['An echo of light.', 'Something bright was felt here.'],
  },
  sadness: {
    immediate: ['The weight still rests here.', 'Sorrow breathes softly.'],
    fading: ['The ache grows gentler.', 'Quiet sadness settles.'],
    distant: ['A distant echo of grief.', 'Something heavy was carried here.'],
  },
  anger: {
    immediate: ['The fire still smolders.', 'Heat remains in these words.'],
    fading: ['The flames dim slowly.', 'Embers cool gently.'],
    distant: ['A faint warmth remains.', 'Something burned here once.'],
  },
  fear: {
    immediate: ['The shadows still stir.', 'Dread lingers at the edges.'],
    fading: ['The darkness softens.', 'Shadows retreat slowly.'],
    distant: ['A memory of shadow.', 'Something watched from here.'],
  },
  surprise: {
    immediate: ['Wonder still echoes.', 'The world still holds its breath.'],
    fading: ['The echo fades gently.', 'A soft echo remains.'],
    distant: ['A distant wonder.', 'Something shifted here once.'],
  },
  neutral: {
    immediate: ['The quiet remains.', 'Stillness settles here.'],
    fading: ['The silence deepens.', 'Quiet grows quieter.'],
    distant: ['A distant quiet.', 'Something was felt here.'],
  },
};

function getEchoPhase(timestamp: number): 'immediate' | 'fading' | 'distant' {
  const age = Date.now() - timestamp;
  const hours = age / 3600000;

  if (hours < 24) return 'immediate';
  if (hours < 168) return 'fading';
  return 'distant';
}

function getEchoMessage(emotion: EmotionType, phase: 'immediate' | 'fading' | 'distant'): string {
  const messages = ECHO_MESSAGES[emotion]?.[phase] || ECHO_MESSAGES.neutral[phase];
  return messages[Math.floor(Date.now() / 120000) % messages.length];
}

function formatTimeSince(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (hours < 1) return 'just finished';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
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
  const [echoPhase, setEchoPhase] = useState<'immediate' | 'fading' | 'distant'>('immediate');
  const [echoMessage, setEchoMessage] = useState('');

  useEffect(() => {
    loadEcho();
  }, [bookId]);

  useEffect(() => {
    if (memory) {
      const phase = getEchoPhase(memory.timestamp);
      setEchoPhase(phase);
      setEchoMessage(getEchoMessage(memory.emotion, phase));
    }
  }, [memory]);

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

  if (!memory) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={[typography.story, { color: theme.colors.textMuted }]}>
            No echo remains.
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 24 }}>
            <Text style={[typography.ui.caption, { color: theme.colors.accent }]}>
              Return
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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

        <View style={styles.echoSection}>
          <Text style={[typography.ui.label, { color: theme.colors.textMuted, marginBottom: theme.spacing.lg }]}>
            Echo
          </Text>
          <Text style={[typography.story, styles.echoMessage, { color: theme.colors.textSecondary }]}>
            {echoMessage}
          </Text>
          <Text style={[typography.ui.tiny, { color: theme.colors.textMuted, marginTop: theme.spacing.md }]}>
            {formatTimeSince(memory.timestamp)}
          </Text>
        </View>

        {fingerprint && (
          <View style={[styles.identityCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[typography.ui.label, { color: theme.colors.textMuted, marginBottom: theme.spacing.md }]}>
              Emotional Signature
            </Text>
            <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>
              {formatEmotionalSignature(fingerprint)}
            </Text>
          </View>
        )}

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.revisitButton, { borderColor: theme.colors.accent }]}
            onPress={() => navigation.navigate('Player', { bookId })}
          >
            <Text style={[typography.ui.caption, { color: theme.colors.accent }]}>
              Return to this world
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

function formatEmotionalSignature(fp: NarrativeFingerprint): string {
  const es = fp.emotionalSignature;
  const parts: string[] = [];

  if (es.warmthIndex > 0.3) parts.push('warmth');
  if (es.melancholyIndex > 0.3) parts.push('melancholy');
  if (es.tensionIndex > 0.3) parts.push('tension');
  if (es.volatility > 0.3) parts.push('shifting');

  return parts.length > 0
    ? `Carries ${parts.join(' and ')}.`
    : 'A quiet presence.';
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
  },
  echoSection: {
    marginBottom: 32,
  },
  echoMessage: {
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 34,
  },
  identityCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  actionsSection: {
    alignItems: 'center',
  },
  revisitButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    borderWidth: 1,
  },
});

export default EchoScreen;
