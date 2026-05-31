import { EmotionType, EmotionProfile, SentenceData } from '../types';
import { NarrativeArc } from '../narration/NarrativeContextManager';

const EMOTION_PROFILES: Record<EmotionType, EmotionProfile> = {
  joy: { speed: 1.15, pitch: 1.10, pauseAfterMs: 50, volume: 1.0 },
  sadness: { speed: 0.80, pitch: 0.90, pauseAfterMs: 200, volume: 0.95 },
  anger: { speed: 1.10, pitch: 1.05, pauseAfterMs: 30, volume: 1.05 },
  fear: { speed: 0.95, pitch: 1.05, pauseAfterMs: 150, volume: 0.98 },
  surprise: { speed: 1.05, pitch: 1.15, pauseAfterMs: 80, volume: 1.02 },
  neutral: { speed: 1.0, pitch: 1.0, pauseAfterMs: 100, volume: 1.0 },
};

const KEYWORDS: Record<EmotionType, string[]> = {
  joy: [
    'laugh', 'smile', 'happy', 'joy', 'excited', 'wonderful', 'amazing',
    'love', 'beautiful', 'celebrate', 'cheer', 'delight', 'glad', 'thrilled',
    'giggle', 'haha', 'yay', 'hooray', 'bliss', 'elated', 'grin',
    'delighted', 'ecstatic', 'euphoric', 'content', 'pleased', 'grateful',
    'optimistic', 'hopeful', 'bright', 'cheerful', 'merry', 'jolly',
  ],
  sadness: [
    'cry', 'sob', 'tears', 'sad', 'grief', 'sorrow', 'mourn', 'weep',
    'lonely', 'miss', 'lost', 'pain', 'hurt', 'heartbreak', 'despair',
    'hollow', 'empty', 'silent tears', 'trembling lips', 'gloomy',
    'depressed', 'miserable', 'unfortunate', 'tragic', 'devastated',
    'anguish', 'melancholy', 'weeping', 'heartache', 'abandoned',
  ],
  anger: [
    'angry', 'rage', 'furious', 'shout', 'yell', 'scream', 'hate',
    'frustrat', 'annoy', 'slam', 'clench', 'growl', 'roar', 'explode',
    'damn', 'stupid', 'idiot', 'crush', 'smash', 'glare', 'bitter',
    'enraged', 'irritated', 'infuriated', 'livid', 'hostile', 'wrath',
    'scold', 'rebuke', 'resent', 'bitterly', 'outraged',
  ],
  fear: [
    'afraid', 'fear', 'terrif', 'horror', 'dread', 'panic', 'tremble',
    'shake', 'shiver', 'cower', 'flee', 'nightmare', 'monster', 'danger',
    'heart pounding', 'cold sweat', 'frozen', 'paralyzed', 'gulp',
    'terrified', 'scared', 'frightened', 'petrified', 'anxious', 'worried',
    'nervous', 'apprehensive', 'uneasy', 'worst', 'threat', 'suspicious',
  ],
  surprise: [
    'surprise', 'shock', 'sudden', 'unexpected', 'gasp', 'unbelievable',
    'impossible', 'what?!', 'no way', 'suddenly', 'out of nowhere',
    'eyes wide', 'jaw dropped', "couldn't believe", 'astonished', 'stunned',
    'startled', 'bewildered', 'amazed', 'astounded', 'incredible',
  ],
  neutral: [],
};

const EMOTION_REGEXES: Record<EmotionType, RegExp[]> = {} as Record<EmotionType, RegExp[]>;
for (const [emotion, keywords] of Object.entries(KEYWORDS)) {
  EMOTION_REGEXES[emotion as EmotionType] = keywords.map(
    (kw) => new RegExp(`\\b${kw}\\b`, 'i')
  );
}

interface EmotionWindow {
  emotion: EmotionType;
  confidence: number;
  intensity: number;
}

export class EmotionEngine {
  private windowSize = 5;
  private recentEmotions: EmotionWindow[] = [];
  private arcPosition = 0;

  classifySentence(text: string): { emotion: EmotionType; confidence: number } {
    if (!text || text.trim().length === 0) {
      return { emotion: 'neutral', confidence: 1.0 };
    }

    const lower = text.toLowerCase();
    const scores: Record<string, number> = {};

    for (const [emotion, regexes] of Object.entries(EMOTION_REGEXES)) {
      let score = 0;
      for (const regex of regexes) {
        if (regex.test(lower)) {
          score += 1;
        }
      }
      scores[emotion] = score;
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) {
      return { emotion: 'neutral', confidence: 1.0 };
    }

    const topEmotion = Object.keys(scores).find(
      (k) => scores[k] === maxScore
    ) as EmotionType;
    const confidence = Math.min(maxScore / 3, 1.0);

    return { emotion: topEmotion, confidence };
  }

  classifyWithContext(
    text: string,
    previousSentences?: SentenceData[]
  ): { emotion: EmotionType; confidence: number; intensity: number } {
    const base = this.classifySentence(text);

    const contextWindow = this.getContextWindow(previousSentences);
    const smoothed = this.smoothWithWindow(base, contextWindow);
    const intensity = this.calculateIntensity(smoothed, contextWindow);

    this.recentEmotions.push({
      emotion: smoothed.emotion,
      confidence: smoothed.confidence,
      intensity,
    });
    if (this.recentEmotions.length > this.windowSize) {
      this.recentEmotions.shift();
    }
    this.arcPosition += 1;

    return {
      emotion: smoothed.emotion,
      confidence: smoothed.confidence,
      intensity,
    };
  }

  private getContextWindow(
    previousSentences?: SentenceData[]
  ): EmotionWindow[] {
    if (!previousSentences || previousSentences.length === 0) {
      return this.recentEmotions.slice(-this.windowSize);
    }

    const recent = previousSentences.slice(-this.windowSize);
    return recent.map((s) => ({
      emotion: s.emotion as EmotionType,
      confidence: s.confidence,
      intensity: 0.5,
    }));
  }

  private smoothWithWindow(
    base: { emotion: EmotionType; confidence: number },
    window: EmotionWindow[]
  ): { emotion: EmotionType; confidence: number } {
    if (window.length === 0) return base;

    const emotionCounts: Record<string, number> = {};
    let totalWeight = 0;

    for (let i = 0; i < window.length; i++) {
      const w = window[i];
      const recencyWeight = (i + 1) / window.length;
      const weight = recencyWeight * w.confidence;
      emotionCounts[w.emotion] = (emotionCounts[w.emotion] || 0) + weight;
      totalWeight += weight;
    }

    emotionCounts[base.emotion] =
      (emotionCounts[base.emotion] || 0) + base.confidence * 2;
    totalWeight += base.confidence * 2;

    let maxWeight = 0;
    let smoothed = base.emotion;
    for (const [emotion, weight] of Object.entries(emotionCounts)) {
      if (weight > maxWeight) {
        maxWeight = weight;
        smoothed = emotion as EmotionType;
      }
    }

    const smoothedConfidence = Math.min(maxWeight / totalWeight, 1.0);

    return { emotion: smoothed, confidence: smoothedConfidence };
  }

  private calculateIntensity(
    current: { emotion: EmotionType; confidence: number },
    window: EmotionWindow[]
  ): number {
    if (window.length === 0) return current.confidence;

    const recentEmotions = window.map((w) => w.emotion);
    const sameCount = recentEmotions.filter(
      (e) => e === current.emotion
    ).length;
    const consistency = sameCount / window.length;

    const avgConfidence =
      window.reduce((sum, w) => sum + w.confidence, 0) / window.length;

    const baseIntensity = current.confidence * 0.6 + consistency * 0.4;

    const isEscalation =
      current.confidence > avgConfidence && current.emotion !== 'neutral';
    const escalationBonus = isEscalation ? 0.15 : 0;

    return Math.min(1.0, baseIntensity + escalationBonus);
  }

  getEmotionProfile(emotion: EmotionType): EmotionProfile {
    return EMOTION_PROFILES[emotion] || EMOTION_PROFILES.neutral;
  }

  getNarrationParams(
    emotion: EmotionType,
    intensity: number,
    userSpeed: number,
    userPitch: number
  ): { speed: number; pitch: number; pauseAfterMs: number } {
    const profile = this.getEmotionProfile(emotion);
    const intensityFactor = 0.5 + intensity * 0.5;

    return {
      speed: userSpeed * (1 + (profile.speed - 1) * intensityFactor),
      pitch: userPitch * (1 + (profile.pitch - 1) * intensityFactor),
      pauseAfterMs: (profile.pauseAfterMs || 100) * intensityFactor,
    };
  }

  classifyWithNarrativeContext(
    text: string,
    arc: NarrativeArc,
    previousSentences?: SentenceData[]
  ): { emotion: EmotionType; confidence: number; intensity: number } {
    const base = this.classifyWithContext(text, previousSentences);

    const adjusted = this.adjustForArc(base, arc);

    const tensionModulation = this.modulateForTension(adjusted.emotion, arc.currentTension);
    const pacingModulation = this.modulateForPacing(tensionModulation, arc.currentPacing);

    return {
      emotion: pacingModulation.emotion,
      confidence: Math.min(1.0, pacingModulation.confidence * arc.currentTension * 0.3 + pacingModulation.confidence * 0.7),
      intensity: Math.min(1.0, adjusted.intensity + arc.currentTension * 0.2),
    };
  }

  private adjustForArc(
    base: { emotion: EmotionType; confidence: number; intensity: number },
    arc: NarrativeArc
  ): { emotion: EmotionType; confidence: number; intensity: number } {
    let emotion = base.emotion;
    let confidence = base.confidence;

    switch (arc.arcPosition) {
      case 'peak':
        if (emotion === 'neutral') {
          emotion = arc.emotionalMomentum > 0 ? 'surprise' : 'neutral';
        }
        confidence = Math.min(1.0, confidence * 1.15);
        break;
      case 'resolution':
        if (emotion === 'anger' || emotion === 'fear') {
          confidence = confidence * 0.75;
        }
        if (emotion === 'neutral' || emotion === 'joy') {
          confidence = Math.min(1.0, confidence * 1.1);
        }
        break;
      case 'rising':
        if (emotion === 'neutral' && arc.currentTension > 0.5) {
          confidence = confidence * 0.85;
        }
        break;
    }

    return { emotion, confidence, intensity: base.intensity };
  }

  private modulateForTension(
    emotion: EmotionType,
    tension: number
  ): { emotion: EmotionType; confidence: number } {
    if (tension > 0.7 && emotion === 'neutral') {
      return { emotion: 'fear', confidence: 0.4 };
    }
    if (tension < 0.2 && (emotion === 'anger' || emotion === 'fear')) {
      return { emotion, confidence: 0.6 };
    }
    return { emotion, confidence: 1.0 };
  }

  private modulateForPacing(
    input: { emotion: EmotionType; confidence: number },
    pacing: number
  ): { emotion: EmotionType; confidence: number } {
    if (pacing > 0.7 && input.emotion === 'neutral') {
      return { emotion: input.emotion, confidence: input.confidence * 0.9 };
    }
    if (pacing < 0.3 && (input.emotion === 'anger' || input.emotion === 'surprise')) {
      return { emotion: input.emotion, confidence: input.confidence * 0.85 };
    }
    return input;
  }

  getArcPosition(): number {
    return this.arcPosition;
  }

  reset(): void {
    this.recentEmotions = [];
    this.arcPosition = 0;
  }
}
