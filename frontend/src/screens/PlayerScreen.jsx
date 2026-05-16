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
import axios from 'axios';
import { usePlayerStore } from '../store/playerStore';

const BACKEND_URL = 'http://localhost:3000/api';

const EMOTION_COLORS = {
  joy: '#fbbf24',
  sadness: '#60a5fa',
  anger: '#f87171',
  fear: '#a78bfa',
  surprise: '#34d399',
  neutral: '#94a3b8',
};

const PlayerScreen = ({ route, navigation }) => {
  const { bookId, chapterIndex: initialChapterIndex, sentenceIndex: initialSentenceIndex } = route.params || {};
  
  const {
    currentBook,
    currentChapter: storeChapter,
    currentSentence: storeSentence,
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
  
  const scrollViewRef = useRef(null);
  const sentenceRefs = useRef({});
  const sleepTimerRef = useRef(null);

  useEffect(() => {
    initTTS();
    loadChapter(currentChapterIndex);

    return () => {
      stopSpeaking();
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (sentences.length > 0 && currentSentenceIndex < sentences.length) {
      const sentence = sentences[currentSentenceIndex];
      setCurrentEmotion(sentence.emotion || 'neutral');
      speakSentence(sentence.text, sentence.emotion);
      scrollToCurrentSentence();
    }
  }, [currentSentenceIndex, sentences]);

  const initTTS = async () => {
    try {
      await Tts.setDefaultLanguage('en-US');
      await Tts.setDefaultRate(0.5);
      await Tts.setDefaultPitch(1.0);
      
      Tts.addEventListener('tts-finish', handleSentenceComplete);
      Tts.addEventListener('tts-cancel', () => setIsPlaying(false));
    } catch (error) {
      console.error('TTS init error:', error);
    }
  };

  const loadChapter = async (chapterIdx) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${BACKEND_URL}/books/${bookId}/chapters/${chapterIdx}`
      );
      
      const chapterData = response.data;
      setChapter(chapterData);
      
      const parsedSentences = chapterData.sentences || [];
      setSentences(parsedSentences);
      
      if (chapterData.sentences && chapterData.sentences.length > 0) {
        setCurrentSentenceIndex(0);
      }
    } catch (error) {
      console.error('Failed to load chapter:', error);
      Alert.alert('Error', 'Failed to load chapter.');
    } finally {
      setLoading(false);
    }
  };

  const handleSentenceComplete = () => {
    if (currentSentenceIndex < sentences.length - 1) {
      setCurrentSentenceIndex(currentSentenceIndex + 1);
    } else {
      setIsPlaying(false);
      nextChapter();
    }
  };

  const speakSentence = async (text, emotion) => {
    try {
      const voiceParams = await getVoiceParams(emotion);
      await Tts.setDefaultRate(speed * voiceParams.speed);
      await Tts.setDefaultPitch(pitch * voiceParams.pitch);
      await Tts.speak(text);
      setIsPlaying(true);
    } catch (error) {
      console.error('Speak error:', error);
    }
  };

  const getVoiceParams = async (emotion) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/tts/voice-params`, {
        emotion,
      });
      return response.data;
    } catch (error) {
      return {
        speed: 1.0,
        pitch: 1.0,
        volume: 1.0,
        pauseAfterMs: 200,
      };
    }
  };

  const stopSpeaking = async () => {
    try {
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
      if (sentences[currentSentenceIndex]) {
        speakSentence(sentences[currentSentenceIndex].text, sentences[currentSentenceIndex].emotion);
      }
    }
  };

  const handlePreviousSentence = () => {
    stopSpeaking();
    if (currentSentenceIndex > 0) {
      setCurrentSentenceIndex(currentSentenceIndex - 1);
    }
  };

  const handleNextSentence = () => {
    stopSpeaking();
    if (currentSentenceIndex < sentences.length - 1) {
      setCurrentSentenceIndex(currentSentenceIndex + 1);
    }
  };

  const nextChapter = async () => {
    if (currentChapterIndex < (currentBook?.chapters?.length || 0) - 1) {
      const nextIdx = currentChapterIndex + 1;
      setCurrentChapterIndex(nextIdx);
      await loadChapter(nextIdx);
    }
  };

  const previousChapter = async () => {
    if (currentChapterIndex > 0) {
      const prevIdx = currentChapterIndex - 1;
      setCurrentChapterIndex(prevIdx);
      await loadChapter(prevIdx);
    }
  };

  const scrollToCurrentSentence = () => {
    if (sentenceRefs.current[currentSentenceIndex]) {
      sentenceRefs.current[currentSentenceIndex].measureLayout(
        scrollViewRef.current,
        (x, y) => {
          scrollViewRef.current.scrollTo({ y: y - 100, animated: true });
        }
      );
    }
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

  const saveProgress = async () => {
    try {
      await axios.post(`${BACKEND_URL}/progress/${bookId}`, {
        currentChapterIndex,
        currentSentenceIndex,
      });
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
        onPress={() => {
          stopSpeaking();
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
          <Text style={styles.emotionText} style={{ color: EMOTION_COLORS[currentEmotion] }}>
            {currentEmotion}
          </Text>
        </View>

        <View style={styles.mainControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={previousChapter}
          >
            <Text style={styles.controlIcon}>⏮</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={handlePreviousSentence}
          >
            <Text style={styles.controlIcon}>◀</Text>
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
          >
            <Text style={styles.controlIcon}>▶</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={nextChapter}
          >
            <Text style={styles.controlIcon}>⏭</Text>
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