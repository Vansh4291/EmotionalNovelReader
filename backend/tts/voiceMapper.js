const emotionProfiles = {
  joy: {
    speed: 1.15,
    pitch: 1.10,
    volume: 1.0,
    pauseAfterMs: 150,
    description: 'Upbeat, lighter, faster pacing',
  },
  sadness: {
    speed: 0.80,
    pitch: 0.90,
    volume: 0.85,
    pauseAfterMs: 500,
    description: 'Slow, lower pitch, longer pauses, softer',
  },
  anger: {
    speed: 1.10,
    pitch: 1.05,
    volume: 1.10,
    pauseAfterMs: 100,
    description: 'Sharp, slightly faster, louder, clipped pauses',
  },
  fear: {
    speed: 0.95,
    pitch: 1.05,
    volume: 0.90,
    pauseAfterMs: 300,
    description: 'Slightly uneven, higher pitch, breathless quality',
  },
  surprise: {
    speed: 1.05,
    pitch: 1.15,
    volume: 1.05,
    pauseAfterMs: 200,
    description: 'Higher pitch, slight acceleration',
  },
  neutral: {
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0,
    pauseAfterMs: 200,
    description: 'Default narration voice',
  },
};

function getVoiceParams(emotion, userDefaults = {}) {
  const profile = emotionProfiles[emotion] || emotionProfiles.neutral;

  const userSpeed = userDefaults.defaultSpeed || 1.0;
  const userPitch = userDefaults.defaultPitch || 1.0;
  const userVolume = userDefaults.defaultVolume || 1.0;

  return {
    speed: Math.max(0.5, Math.min(2.0, profile.speed * userSpeed)),
    pitch: Math.max(0.5, Math.min(2.0, profile.pitch * userPitch)),
    volume: Math.max(0.0, Math.min(1.0, profile.volume * userVolume)),
    pauseAfterMs: profile.pauseAfterMs,
  };
}

module.exports = { getVoiceParams, emotionProfiles };