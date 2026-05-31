import { useReducer, useRef, useCallback, useEffect } from 'react';
import Tts from 'react-native-tts';
import { getChapterWithSentences, updateProgress, getBookById, getBookmarks, addBookmark, deleteBookmark } from '../database/localDatabase.js';
import { processChapterText } from '../utils/chapterProcessor.js';
import { usePlayerStore } from '../store/playerStore.js';
import { useSettingsStore } from '../store/settingsStore.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EMOTION_PROFILES = {
  joy: { speed: 1.15, pitch: 1.10 },
  sadness: { speed: 0.78, pitch: 0.88 },
  anger: { speed: 1.10, pitch: 1.05 },
  fear: { speed: 0.90, pitch: 1.08 },
  surprise: { speed: 1.05, pitch: 1.15 },
  neutral: { speed: 1.0, pitch: 1.0 },
};

const EMOTION_PAUSE_MS = {
  sadness: 1000, fear: 800, joy: 350, anger: 200,
  surprise: 450, awe: 1400, neutral: 250,
};

const EMPHASIS_PAUSE_MS = 600;

function perceptualSpeed(uiSpeed) {
  if (uiSpeed <= 0.5) return 0.22;
  if (uiSpeed <= 0.75) return 0.32;
  if (uiSpeed <= 1.0) return 0.40;
  if (uiSpeed <= 1.25) return 0.50;
  if (uiSpeed <= 1.5) return 0.60;
  return 0.78;
}

function getDeliveryParams(sentence, emotion, baseSpeed, basePitch) {
  const profile = EMOTION_PROFILES[emotion] || EMOTION_PROFILES.neutral;
  let speed = baseSpeed * profile.speed;
  let pitch = basePitch * profile.pitch;
  let pauseBefore = 0;
  let pauseAfter = EMOTION_PAUSE_MS[emotion] || 250;

  if (sentence.isDialogue) {
    speed *= 0.88;
    pitch *= 1.06;
  }

  if (sentence.isQuestion) {
    pitch *= 1.08;
  }

  if (sentence.emphasisWords && sentence.emphasisWords.length > 0) {
    speed *= 0.82;
    pauseBefore = 300;
    pauseAfter += EMPHASIS_PAUSE_MS;
  }

  return {
    speed: perceptualSpeed(Math.max(0.5, Math.min(2.0, speed))),
    pitch: Math.max(0.5, Math.min(2.0, pitch)),
    pauseBefore,
    pauseAfter,
  };
}

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
  const { currentBook, setCurrentBook, speed, pitch, isPlaying, setIsPlaying, setSpeed } = usePlayerStore();
  const { defaultSpeed, defaultPitch } = useSettingsStore();

  const [state, dispatch] = useReducer(playerReducer, {
    chapter: null, sentences: [], currentChapterIndex: initialChapterIndex || 0,
    currentSentenceIndex: initialSentenceIndex || 0, loading: undefined,
    bookChapters: [], showSleepModal: false, bookmarks: [], showBookmarks: false,
  });

  const [sleepTimerState] = useReducer(
    (s, a) => {
      switch (a.type) {
        case 'ACTIVATE': return { active: true, remaining: a.remaining };
        case 'DEACTIVATE': return { active: false, remaining: 0 };
        case 'TICK': return { ...s, remaining: a.remaining };
        default: return s;
      }
    }, { active: false, remaining: 0 }
  );

  const flatListRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const currentSentenceIndexRef = useRef(state.currentSentenceIndex);
  const sentencesRef = useRef(state.sentences);
  const currentChapterIndexRef = useRef(state.currentChapterIndex);
  const bookChaptersRef = useRef(state.bookChapters);
  const speedRef = useRef(speed);
  const pitchRef = useRef(pitch);

  useEffect(() => { currentSentenceIndexRef.current = state.currentSentenceIndex; }, [state.currentSentenceIndex]);
  useEffect(() => { sentencesRef.current = state.sentences; }, [state.sentences]);
  useEffect(() => { currentChapterIndexRef.current = state.currentChapterIndex; }, [state.currentChapterIndex]);
  useEffect(() => { bookChaptersRef.current = state.bookChapters; }, [state.bookChapters]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { pitchRef.current = pitch; }, [pitch]);

  const saveProgress = useCallback(async (ci, si) => {
    try { await updateProgress(bookId, ci, si); }
    catch (e) { console.error('Save progress error:', e); }
  }, [bookId]);

  const stopSpeaking = useCallback(async () => {
    try { isSpeakingRef.current = false; await Tts.stop(); setIsPlaying(false); }
    catch (e) { console.error('Stop error:', e); }
  }, [setIsPlaying]);

  const speakSentence = useCallback(async (text, emotion, sentenceData) => {
    try {
      const params = getDeliveryParams(
        sentenceData || {},
        emotion || 'neutral',
        speedRef.current,
        pitchRef.current,
      );
      if (params.pauseBefore > 0) await sleep(params.pauseBefore);
      await Promise.all([
        Tts.setDefaultRate(params.speed),
        Tts.setDefaultPitch(params.pitch),
      ]);
      await Tts.speak(text);
    } catch (e) { console.error('Speak error:', e); }
  }, []);

  const loadChapter = useCallback(async (ci) => {
    try {
      const chapterData = await getChapterWithSentences(bookId, ci);
      if (chapterData) {
        dispatch({ type: 'SET_CHAPTER', payload: chapterData });
        let ps = chapterData.sentences;
        if (!ps || ps.length === 0) ps = processChapterText(chapterData.rawText);
        dispatch({ type: 'SET_SENTENCES', payload: ps });
        if (ps.length > 0) dispatch({ type: 'SET_CURRENT_SENTENCE_INDEX', payload: ci === initialChapterIndex ? (initialSentenceIndex || 0) : 0 });
        return ps;
      }
      return [];
    } catch (e) { console.error('Load chapter error:', e); return []; }
  }, [bookId, initialChapterIndex, initialSentenceIndex]);

  const nextChapter = useCallback(async (autoPlay = false) => {
    const ci = currentChapterIndexRef.current;
    const chapters = bookChaptersRef.current;
    if (ci < chapters.length - 1) {
      await stopSpeaking();
      const ni = ci + 1;
      dispatch({ type: 'SET_CURRENT_CHAPTER_INDEX', payload: ni });
      dispatch({ type: 'SET_CURRENT_SENTENCE_INDEX', payload: 0 });
      const ns = await loadChapter(ni);
      saveProgress(ni, 0);
      if (autoPlay && ns && ns.length > 0) {
        isSpeakingRef.current = true;
        setIsPlaying(true);
        speakSentence(ns[0].text, ns[0].emotion, ns[0]);
        flatListRef.current?.scrollToSentence(0);
      }
    }
  }, [stopSpeaking, loadChapter, saveProgress, setIsPlaying, speakSentence]);

  const handleSentenceComplete = useCallback(async () => {
    if (!isSpeakingRef.current) return;
    const ci = currentSentenceIndexRef.current;
    const ss = sentencesRef.current;
    const cidx = currentChapterIndexRef.current;
    if (ci < ss.length - 1) {
      const ni = ci + 1;
      dispatch({ type: 'SET_CURRENT_SENTENCE_INDEX', payload: ni });
      saveProgress(cidx, ni);
      const next = ss[ni];
      if (next) {
        const pauseMs = ss[ci].emphasisWords && ss[ci].emphasisWords.length > 0 ? 800
          : EMOTION_PAUSE_MS[ss[ci].emotion] || 250;
        await sleep(pauseMs);
        await speakSentence(next.text, next.emotion, next);
      }
    } else {
      saveProgress(cidx, ci);
      nextChapter(true);
    }
  }, [saveProgress, nextChapter, speakSentence]);

  const initTTS = useCallback(async () => {
    try {
      await Promise.all([
        Tts.setDefaultLanguage('en-US'),
        Tts.setDefaultRate(perceptualSpeed(defaultSpeed || 1.0)),
        Tts.setDefaultPitch(defaultPitch || 1.0),
      ]);
    } catch (e) { console.error('TTS init error:', e); }
  }, [defaultSpeed, defaultPitch]);

  const handleTTSFinishRef = useRef(null);
  const handleTTSCancelRef = useRef(null);
  useEffect(() => { handleTTSFinishRef.current = handleSentenceComplete; }, [handleSentenceComplete]);
  useEffect(() => { handleTTSCancelRef.current = () => { isSpeakingRef.current = false; setIsPlaying(false); }; }, [setIsPlaying]);
  useEffect(() => {
    initTTS();
    Tts.addEventListener('tts-finish', () => handleTTSFinishRef.current?.());
    Tts.addEventListener('tts-cancel', () => handleTTSCancelRef.current?.());
    loadBookAndChapter();
    return () => { stopSpeaking(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initTTS, stopSpeaking]);

  const loadBookAndChapter = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const book = await getBookById(bookId);
      if (book) { dispatch({ type: 'SET_BOOK_CHAPTERS', payload: book.chapters || [] }); setCurrentBook(book); }
      const bm = await getBookmarks(bookId);
      dispatch({ type: 'SET_BOOKMARKS', payload: bm });
      await loadChapter(state.currentChapterIndex);
    } catch (e) { console.error('Load book error:', e); }
    finally { dispatch({ type: 'SET_LOADING', payload: false }); }
  }, [bookId, loadChapter, state.currentChapterIndex, setCurrentBook]);

  const previousChapter = useCallback(async () => {
    const ci = currentChapterIndexRef.current;
    if (ci > 0) {
      await stopSpeaking();
      const pi = ci - 1;
      dispatch({ type: 'SET_CURRENT_CHAPTER_INDEX', payload: pi });
      dispatch({ type: 'SET_CURRENT_SENTENCE_INDEX', payload: 0 });
      await loadChapter(pi);
      saveProgress(pi, 0);
    }
  }, [stopSpeaking, loadChapter, saveProgress]);

  const handlePlayPause = async () => {
    if (isPlaying) { await stopSpeaking(); return; }
    if (!state.sentences || state.sentences.length === 0) return;
    isSpeakingRef.current = true;
    setIsPlaying(true);
    const s = state.sentences[state.currentSentenceIndex];
    if (s) {
      flatListRef.current?.scrollToSentence(state.currentSentenceIndex);
      speakSentence(s.text, s.emotion, s);
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
    const nb = await addBookmark(bookId, state.currentChapterIndex, state.currentSentenceIndex);
    if (nb) { dispatch({ type: 'SET_BOOKMARKS', payload: [...state.bookmarks, nb] }); return nb; }
    return null;
  };

  const handleDeleteBookmark = async (id) => {
    await deleteBookmark(id);
    dispatch({ type: 'SET_BOOKMARKS', payload: await getBookmarks(bookId) });
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
    state, dispatch, sleepTimerState, flatListRef,
    handlePlayPause, handlePreviousSentence, handleNextSentence,
    previousChapter, nextChapter,
    handleBookmark, handleDeleteBookmark, handleJumpToBookmark,
    currentBook, speed, setSpeed, isPlaying,
  };
}
