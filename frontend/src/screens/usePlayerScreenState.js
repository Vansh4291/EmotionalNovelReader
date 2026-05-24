import { useReducer, useRef, useCallback, useEffect } from 'react';
import Tts from 'react-native-tts';
import { getChapterWithSentences, updateProgress, getBookById, getBookmarks, addBookmark, deleteBookmark } from '../database/localDatabase.js';
import { processChapterText } from '../utils/chapterProcessor.js';
import { usePlayerStore } from '../store/playerStore.js';
import { useSettingsStore } from '../store/settingsStore.js';

const EMOTION_PROFILES = {
  joy: { speed: 1.15, pitch: 1.10 }, sadness: { speed: 0.80, pitch: 0.90 },
  anger: { speed: 1.10, pitch: 1.05 }, fear: { speed: 0.95, pitch: 1.05 },
  surprise: { speed: 1.05, pitch: 1.15 }, neutral: { speed: 1.0, pitch: 1.0 },
};

function playerReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'SET_CHAPTER': return { ...state, chapter: action.payload };
    case 'SET_SENTENCES': return { ...state, sentences: action.payload };
    case 'SET_CURRENT_CHAPTER_INDEX': return { ...state, currentChapterIndex: action.payload };
    case 'SET_CURRENT_SENTENCE_INDEX': return { ...state, currentSentenceIndex: action.payload };
    case 'SET_BOOK_CHAPTERS': return { ...state, bookChapters: action.payload };
    case 'SET_SHOW_SLEEP_MODAL': return { ...state, showSleepModal: action.payload };
    case 'SET_BOOKMARKS': return { ...state, bookmarks: action.payload };
    case 'SET_SHOW_BOOKMARKS': return { ...state, showBookmarks: action.payload };
    default: return state;
  }
}

export function usePlayerScreenState(bookId, initialChapterIndex, initialSentenceIndex) {
  const { currentBook, setCurrentBook, speed, pitch, isPlaying, setIsPlaying, setCurrentChapter, setCurrentSentence, setSpeed, sleepTimerMinutes, sleepTimerEndTime, setSleepTimer } = usePlayerStore();
  const { defaultSpeed, defaultPitch } = useSettingsStore();

  const [state, dispatch] = useReducer(playerReducer, {
    chapter: null,
    sentences: [],
    currentChapterIndex: initialChapterIndex || 0,
    currentSentenceIndex: initialSentenceIndex || 0,
    loading: undefined,
    bookChapters: [],
    showSleepModal: false,
    bookmarks: [],
    showBookmarks: false,
  });

  const [sleepTimerState, dispatchSleepTimer] = useReducer(
    (s, action) => {
      switch (action.type) {
        case 'ACTIVATE': return { active: true, remaining: action.remaining };
        case 'DEACTIVATE': return { active: false, remaining: 0 };
        case 'TICK': return { ...s, remaining: action.remaining };
        default: return s;
      }
    }, { active: false, remaining: 0 }
  );

  const flatListRef = useRef(null);
  const sleepTimerRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const listeningTimerRef = useRef(null);
  const listeningSecondsRef = useRef(0);
  const currentSentenceIndexRef = useRef(state.currentSentenceIndex);
  const sentencesRef = useRef(state.sentences);
  const currentChapterIndexRef = useRef(state.currentChapterIndex);
  const bookChaptersRef = useRef(state.bookChapters);

  useEffect(() => { currentSentenceIndexRef.current = state.currentSentenceIndex; }, [state.currentSentenceIndex]);
  useEffect(() => { sentencesRef.current = state.sentences; }, [state.sentences]);
  useEffect(() => { currentChapterIndexRef.current = state.currentChapterIndex; }, [state.currentChapterIndex]);
  useEffect(() => { bookChaptersRef.current = state.bookChapters; }, [state.bookChapters]);

  const saveProgress = useCallback(async (chapterIdx, sentenceIdx) => {
    try { await updateProgress(bookId, chapterIdx, sentenceIdx); }
    catch (error) { console.error('Failed to save progress:', error); }
  }, [bookId]);

  const stopSpeaking = useCallback(async () => {
    try { isSpeakingRef.current = false; await Tts.stop(); setIsPlaying(false); }
    catch (error) { console.error('Stop error:', error); }
  }, [setIsPlaying]);

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

  const loadChapter = useCallback(async (chapterIdx) => {
    try {
      const chapterData = await getChapterWithSentences(bookId, chapterIdx);
      if (chapterData) {
        dispatch({ type: 'SET_CHAPTER', payload: chapterData });
        let processedSentences = chapterData.sentences;
        if (!processedSentences || processedSentences.length === 0) processedSentences = processChapterText(chapterData.rawText);
        dispatch({ type: 'SET_SENTENCES', payload: processedSentences });
        if (processedSentences.length > 0) dispatch({ type: 'SET_CURRENT_SENTENCE_INDEX', payload: chapterIdx === initialChapterIndex ? (initialSentenceIndex || 0) : 0 });
        return processedSentences;
      }
      return [];
    } catch (error) { console.error('Failed to load chapter:', error); return []; }
  }, [bookId, initialChapterIndex, initialSentenceIndex]);

  const nextChapter = useCallback(async (autoPlay = false) => {
    const chapterIdx = currentChapterIndexRef.current;
    const chapters = bookChaptersRef.current;
    if (chapterIdx < chapters.length - 1) {
      await stopSpeaking();
      const nextIdx = chapterIdx + 1;
      dispatch({ type: 'SET_CURRENT_CHAPTER_INDEX', payload: nextIdx });
      dispatch({ type: 'SET_CURRENT_SENTENCE_INDEX', payload: 0 });
      const newSentences = await loadChapter(nextIdx);
      saveProgress(nextIdx, 0);
      if (autoPlay && newSentences && newSentences.length > 0) {
        isSpeakingRef.current = true;
        setIsPlaying(true);
        speakSentence(newSentences[0].text, newSentences[0].emotion);
        flatListRef.current?.scrollToSentence(0);
      }
    }
  }, [stopSpeaking, loadChapter, saveProgress, setIsPlaying, speakSentence]);

  const handleSentenceComplete = useCallback(() => {
    const currentIndex = currentSentenceIndexRef.current;
    const currentSentences = sentencesRef.current;
    const chapterIdx = currentChapterIndexRef.current;
    if (currentIndex < currentSentences.length - 1) {
      dispatch({ type: 'SET_CURRENT_SENTENCE_INDEX', payload: currentIndex + 1 });
      saveProgress(chapterIdx, currentIndex + 1);
    } else {
      saveProgress(chapterIdx, currentIndex);
      nextChapter(true);
    }
  }, [saveProgress, nextChapter]);

  const initTTS = useCallback(async () => {
    try {
      await Promise.all([Tts.setDefaultLanguage('en-US'), Tts.setDefaultRate(defaultSpeed || 1.0), Tts.setDefaultPitch(defaultPitch || 1.0)]);
      Tts.addEventListener('tts-finish', handleSentenceComplete);
      Tts.addEventListener('tts-cancel', () => { isSpeakingRef.current = false; setIsPlaying(false); });
    } catch (error) { console.error('TTS init error:', error); }
  }, [defaultSpeed, defaultPitch, handleSentenceComplete, setIsPlaying]);

  const loadBookAndChapter = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const book = await getBookById(bookId);
      if (book) { dispatch({ type: 'SET_BOOK_CHAPTERS', payload: book.chapters || [] }); setCurrentBook(book); }
      const savedBookmarks = await getBookmarks(bookId);
      dispatch({ type: 'SET_BOOKMARKS', payload: savedBookmarks });
      await loadChapter(state.currentChapterIndex);
    } catch (error) {
      console.error('Failed to load book:', error);
    } finally { dispatch({ type: 'SET_LOADING', payload: false }); }
  }, [bookId, loadChapter, state.currentChapterIndex, setCurrentBook]);

  useEffect(() => {
    initTTS();
    loadBookAndChapter();
    return () => {
      stopSpeaking();
    };
  }, [initTTS, loadBookAndChapter, stopSpeaking]);

  const previousChapter = useCallback(async () => {
    const chapterIdx = currentChapterIndexRef.current;
    if (chapterIdx > 0) {
      await stopSpeaking();
      const prevIdx = chapterIdx - 1;
      dispatch({ type: 'SET_CURRENT_CHAPTER_INDEX', payload: prevIdx });
      dispatch({ type: 'SET_CURRENT_SENTENCE_INDEX', payload: 0 });
      await loadChapter(prevIdx);
      saveProgress(prevIdx, 0);
    }
  }, [stopSpeaking, loadChapter, saveProgress]);

  const handlePlayPause = async () => {
    if (isPlaying) {
      await stopSpeaking();
    } else {
      if (!state.sentences || state.sentences.length === 0) return;
      isSpeakingRef.current = true;
      setIsPlaying(true);
      if (state.sentences[state.currentSentenceIndex]) {
        flatListRef.current?.scrollToSentence(state.currentSentenceIndex);
        speakSentence(state.sentences[state.currentSentenceIndex].text, state.sentences[state.currentSentenceIndex].emotion);
      }
    }
  };

  const handlePreviousSentence = async () => {
    await stopSpeaking();
    dispatch({ type: 'SET_CURRENT_SENTENCE_INDEX', payload: Math.max(0, state.currentSentenceIndex - 1) });
  };

  const handleNextSentence = async () => {
    await stopSpeaking();
    dispatch({ type: 'SET_CURRENT_SENTENCE_INDEX', payload: Math.min(state.sentences.length - 1, state.currentSentenceIndex + 1) });
  };

  const handleBookmark = async () => {
    const newBookmark = await addBookmark(bookId, state.currentChapterIndex, state.currentSentenceIndex);
    if (newBookmark) {
      dispatch({ type: 'SET_BOOKMARKS', payload: [...state.bookmarks, newBookmark] });
      return newBookmark;
    }
    return null;
  };

  const handleDeleteBookmark = async (id) => {
    await deleteBookmark(id);
    const updated = await getBookmarks(bookId);
    dispatch({ type: 'SET_BOOKMARKS', payload: updated });
  };

  const handleJumpToBookmark = async (bm) => {
    if (bm.chapterIndex !== state.currentChapterIndex) {
      dispatch({ type: 'SET_CURRENT_CHAPTER_INDEX', payload: bm.chapterIndex });
      await loadChapter(bm.chapterIndex);
    }
    dispatch({ type: 'SET_CURRENT_SENTENCE_INDEX', payload: bm.sentenceIndex });
    dispatch({ type: 'SET_SHOW_BOOKMARKS', payload: false });
  };

  return {
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
  };
}
