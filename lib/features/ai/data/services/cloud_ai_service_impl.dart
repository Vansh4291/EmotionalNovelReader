import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as p;

import '../../../../core/errors/failures.dart';
import '../../../../core/logging/app_logger.dart';
import '../../../../core/security/secure_storage_service.dart';
import '../../../../core/storage/storage_service.dart';
import '../../domain/entities/ai_inference_entities.dart';
import '../../domain/entities/cloud_ai_config.dart';
import '../../domain/services/cloud_ai_service.dart';

typedef HttpClientFactory = HttpClient Function();

class CloudAiServiceImpl implements CloudAiService {
  CloudAiServiceImpl({
    required this.storageService,
    required this.secureStorage,
    required this.logger,
    HttpClientFactory? httpClientFactory,
  }) : _clientFactory = httpClientFactory ?? HttpClient.new;

  final StorageService storageService;
  final SecureStorageService secureStorage;
  final AppLogger logger;
  final HttpClientFactory _clientFactory;

  static const String _apiKeyStorageKey = 'cloud_ai_api_key';
  static const String _configFileName = 'cloud_ai_config.json';

  @override
  Future<CloudAiConfig> getConfig() async {
    try {
      final modelsDir = await storageService.getModelsDirectory();
      final configFile = File(p.join(modelsDir.path, _configFileName));
      final hasKey = await secureStorage.containsKey(key: _apiKeyStorageKey);

      if (!await configFile.exists()) {
        return CloudAiConfig(hasApiKey: hasKey);
      }

      final jsonStr = await configFile.readAsString();
      final jsonMap = jsonDecode(jsonStr) as Map<String, dynamic>;
      return CloudAiConfig.fromJson(jsonMap, hasApiKey: hasKey);
    } catch (e, st) {
      logger.error('Failed to read Cloud AI config', e, st);
      return const CloudAiConfig();
    }
  }

  @override
  Future<void> saveConfig(CloudAiConfig config) async {
    try {
      final modelsDir = await storageService.getModelsDirectory();
      final configFile = File(p.join(modelsDir.path, _configFileName));
      await configFile.writeAsString(jsonEncode(config.toJson()), flush: true);
      logger.info(
        'Saved Cloud AI config (enabled: ${config.enabled}, consented: ${config.userConsented})',
      );
    } catch (e, st) {
      logger.error('Failed to save Cloud AI config', e, st);
    }
  }

  @override
  Future<void> saveApiKey(String apiKey) async {
    if (apiKey.trim().isEmpty) return;
    await secureStorage.write(key: _apiKeyStorageKey, value: apiKey.trim());
    logger.info(
      'Securely stored Cloud AI API key in EncryptedSharedPreferences',
    );
  }

  @override
  Future<void> clearApiKey() async {
    await secureStorage.delete(key: _apiKeyStorageKey);
    logger.info('Removed Cloud AI API key from secure storage');
  }

  @override
  Future<Result<String>> testConnection() async {
    final config = await getConfig();
    if (!config.enabled || !config.userConsented) {
      return const Result.error(
        ValidationFailure(
          'Cloud AI is disabled or consent has not been granted.',
        ),
      );
    }

    final apiKey = await secureStorage.read(key: _apiKeyStorageKey);
    if (apiKey == null || apiKey.trim().isEmpty) {
      return const Result.error(
        ValidationFailure(
          'API key is not configured. Please enter a valid API key.',
        ),
      );
    }

    try {
      const testPrompt = AiPromptEntity(
        systemPrompt: 'You are a test assistant.',
        userPrompt: 'Respond with the single word "OK" to verify connectivity.',
        maxTokens: 10,
      );

      final result = await generate(testPrompt);
      if (result.isSuccess) {
        return const Result.success(
          'Connection test succeeded! Remote endpoint is accessible.',
        );
      } else {
        return result;
      }
    } catch (e, st) {
      logger.error('Cloud AI connection test failed', e, st);
      return Result.error(UnexpectedFailure('Connection test failed: $e'));
    }
  }

  @override
  Future<Result<String>> generate(AiPromptEntity prompt) async {
    final config = await getConfig();
    if (!config.enabled || !config.userConsented) {
      return const Result.error(
        ValidationFailure(
          'Cloud AI is disabled. Please enable it in Settings with explicit consent.',
        ),
      );
    }

    final apiKey = await secureStorage.read(key: _apiKeyStorageKey);
    if (apiKey == null || apiKey.trim().isEmpty) {
      return const Result.error(
        ValidationFailure(
          'API key is missing. Please set your API key in Cloud AI Settings.',
        ),
      );
    }

    final client = _clientFactory();
    client.connectionTimeout = const Duration(seconds: 20);

    try {
      if (config.provider == CloudAiProvider.googleGemini) {
        return await _generateGemini(client, config, apiKey, prompt);
      } else {
        return await _generateOpenAi(client, config, apiKey, prompt);
      }
    } catch (e, st) {
      logger.error('Cloud AI request failed', e, st);
      return Result.error(
        UnexpectedFailure('Network error during Cloud AI request: $e'),
      );
    } finally {
      client.close();
    }
  }

  @override
  Stream<String> generateStream(
    AiPromptEntity prompt, {
    bool Function()? isCancelled,
  }) async* {
    final res = await generate(prompt);
    if (res.isError) {
      yield 'Error: ${res.failureOrNull?.message ?? "Cloud AI generation failed"}';
      return;
    }

    final text = res.dataOrNull ?? '';
    // Chunk tokens for smooth reader consumption
    final words = text.split(' ');
    for (int i = 0; i < words.length; i++) {
      if (isCancelled?.call() == true) break;
      yield i == words.length - 1 ? words[i] : '${words[i]} ';
      await Future<void>.delayed(const Duration(milliseconds: 30));
    }
  }

  Future<Result<String>> _generateOpenAi(
    HttpClient client,
    CloudAiConfig config,
    String apiKey,
    AiPromptEntity prompt,
  ) async {
    final base = config.endpointUrl.endsWith('/')
        ? config.endpointUrl.substring(0, config.endpointUrl.length - 1)
        : config.endpointUrl;

    final targetUrl = base.endsWith('/chat/completions')
        ? base
        : '$base/chat/completions';
    final uri = Uri.parse(targetUrl);

    final request = await client.postUrl(uri);
    request.headers.set('Content-Type', 'application/json');
    request.headers.set('Authorization', 'Bearer $apiKey');

    final payload = {
      'model': config.modelName,
      'messages': [
        {'role': 'system', 'content': prompt.systemPrompt},
        {'role': 'user', 'content': prompt.userPrompt},
      ],
      'temperature': prompt.temperature,
      'max_tokens': prompt.maxTokens,
    };

    request.add(utf8.encode(jsonEncode(payload)));
    final response = await request.close();
    final body = await utf8.decodeStream(response);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final json = jsonDecode(body) as Map<String, dynamic>;
      final choices = json['choices'] as List<dynamic>?;
      if (choices != null && choices.isNotEmpty) {
        final message = choices.first['message'] as Map<String, dynamic>?;
        final content = message?['content'] as String?;
        if (content != null) {
          return Result.success(content.trim());
        }
      }
      return const Result.success('No response text returned.');
    } else if (response.statusCode == 401) {
      return const Result.error(
        ValidationFailure('Unauthorized: Invalid API key or credentials.'),
      );
    } else if (response.statusCode == 429) {
      return const Result.error(
        UnexpectedFailure('Rate limit exceeded or insufficient credits.'),
      );
    } else {
      return Result.error(
        UnexpectedFailure(
          'Remote server returned HTTP ${response.statusCode}: $body',
        ),
      );
    }
  }

  Future<Result<String>> _generateGemini(
    HttpClient client,
    CloudAiConfig config,
    String apiKey,
    AiPromptEntity prompt,
  ) async {
    final base = config.endpointUrl.endsWith('/')
        ? config.endpointUrl.substring(0, config.endpointUrl.length - 1)
        : config.endpointUrl;

    final targetUrl =
        '$base/models/${config.modelName}:generateContent?key=$apiKey';
    final uri = Uri.parse(targetUrl);

    final request = await client.postUrl(uri);
    request.headers.set('Content-Type', 'application/json');

    final payload = {
      'system_instruction': {
        'parts': [
          {'text': prompt.systemPrompt},
        ],
      },
      'contents': [
        {
          'role': 'user',
          'parts': [
            {'text': prompt.userPrompt},
          ],
        },
      ],
      'generationConfig': {
        'temperature': prompt.temperature,
        'maxOutputTokens': prompt.maxTokens,
      },
    };

    request.add(utf8.encode(jsonEncode(payload)));
    final response = await request.close();
    final body = await utf8.decodeStream(response);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final json = jsonDecode(body) as Map<String, dynamic>;
      final candidates = json['candidates'] as List<dynamic>?;
      if (candidates != null && candidates.isNotEmpty) {
        final content = candidates.first['content'] as Map<String, dynamic>?;
        final parts = content?['parts'] as List<dynamic>?;
        if (parts != null && parts.isNotEmpty) {
          final text = parts.first['text'] as String?;
          if (text != null) {
            return Result.success(text.trim());
          }
        }
      }
      return const Result.success('No response text returned.');
    } else if (response.statusCode == 400 || response.statusCode == 403) {
      return const Result.error(
        ValidationFailure('Authentication failed: Invalid Gemini API key.'),
      );
    } else {
      return Result.error(
        UnexpectedFailure(
          'Gemini API returned HTTP ${response.statusCode}: $body',
        ),
      );
    }
  }
}
