import React, { useState, useMemo, useEffect } from 'react';
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
import { EmotionType } from '../core/types';

interface DreamingModeScreenProps {
  navigation: any;
  route?: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DREAM_STATES = [
  { label: 'Falling asleep', description: 'Softer pacing, gentle fade' },
  { label: 'Deep rest', description: 'Long silences, minimal input' },
  { label: 'Drifting', description: 'Ambient dissolves slowly' },
];

export const DreamingModeScreen: React.FC<DreamingModeScreenProps> = ({
  navigation,
  route,
}) => {
  const [theme] = useState<NarrativeTheme>(
    new NarrativeThemeEngine().getTheme('neutral')
  );
  const typography = useMemo(() => buildTypography(theme), [theme]);

  const [selectedState, setSelectedState] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedState((prev) => (prev + 1) % DREAM_STATES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      <View style={styles.atmosphereLayer} />

      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={[typography.ui.label, { color: theme.colors.textMuted }]}>
            Dreaming Mode
          </Text>
        </View>

        <View style={styles.stateSection}>
          <Text style={[typography.story, styles.stateMessage, { color: theme.colors.textSecondary }]}>
            {DREAM_STATES[selectedState].description}
          </Text>
          <Text style={[typography.ui.tiny, { color: theme.colors.textMuted, marginTop: theme.spacing.md }]}>
            {DREAM_STATES[selectedState].label}
          </Text>
        </View>

        <View style={styles.controlsSection}>
          <TouchableOpacity
            style={[styles.enterButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={[typography.ui.body, { color: theme.colors.background, fontWeight: '600' }]}>
              Begin drifting
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exitButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={[typography.ui.caption, { color: theme.colors.textMuted }]}>
              Not tonight
            </Text>
          </TouchableOpacity>
        </View>
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
    opacity: 0.1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  headerSection: {
    alignItems: 'center',
  },
  stateSection: {
    alignItems: 'center',
  },
  stateMessage: {
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 32,
  },
  controlsSection: {
    alignItems: 'center',
    gap: 24,
  },
  enterButton: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 28,
  },
  exitButton: {
    padding: 16,
  },
});

export default DreamingModeScreen;
