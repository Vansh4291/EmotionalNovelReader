import '../../domain/entities/cloud_ai_config.dart';

class CloudAiState {
  const CloudAiState({
    this.config = const CloudAiConfig(),
    this.isLoading = false,
    this.isTestingConnection = false,
    this.statusMessage,
    this.errorMessage,
    this.testResult,
  });

  final CloudAiConfig config;
  final bool isLoading;
  final bool isTestingConnection;
  final String? statusMessage;
  final String? errorMessage;
  final String? testResult;

  CloudAiState copyWith({
    CloudAiConfig? config,
    bool? isLoading,
    bool? isTestingConnection,
    String? statusMessage,
    String? errorMessage,
    String? testResult,
    bool clearMessages = false,
  }) {
    return CloudAiState(
      config: config ?? this.config,
      isLoading: isLoading ?? this.isLoading,
      isTestingConnection: isTestingConnection ?? this.isTestingConnection,
      statusMessage: clearMessages
          ? null
          : (statusMessage ?? this.statusMessage),
      errorMessage: clearMessages ? null : (errorMessage ?? this.errorMessage),
      testResult: clearMessages ? null : (testResult ?? this.testResult),
    );
  }
}
