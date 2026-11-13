import 'dart:io';
import 'dart:ui' as ui;

import 'package:drift/native.dart';
import 'package:emotional_novel_reader/app/di/injection.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:emotional_novel_reader/features/annotations/domain/entities/highlight_entity.dart';
import 'package:emotional_novel_reader/features/annotations/presentation/cubit/annotation_cubit.dart';
import 'package:emotional_novel_reader/features/import/domain/extractors/extracted_book_data.dart';
import 'package:emotional_novel_reader/features/import/domain/extractors/pdf_extractor.dart';
import 'package:emotional_novel_reader/features/library/domain/entities/book_entity.dart';
import 'package:emotional_novel_reader/features/library/domain/entities/chapter_entity.dart';
import 'package:emotional_novel_reader/features/library/domain/entities/reading_progress_entity.dart';
import 'package:emotional_novel_reader/features/library/domain/repositories/book_repository.dart';
import 'package:emotional_novel_reader/features/reader/presentation/cubit/reader_cubit.dart';
import 'package:emotional_novel_reader/features/reader/presentation/screens/reader_screen.dart';
import 'package:emotional_novel_reader/features/search/domain/repositories/search_repository.dart';
import 'package:emotional_novel_reader/features/tts/domain/services/tts_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';

class FakeTtsService implements TtsService {
  @override
  void setCompletionHandler(void Function() handler) {}
  @override
  void setErrorHandler(void Function(String message) handler) {}
  @override
  void setProgressHandler(void Function(String text, int start, int end, String word) handler) {}
  @override
  Future<bool> initialize() async => true;
  @override
  Future<List<String>> getAvailableLanguages() async => ['en-US'];
  @override
  Future<List<String>> getAvailableEngines() async => ['com.google.android.tts'];
  @override
  Future<void> setSpeechRate(double rate) async {}
  @override
  Future<void> setPitch(double pitch) async {}
  @override
  Future<void> setVolume(double volume) async {}
  @override
  Future<void> setLanguage(String language) async {}
  @override
  Future<void> setEngine(String engine) async {}
  @override
  Future<void> speak(String text) async {}
  @override
  Future<void> pause() async {}
  @override
  Future<void> stop() async {}
  @override
  void dispose() {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppDatabase testDb;
  const artifactDir = r'C:\Users\vansh\.gemini\antigravity\brain\912309cb-c220-424d-8fea-3d54cb56039b';

  late ExtractedBookData atomicData;
  late ExtractedBookData deepWorkData;
  late ExtractedBookData howToReadData;
  late ExtractedBookData hauntingData;

  setUpAll(() async {
    const pdfExtractor = PdfExtractor();

    final atomicRes = await pdfExtractor.extract(File('Books/Atomic Habits James Clear.pdf'));
    atomicData = atomicRes.dataOrNull!;

    final deepWorkRes = await pdfExtractor.extract(File('Books/Deep Work.pdf'));
    deepWorkData = deepWorkRes.dataOrNull!;

    final howToReadRes = await pdfExtractor.extract(File('Books/How to Read a Book.pdf'));
    howToReadData = howToReadRes.dataOrNull!;

    final hauntingRes = await pdfExtractor.extract(File('Books/Haunting Adeline.pdf'));
    hauntingData = hauntingRes.dataOrNull!;
  });

  setUp(() async {
    testDb = AppDatabase(NativeDatabase.memory());
    await configureDependencies(
      databaseOverride: testDb,
      ttsServiceOverride: FakeTtsService(),
    );
  });

  tearDown(() async {
    if (getIt.isRegistered<AppDatabase>()) {
      await getIt<AppDatabase>().close();
    }
    await getIt.reset();
  });

  Future<void> captureWidgetScreenshot({
    required WidgetTester tester,
    required GlobalKey key,
    required String filename,
  }) async {
    await tester.runAsync(() async {
      await Future<void>.delayed(const Duration(milliseconds: 200));
      final boundary = key.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary != null) {
        final image = await boundary.toImage(pixelRatio: 2.0);
        final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
        if (byteData != null) {
          final pngBytes = byteData.buffer.asUint8List();
          final outFile = File('$artifactDir\\$filename');
          await outFile.writeAsBytes(pngBytes, flush: true);
        }
      }
    });
  }

  testWidgets(
    'PDF UI Acceptance: Atomic Habits, How to Read a Book, Haunting Adeline, Deep Work',
    (tester) async {
      // 1. ATOMIC HABITS VERIFICATION
      final pattiIndex = atomicData.chapters.indexWhere(
        (c) => c.content.contains('Patti') || c.content.contains('said casually') || c.content.contains('ambulance'),
      );
      expect(pattiIndex, isNonNegative, reason: 'Patti excerpt must be found');
      final targetChapter = atomicData.chapters[pattiIndex];

      // Verify no Caesar shift, no tofu boxes, clean ligatures and word boundaries
      expect(targetChapter.content, isNot(contains('“ P a t t i')));
      expect(targetChapter.content, contains('“Patti,” I said casually'));
      expect(targetChapter.content, contains('ignoring the fact that it had taken me ten seconds'));
      expect(targetChapter.content, contains('That is the last question'));
      expect(targetChapter.content, contains('Shortly after arriving'));
      expect(targetChapter.content, contains('first seizure'));
      expect(targetChapter.content, contains('Then I stopped breathing entirely'));
      expect(targetChapter.content, contains('fly me to a larger hospital'));
      expect(targetChapter.content, contains('during the flight'));
      expect(targetChapter.content, contains('ground floor'));
      expect(targetChapter.content, contains('fixed'));
      expect(targetChapter.content, isNot(contains('\uFFFD')));
      expect(targetChapter.content, isNot(contains('\uE062')));
      expect(targetChapter.content, isNot(contains('\uE09D')));
      expect(targetChapter.content, isNot(contains('\u0000')));

      // 2. HOW TO READ A BOOK VERIFICATION (Fixed from unreadable gibberish)
      expect(howToReadData.chapters.length, greaterThan(100));
      final howToReadSample = howToReadData.chapters.map((c) => c.content).join('\n');
      expect(howToReadSample, isNot(contains(r'U[yb<lz$8-yzUk(z1H]')));
      expect(howToReadSample, contains('Mortimer'));
      expect(howToReadSample, contains('HOW TO READ A BOOK'));
      expect(howToReadSample, contains('plausibility'));

      // 3. HAUNTING ADELINE VERIFICATION
      expect(hauntingData.chapters.isNotEmpty, isTrue);
      final hauntingSample = hauntingData.chapters.map((c) => c.content).join('\n');
      expect(hauntingSample, contains('Haunting Adeline'));
      expect(hauntingSample, contains('H. D. Carlton'));
      expect(hauntingSample, contains('Printed in the United States of America'));
      expect(hauntingSample, isNot(contains('@7   00 r ),, r ) r ?43')));

      // 4. DEEP WORK VERIFICATION
      expect(deepWorkData.chapters.isNotEmpty, isTrue);
      final deepWorkSample = deepWorkData.chapters.map((c) => c.content).join('\n');
      expect(deepWorkSample, contains('Deep Work'));
      expect(deepWorkSample, contains('Carl Jung'));

      // 5. DATABASE PERSISTENCE FOR ALL 4 BOOKS
      final bookRepo = getIt<BookRepository>();
      const bookId = 'book-atomic-habits';
      final now = DateTime.now();
      final atomicFile = File('Books/Atomic Habits James Clear.pdf');
      final atomicBook = BookEntity(
        id: bookId,
        title: 'Atomic Habits',
        author: 'James Clear',
        originalFileName: 'Atomic Habits James Clear.pdf',
        filePath: atomicFile.path,
        format: 'pdf',
        sha256: 'dummy_hash_atomic',
        fileSizeBytes: atomicFile.lengthSync(),
        createdAt: now,
      );
      await bookRepo.saveBook(atomicBook);

      final atomicChapterEntities = atomicData.chapters.map((c) {
        return ChapterEntity(
          id: '${bookId}_ch_${c.index}',
          bookId: bookId,
          chapterIndex: c.index,
          title: c.title,
          content: c.content,
          wordCount: c.wordCount,
          characterCount: c.characterCount,
        );
      }).toList();
      await bookRepo.saveChapters(atomicChapterEntities);

      // Persist How to Read a Book
      const htrBookId = 'book-how-to-read';
      final htrFile = File('Books/How to Read a Book.pdf');
      final htrBook = BookEntity(
        id: htrBookId,
        title: 'How to Read a Book',
        author: 'Mortimer J. Adler',
        originalFileName: 'How to Read a Book.pdf',
        filePath: htrFile.path,
        format: 'pdf',
        sha256: 'dummy_htr',
        fileSizeBytes: htrFile.lengthSync(),
        createdAt: now,
      );
      await bookRepo.saveBook(htrBook);
      final htrChapters = howToReadData.chapters.map((c) {
        return ChapterEntity(
          id: '${htrBookId}_ch_${c.index}',
          bookId: htrBookId,
          chapterIndex: c.index,
          title: c.title,
          content: c.content,
          wordCount: c.wordCount,
          characterCount: c.characterCount,
        );
      }).toList();
      await bookRepo.saveChapters(htrChapters);

      // Persist Haunting Adeline
      const hauntBookId = 'book-haunting-adeline';
      final hauntFile = File('Books/Haunting Adeline.pdf');
      final hauntBook = BookEntity(
        id: hauntBookId,
        title: 'Haunting Adeline',
        author: 'H. D. Carlton',
        originalFileName: 'Haunting Adeline.pdf',
        filePath: hauntFile.path,
        format: 'pdf',
        sha256: 'dummy_haunt',
        fileSizeBytes: hauntFile.lengthSync(),
        createdAt: now,
      );
      await bookRepo.saveBook(hauntBook);
      final hauntChapters = hauntingData.chapters.map((c) {
        return ChapterEntity(
          id: '${hauntBookId}_ch_${c.index}',
          bookId: hauntBookId,
          chapterIndex: c.index,
          title: c.title,
          content: c.content,
          wordCount: c.wordCount,
          characterCount: c.characterCount,
        );
      }).toList();
      await bookRepo.saveChapters(hauntChapters);

      // Persist Deep Work
      const dwBookId = 'book-deep-work';
      final dwFile = File('Books/Deep Work.pdf');
      final dwBook = BookEntity(
        id: dwBookId,
        title: 'Deep Work',
        author: 'Cal Newport',
        originalFileName: 'Deep Work.pdf',
        filePath: dwFile.path,
        format: 'pdf',
        sha256: 'dummy_dw',
        fileSizeBytes: dwFile.lengthSync(),
        createdAt: now,
      );
      await bookRepo.saveBook(dwBook);
      final dwChapters = deepWorkData.chapters.map((c) {
        return ChapterEntity(
          id: '${dwBookId}_ch_${c.index}',
          bookId: dwBookId,
          chapterIndex: c.index,
          title: c.title,
          content: c.content,
          wordCount: c.wordCount,
          characterCount: c.characterCount,
        );
      }).toList();
      await bookRepo.saveChapters(dwChapters);

      // 6. SEARCH VERIFICATION
      final searchRepo = getIt<SearchRepository>();
      final searchAtomic = await searchRepo.searchContent('seizure', bookId: bookId);
      expect(searchAtomic.isSuccess, isTrue);
      expect(searchAtomic.dataOrNull, isNotEmpty);
      expect(searchAtomic.dataOrNull!.any((r) => r.chapterTitle == targetChapter.title), isTrue);

      final searchHtr = await searchRepo.searchContent('plausibility', bookId: htrBookId);
      expect(searchHtr.isSuccess, isTrue);
      expect(searchHtr.dataOrNull, isNotEmpty);

      // 7. READING PROGRESS RESTORATION
      final progress = ReadingProgressEntity(
        bookId: bookId,
        currentLocation: '$pattiIndex',
        currentChapterId: atomicChapterEntities[pattiIndex].id,
        progressPercentage: 0.05,
        updatedAt: now,
      );
      await bookRepo.saveReadingProgress(progress);
      final fetchedProgress = await bookRepo.getReadingProgress(bookId);
      expect(fetchedProgress.isSuccess, isTrue);
      expect(fetchedProgress.dataOrNull?.currentChapterId, atomicChapterEntities[pattiIndex].id);

      // 8. TEXT HIGHLIGHTING AND ANNOTATIONS
      final annotationCubit = getIt<AnnotationCubit>();
      await annotationCubit.loadAnnotations(bookId);
      const sampleExcerpt = 'Then I stopped breathing entirely.';
      final startOffset = targetChapter.content.indexOf('Then I stopped');
      expect(startOffset, isNonNegative);
      final endOffset = startOffset + sampleExcerpt.length;

      final highlight = HighlightEntity(
        id: 'hl-p10-1',
        bookId: bookId,
        chapterId: atomicChapterEntities[pattiIndex].id,
        chapterIndex: pattiIndex,
        chapterTitle: targetChapter.title,
        startOffset: startOffset,
        endOffset: endOffset,
        selectedText: sampleExcerpt,
        colorValue: 0xFFFFF176,
        createdAt: now,
      );
      final spans = ReaderScreen.buildHighlightedSpans(
        content: targetChapter.content,
        highlights: [highlight],
        baseStyle: const TextStyle(fontSize: 16, color: Colors.white),
      );
      expect(spans, isNotEmpty);
      expect(
        spans.any(
          (s) =>
              s is TextSpan &&
              (s.text?.contains('Then I stopped') ?? false) &&
              s.style?.backgroundColor != null,
        ),
        isTrue,
      );

      // 9. RENDER READER SCREEN FOR ATOMIC HABITS (Patti page)
      tester.view.physicalSize = const Size(800, 1700);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final repaintKey1 = GlobalKey();
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData.dark(),
          home: Scaffold(
            body: RepaintBoundary(
              key: repaintKey1,
              child: SizedBox(
                width: 400,
                height: 850,
                child: BlocProvider<ReaderCubit>(
                  create: (_) => getIt<ReaderCubit>(),
                  child: ReaderScreen(
                    bookId: bookId,
                    initialChapterIndex: pattiIndex,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(ReaderScreen), findsOneWidget);
      expect(find.textContaining('“Patti,” I said casually'), findsWidgets);

      await captureWidgetScreenshot(
        tester: tester,
        key: repaintKey1,
        filename: 'pdf_ui_atomic_habits_patti_page.png',
      );

      // 10. RENDER READER SCREEN FOR HOW TO READ A BOOK
      final repaintKey2 = GlobalKey();
      final htrTargetIdx = howToReadData.chapters.indexWhere((c) => c.content.contains('HOW TO READ A BOOK'));
      final effectiveHtrIdx = htrTargetIdx >= 0 ? htrTargetIdx : 0;
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData.dark(),
          home: Scaffold(
            body: RepaintBoundary(
              key: repaintKey2,
              child: SizedBox(
                width: 400,
                height: 850,
                child: BlocProvider<ReaderCubit>(
                  create: (_) => getIt<ReaderCubit>(),
                  child: ReaderScreen(
                    bookId: htrBookId,
                    initialChapterIndex: effectiveHtrIdx,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(ReaderScreen), findsOneWidget);

      await captureWidgetScreenshot(
        tester: tester,
        key: repaintKey2,
        filename: 'pdf_ui_how_to_read_a_book_page.png',
      );

      // 11. RENDER READER SCREEN FOR HAUNTING ADELINE
      final repaintKey3 = GlobalKey();
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData.dark(),
          home: Scaffold(
            body: RepaintBoundary(
              key: repaintKey3,
              child: SizedBox(
                width: 400,
                height: 850,
                child: BlocProvider<ReaderCubit>(
                  create: (_) => getIt<ReaderCubit>(),
                  child: const ReaderScreen(
                    bookId: hauntBookId,
                    initialChapterIndex: 0,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(ReaderScreen), findsOneWidget);

      await captureWidgetScreenshot(
        tester: tester,
        key: repaintKey3,
        filename: 'pdf_ui_haunting_adeline_page.png',
      );

      // 12. RENDER READER SCREEN FOR DEEP WORK
      final repaintKey4 = GlobalKey();
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData.dark(),
          home: Scaffold(
            body: RepaintBoundary(
              key: repaintKey4,
              child: SizedBox(
                width: 400,
                height: 850,
                child: BlocProvider<ReaderCubit>(
                  create: (_) => getIt<ReaderCubit>(),
                  child: const ReaderScreen(
                    bookId: dwBookId,
                    initialChapterIndex: 1,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(ReaderScreen), findsOneWidget);

      await captureWidgetScreenshot(
        tester: tester,
        key: repaintKey4,
        filename: 'pdf_ui_deep_work_page.png',
      );
    },
  );
}
