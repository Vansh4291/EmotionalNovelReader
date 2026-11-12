import 'package:flutter_tts/flutter_tts.dart';

import '../../../../core/logging/app_logger.dart';
import '../../domain/services/tts_service.dart';

class FlutterTtsServiceImpl implements TtsService {
  FlutterTtsServiceImpl({FlutterTts? tts, required this.logger})
    : _ttsInstance = tts;

  FlutterTts? _ttsInstance;
  FlutterTts get _tts => _ttsInstance ??= FlutterTts();
  final AppLogger logger;

  void Function()? _completionHandler;
  void Function(String message)? _errorHandler;
  void Function(String text, int start, int end, String word)? _progressHandler;

  @override
  Future<bool> initialize() async {
    try {
      await _tts.awaitSpeakCompletion(true);

      _tts.setCompletionHandler(() {
        _completionHandler?.call();
      });

      _tts.setErrorHandler((dynamic msg) {
        final err = msg?.toString() ?? 'TTS Error';
        logger.error('TTS engine reported error: $err');
        _errorHandler?.call(err);
      });

      _tts.setProgressHandler((
        dynamic text,
        dynamic start,
        dynamic end,
        dynamic word,
      ) {
        _progressHandler?.call(
          text?.toString() ?? '',
          start is int ? start : (int.tryParse(start?.toString() ?? '0') ?? 0),
          end is int ? end : (int.tryParse(end?.toString() ?? '0') ?? 0),
          word?.toString() ?? '',
        );
      });

      return true;
    } catch (e, st) {
      logger.error('Failed to initialize TTS', e, st);
      return false;
    }
  }

  @override
  Future<void> speak(String text) async {
    try {
      if (text.trim().isEmpty) return;
      await _tts.speak(text);
    } catch (e, st) {
      logger.error('Failed to speak text', e, st);
      _errorHandler?.call(e.toString());
    }
  }

  @override
  Future<void> pause() async {
    try {
      await _tts.pause();
    } catch (e, st) {
      logger.error('Failed to pause TTS', e, st);
    }
  }

  @override
  Future<void> stop() async {
    try {
      await _tts.stop();
    } catch (e, st) {
      logger.error('Failed to stop TTS', e, st);
    }
  }

  @override
  Future<void> setSpeechRate(double rate) async {
    try {
      // flutter_tts uses 0.0 to 1.0 where 0.5 is normal speed on Android,
      // or standard 0.5x to 2.0x normalized.
      await _tts.setSpeechRate(rate.clamp(0.1, 2.0));
    } catch (e, st) {
      logger.error('Failed to set speech rate', e, st);
    }
  }

  @override
  Future<void> setPitch(double pitch) async {
    try {
      await _tts.setPitch(pitch.clamp(0.5, 2.0));
    } catch (e, st) {
      logger.error('Failed to set pitch', e, st);
    }
  }

  @override
  Future<void> setVolume(double volume) async {
    try {
      await _tts.setVolume(volume.clamp(0.0, 1.0));
    } catch (e, st) {
      logger.error('Failed to set volume', e, st);
    }
  }

  @override
  Future<void> setLanguage(String languageCode) async {
    try {
      await _tts.setLanguage(languageCode);
    } catch (e, st) {
      logger.error('Failed to set language to $languageCode', e, st);
    }
  }

  @override
  Future<List<String>> getAvailableLanguages() async {
    try {
      final langs = await _tts.getLanguages;
      if (langs is List) {
        return langs.map((e) => e.toString()).toList();
      }
      return const [];
    } catch (e, st) {
      logger.error('Failed to fetch available languages', e, st);
      return const [];
    }
  }

  @override
  Future<List<String>> getAvailableEngines() async {
    try {
      final engines = await _tts.getEngines;
      if (engines is List) {
        return engines.map((e) => e.toString()).toList();
      }
      return const [];
    } catch (e, st) {
      logger.error('Failed to fetch available engines', e, st);
      return const [];
    }
  }

  @override
  Future<void> setEngine(String engine) async {
    try {
      await _tts.setEngine(engine);
    } catch (e, st) {
      logger.error('Failed to set TTS engine to $engine', e, st);
    }
  }

  @override
  void setCompletionHandler(void Function() handler) {
    _completionHandler = handler;
  }

  @override
  void setErrorHandler(void Function(String message) handler) {
    _errorHandler = handler;
  }

  @override
  void setProgressHandler(
    void Function(String text, int start, int end, String word) handler,
  ) {
    _progressHandler = handler;
  }

  @override
  void dispose() {
    _ttsInstance?.stop();
  }
}
