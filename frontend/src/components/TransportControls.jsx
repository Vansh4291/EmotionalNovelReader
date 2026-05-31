import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../utils/themeContext';

const TransportControls = ({
  isPlaying, currentSentenceIndex, totalSentences, speed,
  onPlayPause, onPrevSentence, onNextSentence,
  onPrevChapter, onNextChapter, onSpeedChange,
  theme: themeProp, isFirstChapter, isLastChapter,
}) => {
  const contextTheme = useTheme();
  const theme = themeProp || contextTheme;
  const [showSpeed, setShowSpeed] = React.useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Pressable style={({pressed}) => [styles.btn, pressed && styles.pressed]} onPress={onPrevChapter} disabled={isFirstChapter}>
          <Text style={[styles.btnText, {color: theme.textMuted}, isFirstChapter && styles.disabled]}>⏮</Text>
        </Pressable>
        <Pressable style={({pressed}) => [styles.btn, pressed && styles.pressed]} onPress={onPrevSentence} disabled={currentSentenceIndex <= 0}>
          <Text style={[styles.btnText, {color: theme.textMuted}, currentSentenceIndex <= 0 && styles.disabled]}>◀</Text>
        </Pressable>
        <Pressable style={({pressed}) => [styles.playBtn, {backgroundColor: theme.primary + '20'}, pressed && {backgroundColor: theme.primary + '40'}]} onPress={onPlayPause}>
          <Text style={[styles.playIcon, {color: theme.text}]}>{isPlaying ? '⏸' : '▶'}</Text>
        </Pressable>
        <Pressable style={({pressed}) => [styles.btn, pressed && styles.pressed]} onPress={onNextSentence} disabled={currentSentenceIndex >= totalSentences - 1}>
          <Text style={[styles.btnText, {color: theme.textMuted}, currentSentenceIndex >= totalSentences - 1 && styles.disabled]}>▶</Text>
        </Pressable>
        <Pressable style={({pressed}) => [styles.btn, pressed && styles.pressed]} onPress={onNextChapter} disabled={isLastChapter}>
          <Text style={[styles.btnText, {color: theme.textMuted}, isLastChapter && styles.disabled]}>⏭</Text>
        </Pressable>
      </View>
      <View style={styles.bottomRow}>
        <Text style={[styles.counter, {color: theme.textMuted}]}>
          {totalSentences > 0 ? `${currentSentenceIndex + 1} / ${totalSentences}` : ''}
        </Text>
        <Pressable style={({pressed}) => [styles.speedBtn, pressed && {opacity: 0.5}]} onPress={() => setShowSpeed(!showSpeed)}>
          <Text style={[styles.speedLabel, {color: theme.primary}]}>{speed.toFixed(1)}x</Text>
        </Pressable>
      </View>
      {showSpeed && (
        <View style={[styles.speedBar, {backgroundColor: theme.surfaceElevated}]}>
          {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((v) => (
            <Pressable key={v} style={[styles.speedOption, v === speed && {backgroundColor: theme.primary + '30'}]} onPress={() => { onSpeedChange(v); setShowSpeed(false); }}>
              <Text style={[styles.speedOptionText, {color: v === speed ? theme.primary : theme.textMuted}]}>{v}x</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingBottom: 16 },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8 },
  btn: { padding: 8, marginHorizontal: 6 },
  btnText: { fontSize: 14 },
  playBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginHorizontal: 16 },
  playIcon: { fontSize: 18 },
  pressed: { opacity: 0.5 },
  disabled: { opacity: 0.3 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 },
  counter: { fontSize: 10, letterSpacing: 1 },
  speedBtn: { padding: 4 },
  speedLabel: { fontSize: 11, letterSpacing: 0.5 },
  speedBar: { flexDirection: 'row', justifyContent: 'center', marginHorizontal: 24, marginTop: 8, borderRadius: 8, padding: 4 },
  speedOption: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginHorizontal: 2 },
  speedOptionText: { fontSize: 12 },
});

export default TransportControls;
