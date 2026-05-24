import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { useTheme, THEMES } from '../utils/themeContext.js';
import SleepTimerModal from '../components/SleepTimerModal.jsx';
import SentenceList from '../components/SentenceList.jsx';
import TransportControls from '../components/TransportControls.jsx';
import BookmarkPanel from '../components/BookmarkPanel.jsx';
import PlayerHeader from '../components/PlayerHeader.jsx';
import { usePlayerScreenState } from './usePlayerScreenState.js';

const PlayerScreen = ({ route, navigation }) => {
  const { bookId, chapterIndex: initialChapterIndex, sentenceIndex: initialSentenceIndex } = route.params || {};
  const theme = useTheme();

  const {
    state,
    dispatch,
    sleepTimerState,
    flatListRef,
    handlePlayPause,
    handlePreviousSentence,
    handleNextSentence,
    previousChapter,
    nextChapter,
    handleBookmark,
    handleDeleteBookmark,
    handleJumpToBookmark,
    currentBook,
    speed,
    setSpeed,
    isPlaying
  } = usePlayerScreenState(bookId, initialChapterIndex, initialSentenceIndex);

  const currentEmotion = state.sentences[state.currentSentenceIndex]?.emotion || 'neutral';

  if (state.loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.background === THEMES.dark.background ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      <PlayerHeader
        title={currentBook?.title || 'Unknown'}
        subtitle={state.chapter?.title || `Chapter ${state.currentChapterIndex + 1}`}
        onBack={() => navigation.goBack()}
        onBookmarks={() => dispatch({ type: 'SET_SHOW_BOOKMARKS', payload: true })}
        onSleepTimer={() => dispatch({ type: 'SET_SHOW_SLEEP_MODAL', payload: true })}
      />
      {sleepTimerState.active && sleepTimerState.remaining > 0 && (
        <View style={[styles.sleepTimerBanner, { backgroundColor: theme.warning }]}>
          <Text style={[styles.sleepTimerText, { color: theme.background }]}>Sleep in {sleepTimerState.remaining} min</Text>
        </View>
      )}
      <SleepTimerModal visible={state.showSleepModal} onClose={() => dispatch({ type: 'SET_SHOW_SLEEP_MODAL', payload: false })} />
      <BookmarkPanel
        bookmarks={state.bookmarks}
        visible={state.showBookmarks}
        onJumpToBookmark={handleJumpToBookmark}
        onDeleteBookmark={handleDeleteBookmark}
        onClose={() => dispatch({ type: 'SET_SHOW_BOOKMARKS', payload: false })}
        theme={theme}
      />
      <SentenceList
        ref={flatListRef}
        sentences={state.sentences}
        currentSentenceIndex={state.currentSentenceIndex}
        onSentencePress={(index) => dispatch({ type: 'SET_CURRENT_SENTENCE_INDEX', payload: index })}
        theme={theme}
      />
      <TransportControls
        isPlaying={isPlaying}
        currentSentenceIndex={state.currentSentenceIndex}
        totalSentences={state.sentences.length}
        currentEmotion={currentEmotion}
        speed={speed}
        onPlayPause={handlePlayPause}
        onPrevSentence={handlePreviousSentence}
        onNextSentence={handleNextSentence}
        onPrevChapter={previousChapter}
        onNextChapter={() => nextChapter()}
        onBookmark={async () => {
          const newBookmark = await handleBookmark();
          if (newBookmark) {
            Alert.alert('Bookmark added', `Ch ${state.currentChapterIndex + 1} · Sentence ${state.currentSentenceIndex + 1}`);
          }
        }}
        onSpeedChange={(value) => setSpeed(value)}
        theme={theme}
        isFirstChapter={state.currentChapterIndex === 0}
        isLastChapter={state.currentChapterIndex >= state.bookChapters.length - 1}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sleepTimerBanner: { paddingVertical: 6, alignItems: 'center' },
  sleepTimerText: { fontWeight: '600' },
});

export default PlayerScreen;
