import 'package:emotional_novel_reader/core/logging/app_logger.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:logger/logger.dart';

class TestLogOutput extends LogOutput {
  final List<OutputEvent> events = [];

  @override
  void output(OutputEvent event) {
    events.add(event);
  }
}

void main() {
  late TestLogOutput logOutput;
  late AppLogger logger;

  setUp(() {
    logOutput = TestLogOutput();
    final internalLogger = Logger(
      output: logOutput,
      printer: SimplePrinter(colors: false, printTime: false),
    );
    logger = DefaultAppLogger(logger: internalLogger);
  });

  group('Privacy-safe logging tests', () {
    test('Redacts Windows user directory paths', () {
      logger.info('Reading file at C:\\Users\\Alice\\Documents\\book.epub');

      expect(logOutput.events, isNotEmpty);
      final loggedLines = logOutput.events.first.lines.join(' ');
      expect(loggedLines, contains('C:\\Users\\<REDACTED_USER>\\Documents\\book.epub'));
      expect(loggedLines, isNot(contains('Alice')));
    });

    test('Redacts Unix and macOS user directory paths', () {
      logger.warning('Failed to open /Users/Bob/Downloads/novel.txt');

      expect(logOutput.events, isNotEmpty);
      final loggedLines = logOutput.events.first.lines.join(' ');
      expect(loggedLines, contains('/Users/<REDACTED_USER>/Downloads/novel.txt'));
      expect(loggedLines, isNot(contains('Bob')));
    });

    test('Passes operational messages through without alteration', () {
      logger.debug('Database opened in WAL mode');

      expect(logOutput.events, isNotEmpty);
      final loggedLines = logOutput.events.first.lines.join(' ');
      expect(loggedLines, contains('Database opened in WAL mode'));
    });
  });
}

