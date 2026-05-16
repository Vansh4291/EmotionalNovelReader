const express = require('express');
const router = express.Router();
const { getVoiceParams, emotionProfiles } = require('../tts/voiceMapper');

router.post('/speak', (req, res) => {
  try {
    const { text, emotion, userDefaults } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'text required' });
    }

    const voiceParams = getVoiceParams(emotion || 'neutral', userDefaults || {});
    
    res.json({
      success: true,
      text,
      emotion: emotion || 'neutral',
      voiceParams,
      profile: emotionProfiles[emotion || 'neutral']
    });
  } catch (error) {
    console.error('TTS speak error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/voices', (req, res) => {
  res.json({
    success: true,
    availableVoices: [
      { id: 'android', name: 'Android TTS', type: 'device' },
      { id: 'edge', name: 'Microsoft Edge TTS', type: 'online' },
      { id: 'coqui', name: 'Coqui TTS', type: 'offline' }
    ]
  });
});

router.get('/profiles', (req, res) => {
  res.json({
    success: true,
    profiles: emotionProfiles
  });
});

router.post('/voice-params', (req, res) => {
  try {
    const { emotion, userDefaults } = req.body;
    
    const voiceParams = getVoiceParams(emotion || 'neutral', userDefaults || {});
    
    res.json({
      success: true,
      ...voiceParams
    });
  } catch (error) {
    console.error('Voice params error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/pause', (req, res) => {
  res.json({ success: true, message: 'Pause command sent' });
});

router.post('/resume', (req, res) => {
  res.json({ success: true, message: 'Resume command sent' });
});

router.post('/stop', (req, res) => {
  res.json({ success: true, message: 'Stop command sent' });
});

module.exports = router;