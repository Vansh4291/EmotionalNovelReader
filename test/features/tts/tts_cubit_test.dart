import 'package:bloc_test/bloc_test.dart';
import 'package:emotional_novel_reader/core/logging/app_logger.dart';
import 'package:emotional_novel_reader/features/tts/domain/entities/tts_entities.dart';
import 'package:emotional_novel_reader/features/tts/domain/services/tts_service.dart';
import 'package:emotional_novel_reader/features/tts/domain/services/tts_text_parser.dart';
import 'package:emotional_novel_reader/features/tts/presentation/cubit/tts_cubit.dart';
import 'package:emotional_novel_reader/features/tts/presentation/cubit/tts_state.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockTtsService extends Mock implements TtsService {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late MockTtsService mockTtsService;
  late AppLogger logger;
  late void Function() capturedCompletionHandler;
  late void Function(String message) capturedErrorHandler;

  setUp(() {
    mockTtsService = MockTtsService();
    logger = DefaultAppLogger();

    when(() => mockTtsService.setCompletionHandler(any())).thenAnswer((inv) {
      capturedCompletionHandler = inv.positionalArguments[0] as void Function();
    });
    when(() => mockTtsService.setErrorHandler(any())).thenAnswer((inv) {
      capturedErrorHandler =
          inv.positionalArguments[0] as void Function(String);
    });
    when(() => mockTtsService.initialize()).thenAnswer((_) async => true);
    when(() => mockTtsService.getAvailableLanguages())
        .thenAnswer((_) async => ['en-US', 'ja-JP']);
    when(() => mockTtsService.getAvailableEngines())
        .thenAnswer((_) async => ['com.google.android.tts']);
    when(() => mockTtsService.setSpeechRate(any())).thenAnswer((_) async {});
    when(() => mockTtsService.setPitch(any())).thenAnswer((_) async {});
    when(() => mockTtsService.setVolume(any())).thenAnswer((_) async {});
    when(() => mockTtsService.setLanguage(any())).thenAnswer((_) async {});
    when(() => mockTtsService.setEngine(any())).thenAnswer((_) async {});
    when(() => mockTtsService.speak(any())).thenAnswer((_) async {});
    when(() => mockTtsService.pause()).thenAnswer((_) async {});
    when(() => mockTtsService.stop()).thenAnswer((_) async {});
    when(() => mockTtsService.dispose()).thenReturn(null);
  });

  group('TtsCubit Tests', () {
    test('initialize loads available engines and languages', () async {
      final cubit = TtsCubit(ttsService: mockTtsService, logger: logger);

      await cubit.initialize();
      expect(cubit.state.availableLanguages, ['en-US', 'ja-JP']);
      expect(cubit.state.availableEngines, ['com.google.android.tts']);

      await cubit.close();
    });

    test('loadChapter tokenizes text and sets chapter state', () async {
      final cubit = TtsCubit(
        ttsService: mockTtsService,
        textParser: const TtsTextParser(),
        logger: logger,
      );

      await cubit.loadChapter(
        bookId: 'book-1',
        chapterId: 'chap-1',
        chapterTitle: 'Prologue',
        content: 'First sentence. Second sentence! Third sentence?',
      );

      expect(cubit.state.chapterId, 'chap-1');
      expect(cubit.state.chapterTitle, 'Prologue');
      expect(cubit.state.sentences.length, 3);
      expect(cubit.state.currentSentenceIndex, 0);
      expect(cubit.state.currentSentence?.text, 'First sentence.');

      await cubit.close();
    });

    blocTest<TtsCubit, TtsState>(
      'play sets status to playing and invokes ttsService.speak',
      build: () => TtsCubit(ttsService: mockTtsService, logger: logger),
      seed: () => const TtsState(
        sentences: [
          TtsSentence(
            index: 0,
            text: 'Hello world.',
            charStart: 0,
            charEnd: 12,
          ),
        ],
        currentSentenceIndex: 0,
      ),
      act: (cubit) => cubit.play(),
      expect: () => [
        isA<TtsState>().having(
          (s) => s.status,
          'status',
          TtsPlaybackStatus.playing,
        ),
      ],
      verify: (_) {
        verify(() => mockTtsService.speak('Hello world.')).called(1);
      },
    );

    test('nextSentence advances index and invokes play if playing', () async {
      final cubit = TtsCubit(ttsService: mockTtsService, logger: logger);

      await cubit.loadChapter(
        bookId: 'b-1',
        chapterId: 'c-1',
        chapterTitle: 'Title',
        content: 'Sentence one. Sentence two.',
      );

      await cubit.play();
      expect(cubit.state.currentSentenceIndex, 0);

      await cubit.nextSentence();
      expect(cubit.state.currentSentenceIndex, 1);
      expect(cubit.state.currentSentence?.text, 'Sentence two.');
      verify(() => mockTtsService.speak('Sentence two.')).called(1);

      await cubit.close();
    });

    test(
      'triggering completion handler automatically advances sentence',
      () async {
        final cubit = TtsCubit(ttsService: mockTtsService, logger: logger);

        await cubit.loadChapter(
          bookId: 'b-1',
          chapterId: 'c-1',
          chapterTitle: 'Title',
          content: 'First. Second.',
        );

        await cubit.play();
        expect(cubit.state.currentSentenceIndex, 0);

        // Trigger completion of first sentence
        capturedCompletionHandler();
        await Future<void>.delayed(const Duration(milliseconds: 10));

        expect(cubit.state.currentSentenceIndex, 1);

        await cubit.close();
      },
    );

    test(
      'reaching end of chapter fires onChapterCompleted and stops',
      () async {
        final cubit = TtsCubit(ttsService: mockTtsService, logger: logger);

        bool chapterFinished = false;
        cubit.onChapterCompleted = () {
          chapterFinished = true;
        };

        await cubit.loadChapter(
          bookId: 'b-1',
          chapterId: 'c-1',
          chapterTitle: 'Title',
          content: 'Only sentence.',
        );

        await cubit.play();
        // Advance past the only sentence
        await cubit.nextSentence();

        expect(chapterFinished, isTrue);
        expect(cubit.state.status, TtsPlaybackStatus.stopped);

        await cubit.close();
      },
    );

    test('rate, pitch, volume setters update state and service', () async {
      final cubit = TtsCubit(ttsService: mockTtsService, logger: logger);

      await cubit.setRate(1.25);
      expect(cubit.state.rate, 1.25);
      verify(() => mockTtsService.setSpeechRate(1.25)).called(1);

      await cubit.setPitch(1.1);
      expect(cubit.state.pitch, 1.1);
      verify(() => mockTtsService.setPitch(1.1)).called(1);

      await cubit.setVolume(0.8);
      expect(cubit.state.volume, 0.8);
      verify(() => mockTtsService.setVolume(0.8)).called(1);

      await cubit.close();
    });

    test(
      'receiving error callback sets status to stopped and records message',
      () async {
        final cubit = TtsCubit(ttsService: mockTtsService, logger: logger);

        capturedErrorHandler('Language not supported');

        expect(cubit.state.status, TtsPlaybackStatus.stopped);
        expect(cubit.state.errorMessage, 'Language not supported');

        await cubit.close();
      },
    );
  });
}
