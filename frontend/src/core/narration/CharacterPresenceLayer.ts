import { CharacterProfile, CharacterVoiceRegistry } from './CharacterVoiceRegistry';
import { EmotionType } from '../types';
import { EventGovernor } from '../events/EventGovernor';

export interface PresenceIndicator {
  characterId: string | null;
  characterName: string | null;
  emotion: EmotionType;
  intensity: number;
  cadence: CharacterProfile['cadence'];
  opacity: number;
}

export interface DialogueContext {
  speakerId: string | null;
  isDialogue: boolean;
  isNarrator: boolean;
  chainPosition: number;
  chainLength: number;
}

const EMOTION_PRESENCE_STYLES: Record<EmotionType, {
  opacity: number;
  warmth: number;
}> = {
  joy: { opacity: 0.6, warmth: 0.7 },
  sadness: { opacity: 0.4, warmth: 0.3 },
  anger: { opacity: 0.7, warmth: 0.8 },
  fear: { opacity: 0.5, warmth: 0.2 },
  surprise: { opacity: 0.65, warmth: 0.5 },
  neutral: { opacity: 0.3, warmth: 0.5 },
};

const CADENCE_PRESENCE: Record<CharacterProfile['cadence'], {
  animationSpeed: number;
  weight: number;
}> = {
  slow: { animationSpeed: 0.7, weight: 0.8 },
  moderate: { animationSpeed: 1.0, weight: 0.5 },
  fast: { animationSpeed: 1.3, weight: 0.3 },
  variable: { animationSpeed: 1.0, weight: 0.5 },
};

export class CharacterPresenceLayer {
  private registry: CharacterVoiceRegistry;
  private governor: EventGovernor;
  private currentPresence: PresenceIndicator | null = null;
  private dialogueChain: DialogueContext = {
    speakerId: null,
    isDialogue: false,
    isNarrator: true,
    chainPosition: 0,
    chainLength: 0,
  };
  private listeners: Set<(presence: PresenceIndicator | null) => void> = new Set();

  constructor(
    registry: CharacterVoiceRegistry,
    governor: EventGovernor
  ) {
    this.registry = registry;
    this.governor = governor;
  }

  analyzeSentence(
    text: string,
    surroundingText?: string
  ): PresenceIndicator {
    const dialogueCtx = this.classifyDialogue(text);
    this.dialogueChain = dialogueCtx;

    let character: CharacterProfile | null = null;

    if (dialogueCtx.isDialogue && dialogueCtx.speakerId) {
      const profile = this.registry.getCharacter(dialogueCtx.speakerId);
      if (profile) {
        character = profile;
        this.registry.recordSpeech(profile.id, [{
          text,
          emotion: 'neutral',
          confidence: 0.5,
        }]);
      }
    }

    const presence = this.buildPresence(character, dialogueCtx);
    this.currentPresence = presence;

    this.governor.publish('presence:updated', {
      characterId: presence.characterId,
      characterName: presence.characterName,
      isDialogue: dialogueCtx.isDialogue,
      chainLength: dialogueCtx.chainLength,
    }, 'CharacterPresenceLayer', 'low');

    this.notifyListeners(presence);
    return presence;
  }

  private classifyDialogue(text: string): DialogueContext {
    const trimmed = text.trim();
    const hasDialogueMarkers =
      /^["'"'\u201c\u201d]/.test(trimmed) ||
      /["'"'\u201c\u201d]$/.test(trimmed);

    const speakerMatch = text.match(
      /\b(said|asked|replied|whispered|shouted|murmured|exclaimed|called|cried|answered)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
    );

    let speakerId: string | null = null;
    if (speakerMatch) {
      const profile = this.registry.getCharacterByName(speakerMatch[2]);
      if (profile) {
        speakerId = profile.id;
      }
    }

    if (!speakerId && hasDialogueMarkers) {
      speakerId = this.registry.detectCharacterInDialogue(text) || null;
    }

    const isNarrator = !hasDialogueMarkers && !speakerId;

    if (speakerId !== this.dialogueChain.speakerId) {
      this.dialogueChain.chainPosition = 0;
      this.dialogueChain.chainLength = 0;
    }

    return {
      speakerId,
      isDialogue: hasDialogueMarkers,
      isNarrator,
      chainPosition: this.dialogueChain.chainPosition + 1,
      chainLength: this.dialogueChain.chainLength + (hasDialogueMarkers ? 1 : 0),
    };
  }

  private buildPresence(
    character: CharacterProfile | null,
    dialogueCtx: DialogueContext
  ): PresenceIndicator {
    if (!character) {
      return {
        characterId: null,
        characterName: null,
        emotion: 'neutral',
        intensity: 0.1,
        cadence: 'moderate',
        opacity: 0.15,
      };
    }

    const style = EMOTION_PRESENCE_STYLES[character.stats.dominantEmotion];
    const cadence = CADENCE_PRESENCE[character.cadence];

    const chainBonus = Math.min(dialogueCtx.chainPosition * 0.05, 0.2);
    const opacity = Math.min(0.7, style.opacity * (0.5 + chainBonus));

    return {
      characterId: character.id,
      characterName: character.name,
      emotion: character.stats.dominantEmotion,
      intensity: character.emotionalRange,
      cadence: character.cadence,
      opacity,
    };
  }

  getCurrentPresence(): PresenceIndicator | null {
    return this.currentPresence;
  }

  getDialogueContext(): DialogueContext {
    return this.dialogueChain;
  }

  isInDialogue(): boolean {
    return this.dialogueChain.isDialogue;
  }

  getCurrentSpeaker(): string | null {
    return this.dialogueChain.speakerId;
  }

  getChainLength(): number {
    return this.dialogueChain.chainLength;
  }

  subscribe(listener: (presence: PresenceIndicator | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(presence: PresenceIndicator | null): void {
    for (const listener of this.listeners) {
      try {
        listener(presence);
      } catch (e) {
        console.error('[CharacterPresenceLayer] Listener error:', e);
      }
    }
  }

  reset(): void {
    this.currentPresence = null;
    this.dialogueChain = {
      speakerId: null,
      isDialogue: false,
      isNarrator: true,
      chainPosition: 0,
      chainLength: 0,
    };
  }

  destroy(): void {
    this.reset();
    this.listeners.clear();
  }
}
