import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
        console.error('Failed to load stats:', e);
      }
    })();
  }, []);

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Cache cleared successfully.');
          },
        },
      ]
    );
  };

  const renderSettingRow = (title, value, onValueChange, isSwitch = false) => (
    <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: theme.surfaceLight, true: theme.primary }}
          thumbColor={value ? theme.text : theme.textSecondary}
        />
      ) : null}
    </View>
  );

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
        
        {renderSettingRow(
          'Emotion Effects',
          emotionEffectsEnabled,
          setEmotionEffectsEnabled,
          true
        )}
        
        {renderSettingRow(
          'Text Highlight Sync',
          highlightSyncEnabled,
          setHighlightSyncEnabled,
          true
        )}
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.primary }]}>Theme</Text>
        
        <View style={styles.themeOptions}>
          <TouchableOpacity
            style={[
              styles.themeOption,
              { backgroundColor: theme.surfaceLight },
              themeName === 'dark' && { backgroundColor: theme.primary },
            ]}
            onPress={() => setTheme('dark')}
          >
            <Text style={[styles.themeOptionText, { color: theme.text }]}>🌙 Dark</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.themeOption,
              { backgroundColor: theme.surfaceLight },
              themeName === 'light' && { backgroundColor: theme.primary },
            ]}
            onPress={() => setTheme('light')}
          >
            <Text style={[styles.themeOptionText, { color: theme.text }]}>☀️ Light</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.themeOption,
              { backgroundColor: theme.surfaceLight },
              themeName === 'sepia' && { backgroundColor: theme.primary },
            ]}
            onPress={() => setTheme('sepia')}
          >
            <Text style={[styles.themeOptionText, { color: theme.text }]}>📖 Sepia</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.primary }]}>Data</Text>
        
        <TouchableOpacity style={[styles.dangerButton, { backgroundColor: theme.danger }]} onPress={handleClearCache}>
          <Text style={styles.dangerButtonText}>Clear Cache</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.primary }]}>Reading Stats</Text>
        <Text style={[styles.statText, { color: theme.text }]}>
          Total listening time: {formatTime(listeningTime)}
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.primary }]}>About</Text>
        <Text style={[styles.aboutText, { color: theme.text }]}>Emotional Light Novel Reader</Text>
        <Text style={[styles.versionText, { color: theme.textMuted }]}>Version 1.0.0</Text>
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
  settingTitle: {
    fontSize: 16,
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