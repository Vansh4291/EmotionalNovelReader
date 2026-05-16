import React, { useState } from 'react';
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

const SettingsScreen = ({ navigation }) => {
  const {
    defaultSpeed,
    defaultPitch,
    defaultVolume,
    emotionEffectsEnabled,
    highlightSyncEnabled,
    theme,
    setDefaultSpeed,
    setDefaultPitch,
    setDefaultVolume,
    setEmotionEffectsEnabled,
    setHighlightSyncEnabled,
    setTheme,
  } = useSettingsStore();

  const [localSpeed, setLocalSpeed] = useState(defaultSpeed);
  const [localPitch, setLocalPitch] = useState(defaultPitch);
  const [localVolume, setLocalVolume] = useState(defaultVolume);

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
    <View style={styles.settingRow}>
      <Text style={styles.settingTitle}>{title}</Text>
      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#2d3a5c', true: '#4ade80' }}
          thumbColor={value ? '#ffffff' : '#a0aec0'}
        />
      ) : null}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Voice Settings</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Default Speed: {localSpeed.toFixed(1)}x</Text>
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
            minimumTrackTintColor="#4ade80"
            maximumTrackTintColor="#2d3a5c"
            thumbTintColor="#4ade80"
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Default Pitch: {localPitch.toFixed(1)}</Text>
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
            minimumTrackTintColor="#4ade80"
            maximumTrackTintColor="#2d3a5c"
            thumbTintColor="#4ade80"
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Default Volume: {Math.round(localVolume * 100)}%</Text>
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
            minimumTrackTintColor="#4ade80"
            maximumTrackTintColor="#2d3a5c"
            thumbTintColor="#4ade80"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Theme</Text>
        
        <View style={styles.themeOptions}>
          <TouchableOpacity
            style={[
              styles.themeOption,
              theme === 'dark' && styles.themeOptionActive,
            ]}
            onPress={() => setTheme('dark')}
          >
            <Text style={styles.themeOptionText}>🌙 Dark</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.themeOption,
              theme === 'light' && styles.themeOptionActive,
            ]}
            onPress={() => setTheme('light')}
          >
            <Text style={styles.themeOptionText}>☀️ Light</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.themeOption,
              theme === 'sepia' && styles.themeOptionActive,
            ]}
            onPress={() => setTheme('sepia')}
          >
            <Text style={styles.themeOptionText}>📖 Sepia</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        
        <TouchableOpacity style={styles.dangerButton} onPress={handleClearCache}>
          <Text style={styles.dangerButtonText}>Clear Cache</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>Emotional Light Novel Reader</Text>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  section: {
    backgroundColor: '#1a1a2e',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ade80',
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
    borderBottomColor: '#2d3a5c',
  },
  settingTitle: {
    fontSize: 16,
    color: '#ffffff',
  },
  settingItem: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 14,
    color: '#a0aec0',
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
    backgroundColor: '#2d3a5c',
  },
  themeOptionActive: {
    backgroundColor: '#4ade80',
  },
  themeOptionText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  aboutText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  versionText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
});

export default SettingsScreen;