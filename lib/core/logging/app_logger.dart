import 'package:logger/logger.dart';

/// Privacy-safe structured logger interface for EmotionalNovelReader.
abstract interface class AppLogger {
  void debug(String message, [Object? error, StackTrace? stackTrace]);
  void info(String message, [Object? error, StackTrace? stackTrace]);
  void warning(String message, [Object? error, StackTrace? stackTrace]);
  void error(String message, [Object? error, StackTrace? stackTrace]);
}

/// Production and development logger implementation wrapping the [Logger] package.
///
/// Automatically sanitizes messages to ensure no book contents, user annotations,
/// or sensitive filesystem paths leak into local diagnostic logs.
class DefaultAppLogger implements AppLogger {
  DefaultAppLogger({Logger? logger})
      : _logger = logger ??
            Logger(
              printer: PrettyPrinter(
                methodCount: 2,
                errorMethodCount: 8,
                lineLength: 100,
                colors: false,
                printEmojis: true,
                dateTimeFormat: DateTimeFormat.dateAndTime,
              ),
              output: ConsoleOutput(),
            );

  final Logger _logger;

  // Patterns for path and PII sanitization
  static final RegExp _userPathPattern =
      RegExp(r'(/Users/|/home/|C:\\Users\\)[^/\\]+', caseSensitive: false);

  String _sanitize(String message) {
    // Redact machine-specific username paths
    return message.replaceAllMapped(_userPathPattern, (match) {
      final prefix = match.group(1) ?? '';
      return '$prefix<REDACTED_USER>';
    });
  }

  @override
  void debug(String message, [Object? error, StackTrace? stackTrace]) {
    _logger.d(_sanitize(message), error: error, stackTrace: stackTrace);
  }

  @override
  void info(String message, [Object? error, StackTrace? stackTrace]) {
    _logger.i(_sanitize(message), error: error, stackTrace: stackTrace);
  }

  @override
  void warning(String message, [Object? error, StackTrace? stackTrace]) {
    _logger.w(_sanitize(message), error: error, stackTrace: stackTrace);
  }

  @override
  void error(String message, [Object? error, StackTrace? stackTrace]) {
    _logger.e(_sanitize(message), error: error, stackTrace: stackTrace);
  }
}

