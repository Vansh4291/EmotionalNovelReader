import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:emotional_novel_reader/core/logging/app_logger.dart';
import 'package:emotional_novel_reader/core/security/secure_storage_service.dart';
import 'package:emotional_novel_reader/core/storage/storage_service.dart';
import 'package:emotional_novel_reader/features/ai/data/services/cloud_ai_service_impl.dart';
import 'package:emotional_novel_reader/features/ai/domain/entities/ai_inference_entities.dart';
import 'package:emotional_novel_reader/features/ai/domain/entities/cloud_ai_config.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;

class MockSecureStorageService implements SecureStorageService {
  final Map<String, String> _storage = {};

  @override
  Future<void> write({required String key, required String value}) async {
    _storage[key] = value;
  }

  @override
  Future<String?> read({required String key}) async => _storage[key];

  @override
  Future<void> delete({required String key}) async {
    _storage.remove(key);
  }

  @override
  Future<bool> containsKey({required String key}) async =>
      _storage.containsKey(key);

  @override
  Future<void> deleteAll() async {
    _storage.clear();
  }
}

class CloudTestStorageService implements StorageService {
  CloudTestStorageService(this.rootDir);
  final Directory rootDir;

  @override
  Future<Directory> getAppLibraryDirectory() async =>
      Directory(p.join(rootDir.path, 'books'))..createSync(recursive: true);

  @override
  Future<Directory> getBookDirectory(String bookId) async =>
      Directory(p.join(rootDir.path, 'books', bookId))
        ..createSync(recursive: true);

  @override
  Future<Directory> getTempDirectory() async => rootDir;

  @override
  Future<Directory> getBackupDirectory() async =>
      Directory(p.join(rootDir.path, 'backups'))..createSync(recursive: true);

  @override
  Future<Directory> getModelsDirectory() async =>
      Directory(p.join(rootDir.path, 'ai_models'))..createSync(recursive: true);

  @override
  Future<void> cleanupTempDirectory() async {}

  @override
  Future<String> saveBookFile({
    required String bookId,
    required String originalFileName,
    required List<int> bytes,
  }) async => '';

  @override
  Future<String> copyBookFile({
    required String bookId,
    required String originalFileName,
    required File sourceFile,
  }) async => '';

  @override
  Future<String> saveCoverImage({
    required String bookId,
    required List<int> bytes,
  }) async => '';

  @override
  Future<String> calculateSha256(File file) async => 'dummy-sha';

  @override
  Future<void> deleteBookDirectory(String bookId) async {}

  @override
  void assertSafeRelativePath(String basePath, String relativePath) {}
}

class FakeHttpHeaders implements HttpHeaders {
  final Map<String, List<String>> _headers = {};

  @override
  void set(String name, Object value, {bool preserveHeaderCase = false}) {
    _headers[name] = [value.toString()];
  }

  @override
  void add(String name, Object value, {bool preserveHeaderCase = false}) {
    _headers.putIfAbsent(name, () => []).add(value.toString());
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeHttpClientRequest implements HttpClientRequest {
  FakeHttpClientRequest(this.response);
  final HttpClientResponse response;
  final List<List<int>> dataWritten = [];

  @override
  final HttpHeaders headers = FakeHttpHeaders();

  @override
  void add(List<int> data) {
    dataWritten.add(data);
  }

  @override
  Future<HttpClientResponse> close() async => response;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeHttpClientResponse extends Stream<List<int>>
    implements HttpClientResponse {
  FakeHttpClientResponse({required this.statusCode, required this.body});
  @override
  final int statusCode;
  final String body;

  @override
  StreamSubscription<List<int>> listen(
    void Function(List<int> event)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) {
    return Stream<List<int>>.value(utf8.encode(body)).listen(
      onData,
      onError: onError,
      onDone: onDone,
      cancelOnError: cancelOnError,
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeHttpClient implements HttpClient {
  FakeHttpClient({this.responseToReturn});
  HttpClientResponse? responseToReturn;

  @override
  Duration? connectionTimeout;

  @override
  Future<HttpClientRequest> postUrl(Uri url) async {
    final resp =
        responseToReturn ??
        FakeHttpClientResponse(
          statusCode: 200,
          body: jsonEncode({
            'choices': [
              {
                'message': {'content': 'Fake test response'},
              },
            ],
          }),
        );
    return FakeHttpClientRequest(resp);
  }

  @override
  void close({bool force = false}) {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late StorageService storageService;
  late MockSecureStorageService secureStorage;
  late FakeHttpClient fakeHttpClient;
  late CloudAiServiceImpl cloudService;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('enr_cloud_test_');
    storageService = CloudTestStorageService(tempDir);
    secureStorage = MockSecureStorageService();
    fakeHttpClient = FakeHttpClient();

    cloudService = CloudAiServiceImpl(
      storageService: storageService,
      secureStorage: secureStorage,
      logger: DefaultAppLogger(),
      httpClientFactory: () => fakeHttpClient,
    );
  });

  tearDown(() async {
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  group('CloudAiService Tests (ENR-0100 & ENR-0101)', () {
    test('Default config is disabled and requires user consent', () async {
      final config = await cloudService.getConfig();
      expect(config.enabled, isFalse);
      expect(config.userConsented, isFalse);
      expect(config.hasApiKey, isFalse);
    });

    test('Saving and loading config preserves settings', () async {
      const newConfig = CloudAiConfig(
        enabled: true,
        userConsented: true,
        provider: CloudAiProvider.googleGemini,
        endpointUrl: 'https://custom.endpoint.com',
        modelName: 'gemini-custom',
      );

      await cloudService.saveConfig(newConfig);
      final loaded = await cloudService.getConfig();

      expect(loaded.enabled, isTrue);
      expect(loaded.userConsented, isTrue);
      expect(loaded.provider, equals(CloudAiProvider.googleGemini));
      expect(loaded.endpointUrl, equals('https://custom.endpoint.com'));
      expect(loaded.modelName, equals('gemini-custom'));
    });

    test(
      'API key is stored in secure storage and not in config JSON',
      () async {
        await cloudService.saveApiKey('secret-test-key-12345');

        final storedKey = await secureStorage.read(key: 'cloud_ai_api_key');
        expect(storedKey, equals('secret-test-key-12345'));

        final config = await cloudService.getConfig();
        expect(config.hasApiKey, isTrue);

        // Verify file does not contain secret key
        final modelsDir = await storageService.getModelsDirectory();
        final configFile = File(p.join(modelsDir.path, 'cloud_ai_config.json'));
        if (await configFile.exists()) {
          final content = await configFile.readAsString();
          expect(content, isNot(contains('secret-test-key-12345')));
        }

        await cloudService.clearApiKey();
        expect(await secureStorage.read(key: 'cloud_ai_api_key'), isNull);
      },
    );

    test('generate refuses execution when disabled or not consented (ENR-0100-S03, S05)', () async {
      await cloudService.saveApiKey('key');
      await cloudService.saveConfig(
        const CloudAiConfig(enabled: false, userConsented: false),
      );

      const prompt = AiPromptEntity(userPrompt: 'Test');
      final result = await cloudService.generate(prompt);

      expect(result.isError, isTrue);
      expect(result.failureOrNull?.message, contains('Cloud AI is disabled'));
    });

    test('generate refuses execution when API key is missing', () async {
      await cloudService.saveConfig(
        const CloudAiConfig(enabled: true, userConsented: true),
      );

      const prompt = AiPromptEntity(userPrompt: 'Test');
      final result = await cloudService.generate(prompt);

      expect(result.isError, isTrue);
      expect(result.failureOrNull?.message, contains('API key is missing'));
    });

    test(
      'OpenAI compatible generate succeeds with valid credentials',
      () async {
        await cloudService.saveApiKey('valid-key');
        await cloudService.saveConfig(
          const CloudAiConfig(
            enabled: true,
            userConsented: true,
            provider: CloudAiProvider.openAiCompatible,
          ),
        );

        fakeHttpClient.responseToReturn = FakeHttpClientResponse(
          statusCode: 200,
          body: jsonEncode({
            'choices': [
              {
                'message': {
                  'content':
                      'The novel explores themes of connection and solitude.',
                },
              },
            ],
          }),
        );

        const prompt = AiPromptEntity(userPrompt: 'What are the themes?');
        final result = await cloudService.generate(prompt);

        expect(result.isSuccess, isTrue);
        expect(
          result.dataOrNull,
          contains('themes of connection and solitude'),
        );
      },
    );

    test(
      'Google Gemini generate succeeds and parses candidates parts',
      () async {
        await cloudService.saveApiKey('valid-gemini-key');
        await cloudService.saveConfig(
          const CloudAiConfig(
            enabled: true,
            userConsented: true,
            provider: CloudAiProvider.googleGemini,
          ),
        );

        fakeHttpClient.responseToReturn = FakeHttpClientResponse(
          statusCode: 200,
          body: jsonEncode({
            'candidates': [
              {
                'content': {
                  'parts': [
                    {
                      'text':
                          'Holo represents ancient wisdom and vulnerability.',
                    },
                  ],
                },
              },
            ],
          }),
        );

        const prompt = AiPromptEntity(userPrompt: 'Analyze Holo');
        final result = await cloudService.generate(prompt);

        expect(result.isSuccess, isTrue);
        expect(result.dataOrNull, contains('ancient wisdom and vulnerability'));
      },
    );

    test('Handles HTTP 401 Unauthorized securely without crashing', () async {
      await cloudService.saveApiKey('bad-key');
      await cloudService.saveConfig(
        const CloudAiConfig(
          enabled: true,
          userConsented: true,
          provider: CloudAiProvider.openAiCompatible,
        ),
      );

      fakeHttpClient.responseToReturn = FakeHttpClientResponse(
        statusCode: 401,
        body: '{"error": {"message": "Invalid API key"}}',
      );

      const prompt = AiPromptEntity(userPrompt: 'Test');
      final result = await cloudService.generate(prompt);

      expect(result.isError, isTrue);
      expect(result.failureOrNull?.message, contains('Unauthorized'));
    });
  });
}
