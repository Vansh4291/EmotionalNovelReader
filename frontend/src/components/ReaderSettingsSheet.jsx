import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSettingsStore } from '../store/settingsStore.js';

const FONT_SIZES = [16, 18, 20, 22, 24, 28];
const LINE_HEIGHTS = [1.3, 1.5, 1.7, 1.9, 2.1];

/**
 * Reader settings bottom sheet: font size + line height. Values persist via
 * the settings store (Realm-backed) and apply live to the reader.
 */
const ReaderSettingsSheet = ({ visible, onClose, theme }) => {
  const fontSize = useSettingsStore((s) => s.readerFontSize);
  const lineHeight = useSettingsStore((s) => s.readerLineHeight);
  const setReaderFontSize = useSettingsStore((s) => s.setReaderFontSize);
  const setReaderLineHeight = useSettingsStore((s) => s.setReaderLineHeight);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.sheetTitle, { color: theme.text }]} accessibilityRole="header">
            Reader Settings
          </Text>

          <Text style={[styles.controlLabel, { color: theme.textSecondary }]} allowFontScaling>
            Text size · {fontSize}pt
          </Text>
          <View style={styles.sizeRow}>
            {FONT_SIZES.map((size) => (
              <Pressable
                key={size}
                style={({ pressed }) => [
                  styles.sizeChip,
                  { backgroundColor: fontSize === size ? theme.primary : theme.surfaceLight },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => setReaderFontSize(size)}
                accessibilityRole="button"
                accessibilityLabel={`Text size ${size}`}
                accessibilityState={{ selected: fontSize === size }}
              >
                <Text style={[styles.sizeChipText, { color: fontSize === size ? theme.surface : theme.text }]}>
                  A{size >= 24 ? '+' : ''}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.controlLabel, { color: theme.textSecondary }]} allowFontScaling>
            Line height · {lineHeight.toFixed(1)}x
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={1.2}
            maximumValue={2.2}
            step={0.1}
            value={lineHeight}
            onValueChange={setReaderLineHeight}
            minimumTrackTintColor={theme.primary}
            maximumTrackTintColor={theme.surfaceLight}
            thumbTintColor={theme.primary}
            accessibilityLabel="Line height"
          />

          <Pressable
            style={({ pressed }) => [styles.doneButton, { backgroundColor: theme.primary }, pressed && { opacity: 0.8 }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={[styles.doneButtonText, { color: theme.surface }]}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 18,
  },
  controlLabel: {
    fontSize: 13,
    marginBottom: 10,
  },
  sizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  sizeChip: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeChipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 16,
  },
  doneButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ReaderSettingsSheet;
