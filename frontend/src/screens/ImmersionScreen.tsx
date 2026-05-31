import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { NarrativeThemeEngine, NarrativeTheme } from '../theme/NarrativeThemeEngine';
import { buildTypography, NarrativeTypography } from '../theme/NarrativeTypography';
import { EmotionType } from '../core/types';

interface ImmersionScreenProps {
  navigation: any;
  route?: any;
}

interface ImmersionSetting {
  id: string;
  label: string;
  description: string;
  type: 'toggle' | 'level';
  value: boolean | number;
  icon: string;
}

export const ImmersionScreen: React.FC<ImmersionScreenProps> = ({
  navigation,
  route,
}) => {
  const [theme] = useState<NarrativeTheme>(
    new NarrativeThemeEngine().getTheme('neutral')
  );
  const typography = useMemo(() => buildTypography(theme), [theme]);

  const [ambientEnabled, setAmbientEnabled] = useState(false);
  const [silenceSensitivity, setSilenceSensitivity] = useState(0.5);
  const [focusDepth, setFocusDepth] = useState(0.5);
  const [pacingSoftness, setPacingSoftness] = useState(0.5);
  const [typographyWarmth, setTypographyWarmth] = useState(0.5);

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
            Immersion
          </Text>
          <Text style={[typography.ui.caption, { color: theme.colors.textMuted, marginTop: theme.spacing.xs }]}>
            Prepare your reading space
          </Text>
        </View>

        <View style={[styles.settingSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[typography.ui.label, { color: theme.colors.textMuted, marginBottom: theme.spacing.lg }]}>
            Atmosphere
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[typography.ui.body, { color: theme.colors.text }]}>
                Ambient Sound
              </Text>
              <Text style={[typography.ui.caption, { color: theme.colors.textMuted }]}>
                Minimalistic atmospheric layers
              </Text>
            </View>
            <Switch
              value={ambientEnabled}
              onValueChange={setAmbientEnabled}
              trackColor={{ false: theme.colors.surface, true: theme.colors.accent }}
              thumbColor={theme.colors.text}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[typography.ui.body, { color: theme.colors.text }]}>
                Silence Sensitivity
              </Text>
              <Text style={[typography.ui.caption, { color: theme.colors.textMuted }]}>
                How much silence matters
              </Text>
            </View>
            <View style={styles.levelControl}>
              <TouchableOpacity
                onPress={() => setSilenceSensitivity(Math.max(0, silenceSensitivity - 0.1))}
                style={[styles.levelButton, { borderColor: theme.colors.border }]}
              >
                <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>-</Text>
              </TouchableOpacity>
              <Text style={[typography.ui.caption, { color: theme.colors.accent, minWidth: 40, textAlign: 'center' }]}>
                {Math.round(silenceSensitivity * 100)}%
              </Text>
              <TouchableOpacity
                onPress={() => setSilenceSensitivity(Math.min(1, silenceSensitivity + 0.1))}
                style={[styles.levelButton, { borderColor: theme.colors.border }]}
              >
                <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.settingSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[typography.ui.label, { color: theme.colors.textMuted, marginBottom: theme.spacing.lg }]}>
            Pacing
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[typography.ui.body, { color: theme.colors.text }]}>
                Focus Depth
              </Text>
              <Text style={[typography.ui.caption, { color: theme.colors.textMuted }]}>
                How deeply the story pulls you in
              </Text>
            </View>
            <View style={styles.levelControl}>
              <TouchableOpacity
                onPress={() => setFocusDepth(Math.max(0, focusDepth - 0.1))}
                style={[styles.levelButton, { borderColor: theme.colors.border }]}
              >
                <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>-</Text>
              </TouchableOpacity>
              <Text style={[typography.ui.caption, { color: theme.colors.accent, minWidth: 40, textAlign: 'center' }]}>
                {Math.round(focusDepth * 100)}%
              </Text>
              <TouchableOpacity
                onPress={() => setFocusDepth(Math.min(1, focusDepth + 0.1))}
                style={[styles.levelButton, { borderColor: theme.colors.border }]}
              >
                <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[typography.ui.body, { color: theme.colors.text }]}>
                Pacing Softness
              </Text>
              <Text style={[typography.ui.caption, { color: theme.colors.textMuted }]}>
                Gentler transitions between moments
              </Text>
            </View>
            <View style={styles.levelControl}>
              <TouchableOpacity
                onPress={() => setPacingSoftness(Math.max(0, pacingSoftness - 0.1))}
                style={[styles.levelButton, { borderColor: theme.colors.border }]}
              >
                <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>-</Text>
              </TouchableOpacity>
              <Text style={[typography.ui.caption, { color: theme.colors.accent, minWidth: 40, textAlign: 'center' }]}>
                {Math.round(pacingSoftness * 100)}%
              </Text>
              <TouchableOpacity
                onPress={() => setPacingSoftness(Math.min(1, pacingSoftness + 0.1))}
                style={[styles.levelButton, { borderColor: theme.colors.border }]}
              >
                <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.settingSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[typography.ui.label, { color: theme.colors.textMuted, marginBottom: theme.spacing.lg }]}>
            Reading Space
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[typography.ui.body, { color: theme.colors.text }]}>
                Typography Warmth
              </Text>
              <Text style={[typography.ui.caption, { color: theme.colors.textMuted }]}>
                Warmer, more intimate text feel
              </Text>
            </View>
            <View style={styles.levelControl}>
              <TouchableOpacity
                onPress={() => setTypographyWarmth(Math.max(0, typographyWarmth - 0.1))}
                style={[styles.levelButton, { borderColor: theme.colors.border }]}
              >
                <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>-</Text>
              </TouchableOpacity>
              <Text style={[typography.ui.caption, { color: theme.colors.accent, minWidth: 40, textAlign: 'center' }]}>
                {Math.round(typographyWarmth * 100)}%
              </Text>
              <TouchableOpacity
                onPress={() => setTypographyWarmth(Math.min(1, typographyWarmth + 0.1))}
                style={[styles.levelButton, { borderColor: theme.colors.border }]}
              >
                <Text style={[typography.ui.caption, { color: theme.colors.textSecondary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.ritualSection}>
          <Text style={[typography.ui.caption, { color: theme.colors.textMuted, textAlign: 'center' }]}>
            Your space is ready.
          </Text>
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
  settingSection: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  levelControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ritualSection: {
    paddingVertical: 32,
  },
});

export default ImmersionScreen;
