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
import { getChapterWithSentences, updateProgress, getBookById } from '../database/localDatabase';
import { processChapterText } from '../utils/chapterProcessor';
import { usePlayerStore } from '../store/playerStore';

const EMOTION_COLORS = {
  joy: '#fbbf24',
  sadness: '#60a5fa',
  anger: '#f87171',
  fear: '#a78bfa',
  surprise: '#34d399',
  neutral: '#94a3b8',
};

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
  } = usePlayerStore();

  const [chapter, setChapter] = useState(null);
  const [sentences, setSentences] = useState([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(initialChapterIndex || 0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(initialSentenceIndex || 0);
  const [loading, setLoading] = useState(true);
  const [sleepTimer, setSleepTimer] = useState(0);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [bookChapters, setBookChapters] = useState([]);
  
  const scrollViewRef = useRef(null);
  const sentenceRefs = useRef({});
  const sleepTimerRef = useRef(null);
  const isSpeakingRef = useRef(false);

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
      stopSpeaking();
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
    };
  }, []);

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
      await Tts.setDefaultRate(1.0);
      await Tts.setDefaultPitch(1.0);
      
      Tts.addEventListener('tts-finish', handleSentenceComplete);
      Tts.addEventListener('tts-cancel', () => {
        isSpeakingRef.current = false;
        setIsPlaying(false);
      });
    } catch (error) {
      console.error('TTS init error:', error);
    }
  };

  const loadBookAndChapter = async () => {
    try {
      setLoading(true);
      
      const book = await getBookById(bookId);
      if (book) {
        setBookChapters(book.chapters || []);
        setCurrentBook(book);
      }
      
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
      }
    } catch (error) {
      console.error('Failed to load chapter:', error);
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
      isSpeakingRef.current = false;
      setIsPlaying(false);
      nextChapter();
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
      isSpeakingRef.current = true;
      setIsPlaying(true);
      if (sentences[currentSentenceIndex]) {
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

  const nextChapter = async () => {
    const chapterIdx = currentChapterIndexRef.current;
    const chapters = bookChaptersRef.current;
    if (chapterIdx < chapters.length - 1) {
      const nextIdx = chapterIdx + 1;
      setCurrentChapterIndex(nextIdx);
      setCurrentSentenceIndex(0);
      await loadChapter(nextIdx);
      saveProgress(nextIdx, 0);
    }
  };

  const previousChapter = async () => {
    const chapterIdx = currentChapterIndexRef.current;
    if (chapterIdx > 0) {
      const prevIdx = chapterIdx - 1;
      setCurrentChapterIndex(prevIdx);
      setCurrentSentenceIndex(0);
      await loadChapter(prevIdx);
      saveProgress(prevIdx, 0);
    }
  };

  const scrollToCurrentSentence = () => {
    setTimeout(() => {
      if (sentenceRefs.current[currentSentenceIndex]) {
        sentenceRefs.current[currentSentenceIndex].measureLayout(
          scrollViewRef.current,
          (x, y) => {
            scrollViewRef.current.scrollTo({ y: y - 100, animated: true });
          }
        );
      }
    }, 100);
  };

  const handleSleepTimer = (minutes) => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
    }
    
    setSleepTimer(minutes);
    
    if (minutes > 0) {
      sleepTimerRef.current = setTimeout(() => {
        stopSpeaking();
        setSleepTimer(0);
      }, minutes * 60 * 1000);
    }
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
    const bgColor = isActive ? EMOTION_COLORS[emotion] + '30' : 'transparent';
    const borderColor = isActive ? EMOTION_COLORS[emotion] : 'transparent';

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
        <Text style={[styles.sentenceText, isActive && styles.activeSentenceText]}>
          {sentence.text}
        </Text>
        {isActive && (
          <View style={[styles.emotionBadge, { backgroundColor: EMOTION_COLORS[emotion] }]}>
            <Text style={styles.emotionBadgeText}>{emotion}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ade80" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.bookTitle} numberOfLines={1}>
            {currentBook?.title || 'Unknown'}
          </Text>
          <Text style={styles.chapterTitle} numberOfLines={1}>
            {chapter?.title || `Chapter ${currentChapterIndex + 1}`}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => {
            Alert.alert(
              'Sleep Timer',
              'Select duration',
              [
                { text: '15 min', onPress: () => handleSleepTimer(15) },
                { text: '30 min', onPress: () => handleSleepTimer(30) },
                { text: '45 min', onPress: () => handleSleepTimer(45) },
                { text: '60 min', onPress: () => handleSleepTimer(60) },
                { text: 'Cancel', onPress: () => {} },
              ]
            );
          }}
          style={styles.sleepButton}
        >
          <Text style={styles.sleepIcon}>😴</Text>
        </TouchableOpacity>
      </View>

      {sleepTimer > 0 && (
        <View style={styles.sleepTimerBanner}>
          <Text style={styles.sleepTimerText}>Sleep in {sleepTimer} min</Text>
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

      <View style={styles.controls}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {currentSentenceIndex + 1} / {sentences.length}
          </Text>
          <Text style={[styles.emotionText, { color: EMOTION_COLORS[currentEmotion] }]}>
            {currentEmotion}
          </Text>
        </View>

        <View style={styles.mainControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={previousChapter}
            disabled={currentChapterIndex === 0}
          >
            <Text style={[styles.controlIcon, currentChapterIndex === 0 && styles.disabledIcon]}>⏮</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={handlePreviousSentence}
            disabled={currentSentenceIndex === 0}
          >
            <Text style={[styles.controlIcon, currentSentenceIndex === 0 && styles.disabledIcon]}>◀</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playButton}
            onPress={handlePlayPause}
          >
            <Text style={styles.playButtonText}>
              {isPlaying ? '⏸' : '▶'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleNextSentence}
            disabled={currentSentenceIndex >= sentences.length - 1}
          >
            <Text style={[styles.controlIcon, currentSentenceIndex >= sentences.length - 1 && styles.disabledIcon]}>▶</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={nextChapter}
            disabled={currentChapterIndex >= bookChapters.length - 1}
          >
            <Text style={[styles.controlIcon, currentChapterIndex >= bookChapters.length - 1 && styles.disabledIcon]}>⏭</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.speedControl}>
          <Text style={styles.speedLabel}>Speed: {speed.toFixed(1)}x</Text>
          <Slider
            style={styles.speedSlider}
            minimumValue={0.5}
            maximumValue={2.0}
            step={0.1}
            value={speed}
            onValueChange={(value) => setSpeed(value)}
            minimumTrackTintColor="#4ade80"
            maximumTrackTintColor="#2d3a5c"
            thumbTintColor="#4ade80"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16213e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#ffffff',
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  chapterTitle: {
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 2,
  },
  sleepButton: {
    padding: 8,
  },
  sleepIcon: {
    fontSize: 20,
  },
  sleepTimerBanner: {
    backgroundColor: '#f59e0b',
    paddingVertical: 6,
    alignItems: 'center',
  },
  sleepTimerText: {
    color: '#1a1a2e',
    fontWeight: '600',
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
    color: '#a0aec0',
    lineHeight: 28,
  },
  activeSentenceText: {
    color: '#ffffff',
    fontWeight: '500',
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
    color: '#1a1a2e',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  controls: {
    backgroundColor: '#1a1a2e',
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
    color: '#a0aec0',
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
  controlIcon: {
    fontSize: 20,
    color: '#a0aec0',
  },
  disabledIcon: {
    color: '#4a5568',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4ade80',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  playButtonText: {
    fontSize: 28,
    color: '#1a1a2e',
  },
  speedControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedLabel: {
    fontSize: 14,
    color: '#a0aec0',
    width: 80,
  },
  speedSlider: {
    flex: 1,
    height: 40,
  },
});

export default PlayerScreen;