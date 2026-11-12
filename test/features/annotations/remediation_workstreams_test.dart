import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:emotional_novel_reader/features/annotations/data/repositories/annotation_repository_impl.dart';
import 'package:emotional_novel_reader/features/annotations/domain/entities/bookmark_entity.dart';
import 'package:emotional_novel_reader/features/annotations/domain/entities/highlight_entity.dart';
import 'package:emotional_novel_reader/features/annotations/presentation/cubit/annotation_cubit.dart';
import 'package:emotional_novel_reader/features/annotations/presentation/cubit/annotation_state.dart';
import 'package:emotional_novel_reader/features/reader/presentation/services/reader_scroll_mapper.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late AppDatabase database;
  late AnnotationRepositoryImpl repository;
  late AnnotationCubit cubit;

  const testBookId = 'book-rem-test';
  const testCh1Id = 'ch-rem-1';
  const testCh2Id = 'ch-rem-2';

  setUp(() async {
    database = AppDatabase(NativeDatabase.memory());
    repository = AnnotationRepositoryImpl(database: database);
    cubit = AnnotationCubit(repository: repository);

    final now = DateTime.now().toUtc();
    await database.insertBook(
      BooksCompanion.insert(
        id: testBookId,
        title: 'Chronicles of Solitude',
        originalFileName: 'solitude.txt',
        filePath: '/storage/solitude.txt',
        format: 'txt',
        sha256: 'sha-rem-12345',
        fileSizeBytes: 4096,
        createdAt: now,
      ),
    );

    await database.insertChapters([
      ChaptersCompanion.insert(
        id: testCh1Id,
        bookId: testBookId,
        chapterIndex: 0,
        title: 'Chapter I: The Whispering Wind',
        content: const Value(
          'The wind whispered ancient secrets through the willow trees. '
          'In the quiet dusk, memories surfaced like gentle ripples on a forgotten pond. '
          'The wind whispered again, softer this time, carrying echoes of distant laughter.',
        ),
        wordCount: const Value(34),
        characterCount: const Value(218),
      ),
      ChaptersCompanion.insert(
        id: testCh2Id,
        bookId: testBookId,
        chapterIndex: 1,
        title: 'Chapter II: Shadows in the Mist',
        content: const Value(
          'Mist rolled across the cobblestone alleys of the sleepy harbor town. '
          'Lantern light flickered against the damp walls, casting tall, wavering shadows.',
        ),
        wordCount: const Value(25),
        characterCount: const Value(156),
      ),
    ]);
  });

  tearDown(() async {
    await cubit.close();
    await database.close();
  });

  group(
    'Workstream A: Bookmark Granularity, Stability & Duplicate Prevention',
    () {
      test('R01 & R02: Multiple bookmarks can exist at distinct locations within one chapter, preventing duplicates at same location', () async {
        // 1. Add first bookmark at location char:50
        final b1 = await repository.addBookmark(
          bookId: testBookId,
          chapterId: testCh1Id,
          chapterIndex: 0,
          chapterTitle: 'Chapter I',
          location: 'char:50',
          label: 'First passage',
        );
        expect(b1.isSuccess, isTrue);

        // 2. Duplicate attempt at exact same location char:50 (R02)
        final dup = await repository.addBookmark(
          bookId: testBookId,
          chapterId: testCh1Id,
          chapterIndex: 0,
          chapterTitle: 'Chapter I',
          location: 'char:50',
          label: 'Duplicate attempt',
        );
        expect(dup.isSuccess, isTrue);
        expect(dup.dataOrNull!.id, b1.dataOrNull!.id);

        // 3. Add second bookmark at different location char:140 in same chapter (R01)
        final b2 = await repository.addBookmark(
          bookId: testBookId,
          chapterId: testCh1Id,
          chapterIndex: 0,
          chapterTitle: 'Chapter I',
          location: 'char:140',
          label: 'Second passage',
        );
        expect(b2.isSuccess, isTrue);
        expect(b2.dataOrNull!.id, isNot(b1.dataOrNull!.id));

        // Verify both bookmarks exist in the chapter
        final all = (await repository.getBookmarksForBook(testBookId))
            .dataOrNull!;
        expect(all.length, 2);
      });

      test('R03: Removing one bookmark does not remove other bookmarks in the same chapter', () async {
        final b1 = (await repository.addBookmark(
          bookId: testBookId,
          chapterId: testCh1Id,
          location: 'char:30',
        )).dataOrNull!;

        final b2 = (await repository.addBookmark(
          bookId: testBookId,
          chapterId: testCh1Id,
          location: 'char:110',
        )).dataOrNull!;

        expect(
          (await repository.getBookmarksForBook(testBookId)).dataOrNull!.length,
          2,
        );

        // Delete b1
        final delRes = await repository.deleteBookmark(b1.id);
        expect(delRes.isSuccess, isTrue);

        // Verify b2 remains intact
        final remaining = (await repository.getBookmarksForBook(testBookId))
            .dataOrNull!;
        expect(remaining.length, 1);
        expect(remaining.first.id, b2.id);
        expect(remaining.first.location, 'char:110');
      });

      test('R04: Bookmark anchors parse stable character offsets cleanly', () {
        final now = DateTime.now();
        final b1 = BookmarkEntity(
          id: 'bm-1',
          bookId: testBookId,
          location: 'char:1250',
          createdAt: now,
        );
        expect(b1.charOffset, 1250);

        final b2 = BookmarkEntity(
          id: 'bm-2',
          bookId: testBookId,
          location: '450',
          createdAt: now,
        );
        expect(b2.charOffset, 450);

        expect(BookmarkEntity.formatLocation(800), 'char:800');
      });
    },
  );

  group('Workstream B & C: Reader Scroll Mapping & Position Calculation', () {
    test('R07, R08, R09: Character offsets are mapped to rendered pixel positions with text layout and font scale', () {
      const sampleText =
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '
          'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '
          'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. '
          'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. '
          'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

      const baseStyle = TextStyle(fontSize: 16.0, height: 1.5);
      const contentWidth = 350.0;
      const headerOffset = 100.0;

      // Start of text
      final offsetAt0 = ReaderScrollMapper.calculatePixelOffset(
        content: sampleText,
        charOffset: 0,
        textStyle: baseStyle,
        contentWidth: contentWidth,
        headerHeight: headerOffset,
      );
      expect(offsetAt0, headerOffset);

      // Later character offset (e.g. char 300)
      final offsetAt300 = ReaderScrollMapper.calculatePixelOffset(
        content: sampleText,
        charOffset: 300,
        textStyle: baseStyle,
        contentWidth: contentWidth,
        headerHeight: headerOffset,
      );
      expect(offsetAt300, greaterThan(offsetAt0));

      // Font size scaling: larger font size must increase vertical pixel offset for same character
      final offsetLargeFont = ReaderScrollMapper.calculatePixelOffset(
        content: sampleText,
        charOffset: 300,
        textStyle: const TextStyle(fontSize: 24.0, height: 1.8),
        contentWidth: contentWidth,
        headerHeight: headerOffset,
      );
      expect(offsetLargeFont, greaterThan(offsetAt300));

      // Bidirectional conversion: pixel offset to char offset
      final derivedChar = ReaderScrollMapper.calculateCharOffset(
        content: sampleText,
        scrollOffset: offsetAt300,
        textStyle: baseStyle,
        contentWidth: contentWidth,
        headerHeight: headerOffset,
      );
      expect(derivedChar, closeTo(300, 30));
    });

    test(
      'ParsedLocation distinguishes char offsets from legacy pixel offsets',
      () {
        final loc1 = ReaderScrollMapper.parseLocation('char:1250');
        expect(loc1.isCharOffset, isTrue);
        expect(loc1.charOffset, 1250);

        final loc2 = ReaderScrollMapper.parseLocation('500');
        expect(loc2.isCharOffset, isTrue);
        expect(loc2.charOffset, 500);

        final loc3 = ReaderScrollMapper.parseLocation('350.5');
        expect(loc3.isCharOffset, isFalse);
        expect(loc3.pixelOffset, 350.5);
      },
    );
  });

  group('Workstream D: Proximity-Aware Highlight Anchor Reconciliation', () {
    test('R10: Selects closest occurrence when duplicate passages exist instead of naive index 0', () {
      // Content has "The wind whispered" at index 0 and "The wind whispered" at index 140
      const content =
          'The wind whispered ancient secrets through the willow trees. '
          'In the quiet dusk, memories surfaced like gentle ripples on a forgotten pond. '
          'The wind whispered again, softer this time, carrying echoes of distant laughter.';

      const targetText = 'The wind whispered';
      final firstIdx = content.indexOf(targetText); // 0
      final secondIdx = content.indexOf(targetText, firstIdx + 1); // 140
      expect(secondIdx, greaterThan(firstIdx));

      // Create a highlight originally intended for the SECOND occurrence (around char 135)
      // but offsets slightly shifted due to chapter edits
      final highlightNearSecond = HighlightEntity(
        id: 'hl-second',
        bookId: testBookId,
        chapterId: testCh1Id,
        startOffset: 138, // Close to 140, far from 0
        endOffset: 156,
        selectedText: targetText,
        createdAt: DateTime.now(),
      );

      // Reconcile: must choose the nearest match (secondIdx 140), NOT index 0!
      final reconciled = highlightNearSecond.reconcileIn(content);
      expect(reconciled.anchorStatus, AnchorStatus.reconciled);
      expect(reconciled.startOffset, secondIdx);
      expect(reconciled.startOffset, isNot(firstIdx));
    });

    test('R11: Equidistant ambiguous duplicate occurrences remain unresolved safely without altering offsets', () {
      // Two occurrences of "word" at index 4 and index 18. Midpoint is (4+18)/2 = 11.
      const text = 'word';
      const textContent = '0000word0000000000word0000';
      final h = HighlightEntity(
        id: 'hl-ambig',
        bookId: testBookId,
        startOffset: 11,
        endOffset: 15,
        selectedText: text,
        createdAt: DateTime.now(),
      );

      final result = h.reconcileIn(textContent);
      expect(result.anchorStatus, AnchorStatus.ambiguous);
      // Original offsets preserved safely
      expect(result.startOffset, 11);
      expect(result.endOffset, 15);
    });

    test('R12: Missing selected text remains unresolved without data loss', () {
      const content = 'Completely different text without the original phrase.';
      final h = HighlightEntity(
        id: 'hl-deleted',
        bookId: testBookId,
        startOffset: 50,
        endOffset: 70,
        selectedText: 'vanished ancient secrets',
        note: 'Important note on ancient secrets',
        createdAt: DateTime.now(),
      );

      final result = h.reconcileIn(content);
      expect(result.anchorStatus, AnchorStatus.unresolved);
      expect(result.selectedText, 'vanished ancient secrets');
      expect(result.note, 'Important note on ancient secrets');
      expect(result.startOffset, 50);
    });
  });

  group('Workstream E: Standalone Chapter Notes CRUD & Filtering', () {
    test(
      'R14 & R15: Standalone chapter notes can be created, edited, and deleted',
      () async {
        // Create chapter note without selected text (R14)
        final created = await repository.createChapterNote(
          bookId: testBookId,
          chapterId: testCh1Id,
          chapterIndex: 0,
          chapterTitle: 'Chapter I',
          content: 'Reflections on the opening theme of wind and memory.',
        );
        expect(created.isSuccess, isTrue);
        final note = created.dataOrNull!;
        expect(
          note.content,
          'Reflections on the opening theme of wind and memory.',
        );

        // Update chapter note (R15)
        final updated = await repository.updateChapterNote(
          id: note.id,
          content: 'Revised reflections on nostalgia and soundscapes.',
        );
        expect(updated.isSuccess, isTrue);
        expect(
          updated.dataOrNull!.content,
          'Revised reflections on nostalgia and soundscapes.',
        );

        // Verify list
        final list = (await repository.getChapterNotesForBook(testBookId))
            .dataOrNull!;
        expect(list.length, 1);
        expect(
          list.first.content,
          'Revised reflections on nostalgia and soundscapes.',
        );

        // Delete chapter note (R15)
        final del = await repository.deleteChapterNote(note.id);
        expect(del.isSuccess, isTrue);

        final afterDel = (await repository.getChapterNotesForBook(testBookId))
            .dataOrNull!;
        expect(afterDel.isEmpty, isTrue);
      },
    );

    test('R16 & R17: Both passage notes and chapter notes appear in filtering and search', () async {
      // 1. Passage highlight with note
      await repository.createHighlight(
        bookId: testBookId,
        chapterId: testCh1Id,
        startOffset: 4,
        endOffset: 18,
        selectedText: 'wind whispered',
        note: 'Metaphor for ancestral knowledge',
      );

      // 2. Standalone chapter note
      await repository.createChapterNote(
        bookId: testBookId,
        chapterId: testCh1Id,
        chapterIndex: 0,
        chapterTitle: 'Chapter I',
        content: 'Overarching atmosphere is melancholic and peaceful.',
      );

      // 3. Load via Cubit
      await cubit.loadAnnotations(testBookId);
      var state = cubit.state as AnnotationLoaded;

      // Both appear in 'all'
      expect(state.displayedHighlights.length, 1);
      expect(state.displayedChapterNotes.length, 1);

      // Both appear in 'notes' filter
      cubit.setFilter(AnnotationFilter.notes);
      state = cubit.state as AnnotationLoaded;
      expect(state.displayedHighlights.length, 1);
      expect(state.displayedChapterNotes.length, 1);

      // Search matching chapter note
      cubit.setFilter(AnnotationFilter.all);
      cubit.setSearchQuery('melancholic');
      state = cubit.state as AnnotationLoaded;
      expect(state.displayedHighlights.isEmpty, isTrue);
      expect(state.displayedChapterNotes.length, 1);
      expect(
        state.displayedChapterNotes.first.content,
        contains('melancholic'),
      );

      // Search matching passage note
      cubit.setSearchQuery('ancestral');
      state = cubit.state as AnnotationLoaded;
      expect(state.displayedChapterNotes.isEmpty, isTrue);
      expect(state.displayedHighlights.length, 1);
      expect(state.displayedHighlights.first.note, contains('ancestral'));
    });
  });
}
