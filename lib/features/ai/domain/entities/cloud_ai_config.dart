enum CloudAiProvider {
  openAiCompatible(
    'OpenAI Compatible',
    'https://api.openai.com/v1',
    'gpt-4o-mini',
  ),
  googleGemini(
    'Google Gemini',
    'https://generativelanguage.googleapis.com/v1beta',
    'gemini-1.5-flash',
  );

  const CloudAiProvider(
    this.displayName,
    this.defaultEndpoint,
    this.defaultModel,
  );
  final String displayName;
  final String defaultEndpoint;
  final String defaultModel;
}

class CloudAiConfig {
  const CloudAiConfig({
    this.enabled = false,
    this.userConsented = false,
    this.provider = CloudAiProvider.openAiCompatible,
    this.endpointUrl = 'https://api.openai.com/v1',
    this.modelName = 'gpt-4o-mini',
    this.hasApiKey = false,
  });

  final bool enabled;
  final bool userConsented;
  final CloudAiProvider provider;
  final String endpointUrl;
  final String modelName;
  final bool hasApiKey;

  CloudAiConfig copyWith({
    bool? enabled,
    bool? userConsented,
    CloudAiProvider? provider,
    String? endpointUrl,
    String? modelName,
    bool? hasApiKey,
  }) {
    return CloudAiConfig(
      enabled: enabled ?? this.enabled,
      userConsented: userConsented ?? this.userConsented,
      provider: provider ?? this.provider,
      endpointUrl: endpointUrl ?? this.endpointUrl,
      modelName: modelName ?? this.modelName,
      hasApiKey: hasApiKey ?? this.hasApiKey,
    );
  }

  Map<String, dynamic> toJson() => {
    'enabled': enabled,
    'userConsented': userConsented,
    'provider': provider.name,
    'endpointUrl': endpointUrl,
    'modelName': modelName,
  };

  factory CloudAiConfig.fromJson(
    Map<String, dynamic> json, {
    bool hasApiKey = false,
  }) {
    final providerName = json['provider'] as String? ?? 'openAiCompatible';
    final provider = CloudAiProvider.values.firstWhere(
      (p) => p.name == providerName,
      orElse: () => CloudAiProvider.openAiCompatible,
    );

    return CloudAiConfig(
      enabled: json['enabled'] as bool? ?? false,
      userConsented: json['userConsented'] as bool? ?? false,
      provider: provider,
      endpointUrl: json['endpointUrl'] as String? ?? provider.defaultEndpoint,
      modelName: json['modelName'] as String? ?? provider.defaultModel,
      hasApiKey: hasApiKey,
    );
  }
}
