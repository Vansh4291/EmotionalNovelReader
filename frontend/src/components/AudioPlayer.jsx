import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Tts from 'react-native-tts';
import { usePlayerStore } from '../store/playerStore';
import EmotionBadge from './EmotionBadge';

const AudioPlayer = ({
  sentences = [],
  currentSentenceIndex = 0,
  onSentenceComplete,
  onPlaybackError,
}) => {
  const {
    isPlaying,
    setIsPlaying,
    speed,
    pitch,
    volume,
    currentEmotion,
    setCurrentEmotion,
  } = usePlayerStore();

  const isInitialized = useRef(false);
  const currentIndex = useRef(currentSentenceIndex);

  useEffect(() => {
    initializeTTS();
    return () => {
      Tts.stop();
    };
  }, []);

  useEffect(() => {
    currentIndex.current = currentSentenceIndex;
  }, [currentSentenceIndex]);

  useEffect(() => {
    if (isInitialized.current && sentences.length > 0) {
      const sentence = sentences[currentSentenceIndex];
      if (sentence) {
        setCurrentEmotion(sentence.emotion || 'neutral');
        if (isPlaying) {
          speak(sentence.text, sentence.emotion);
        }
      }
    }
  }, [currentSentenceIndex, sentences]);

  const initializeTTS = async () => {
    try {
      if (Platform.OS === 'android') {
        await Tts.setDefaultLanguage('en-US');
      }
      await Tts.setDefaultRate(0.5);
      await Tts.setDefaultPitch(1.0);
      await Tts.setDefaultVolume(1.0);

      Tts.addEventListener('tts-start', () => {
        setIsPlaying(true);
      });

      Tts.addEventListener('tts-finish', () => {
        handleSentenceFinished();
      });

      Tts.addEventListener('tts-cancel', () => {
        setIsPlaying(false);
      });

      Tts.addEventListener('tts-error', (error) => {
        console.error('TTS Error:', error);
        setIsPlaying(false);
        onPlaybackError && onPlaybackError(error);
      });

      isInitialized.current = true;
    } catch (error) {
      console.error('TTS initialization error:', error);
      onPlaybackError && onPlaybackError(error);
    }
  };

  const handleSentenceFinished = () => {
    const nextIndex = currentIndex.current + 1;
    if (nextIndex < sentences.length) {
      onSentenceComplete && onSentenceComplete(nextIndex);
    } else {
      setIsPlaying(false);
    }
  };

  const speak = useCallback(async (text, emotion) => {
    if (!text || !isInitialized.current) return;

    try {
      const voiceParams = getVoiceParams(emotion);
      
      await Tts.setDefaultRate(speed * voiceParams.speed);
      await Tts.setDefaultPitch(pitch * voiceParams.pitch);
      await Tts.setDefaultVolume(volume * voiceParams.volume);
      
      await Tts.speak(text);
    } catch (error) {
      console.error('Speak error:', error);
    }
  }, [speed, pitch, volume]);

  const getVoiceParams = (emotion) => {
    const profiles = {
      joy: { speed: 1.15, pitch: 1.10, volume: 1.0, pause: 150 },
      sadness: { speed: 0.80, pitch: 0.90, volume: 0.85, pause: 500 },
      anger: { speed: 1.10, pitch: 1.05, volume: 1.10, pause: 100 },
      fear: { speed: 0.95, pitch: 1.05, volume: 0.90, pause: 300 },
      surprise: { speed: 1.05, pitch: 1.15, volume: 1.05, pause: 200 },
      neutral: { speed: 1.0, pitch: 1.0, volume: 1.0, pause: 200 },
    };
    
    return profiles[emotion] || profiles.neutral;
  };

  const play = useCallback(() => {
    const sentence = sentences[currentSentenceIndex];
    if (sentence) {
      speak(sentence.text, sentence.emotion);
    }
  }, [currentSentenceIndex, sentences, speak]);

  const pause = useCallback(async () => {
    try {
      await Tts.stop();
      setIsPlaying(false);
    } catch (error) {
      console.error('Pause error:', error);
    }
  }, [setIsPlaying]);

  const stop = useCallback(async () => {
    try {
      await Tts.stop();
      setIsPlaying(false);
    } catch (error) {
      console.error('Stop error:', error);
    }
  }, [setIsPlaying]);

  return {
    isPlaying,
    play,
    pause,
    stop,
    currentEmotion,
  };
};

export default AudioPlayer;