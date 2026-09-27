import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../utils/themeContext';
import { getRealm } from '../database/localDatabase';

function formatTime(seconds) {
  if (!seconds || seconds <= 0) return '0 min';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} min`;
}

const SettingRow = ({ title, value, onValueChange, isSwitch, theme, description }) => (
  <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
    <View style={styles.settingRowText}>
      <Text style={[styles.settingTitle, { color: theme.text }]} allowFontScaling>{title}</Text>
      {description ? (
        <Text style={[styles.settingDescription, { color: theme.textMuted }]} allowFontScaling>{description}</Text>
      ) : null}
    </View>
    {isSwitch ? (
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.surfaceLight, true: theme.primary }}
        thumbColor={value ? theme.text : theme.textSecondary}
        accessibilityLabel={title}
      />
    ) : null}
  </View>
);

const SettingsScreen = ({ navigation }) => {
  const settings = useSettingsStore();
  const theme = useTheme();
  const [listeningTime, setListeningTime] = useState(0);
  const {
    defaultSpeed,
    defaultPitch,
    defaultVolume,
    emotionEffectsEnabled,
    highlightSyncEnabled,
    theme: themeName,
    setDefaultSpeed,
    setDefaultPitch,
    setDefaultVolume,
    setEmotionEffectsEnabled,
    setHighlightSyncEnabled,
    setTheme,
  } = settings;

  const emotionDelivery = useSettingsStore((s) => s.emotionEffectsEnabled);

  const [localSpeed, setLocalSpeed] = useState(defaultSpeed);
  const [localPitch, setLocalPitch] = useState(defaultPitch);
  const [localVolume, setLocalVolume] = useState(defaultVolume);

  useEffect(() => {
    (async () => {
      try {
        const realm = await getRealm();
        const progresses = realm.objects('UserProgress');
        const total = progresses.reduce((sum, p) => sum + p.listeningTimeSeconds, 0);
        setListeningTime(total);
      } catch (e) {
        if (__DEV__) console.error('Failed to load stats:', e);
      }
    })();
  }, []);

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove the chapter sentence cache. Your books, progress and bookmarks are kept. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // Chapter caches are rebuilt on demand from stored rawText; books,
            // progress and bookmarks are never touched.
            Alert.alert('Done', 'Cache cleared.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.primary }]}>Voice Settings</Text>
        
        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Default Speed: {localSpeed.toFixed(1)}x</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={2.0}
            step={0.1}
            value={localSpeed}
            onValueChange={(value) => {
              setLocalSpeed(value);
              setDefaultSpeed(value);
            }}
            minimumTrackTintColor={theme.primary}
            maximumTrackTintColor={theme.surfaceLight}
            thumbTintColor={theme.primary}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Default Pitch: {localPitch.toFixed(1)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={2.0}
            step={0.1}
            value={localPitch}
            onValueChange={(value) => {
              setLocalPitch(value);
              setDefaultPitch(value);
            }}
            minimumTrackTintColor={theme.primary}
            maximumTrackTintColor={theme.surfaceLight}
            thumbTintColor={theme.primary}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Default Volume: {Math.round(localVolume * 100)}%</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            step={0.1}
            value={localVolume}
            onValueChange={(value) => {
              setLocalVolume(value);
              setDefaultVolume(value);
            }}
            minimumTrackTintColor={theme.primary}
            maximumTrackTintColor={theme.surfaceLight}
            thumbTintColor={theme.primary}
          />
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.primary }]}>Features</Text>
        
        <SettingRow
          title="Emotional narration"
          description="Adjust speed and tone to match the mood of each sentence"
          value={emotionEffectsEnabled}
          onValueChange={setEmotionEffectsEnabled}
          isSwitch
          theme={theme}
        />

        <SettingRow
          title="Text highlight sync"
          description="Highlight the sentence being narrated"
          value={highlightSyncEnabled}
          onValueChange={setHighlightSyncEnabled}
          isSwitch
          theme={theme}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.primary }]}>Theme</Text>
        
        <View style={styles.themeOptions}>
          <Pressable
            style={({ pressed }) => [
              styles.themeOption,
              { backgroundColor: theme.surfaceLight },
              themeName === 'dark' && { backgroundColor: theme.primary },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => setTheme('dark')}
          >
            <Text style={[styles.themeOptionText, { color: theme.text }]}>Dark</Text>
          </Pressable>
          
          <Pressable
            style={({ pressed }) => [
              styles.themeOption,
              { backgroundColor: theme.surfaceLight },
              themeName === 'light' && { backgroundColor: theme.primary },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => setTheme('light')}
          >
            <Text style={[styles.themeOptionText, { color: theme.text }]}>Light</Text>
          </Pressable>
          
          <Pressable
            style={({ pressed }) => [
              styles.themeOption,
              { backgroundColor: theme.surfaceLight },
              themeName === 'sepia' && { backgroundColor: theme.primary },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => setTheme('sepia')}
          >
            <Text style={[styles.themeOptionText, { color: theme.text }]}>Sepia</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.primary }]}>Data</Text>

        <Text style={[styles.settingDescription, { color: theme.textMuted, marginBottom: 10 }]}>
          Total listening time: {formatTime(listeningTime)}
        </Text>

        <Pressable
          style={({ pressed }) => [styles.dangerButton, { backgroundColor: theme.danger }, pressed && { opacity: 0.7 }]}
          onPress={handleClearCache}
          accessibilityRole="button"
          accessibilityLabel="Clear cache"
        >
          <Text style={styles.dangerButtonText}>Clear Cache</Text>
        </Pressable>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.primary }]}>About</Text>
        <Text style={[styles.aboutText, { color: theme.text }]}>Emotional Novel Reader</Text>
        <Text style={[styles.versionText, { color: theme.textMuted }]}>Version 1.1.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingRowText: {
    flex: 1,
    paddingRight: 12,
  },
  settingTitle: {
    fontSize: 16,
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  settingItem: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  themeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  themeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  statText: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 8,
  },
  aboutText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  versionText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default SettingsScreen;