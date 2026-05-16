import { create } from 'zustand';

export const usePlayerStore = create((set, get) => ({
  currentBook: null,
  currentChapter: 0,
  currentSentence: 0,
  currentChapterIndex: 0,
  currentSentenceIndex: 0,
  isPlaying: false,
  isPaused: false,
  speed: 1.0,
  pitch: 1.0,
  volume: 1.0,
  playbackSpeed: 1.0,
  currentEmotion: 'neutral',
  sentences: [],
  sleepTimerMinutes: 0,
  sleepTimerEndTime: null,
  listeningTimeSeconds: 0,

  setCurrentBook: (book) => set({ currentBook: book }),
  
  setCurrentChapter: (index) => set({ currentChapter: index, currentChapterIndex: index }),
  
  setCurrentSentence: (index) => set({ currentSentence: index, currentSentenceIndex: index }),
  
  setCurrentChapterIndex: (index) => set({ currentChapterIndex: index }),
  
  setCurrentSentenceIndex: (index) => set({ currentSentenceIndex: index, currentSentence: index }),
  
  setSentences: (sentences) => set({ sentences }),
  
  setIsPlaying: (isPlaying) => set({ isPlaying, isPaused: false }),
  
  setIsPaused: (isPaused) => set({ isPaused, isPlaying: !isPaused }),
  
  setSpeed: (speed) => set({ speed: Math.max(0.5, Math.min(2.0, speed)) }),
  
  setPitch: (pitch) => set({ pitch: Math.max(0.5, Math.min(2.0, pitch)) }),
  
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1.0, volume)) }),
  
  setPlaybackSpeed: (speed) => set({ playbackSpeed: Math.max(0.5, Math.min(2.0, speed)) }),
  
  setCurrentEmotion: (emotion) => set({ currentEmotion: emotion }),
  
  setSleepTimer: (minutes) => {
    if (minutes > 0) {
      const endTime = Date.now() + minutes * 60 * 1000;
      set({ sleepTimerMinutes: minutes, sleepTimerEndTime: endTime });
    } else {
      set({ sleepTimerMinutes: 0, sleepTimerEndTime: null });
    }
  },
  
  addListeningTime: (seconds) => set((state) => ({
    listeningTimeSeconds: state.listeningTimeSeconds + seconds
  })),
  
  nextSentence: () => {
    const { currentSentenceIndex, sentences } = get();
    if (currentSentenceIndex < sentences.length - 1) {
      const nextIndex = currentSentenceIndex + 1;
      const nextSentence = sentences[nextIndex];
      set({
        currentSentenceIndex: nextIndex,
        currentEmotion: nextSentence?.emotion || 'neutral'
      });
      return true;
    }
    return false;
  },
  
  previousSentence: () => {
    const { currentSentenceIndex } = get();
    if (currentSentenceIndex > 0) {
      const prevIndex = currentSentenceIndex - 1;
      const { sentences } = get();
      const prevSentence = sentences[prevIndex];
      set({
        currentSentenceIndex: prevIndex,
        currentEmotion: prevSentence?.emotion || 'neutral'
      });
      return true;
    }
    return false;
  },
  
  resetPlayer: () => set({
    currentBook: null,
    currentChapterIndex: 0,
    currentSentenceIndex: 0,
    isPlaying: false,
    isPaused: false,
    currentEmotion: 'neutral',
    sentences: [],
    listeningTimeSeconds: 0,
  }),
}));

export default usePlayerStore;