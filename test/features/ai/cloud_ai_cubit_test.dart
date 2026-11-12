import 'package:emotional_novel_reader/core/errors/failures.dart';
import 'package:emotional_novel_reader/features/ai/domain/entities/ai_inference_entities.dart';
import 'package:emotional_novel_reader/features/ai/domain/entities/cloud_ai_config.dart';
import 'package:emotional_novel_reader/features/ai/domain/services/cloud_ai_service.dart';
import 'package:emotional_novel_reader/features/ai/presentation/cubit/cloud_ai_cubit.dart';
import 'package:flutter_test/flutter_test.dart';

class MockCloudAiService implements CloudAiService {
  CloudAiConfig _config = const CloudAiConfig();
  bool testConnectionSuccess = true;

  @override
  Future<CloudAiConfig> getConfig() async => _config;

  @override
  Future<void> saveConfig(CloudAiConfig config) async {
    _config = config;
  }

  @override
  Future<void> saveApiKey(String apiKey) async {
    _config = _config.copyWith(hasApiKey: true);
  }

  @override
  Future<void> clearApiKey() async {
    _config = _config.copyWith(hasApiKey: false);
  }

  @override
  Future<Result<String>> testConnection() async {
    if (testConnectionSuccess) {
      return const Result.success('Connected successfully!');
    } else {
      return const Result.error(
        ValidationFailure('Failed to connect to endpoint'),
      );
    }
  }

  @override
  Future<Result<String>> generate(AiPromptEntity prompt) async {
    return const Result.success('Generated text');
  }

  @override
  Stream<String> generateStream(
    AiPromptEntity prompt, {
    bool Function()? isCancelled,
  }) async* {
    yield 'Generated text';
  }
}

void main() {
  late MockCloudAiService mockService;
  late CloudAiCubit cubit;

  setUp(() {
    mockService = MockCloudAiService();
    cubit = CloudAiCubit(cloudAiService: mockService);
  });

  group('CloudAiCubit Tests', () {
    test('Initial state has default disabled config', () {
      expect(cubit.state.config.enabled, isFalse);
      expect(cubit.state.config.userConsented, isFalse);
      expect(cubit.state.isLoading, isFalse);
    });

    test('loadConfig loads config from service', () async {
      mockService._config = const CloudAiConfig(
        enabled: true,
        userConsented: true,
        modelName: 'custom-model',
      );

      await cubit.loadConfig();

      expect(cubit.state.config.enabled, isTrue);
      expect(cubit.state.config.userConsented, isTrue);
      expect(cubit.state.config.modelName, equals('custom-model'));
    });

    test(
      'grantConsentAndEnable enables cloud AI with explicit consent',
      () async {
        await cubit.grantConsentAndEnable();

        expect(cubit.state.config.enabled, isTrue);
        expect(cubit.state.config.userConsented, isTrue);
        expect(
          cubit.state.statusMessage,
          contains('enabled with user consent'),
        );
      },
    );

    test('disableCloudAi disables cloud AI cleanly', () async {
      await cubit.grantConsentAndEnable();
      expect(cubit.state.config.enabled, isTrue);

      await cubit.disableCloudAi();
      expect(cubit.state.config.enabled, isFalse);
      expect(cubit.state.statusMessage, contains('disabled'));
    });

    test('updateProvider switches provider and resets defaults', () async {
      await cubit.updateProvider(CloudAiProvider.googleGemini);

      expect(cubit.state.config.provider, equals(CloudAiProvider.googleGemini));
      expect(
        cubit.state.config.endpointUrl,
        equals(CloudAiProvider.googleGemini.defaultEndpoint),
      );
      expect(
        cubit.state.config.modelName,
        equals(CloudAiProvider.googleGemini.defaultModel),
      );
    });

    test('saveApiKey and clearApiKey update hasApiKey state', () async {
      await cubit.saveApiKey('sk-test-key-abc');
      expect(cubit.state.config.hasApiKey, isTrue);
      expect(cubit.state.statusMessage, contains('KeyStore'));

      await cubit.clearApiKey();
      expect(cubit.state.config.hasApiKey, isFalse);
      expect(cubit.state.statusMessage, contains('deleted'));
    });

    test('testConnection handles success and failure', () async {
      mockService.testConnectionSuccess = true;
      await cubit.testConnection();
      expect(cubit.state.isTestingConnection, isFalse);
      expect(cubit.state.testResult, equals('Connected successfully!'));
      expect(cubit.state.errorMessage, isNull);

      mockService.testConnectionSuccess = false;
      await cubit.testConnection();
      expect(cubit.state.isTestingConnection, isFalse);
      expect(cubit.state.errorMessage, contains('Failed to connect'));
    });
  });
}
