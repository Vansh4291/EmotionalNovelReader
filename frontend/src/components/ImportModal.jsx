import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ProgressBar,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import axios from 'axios';

const BACKEND_URL = 'http://localhost:3000/api';

const ImportModal = ({ visible, onClose, onImportSuccess }) => {
  const [step, setStep] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) {
      setStep('idle');
      setProgress(0);
      setStatusText('');
      setError(null);
    }
  }, [visible]);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [
          DocumentPicker.types.plainText,
          DocumentPicker.types.allFiles,
        ],
      });

      const file = result[0];
      await importBook(file);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        setError('Failed to pick file');
        setStep('error');
      }
    }
  };

  const importBook = async (file) => {
    try {
      setStep('uploading');
      setStatusText('Uploading book...');
      setProgress(0.1);

      const formData = new FormData();
      formData.append('book', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      });

      setProgress(0.3);
      setStatusText('Parsing book...');

      const response = await axios.post(
        `${BACKEND_URL}/books/import`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percent = 0.3 + (progressEvent.loaded / progressEvent.total) * 0.2;
            setProgress(percent);
          },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Import failed');
      }

      setProgress(0.6);
      setStatusText('Analyzing emotions...');

      await analyzeBookEmotions(response.data.book._id);

      setProgress(1.0);
      setStatusText('Complete!');
      setStep('success');

      setTimeout(() => {
        onImportSuccess && onImportSuccess(response.data.book);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Import error:', err);
      setError(err.message || 'Failed to import book');
      setStep('error');
    }
  };

  const analyzeBookEmotions = async (bookId) => {
    try {
      const chaptersResponse = await axios.get(`${BACKEND_URL}/books/${bookId}/chapters`);
      const chapters = chaptersResponse.data.chapters || [];
      
      for (let i = 0; i < chapters.length; i++) {
        setStatusText(`Analyzing chapter ${i + 1} of ${chapters.length}...`);
        const progressPercent = 0.6 + (i / chapters.length) * 0.3;
        setProgress(progressPercent);
        
        await axios.post(`${BACKEND_URL}/emotion/analyze`, {
          bookId,
          chapterIndex: i,
        });
      }
    } catch (err) {
      console.error('Emotion analysis error:', err);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'idle':
        return (
          <View style={styles.content}>
            <Text style={styles.title}>Import Book</Text>
            <Text style={styles.subtitle}>
              Select a file to import. Supported formats: TXT, EPUB, PDF
            </Text>
            <TouchableOpacity style={styles.button} onPress={handlePickFile}>
              <Text style={styles.buttonText}>Select File</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        );

      case 'uploading':
      case 'success':
        return (
          <View style={styles.content}>
            <Text style={styles.title}>
              {step === 'success' ? '✓ Success!' : 'Importing...'}
            </Text>
            <ActivityIndicator size="large" color="#4ade80" style={styles.loader} />
            <Text style={styles.statusText}>{statusText}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
        );

      case 'error':
        return (
          <View style={styles.content}>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.button} onPress={handlePickFile}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
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
          {renderContent()}
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
    maxWidth: 400,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#a0aec0',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4ade80',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#a0aec0',
  },
  loader: {
    marginVertical: 20,
  },
  statusText: {
    fontSize: 14,
    color: '#a0aec0',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#2d3a5c',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ade80',
    borderRadius: 3,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f87171',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#a0aec0',
    marginBottom: 24,
    textAlign: 'center',
  },
});

export default ImportModal;