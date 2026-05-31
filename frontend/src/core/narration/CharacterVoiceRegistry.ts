import { EmotionType, EmotionProfile } from '../types';
import { EventGovernor } from '../events/EventGovernor';

export interface CharacterProfile {
  id: string;
  name: string;
  aliases: string[];
  baselineEmotion: EmotionType;
  cadence: 'slow' | 'moderate' | 'fast' | 'variable';
  speechPattern: 'formal' | 'casual' | 'aggressive' | 'gentle' | 'cold' | 'warm';
  emotionalRange: number;
  voiceModifiers: VoiceModifiers;
  stats: CharacterStats;
  createdAt: number;
  lastSeenAt: number;
}

export interface VoiceModifiers {
  pitchOffset: number;
  speedMultiplier: number;
  volumeAdjustment: number;
  pauseMultiplier: number;
}

export interface CharacterStats {
  totalSentences: number;
  emotionDistribution: Record<EmotionType, number>;
  avgConfidence: number;
  dominantEmotion: EmotionType;
  longestDialogueChain: number;
}

interface SpeechPatternHint {
  text: string;
  emotion: EmotionType;
  confidence: number;
}

const DEFAULT_VOICE_MODIFIERS: VoiceModifiers = {
  pitchOffset: 0,
  speedMultiplier: 1.0,
  volumeAdjustment: 1.0,
  pauseMultiplier: 1.0,
};

const DIALOGUE_MARKERS = /^["'"'\u201c\u201d]/;
const CHARACTER_INDICATORS = [
  /\b(said|asked|replied|whispered|shouted|murmured|exclaimed|called|cried|answered|began|continued|added|finished|demanded|insisted|suggested|agreed|objected|argued)\b/i,
  /^["'"'\u201c\u201d].*["'"'\u201c\u201d]$/,
];

export class CharacterVoiceRegistry {
  private characters: Map<string, CharacterProfile> = new Map();
  private nameIndex: Map<string, string> = new Map();
  private governor: EventGovernor | null = null;

  constructor(governor?: EventGovernor) {
    this.governor = governor || null;
  }

  registerCharacter(name: string, aliases: string[] = []): CharacterProfile {
    const id = this.generateId(name);
    const existing = this.characters.get(id);
    if (existing) return existing;

    const profile: CharacterProfile = {
      id,
      name,
      aliases,
      baselineEmotion: 'neutral',
      cadence: 'moderate',
      speechPattern: 'casual',
      emotionalRange: 0.5,
      voiceModifiers: { ...DEFAULT_VOICE_MODIFIERS },
      stats: this.createEmptyStats(),
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    };

    this.characters.set(id, profile);
    this.nameIndex.set(name.toLowerCase(), id);
    for (const alias of aliases) {
      this.nameIndex.set(alias.toLowerCase(), id);
    }

    this.governor?.publish('character:registered', {
      characterId: id,
      name,
    }, 'CharacterVoiceRegistry', 'low');

    return profile;
  }

  detectCharacterInDialogue(
    text: string,
    surroundingText?: string
  ): string | null {
    const trimmed = text.trim();
    const isDialogue = DIALOGUE_MARKERS.test(trimmed);

    if (!isDialogue) return null;

    const context = surroundingText || trimmed;
    const speakerMatch = context.match(
      /\b(said|asked|replied|whispered|shouted|murmured|exclaimed|called|cried|answered)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
    );

    if (speakerMatch) {
      const speakerName = speakerMatch[2];
      const found = this.nameIndex.get(speakerName.toLowerCase());
      if (found) return found;
    }

    for (const [name, id] of this.nameIndex) {
      if (context.toLowerCase().includes(name)) {
        return id;
      }
    }

    return null;
  }

  recordSpeech(
    characterId: string,
    hints: SpeechPatternHint[]
  ): void {
    const profile = this.characters.get(characterId);
    if (!profile || hints.length === 0) return;

    profile.lastSeenAt = Date.now();
    profile.stats.totalSentences += hints.length;

    for (const hint of hints) {
      profile.stats.emotionDistribution[hint.emotion] =
        (profile.stats.emotionDistribution[hint.emotion] || 0) + 1;
      profile.stats.avgConfidence =
        (profile.stats.avgConfidence * (profile.stats.totalSentences - 1) +
          hint.confidence) /
        profile.stats.totalSentences;
    }

    profile.stats.dominantEmotion = this.computeDominantEmotion(
      profile.stats.emotionDistribution
    );

    this.updateBaselineEmotion(profile);
    this.updateCadence(profile, hints);
    this.updateSpeechPattern(profile, hints);
    this.updateEmotionalRange(profile);
    this.updateVoiceModifiers(profile);

    this.governor?.publish('character:speech_recorded', {
      characterId,
      sentenceCount: hints.length,
      dominantEmotion: profile.stats.dominantEmotion,
    }, 'CharacterVoiceRegistry', 'low');
  }

  private computeDominantEmotion(
    distribution: Record<EmotionType, number>
  ): EmotionType {
    let max = 0;
    let dominant: EmotionType = 'neutral';
    for (const [emotion, count] of Object.entries(distribution)) {
      if (count > max) {
        max = count;
        dominant = emotion as EmotionType;
      }
    }
    return dominant;
  }

  private updateBaselineEmotion(profile: CharacterProfile): void {
    if (profile.stats.totalSentences < 5) return;

    const recentEmotions = Object.entries(profile.stats.emotionDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([emotion]) => emotion as EmotionType);

    if (recentEmotions.length > 0) {
      profile.baselineEmotion = recentEmotions[0];
    }
  }

  private updateCadence(
    profile: CharacterProfile,
    hints: SpeechPatternHint[]
  ): void {
    const avgWordsPerSentence =
      hints.reduce((sum, h) => sum + h.text.split(/\s+/).length, 0) /
      hints.length;

    if (avgWordsPerSentence < 5) {
      profile.cadence = 'fast';
    } else if (avgWordsPerSentence < 12) {
      profile.cadence = 'moderate';
    } else {
      profile.cadence = 'slow';
    }

    const emotionVariance = this.computeEmotionVariance(hints);
    if (emotionVariance > 0.3) {
      profile.cadence = 'variable';
    }
  }

  private computeEmotionVariance(hints: SpeechPatternHint[]): number {
    if (hints.length < 2) return 0;

    const emotionIntensityMap = new Map<string, number[]>();
    for (const hint of hints) {
      const existing = emotionIntensityMap.get(hint.emotion) || [];
      existing.push(hint.confidence);
      emotionIntensityMap.set(hint.emotion, existing);
    }

    const intensities = Array.from(emotionIntensityMap.values())
      .filter((v) => v.length > 1)
      .map((v) => {
        const avg = v.reduce((a, b) => a + b, 0) / v.length;
        const variance = v.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / v.length;
        return variance;
      });

    return intensities.length > 0
      ? intensities.reduce((a, b) => a + b, 0) / intensities.length
      : 0;
  }

  private updateSpeechPattern(
    profile: CharacterProfile,
    hints: SpeechPatternHint[]
  ): void {
    const text = hints.map((h) => h.text).join(' ').toLowerCase();

    const patterns: [CharacterProfile['speechPattern'], RegExp][] = [
      ['formal', /\b(therefore|furthermore|consequently|nevertheless|moreover|thus|hence)\b/i],
      ['aggressive', /\b(hate|stupid|idiot|damn|shut|kill|destroy|crush)\b/i],
      ['gentle', /\b(please|thank|sorry|kind|gentle|soft|quiet|whisper)\b/i],
      ['cold', /\b(calm|cold|ice|frozen|empty|nothing|silent|still)\b/i],
      ['warm', /\b(love|warm|bright|smile|laugh|happy|friend|hope)\b/i],
    ];

    let bestMatch: CharacterProfile['speechPattern'] = 'casual';
    let bestScore = 0;

    for (const [pattern, regex] of patterns) {
      const matches = text.match(regex);
      if (matches && matches.length > bestScore) {
        bestScore = matches.length;
        bestMatch = pattern;
      }
    }

    profile.speechPattern = bestMatch;
  }

  private updateEmotionalRange(profile: CharacterProfile): void {
    const distribution = profile.stats.emotionDistribution;
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total === 0) return;

    const nonNeutral = Object.entries(distribution)
      .filter(([emotion]) => emotion !== 'neutral')
      .reduce((sum, [, count]) => sum + count, 0);

    profile.emotionalRange = Math.min(1.0, nonNeutral / total);
  }

  private updateVoiceModifiers(profile: CharacterProfile): void {
    const mods = profile.voiceModifiers;

    switch (profile.cadence) {
      case 'fast':
        mods.speedMultiplier = 1.1;
        mods.pauseMultiplier = 0.8;
        break;
      case 'slow':
        mods.speedMultiplier = 0.9;
        mods.pauseMultiplier = 1.3;
        break;
      case 'variable':
        mods.speedMultiplier = 1.0;
        mods.pauseMultiplier = 1.0;
        break;
      default:
        mods.speedMultiplier = 1.0;
        mods.pauseMultiplier = 1.0;
    }

    switch (profile.speechPattern) {
      case 'formal':
        mods.pitchOffset = -0.02;
        mods.volumeAdjustment = 1.0;
        break;
      case 'aggressive':
        mods.pitchOffset = 0.03;
        mods.volumeAdjustment = 1.08;
        break;
      case 'gentle':
        mods.pitchOffset = 0.02;
        mods.volumeAdjustment = 0.92;
        break;
      case 'cold':
        mods.pitchOffset = -0.04;
        mods.volumeAdjustment = 0.95;
        break;
      case 'warm':
        mods.pitchOffset = 0.02;
        mods.volumeAdjustment = 1.02;
        break;
      default:
        mods.pitchOffset = 0;
        mods.volumeAdjustment = 1.0;
    }

    const emotion = profile.stats.dominantEmotion;
    switch (emotion) {
      case 'anger':
        mods.speedMultiplier *= 1.05;
        mods.volumeAdjustment *= 1.05;
        break;
      case 'sadness':
        mods.speedMultiplier *= 0.92;
        mods.volumeAdjustment *= 0.95;
        break;
      case 'fear':
        mods.speedMultiplier *= 0.97;
        mods.pauseMultiplier *= 1.2;
        break;
      case 'joy':
        mods.speedMultiplier *= 1.03;
        mods.pitchOffset += 0.02;
        break;
    }
  }

  getCharacter(id: string): CharacterProfile | undefined {
    return this.characters.get(id);
  }

  getCharacterByName(name: string): CharacterProfile | undefined {
    const id = this.nameIndex.get(name.toLowerCase());
    return id ? this.characters.get(id) : undefined;
  }

  getAllCharacters(): CharacterProfile[] {
    return Array.from(this.characters.values());
  }

  getVoiceModifiers(characterId: string): VoiceModifiers {
    const profile = this.characters.get(characterId);
    return profile
      ? { ...profile.voiceModifiers }
      : { ...DEFAULT_VOICE_MODIFIERS };
  }

  mergeCharacterProfiles(sourceId: string, targetId: string): void {
    const source = this.characters.get(sourceId);
    const target = this.characters.get(targetId);
    if (!source || !target) return;

    target.stats.totalSentences += source.stats.totalSentences;
    for (const [emotion, count] of Object.entries(source.stats.emotionDistribution)) {
      target.stats.emotionDistribution[emotion as EmotionType] =
        (target.stats.emotionDistribution[emotion as EmotionType] || 0) + count;
    }
    target.stats.dominantEmotion = this.computeDominantEmotion(
      target.stats.emotionDistribution
    );

    for (const alias of source.aliases) {
      if (!target.aliases.includes(alias)) {
        target.aliases.push(alias);
        this.nameIndex.set(alias.toLowerCase(), targetId);
      }
    }
    this.nameIndex.set(source.name.toLowerCase(), targetId);

    this.updateBaselineEmotion(target);
    this.updateVoiceModifiers(target);

    this.characters.delete(sourceId);
  }

  private createEmptyStats(): CharacterStats {
    return {
      totalSentences: 0,
      emotionDistribution: {
        joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0, neutral: 0,
      },
      avgConfidence: 0,
      dominantEmotion: 'neutral',
      longestDialogueChain: 0,
    };
  }

  private generateId(name: string): string {
    return `char_${name.toLowerCase().replace(/\s+/g, '_')}`;
  }

  reset(): void {
    this.characters.clear();
    this.nameIndex.clear();
  }
}
