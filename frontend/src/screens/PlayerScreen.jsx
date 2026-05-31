import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, StatusBar } from 'react-native';
import { useTheme, THEMES } from '../utils/themeContext.js';
import SentenceList from '../components/SentenceList.jsx';
import TransportControls from '../components/TransportControls.jsx';
import { usePlayerScreenState } from './usePlayerScreenState.js';

const PlayerScreen = ({ route, navigation }) => {
  const { bookId, chapterIndex: initCI, sentenceIndex: initSI } = route.params || {};
  const theme = useTheme();

  const {
    state, flatListRef, handlePlayPause, handlePreviousSentence, handleNextSentence,
    previousChapter, nextChapter, handleJumpToBookmark, speed, setSpeed, isPlaying,
  } = usePlayerScreenState(bookId, initCI, initSI);

  const isLoading = state.loading === true || state.loading === undefined;
  const isLast = state.currentChapterIndex >= state.bookChapters.length - 1;
  const isFirst = state.currentChapterIndex === 0;

  const handleSentencePress = useCallback((index) => {
    handleJumpToBookmark({ chapterIndex: state.currentChapterIndex, sentenceIndex: index });
  }, [handleJumpToBookmark, state.currentChapterIndex]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.background === THEMES.dark.background ? 'light-content' : 'dark-content'} backgroundColor={theme.background} translucent />
      <View style={styles.header}>
        <Pressable style={({pressed}) => [styles.headBtn, pressed && {opacity: 0.5}]} onPress={() => navigation.goBack()}>
          <Text style={[styles.headIcon, {color: theme.textMuted}]}>←</Text>
        </Pressable>
        <Text style={[styles.chapterLabel, {color: theme.primary}]}>
          Chapter {state.currentChapterIndex + 1}
        </Text>
        <View style={styles.headSpacer} />
      </View>
      <View style={styles.textArea}>
        <SentenceList
          ref={flatListRef}
          sentences={state.sentences}
          currentSentenceIndex={state.currentSentenceIndex}
          onSentencePress={handleSentencePress}
          theme={theme}
        />
      </View>
      <View style={styles.controlsArea}>
        <View style={[styles.progress, {backgroundColor: theme.surfaceLight}]}>
          <View style={[styles.progressFill, {backgroundColor: theme.textMuted, width: `${state.sentences.length > 0 ? ((state.currentSentenceIndex + 1) / state.sentences.length) * 100 : 0}%`}]} />
        </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 4 },
  headBtn: { padding: 4, marginRight: 8 },
  headIcon: { fontSize: 18 },
  chapterLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  headSpacer: { flex: 1 },
  textArea: { flex: 1 },
  controlsArea: {},
  progress: { height: 1, marginHorizontal: 24 },
  progressFill: { height: '100%' },
});

export default PlayerScreen;
