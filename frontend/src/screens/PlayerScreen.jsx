import React, { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, StatusBar } from 'react-native';
import Tts from 'react-native-tts';
import { getChapterWithSentences, updateProgress, getBookById, getBookmarks, addBookmark, deleteBookmark } from '../database/localDatabase';
import { processChapterText } from '../utils/chapterProcessor';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme, THEMES } from '../utils/themeContext';
import SleepTimerModal from '../components/SleepTimerModal';
import SentenceList from '../components/SentenceList';
import TransportControls from '../components/TransportControls';
import BookmarkPanel from '../components/BookmarkPanel';
import PlayerHeader from '../components/PlayerHeader';

const EMOTION_PROFILES = {
  joy: { speed: 1.15, pitch: 1.10 }, sadness: { speed: 0.80, pitch: 0.90 },
  anger: { speed: 1.10, pitch: 1.05 }, fear: { speed: 0.95, pitch: 1.05 },
  surprise: { speed: 1.05, pitch: 1.15 }, neutral: { speed: 1.0, pitch: 1.0 },
};

const PlayerScreen = ({ route, navigation }) => {
  const { bookId, chapterIndex: initialChapterIndex, sentenceIndex: initialSentenceIndex } = route.params || {};
  const { currentBook, setCurrentBook, speed, pitch, isPlaying, setIsPlaying, setCurrentChapter, setCurrentSentence, setSpeed, sleepTimerMinutes, sleepTimerEndTime, setSleepTimer } = usePlayerStore();
  const { defaultSpeed, defaultPitch, defaultVolume } = useSettingsStore();

  const [chapter, setChapter] = useState(null);
  const [sentences, setSentences] = useState([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(initialChapterIndex || 0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(initialSentenceIndex || 0);
  const [loading, setLoading] = useState(undefined);
  const [bookChapters, setBookChapters] = useState([]);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [sleepTimerState, dispatchSleepTimer] = useReducer(
    (state, action) => {
      switch (action.type) {
        case 'ACTIVATE': return { active: true, remaining: action.remaining };
        case 'DEACTIVATE': return { active: false, remaining: 0 };
        case 'TICK': return { ...state, remaining: action.remaining };
        default: return state;
      }
    }, { active: false, remaining: 0 }
  );

  const currentEmotion = sentences[currentSentenceIndex]?.emotion || 'neutral';
  const theme = useTheme();

  const flatListRef = useRef(null);
  const sleepTimerRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const listeningTimerRef = useRef(null);
  const listeningSecondsRef = useRef(0);
  const currentSentenceIndexRef = useRef(currentSentenceIndex);
  const sentencesRef = useRef(sentences);
  const currentChapterIndexRef = useRef(currentChapterIndex);
  const bookChaptersRef = useRef(bookChapters);

  useEffect(() => { currentSentenceIndexRef.current = currentSentenceIndex; }, [currentSentenceIndex]);
  useEffect(() => { sentencesRef.current = sentences; }, [sentences]);
  useEffect(() => { currentChapterIndexRef.current = currentChapterIndex; }, [currentChapterIndex]);
  useEffect(() => { bookChaptersRef.current = bookChapters; }, [bookChapters]);

  if (defaultSpeed && defaultSpeed !== speed) setSpeed(defaultSpeed);

  const saveProgress = useCallback(async (chapterIdx, sentenceIdx) => {
    try { await updateProgress(bookId, chapterIdx, sentenceIdx); }
    catch (error) { console.error('Failed to save progress:', error); }
  }, [bookId]);

  const nextChapter = useCallback(async (autoPlay = false) => {
    const chapterIdx = currentChapterIndexRef.current;
    const chapters = bookChaptersRef.current;
    if (chapterIdx < chapters.length - 1) {
      await stopSpeaking();
      const nextIdx = chapterIdx + 1;
      setCurrentChapterIndex(nextIdx);
      setCurrentSentenceIndex(0);
      const newSentences = await loadChapter(nextIdx);
      saveProgress(nextIdx, 0);
      if (autoPlay && newSentences && newSentences.length > 0) {
        isSpeakingRef.current = true;
        setIsPlaying(true);
        speakSentence(newSentences[0].text, newSentences[0].emotion);
        flatListRef.current?.scrollToSentence(0);
      }
    }
  }, [stopSpeaking, setCurrentChapterIndex, setCurrentSentenceIndex, loadChapter, saveProgress, setIsPlaying, speakSentence]);

  const handleSentenceComplete = useCallback(() => {
    const currentIndex = currentSentenceIndexRef.current;
    const currentSentences = sentencesRef.current;
    const chapterIdx = currentChapterIndexRef.current;
    if (currentIndex < currentSentences.length - 1) {
      setCurrentSentenceIndex(currentIndex + 1);
      saveProgress(chapterIdx, currentIndex + 1);
    } else {
      saveProgress(chapterIdx, currentIndex);
      nextChapter(true);
    }
  }, [setCurrentSentenceIndex, saveProgress, nextChapter]);

  const initTTS = useCallback(async () => {
    try {
      await Promise.all([Tts.setDefaultLanguage('en-US'), Tts.setDefaultRate(defaultSpeed || 1.0), Tts.setDefaultPitch(defaultPitch || 1.0)]);
      Tts.addEventListener('tts-finish', handleSentenceComplete);
      Tts.addEventListener('tts-cancel', () => { isSpeakingRef.current = false; setIsPlaying(false); });
    } catch (error) { console.error('TTS init error:', error); }
  }, [defaultSpeed, defaultPitch, handleSentenceComplete, setIsPlaying]);

  const loadChapter = useCallback(async (chapterIdx) => {
    try {
      const chapterData = await getChapterWithSentences(bookId, chapterIdx);
      if (chapterData) {
        setChapter(chapterData);
        let processedSentences = chapterData.sentences;
        if (!processedSentences || processedSentences.length === 0) processedSentences = processChapterText(chapterData.rawText);
        setSentences(processedSentences);
        if (processedSentences.length > 0) setCurrentSentenceIndex(chapterIdx === initialChapterIndex ? (initialSentenceIndex || 0) : 0);
        return processedSentences;
      }
      return [];
    } catch (error) { console.error('Failed to load chapter:', error); return []; }
  }, [bookId, initialChapterIndex, initialSentenceIndex]);

  const loadBookAndChapter = useCallback(async () => {
    try {
      setLoading(true);
      const book = await getBookById(bookId);
      if (book) { setBookChapters(book.chapters || []); setCurrentBook(book); }
      const savedBookmarks = await getBookmarks(bookId);
      setBookmarks(savedBookmarks);
      await loadChapter(currentChapterIndex);
    } catch (error) {
      console.error('Failed to load book:', error);
      Alert.alert('Error', 'Failed to load book.');
    } finally { setLoading(false); }
  }, [bookId, setBookChapters, setCurrentBook, setBookmarks, loadChapter, currentChapterIndex, setLoading]);

  useEffect(() => {
    initTTS();
    loadBookAndChapter();
    const seconds = listeningSecondsRef.current;
    const chapterIdx = currentChapterIndexRef.current;
    const sentenceIdx = currentSentenceIndexRef.current;
    const sleepTimer = sleepTimerRef.current;
    const listeningTimer = listeningTimerRef.current;
    return () => {
      if (seconds > 0) updateProgress(bookId, chapterIdx, sentenceIdx, seconds);
      stopSpeaking();
      if (sleepTimer) clearTimeout(sleepTimer);
      if (listeningTimer) clearInterval(listeningTimer);
    };
  }, [bookId, initTTS, loadBookAndChapter, stopSpeaking]);

  const handleSleepTimerEnd = useCallback(() => {
    stopSpeaking();
    setSleepTimer(0);
    dispatchSleepTimer({ type: 'DEACTIVATE' });
  }, [stopSpeaking, setSleepTimer]);

  useEffect(() => {
    if (sleepTimerMinutes > 0 && sleepTimerEndTime) {
      dispatchSleepTimer({ type: 'ACTIVATE', remaining: Math.max(0, Math.ceil((sleepTimerEndTime - Date.now()) / 60000)) });
      const timeoutDuration = sleepTimerEndTime - Date.now();
      if (timeoutDuration > 0) sleepTimerRef.current = setTimeout(handleSleepTimerEnd, timeoutDuration);
      const interval = setInterval(() => {
        const rem = Math.max(0, Math.ceil((sleepTimerEndTime - Date.now()) / 60000));
        if (rem <= 0) { clearInterval(interval); handleSleepTimerEnd(); }
        else dispatchSleepTimer({ type: 'TICK', remaining: rem });
      }, 10000);
      return () => clearInterval(interval);
    } else {
      if (sleepTimerRef.current) { clearTimeout(sleepTimerRef.current); sleepTimerRef.current = null; }
      dispatchSleepTimer({ type: 'DEACTIVATE' });
    }
  }, [sleepTimerMinutes, sleepTimerEndTime, handleSleepTimerEnd]);

  useEffect(() => {
    if (isPlaying && !listeningTimerRef.current) {
      listeningTimerRef.current = setInterval(() => { listeningSecondsRef.current += 1; }, 1000);
    } else if (!isPlaying && listeningTimerRef.current) {
      clearInterval(listeningTimerRef.current);
      listeningTimerRef.current = null;
    }
    return () => {
      if (listeningTimerRef.current) { clearInterval(listeningTimerRef.current); listeningTimerRef.current = null; }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (sentences.length > 0 && currentSentenceIndex < sentences.length && isSpeakingRef.current) {
      speakSentence(sentences[currentSentenceIndex].text, sentences[currentSentenceIndex].emotion);
    }
  }, [currentSentenceIndex, sentences, speakSentence]);

  const speakSentence = useCallback(async (text, emotion) => {
    try {
      const emotionProfile = EMOTION_PROFILES[emotion] || EMOTION_PROFILES.neutral;
      const finalSpeed = speed * emotionProfile.speed;
      const finalPitch = pitch * emotionProfile.pitch;
      await Promise.all([
        Tts.setDefaultRate(Math.max(0.5, Math.min(2.0, finalSpeed))),
        Tts.setDefaultPitch(Math.max(0.5, Math.min(2.0, finalPitch))),
      ]);
      await Tts.speak(text);
    } catch (error) { console.error('Speak error:', error); }
  }, [speed, pitch]);

  const stopSpeaking = useCallback(async () => {
    try { isSpeakingRef.current = false; await Tts.stop(); setIsPlaying(false); }
    catch (error) { console.error('Stop error:', error); }
  }, [setIsPlaying]);

  const handlePlayPause = async () => {
    if (isPlaying) {
      await stopSpeaking();
    } else {
      if (!sentences || sentences.length === 0) return;
      isSpeakingRef.current = true;
      setIsPlaying(true);
      if (sentences[currentSentenceIndex]) {
        flatListRef.current?.scrollToSentence(currentSentenceIndex);
        speakSentence(sentences[currentSentenceIndex].text, sentences[currentSentenceIndex].emotion);
      }
    }
  };

  const handlePreviousSentence = async () => {
    await stopSpeaking();
    setCurrentSentenceIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextSentence = async () => {
    await stopSpeaking();
    setCurrentSentenceIndex(prev => Math.min(sentences.length - 1, prev + 1));
  };

  const previousChapter = useCallback(async () => {
    const chapterIdx = currentChapterIndexRef.current;
    if (chapterIdx > 0) {
      await stopSpeaking();
      const prevIdx = chapterIdx - 1;
      setCurrentChapterIndex(prevIdx);
      setCurrentSentenceIndex(0);
      await loadChapter(prevIdx);
      saveProgress(prevIdx, 0);
    }
  }, [stopSpeaking, setCurrentChapterIndex, setCurrentSentenceIndex, loadChapter, saveProgress]);

  if (loading) {
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
        subtitle={chapter?.title || `Chapter ${currentChapterIndex + 1}`}
        onBack={() => navigation.goBack()}
        onBookmarks={() => setShowBookmarks(true)}
        onSleepTimer={() => setShowSleepModal(true)}
      />
      {sleepTimerState.active && sleepTimerState.remaining > 0 && (
        <View style={[styles.sleepTimerBanner, { backgroundColor: theme.warning }]}>
          <Text style={[styles.sleepTimerText, { color: theme.background }]}>Sleep in {sleepTimerState.remaining} min</Text>
        </View>
      )}
      <SleepTimerModal visible={showSleepModal} onClose={() => setShowSleepModal(false)} />
      <BookmarkPanel
        bookmarks={bookmarks}
        visible={showBookmarks}
        onJumpToBookmark={(bm) => {
          if (bm.chapterIndex !== currentChapterIndex) {
            setCurrentChapterIndex(bm.chapterIndex);
            loadChapter(bm.chapterIndex).then(() => setCurrentSentenceIndex(bm.sentenceIndex));
          } else setCurrentSentenceIndex(bm.sentenceIndex);
          setShowBookmarks(false);
        }}
        onDeleteBookmark={async (id) => {
          await deleteBookmark(id);
          setBookmarks(await getBookmarks(bookId));
        }}
        onClose={() => setShowBookmarks(false)}
        theme={theme}
      />
      <SentenceList
        ref={flatListRef}
        sentences={sentences}
        currentSentenceIndex={currentSentenceIndex}
        onSentencePress={async (index) => { await stopSpeaking(); setCurrentSentenceIndex(index); }}
        theme={theme}
      />
      <TransportControls
        isPlaying={isPlaying}
        currentSentenceIndex={currentSentenceIndex}
        totalSentences={sentences.length}
        currentEmotion={currentEmotion}
        speed={speed}
        onPlayPause={handlePlayPause}
        onPrevSentence={handlePreviousSentence}
        onNextSentence={handleNextSentence}
        onPrevChapter={previousChapter}
        onNextChapter={() => nextChapter()}
        onBookmark={async () => {
          const newBookmark = await addBookmark(bookId, currentChapterIndex, currentSentenceIndex);
          if (newBookmark) {
            setBookmarks([...bookmarks, newBookmark]);
            Alert.alert('Bookmark added', `Ch ${currentChapterIndex + 1} · Sentence ${currentSentenceIndex + 1}`);
          }
        }}
        onSpeedChange={(value) => setSpeed(value)}
        theme={theme}
        isFirstChapter={currentChapterIndex === 0}
        isLastChapter={currentChapterIndex >= bookChapters.length - 1}
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
