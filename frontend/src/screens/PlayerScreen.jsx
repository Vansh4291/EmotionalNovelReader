import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Tts from 'react-native-tts';
import { getChapterWithSentences, updateProgress, getBookById, getBookmarks, addBookmark, deleteBookmark } from '../database/localDatabase';
import { processChapterText } from '../utils/chapterProcessor';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme, THEMES } from '../utils/themeContext';
import SleepTimerModal from '../components/SleepTimerModal';

const EMOTION_PROFILES = {
  joy: { speed: 1.15, pitch: 1.10 },
  sadness: { speed: 0.80, pitch: 0.90 },
  anger: { speed: 1.10, pitch: 1.05 },
  fear: { speed: 0.95, pitch: 1.05 },
  surprise: { speed: 1.05, pitch: 1.15 },
  neutral: { speed: 1.0, pitch: 1.0 },
};

const PlayerScreen = ({ route, navigation }) => {
  const { bookId, chapterIndex: initialChapterIndex, sentenceIndex: initialSentenceIndex } = route.params || {};
  
  const {
    currentBook,
    setCurrentBook,
    currentChapter: storeChapter,
    speed,
    pitch,
    isPlaying,
    setIsPlaying,
    setCurrentChapter,
    setCurrentSentence,
    setSpeed,
    sleepTimerMinutes,
    sleepTimerEndTime,
    setSleepTimer,
  } = usePlayerStore();

  const { defaultSpeed, defaultPitch, defaultVolume } = useSettingsStore();

  const [chapter, setChapter] = useState(null);
  const [sentences, setSentences] = useState([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(initialChapterIndex || 0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(initialSentenceIndex || 0);
  const [loading, setLoading] = useState(true);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [bookChapters, setBookChapters] = useState([]);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [listeningSeconds, setListeningSeconds] = useState(0);
  const [sleepTimerActive, setSleepTimerActive] = useState(false);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState(0);
  
  const theme = useTheme();
  const getColor = (emotion) => {
    const map = {
      joy: theme.emotionJoy,
      sadness: theme.emotionSadness,
      anger: theme.emotionAnger,
      fear: theme.emotionFear,
      surprise: theme.emotionSurprise,
      neutral: theme.emotionNeutral,
    };
    return map[emotion] || theme.emotionNeutral;
  };
  
  const scrollViewRef = useRef(null);
  const sentenceRefs = useRef({});
  const sleepTimerRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const listeningTimerRef = useRef(null);
  const listeningSecondsRef = useRef(0);

  const currentSentenceIndexRef = useRef(currentSentenceIndex);
  const sentencesRef = useRef(sentences);
  const currentChapterIndexRef = useRef(currentChapterIndex);
  const bookChaptersRef = useRef(bookChapters);

  useEffect(() => {
    currentSentenceIndexRef.current = currentSentenceIndex;
  }, [currentSentenceIndex]);

  useEffect(() => {
    sentencesRef.current = sentences;
  }, [sentences]);

  useEffect(() => {
    currentChapterIndexRef.current = currentChapterIndex;
  }, [currentChapterIndex]);

  useEffect(() => {
    bookChaptersRef.current = bookChapters;
  }, [bookChapters]);

  useEffect(() => {
    initTTS();
    loadBookAndChapter();

    return () => {
      if (listeningSecondsRef.current > 0) {
        updateProgress(bookId, currentChapterIndexRef.current, currentSentenceIndexRef.current, listeningSecondsRef.current);
      }
      stopSpeaking();
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
      if (listeningTimerRef.current) {
        clearInterval(listeningTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (sleepTimerMinutes > 0 && sleepTimerEndTime) {
      setSleepTimerActive(true);
      const remaining = Math.max(0, Math.ceil((sleepTimerEndTime - Date.now()) / 60000));
      setSleepTimerRemaining(remaining);
      const timeoutDuration = sleepTimerEndTime - Date.now();
      if (timeoutDuration > 0) {
        sleepTimerRef.current = setTimeout(() => {
          stopSpeaking();
          setSleepTimer(0);
          setSleepTimerActive(false);
          setSleepTimerRemaining(0);
        }, timeoutDuration);
      }
      const interval = setInterval(() => {
        const rem = Math.max(0, Math.ceil((sleepTimerEndTime - Date.now()) / 60000));
        setSleepTimerRemaining(rem);
        if (rem <= 0) {
          clearInterval(interval);
          setSleepTimerActive(false);
        }
      }, 10000);
      return () => {
        clearInterval(interval);
      };
    } else {
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
        sleepTimerRef.current = null;
      }
      setSleepTimerActive(false);
      setSleepTimerRemaining(0);
    }
  }, [sleepTimerMinutes, sleepTimerEndTime]);

  useEffect(() => {
    if (isPlaying && !listeningTimerRef.current) {
      listeningTimerRef.current = setInterval(() => {
        listeningSecondsRef.current += 1;
        setListeningSeconds(listeningSecondsRef.current);
      }, 1000);
    } else if (!isPlaying && listeningTimerRef.current) {
      clearInterval(listeningTimerRef.current);
      listeningTimerRef.current = null;
    }
    return () => {
      if (listeningTimerRef.current) {
        clearInterval(listeningTimerRef.current);
        listeningTimerRef.current = null;
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (sentences.length > 0 && currentSentenceIndex < sentences.length && isSpeakingRef.current) {
      const sentence = sentences[currentSentenceIndex];
      setCurrentEmotion(sentence.emotion || 'neutral');
      speakSentence(sentence.text, sentence.emotion);
      scrollToCurrentSentence();
    }
  }, [currentSentenceIndex, sentences]);

  const initTTS = async () => {
    try {
      await Tts.setDefaultLanguage('en-US');
      await Tts.setDefaultRate(defaultSpeed || 1.0);
      await Tts.setDefaultPitch(defaultPitch || 1.0);
      
      Tts.addEventListener('tts-finish', handleSentenceComplete);
      Tts.addEventListener('tts-cancel', () => {
        isSpeakingRef.current = false;
        setIsPlaying(false);
      });
    } catch (error) {
      console.error('TTS init error:', error);
    }
  };

  useEffect(() => {
    setSpeed(defaultSpeed || 1.0);
  }, []);

  const loadBookAndChapter = async () => {
    try {
      setLoading(true);
      
      const book = await getBookById(bookId);
      if (book) {
        setBookChapters(book.chapters || []);
        setCurrentBook(book);
      }
      
      const savedBookmarks = await getBookmarks(bookId);
      setBookmarks(savedBookmarks);
      
      await loadChapter(currentChapterIndex);
    } catch (error) {
      console.error('Failed to load book:', error);
      Alert.alert('Error', 'Failed to load book.');
    } finally {
      setLoading(false);
    }
  };

  const loadChapter = async (chapterIdx) => {
    try {
      const chapterData = await getChapterWithSentences(bookId, chapterIdx);
      
      if (chapterData) {
        setChapter(chapterData);
        
        let processedSentences = chapterData.sentences;
        if (!processedSentences || processedSentences.length === 0) {
          processedSentences = processChapterText(chapterData.rawText);
        }
        setSentences(processedSentences);
        
        if (processedSentences.length > 0) {
          const startIndex = chapterIdx === initialChapterIndex ? (initialSentenceIndex || 0) : 0;
          setCurrentSentenceIndex(startIndex);
        }
        return processedSentences;
      }
      return [];
    } catch (error) {
      console.error('Failed to load chapter:', error);
      return [];
    }
  };

  const handleSentenceComplete = () => {
    const currentIndex = currentSentenceIndexRef.current;
    const currentSentences = sentencesRef.current;
    const chapterIdx = currentChapterIndexRef.current;

    if (currentIndex < currentSentences.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentSentenceIndex(nextIndex);
      saveProgress(chapterIdx, nextIndex);
    } else {
      saveProgress(chapterIdx, currentIndex);
      nextChapter(true);
    }
  };

  const speakSentence = async (text, emotion) => {
    try {
      const emotionProfile = EMOTION_PROFILES[emotion] || EMOTION_PROFILES.neutral;
      const finalSpeed = speed * emotionProfile.speed;
      const finalPitch = pitch * emotionProfile.pitch;
      
      await Tts.setDefaultRate(Math.max(0.5, Math.min(2.0, finalSpeed)));
      await Tts.setDefaultPitch(Math.max(0.5, Math.min(2.0, finalPitch)));
      await Tts.speak(text);
    } catch (error) {
      console.error('Speak error:', error);
    }
  };

  const stopSpeaking = async () => {
    try {
      isSpeakingRef.current = false;
      await Tts.stop();
      setIsPlaying(false);
    } catch (error) {
      console.error('Stop error:', error);
    }
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      await stopSpeaking();
    } else {
      if (!sentences || sentences.length === 0) {
        return;
      }
      isSpeakingRef.current = true;
      setIsPlaying(true);
      if (sentences[currentSentenceIndex]) {
        scrollToCurrentSentence();
        speakSentence(sentences[currentSentenceIndex].text, sentences[currentSentenceIndex].emotion);
      }
    }
  };

  const handlePreviousSentence = async () => {
    await stopSpeaking();
    if (currentSentenceIndex > 0) {
      setCurrentSentenceIndex(currentSentenceIndex - 1);
    }
  };

  const handleNextSentence = async () => {
    await stopSpeaking();
    if (currentSentenceIndex < sentences.length - 1) {
      setCurrentSentenceIndex(currentSentenceIndex + 1);
    }
  };

  const nextChapter = async (autoPlay = false) => {
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
        setCurrentEmotion(newSentences[0].emotion || 'neutral');
        speakSentence(newSentences[0].text, newSentences[0].emotion);
        scrollToCurrentSentence();
      }
    }
  };

  const previousChapter = async () => {
    const chapterIdx = currentChapterIndexRef.current;
    if (chapterIdx > 0) {
      await stopSpeaking();
      const prevIdx = chapterIdx - 1;
      setCurrentChapterIndex(prevIdx);
      setCurrentSentenceIndex(0);
      await loadChapter(prevIdx);
      saveProgress(prevIdx, 0);
    }
  };

  const scrollToCurrentSentence = () => {
    setTimeout(() => {
      const ref = sentenceRefs.current[currentSentenceIndex];
      if (ref && scrollViewRef.current) {
        ref.measureLayout(
          scrollViewRef.current,
          (x, y) => {
            scrollViewRef.current.scrollTo({ y: Math.max(0, y - 100), animated: true });
          },
          () => {}
        );
      }
    }, 100);
  };

  const saveProgress = async (chapterIdx, sentenceIdx) => {
    try {
      await updateProgress(bookId, chapterIdx, sentenceIdx);
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  const renderSentence = (sentence, index) => {
    const isActive = index === currentSentenceIndex;
    const emotion = sentence.emotion || 'neutral';
    const emotionColor = getColor(emotion);
    const bgColor = isActive ? emotionColor + '30' : 'transparent';
    const borderColor = isActive ? emotionColor : 'transparent';

    return (
      <TouchableOpacity
        key={index}
        ref={(ref) => (sentenceRefs.current[index] = ref)}
        style={[
          styles.sentenceContainer,
          { backgroundColor: bgColor, borderLeftColor: borderColor },
        ]}
        onPress={async () => {
          await stopSpeaking();
          setCurrentSentenceIndex(index);
        }}
      >
        <Text style={[styles.sentenceText, { color: theme.textSecondary }, isActive && { color: theme.text }]}>
          {sentence.text}
        </Text>
        {isActive && (
          <View style={[styles.emotionBadge, { backgroundColor: emotionColor }]}>
            <Text style={[styles.emotionBadgeText, { color: theme.background }]}>{emotion}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
      
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.bookTitleLabel, { color: theme.text }]} numberOfLines={1}>
            {currentBook?.title || 'Unknown'}
          </Text>
          <Text style={[styles.chapterTitleLabel, { color: theme.textSecondary }]} numberOfLines={1}>
            {chapter?.title || `Chapter ${currentChapterIndex + 1}`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowBookmarks(true)} style={styles.headerButton}>
          <Text style={styles.headerIcon}>🔖</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowSleepModal(true)} style={styles.headerButton}>
          <Text style={styles.headerIcon}>😴</Text>
        </TouchableOpacity>
      </View>

      {sleepTimerActive && sleepTimerRemaining > 0 && (
        <View style={[styles.sleepTimerBanner, { backgroundColor: theme.warning }]}>
          <Text style={[styles.sleepTimerText, { color: theme.background }]}>Sleep in {sleepTimerRemaining} min</Text>
        </View>
      )}
      
      <SleepTimerModal
        visible={showSleepModal}
        onClose={() => setShowSleepModal(false)}
      />

      {showBookmarks && (
        <View style={[styles.bookmarksOverlay, { backgroundColor: theme.surface }]}>
          <View style={styles.bookmarksHeader}>
            <Text style={[styles.bookmarksTitle, { color: theme.text }]}>Bookmarks</Text>
            <TouchableOpacity onPress={() => setShowBookmarks(false)}>
              <Text style={[styles.bookmarksClose, { color: theme.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
          {bookmarks.length === 0 ? (
            <Text style={[styles.noBookmarksText, { color: theme.textMuted }]}>No bookmarks yet</Text>
          ) : (
            bookmarks.map((bm, i) => (
              <TouchableOpacity
                key={bm._id}
                style={[styles.bookmarkItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  if (bm.chapterIndex !== currentChapterIndex) {
                    setCurrentChapterIndex(bm.chapterIndex);
                    loadChapter(bm.chapterIndex).then(() => {
                      setCurrentSentenceIndex(bm.sentenceIndex);
                    });
                  } else {
                    setCurrentSentenceIndex(bm.sentenceIndex);
                  }
                  setShowBookmarks(false);
                }}
              >
                <Text style={[styles.bookmarkText, { color: theme.text }]}>
                  Ch {bm.chapterIndex + 1} · Sentence {bm.sentenceIndex + 1}
                </Text>
                {bm.note ? <Text style={[styles.bookmarkNote, { color: theme.textSecondary }]}>{bm.note}</Text> : null}
                <TouchableOpacity onPress={async () => {
                  await deleteBookmark(bm._id);
                  const updated = await getBookmarks(bookId);
                  setBookmarks(updated);
                }}>
                  <Text style={styles.deleteBookmarkBtn}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.textContainer}
        contentContainerStyle={styles.textContent}
        showsVerticalScrollIndicator={false}
      >
        {sentences.map((sentence, index) => renderSentence(sentence, index))}
      </ScrollView>

      <View style={[styles.controls, { backgroundColor: theme.surface }]}>
        <View style={styles.progressInfo}>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            {currentSentenceIndex + 1} / {sentences.length}
          </Text>
          <Text style={[styles.emotionText, { color: getColor(currentEmotion) }]}>
            {currentEmotion}
          </Text>
        </View>

        <View style={styles.mainControls}>
          <TouchableOpacity
            style={[styles.controlButton, currentChapterIndex === 0 && styles.controlButtonDisabled]}
            onPress={previousChapter}
            disabled={currentChapterIndex === 0}
          >
            <Text style={[styles.controlIcon, { color: theme.textSecondary }, currentChapterIndex === 0 && { color: theme.textMuted }]}>⏮</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, currentSentenceIndex === 0 && styles.controlButtonDisabled]}
            onPress={handlePreviousSentence}
            disabled={currentSentenceIndex === 0}
          >
            <Text style={[styles.controlIcon, { color: theme.textSecondary }, currentSentenceIndex === 0 && { color: theme.textMuted }]}>◀</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: theme.primary }]}
            onPress={handlePlayPause}
          >
            <Text style={[styles.playButtonText, { color: theme.background }]}>
              {isPlaying ? '⏸' : '▶'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, currentSentenceIndex >= sentences.length - 1 && styles.controlButtonDisabled]}
            onPress={handleNextSentence}
            disabled={currentSentenceIndex >= sentences.length - 1}
          >
            <Text style={[styles.controlIcon, { color: theme.textSecondary }, currentSentenceIndex >= sentences.length - 1 && { color: theme.textMuted }]}>▶</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, currentChapterIndex >= bookChapters.length - 1 && styles.controlButtonDisabled]}
            onPress={nextChapter}
            disabled={currentChapterIndex >= bookChapters.length - 1}
          >
            <Text style={[styles.controlIcon, { color: theme.textSecondary }, currentChapterIndex >= bookChapters.length - 1 && { color: theme.textMuted }]}>⏭</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={async () => {
              const newBookmark = await addBookmark(bookId, currentChapterIndex, currentSentenceIndex);
              if (newBookmark) {
                setBookmarks([...bookmarks, newBookmark]);
                Alert.alert('Bookmark added', `Ch ${currentChapterIndex + 1} · Sentence ${currentSentenceIndex + 1}`);
              }
            }}
          >
            <Text style={[styles.controlIcon, { color: theme.textSecondary }]}>🔖</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.speedControl}>
          <Text style={[styles.speedLabel, { color: theme.textSecondary }]}>Speed: {speed.toFixed(1)}x</Text>
          <Slider
            style={styles.speedSlider}
            minimumValue={0.5}
            maximumValue={2.0}
            step={0.1}
            value={speed}
            onValueChange={(value) => setSpeed(value)}
            minimumTrackTintColor={theme.primary}
            maximumTrackTintColor={theme.surfaceLight}
            thumbTintColor={theme.primary}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  bookTitleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  chapterTitleLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
  },
  headerIcon: {
    fontSize: 20,
  },
  sleepTimerBanner: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  sleepTimerText: {
    fontWeight: '600',
  },
  bookmarksOverlay: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 16,
    zIndex: 100,
    elevation: 10,
    maxHeight: 300,
  },
  bookmarksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bookmarksTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  bookmarksClose: {
    fontSize: 16,
  },
  noBookmarksText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  bookmarkItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookmarkText: {
    flex: 1,
    fontSize: 14,
  },
  bookmarkNote: {
    fontSize: 12,
    marginLeft: 8,
  },
  deleteBookmarkBtn: {
    fontSize: 16,
    color: '#ef4444',
    // preserved as danger color since it needs to stand out
    // and the bookmark overlay doesn't have direct theme access
    paddingLeft: 8,
  },
  textContainer: {
    flex: 1,
  },
  textContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sentenceContainer: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  sentenceText: {
    fontSize: 18,
    lineHeight: 28,
  },
  emotionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  emotionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  controls: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
  },
  emotionText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlButton: {
    padding: 12,
    marginHorizontal: 8,
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  controlIcon: {
    fontSize: 20,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  playButtonText: {
    fontSize: 28,
  },
  speedControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedLabel: {
    fontSize: 14,
    width: 80,
  },
  speedSlider: {
    flex: 1,
    height: 40,
  },
});

export default PlayerScreen;