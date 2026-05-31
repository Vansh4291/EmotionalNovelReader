import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { NarrativeThemeEngine, NarrativeTheme } from '../theme/NarrativeThemeEngine';
import { buildTypography, NarrativeTypography } from '../theme/NarrativeTypography';
import { NarrativeMemoryPersistence, NarrativeMemory } from '../core/narration/NarrativeMemoryPersistence';
import { NarrativeWeatherSystem, WeatherState } from '../core/narration/NarrativeWeatherSystem';
import { EmotionType } from '../core/types';
import { EventGovernor } from '../core/events/EventGovernor';

interface SanctuaryScreenProps {
  navigation: any;
  route?: any;
}

const GOVERNOR = new EventGovernor();

const PRESENCE_MESSAGES: Record<EmotionType, string[]> = {
  joy: [
    'A quiet warmth lingers here.',
    'The light has not yet faded.',
    'Something gentle waits.',
  ],
  sadness: [
    'The weight remains softly.',
    'A quiet sorrow breathes.',
    'The stillness holds its memory.',
  ],
  anger: [
    'The fire has settled to embers.',
    'Heat still radiates gently.',
    'Something smolders quietly.',
  ],
  fear: [
    'Shadows rest at the edges.',
    'The dark is patient tonight.',
    'Something stirs in silence.',
  ],
  surprise: [
    'The world still holds its breath.',
    'An echo of wonder remains.',
    'Something shifted here.',
  ],
  neutral: [
    'The space is quiet.',
    'A gentle pause between worlds.',
    'Stillness settles softly.',
  ],
};

function getPresenceMessage(emotion: EmotionType): string {
  const messages = PRESENCE_MESSAGES[emotion] || PRESENCE_MESSAGES.neutral;
  return messages[Math.floor(Date.now() / 60000) % messages.length];
}

function getAtmosphericWord(weather: WeatherState | null): string {
  if (!weather) return 'quiet';

  if (weather.temperature < 0.3) return 'still';
  if (weather.temperature > 0.7) return 'warm';
  if (weather.weight > 0.6) return 'heavy';
  if (weather.clarity < 0.4) return 'hazy';
  return 'gentle';
}

export const SanctuaryScreen: React.FC<SanctuaryScreenProps> = ({
  navigation,
  route,
}) => {
  const [theme] = useState<NarrativeTheme>(
    new NarrativeThemeEngine().getTheme('neutral')
  );
  const typography = useMemo(() => buildTypography(theme), [theme]);

  const [memory, setMemory] = useState<NarrativeMemory | null>(null);
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [presenceMessage, setPresenceMessage] = useState('');

  useEffect(() => {
    loadSanctuary();
  }, []);

  const loadSanctuary = async () => {
    try {
      const persistence = new NarrativeMemoryPersistence(GOVERNOR);
      const recent = await persistence.getRecentBooks(1);
      if (recent.length > 0) {
        setMemory(recent[0]);
        setPresenceMessage(getPresenceMessage(recent[0].emotion));
      }
    } catch (e) {
      console.error('Failed to load sanctuary:', e);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      <View style={styles.atmosphereLayer} />

      <View style={styles.content}>
        <View style={styles.presenceSection}>
          {memory ? (
            <>
              <Text style={[typography.story, styles.presenceMessage, { color: theme.colors.textSecondary }]}>
                {presenceMessage}
              </Text>

              <View style={styles.weatherLine}>
                <Text style={[typography.ui.tiny, { color: theme.colors.textMuted }]}>
                  The air feels {getAtmosphericWord(weather)}
                </Text>
              </View>
            </>
          ) : (
            <Text style={[typography.story, styles.presenceMessage, { color: theme.colors.textMuted }]}>
              The sanctuary is quiet.
            </Text>
          )}
        </View>

        {memory && (
          <TouchableOpacity
            style={styles.enterButton}
            onPress={() => navigation.navigate('Player', { bookId: memory.bookId })}
            activeOpacity={0.7}
          >
            <Text style={[typography.ui.caption, { color: theme.colors.accent }]}>
              Return to story
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.leaveButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={[typography.ui.tiny, { color: theme.colors.textMuted }]}>
            Leave quietly
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  atmosphereLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  presenceSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  presenceMessage: {
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 34,
    letterSpacing: 0.5,
  },
  weatherLine: {
    marginTop: 24,
  },
  enterButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  leaveButton: {
    padding: 16,
  },
});

export default SanctuaryScreen;
