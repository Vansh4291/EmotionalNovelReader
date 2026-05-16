import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { usePlayerStore } from '../store/playerStore';

const TIMER_OPTIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
];

const SleepTimerModal = ({ visible, onClose }) => {
  const { sleepTimerMinutes, setSleepTimer, isPlaying } = usePlayerStore();
  const [remainingTime, setRemainingTime] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (sleepTimerMinutes > 0) {
      setRemainingTime(sleepTimerMinutes * 60);
      
      intervalRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setSleepTimer(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sleepTimerMinutes]);

  const handleSelectTimer = (minutes) => {
    setSleepTimer(minutes);
    onClose();
  };

  const handleCancelTimer = () => {
    setSleepTimer(0);
    setRemainingTime(0);
    onClose();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Sleep Timer</Text>

          {sleepTimerMinutes > 0 ? (
            <View style={styles.activeTimer}>
              <Text style={styles.timerText}>
                Time remaining: {formatTime(remainingTime)}
              </Text>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelTimer}
              >
                <Text style={styles.cancelButtonText}>Cancel Timer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.subtitle}>Stop playback after:</Text>
              
              <View style={styles.options}>
                {TIMER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.optionButton}
                    onPress={() => handleSelectTimer(option.value)}
                  >
                    <Text style={styles.optionText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 350,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#a0aec0',
    textAlign: 'center',
    marginBottom: 16,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#2d3a5c',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    margin: 4,
  },
  optionText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  activeTimer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#4ade80',
    marginBottom: 16,
  },
  cancelButton: {
    backgroundColor: '#f87171',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#a0aec0',
  },
});

export default SleepTimerModal;