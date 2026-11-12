enum DeviceModelTier {
  unsupported,
  compact, // 0.5B - 1.5B models (e.g. Qwen 2.5 1.5B, SmolLM 1.7B)
  standard, // 2B - 3B models (e.g. Gemma 2 2B, Llama 3.2 3B)
  large, // 7B+ models (strictly for high-RAM flagship devices >=12GB)
}

class DeviceAiCapability {
  const DeviceAiCapability({
    required this.estimatedRamMb,
    required this.recommendedTier,
    required this.isSupported,
    required this.guidanceMessage,
  });

  final int estimatedRamMb;
  final DeviceModelTier recommendedTier;
  final bool isSupported;
  final String guidanceMessage;
}

class AiPromptEntity {
  const AiPromptEntity({
    required this.userPrompt,
    this.systemPrompt = 'You are an emotionally intelligent literary reading companion. Analyze characters, emotions, themes, and narrative flow with nuance while strictly respecting spoiler boundaries.',
    this.temperature = 0.7,
    this.maxTokens = 512,
    this.stopSequences = const [],
  });

  final String systemPrompt;
  final String userPrompt;
  final double temperature;
  final int maxTokens;
  final List<String> stopSequences;
}

class AiGenerationResult {
  const AiGenerationResult({
    required this.text,
    required this.promptTokens,
    required this.completionTokens,
    required this.durationMs,
    this.modelId = '',
  });

  final String text;
  final int promptTokens;
  final int completionTokens;
  final int durationMs;
  final String modelId;
}
