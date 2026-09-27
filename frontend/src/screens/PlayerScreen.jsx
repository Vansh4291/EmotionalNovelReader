import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Pressable, StatusBar,
} from 'react-native';
import { useTheme, THEMES } from '../utils/themeContext.js';
import { useSettingsStore } from '../store/settingsStore.js';
import SentenceList from '../components/SentenceList.jsx';
import TransportControls from '../components/TransportControls.jsx';
import ReaderSettingsSheet from '../components/ReaderSettingsSheet.jsx';
import { usePlayerScreenState } from './usePlayerScreenState.js';

const ReaderScreen = ({ route, navigation }) => {
  const { bookId, chapterIndex: initCI, sentenceIndex: initSI } = route.params || {};
  const theme = useTheme();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const fontSize = useSettingsStore((s) => s.readerFontSize);
  const lineHeight = useSettingsStore((s) => s.readerLineHeight);

  const {
    state, flatListRef, handlePlayPause, handlePreviousSentence, handleNextSentence,
    previousChapter, nextChapter, handleJumpToBookmark, speed, setSpeed, isPlaying,
  } = usePlayerScreenState(bookId, initCI, initSI);

  const isLoading = state.loading === true || state.loading === undefined;
  const isLast = state.currentChapterIndex >= state.bookChapters.length - 1;
  const isFirst = state.currentChapterIndex === 0;
  const chapterTitle = state.bookChapters[state.currentChapterIndex]?.title || `Chapter ${state.currentChapterIndex + 1}`;
  const progressPct = state.sentences.length > 0
    ? ((state.currentSentenceIndex + 1) / state.sentences.length) * 100
    : 0;

  const handleSentencePress = useCallback((index) => {
    handleJumpToBookmark({ chapterIndex: state.currentChapterIndex, sentenceIndex: index });
  }, [handleJumpToBookmark, state.currentChapterIndex]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading chapter…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.background === THEMES.dark.background ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
        translucent
      />

      {/* Tap target for toggling chrome — the full text area */}
      <Pressable style={styles.textArea} onPress={() => setChromeVisible((v) => !v)}>
        <SentenceList
          ref={flatListRef}
          sentences={state.sentences}
          currentSentenceIndex={state.currentSentenceIndex}
          onSentencePress={handleSentencePress}
          theme={theme}
          fontSize={fontSize}
          lineHeight={lineHeight}
        />
      </Pressable>

      {/* Progress strip pinned under the content */}
      <View style={[styles.progress, { backgroundColor: theme.surfaceLight }]}>
        <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${progressPct}%` }]} />
      </View>

      {chromeVisible && (
        <>
          <View style={[styles.header, { backgroundColor: theme.surface }]}>
            <Pressable
              style={({ pressed }) => [styles.headBtn, pressed && { opacity: 0.5 }]}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Close reader"
              accessibilityHint="Returns to the book details screen"
            >
              <Text style={[styles.headIcon, { color: theme.textMuted }]} accessible={false}>←</Text>
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={[styles.chapterLabel, { color: theme.primary }]} numberOfLines={1} allowFontScaling>
                {chapterTitle}
              </Text>
              <Text style={[styles.chapterMeta, { color: theme.textMuted }]} allowFontScaling>
                Chapter {state.currentChapterIndex + 1} of {Math.max(state.bookChapters.length, 1)}
                {'  ·  '}
                {Math.round(progressPct)}%
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.headBtn, pressed && { opacity: 0.5 }]}
              onPress={() => setSettingsVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Reader settings"
              accessibilityHint="Opens text size and line height controls"
            >
              <Text style={[styles.headIcon, { color: theme.textMuted }]} accessible={false}>Aa</Text>
            </Pressable>
          </View>

          <View style={styles.controlsArea}>
            <TransportControls
              isPlaying={isPlaying}
              currentSentenceIndex={state.currentSentenceIndex}
              totalSentences={state.sentences.length}
              speed={speed}
              onPlayPause={handlePlayPause}
              onPrevSentence={handlePreviousSentence}
              onNextSentence={handleNextSentence}
              onPrevChapter={previousChapter}
              onNextChapter={nextChapter}
              onSpeedChange={setSpeed}
              theme={theme}
              isFirstChapter={isFirst}
              isLastChapter={isLast}
            />
          </View>
        </>
      )}

      <ReaderSettingsSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        theme={theme}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  headBtn: { padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  headIcon: { fontSize: 17, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  chapterLabel: { fontSize: 15, fontWeight: '600' },
  chapterMeta: { fontSize: 11, marginTop: 2, letterSpacing: 0.3 },
  textArea: { flex: 1 },
  controlsArea: {},
  progress: { height: 2, marginHorizontal: 24 },
  progressFill: { height: '100%' },
});

export default ReaderScreen;
