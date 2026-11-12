import 'package:drift/drift.dart' show Value;
import 'package:drift/native.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:emotional_novel_reader/features/annotations/data/repositories/annotation_repository_impl.dart';
import 'package:emotional_novel_reader/features/annotations/domain/entities/highlight_entity.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late AppDatabase db;
  late AnnotationRepositoryImpl repository;

  const testBookId = 'book-ann-test-1';
  const testChapter1Id = 'ch-ann-1';
  const testChapter2Id = 'ch-ann-2';

  setUp(() async {
    db = AppDatabase(NativeDatabase.memory());
    repository = AnnotationRepositoryImpl(database: db);

    // Insert sample book and chapters to fulfill foreign keys
    final now = DateTime.now().toUtc();
    await db.insertBook(
      BooksCompanion.insert(
        id: testBookId,
        title: 'Test Novel',
        originalFileName: 'novel.txt',
        filePath: '/tmp/novel.txt',
        format: 'txt',
        sha256: 'sha-ann-12345',
        fileSizeBytes: 2048,
        createdAt: now,
      ),
    );

    await db.insertChapters([
      ChaptersCompanion.insert(
        id: testChapter1Id,
        bookId: testBookId,
        chapterIndex: 0,
        title: 'Chapter 1: The Arrival',
        content: const Value(
          'This is the first chapter content. It has many sentences to highlight.',
        ),
        wordCount: const Value(12),
        characterCount: const Value(70),
      ),
      ChaptersCompanion.insert(
        id: testChapter2Id,
        bookId: testBookId,
        chapterIndex: 1,
        title: 'Chapter 2: The Journey',
        content: const Value(
          'This is the second chapter with another exciting adventure.',
        ),
        wordCount: const Value(9),
        characterCount: const Value(59),
      ),
    ]);
  });

  tearDown(() async {
    await db.close();
  });

  group('Bookmark Repository Operations', () {
    test('addBookmark creates and retrieves a valid bookmark with chapter metadata', () async {
      final res = await repository.addBookmark(
        bookId: testBookId,
        chapterId: testChapter1Id,
        chapterIndex: 0,
        chapterTitle: 'Chapter 1: The Arrival',
        location: '120.5',
        label: 'Important scene',
      );

      expect(res.isSuccess, isTrue);
      final bookmark = res.dataOrNull!;
      expect(bookmark.bookId, testBookId);
      expect(bookmark.chapterId, testChapter1Id);
      expect(bookmark.location, '120.5');
      expect(bookmark.label, 'Important scene');
      expect(bookmark.chapterIndex, 0);
      expect(bookmark.chapterTitle, 'Chapter 1: The Arrival');

      // Verify in getBookmarksForBook
      final listRes = await repository.getBookmarksForBook(testBookId);
      expect(listRes.isSuccess, isTrue);
      final list = listRes.dataOrNull!;
      expect(list.length, 1);
      expect(list.first.id, bookmark.id);
    });

    test('addBookmark allows multiple bookmarks per chapter and prevents duplicate at same location', () async {
      final first = await repository.addBookmark(
        bookId: testBookId,
        chapterId: testChapter1Id,
        chapterIndex: 0,
        location: 'char:100',
        label: 'First add',
      );
      expect(first.isSuccess, isTrue);

      // Same location returns existing bookmark without duplicating
      final dup = await repository.addBookmark(
        bookId: testBookId,
        chapterId: testChapter1Id,
        chapterIndex: 0,
        location: 'char:100',
        label: 'Duplicate attempt',
      );
      expect(dup.isSuccess, isTrue);
      expect(dup.dataOrNull!.id, first.dataOrNull!.id);

      // Different location in same chapter creates distinct bookmark (R01)
      final second = await repository.addBookmark(
        bookId: testBookId,
        chapterId: testChapter1Id,
        chapterIndex: 0,
        location: 'char:250',
        label: 'Second location in same chapter',
      );
      expect(second.isSuccess, isTrue);
      expect(second.dataOrNull!.id, isNot(first.dataOrNull!.id));

      final list = (await repository.getBookmarksForBook(testBookId))
          .dataOrNull!;
      expect(list.length, 2);

      // Independent deletion removes only the targeted bookmark (R03)
      await repository.deleteBookmark(first.dataOrNull!.id);
      final afterDelete = (await repository.getBookmarksForBook(testBookId))
          .dataOrNull!;
      expect(afterDelete.length, 1);
      expect(afterDelete.first.id, second.dataOrNull!.id);
    });

    test('isChapterBookmarked returns correct status', () async {
      expect(
        (await repository.isChapterBookmarked(
          bookId: testBookId,
          chapterId: testChapter1Id,
        )).dataOrNull,
        isFalse,
      );

      await repository.addBookmark(
        bookId: testBookId,
        chapterId: testChapter1Id,
        location: '0',
      );

      expect(
        (await repository.isChapterBookmarked(
          bookId: testBookId,
          chapterId: testChapter1Id,
        )).dataOrNull,
        isTrue,
      );
      expect(
        (await repository.isChapterBookmarked(
          bookId: testBookId,
          chapterId: testChapter2Id,
        )).dataOrNull,
        isFalse,
      );
    });

    test('deleteBookmark removes bookmark by ID', () async {
      final added = (await repository.addBookmark(
        bookId: testBookId,
        chapterId: testChapter1Id,
        location: '0',
      )).dataOrNull!;

      final delRes = await repository.deleteBookmark(added.id);
      expect(delRes.isSuccess, isTrue);

      final list = (await repository.getBookmarksForBook(testBookId))
          .dataOrNull!;
      expect(list.isEmpty, isTrue);
    });

    test('deleteBookmarkForChapter removes bookmark by chapterId', () async {
      await repository.addBookmark(
        bookId: testBookId,
        chapterId: testChapter1Id,
        location: '0',
      );

      final delRes = await repository.deleteBookmarkForChapter(
        bookId: testBookId,
        chapterId: testChapter1Id,
      );
      expect(delRes.isSuccess, isTrue);

      expect(
        (await repository.isChapterBookmarked(
          bookId: testBookId,
          chapterId: testChapter1Id,
        )).dataOrNull,
        isFalse,
      );
    });
  });

  group('Highlight & Note Repository Operations', () {
    test(
      'createHighlight persists and returns valid highlight with defaults',
      () async {
        final res = await repository.createHighlight(
          bookId: testBookId,
          chapterId: testChapter1Id,
          chapterIndex: 0,
          chapterTitle: 'Chapter 1: The Arrival',
          startOffset: 12,
          endOffset: 25,
          selectedText: 'first chapter',
        );

        expect(res.isSuccess, isTrue);
        final hl = res.dataOrNull!;
        expect(hl.bookId, testBookId);
        expect(hl.chapterId, testChapter1Id);
        expect(hl.startOffset, 12);
        expect(hl.endOffset, 25);
        expect(hl.selectedText, 'first chapter');
        expect(hl.colorValue, HighlightEntity.defaultHighlightColor);
        expect(hl.hasNote, isFalse);
      },
    );

    test('createHighlight with custom note and color', () async {
      final res = await repository.createHighlight(
        bookId: testBookId,
        chapterId: testChapter1Id,
        startOffset: 0,
        endOffset: 4,
        selectedText: 'This',
        note: 'Introductory pronoun',
        colorValue: 0xFFA5D6A7, // Green
      );

      expect(res.isSuccess, isTrue);
      final hl = res.dataOrNull!;
      expect(hl.note, 'Introductory pronoun');
      expect(hl.hasNote, isTrue);
      expect(hl.colorValue, 0xFFA5D6A7);
    });

    test('updateHighlightNote updates note or clears note', () async {
      final created = (await repository.createHighlight(
        bookId: testBookId,
        chapterId: testChapter1Id,
        startOffset: 5,
        endOffset: 7,
        selectedText: 'is',
      )).dataOrNull!;

      // Add note
      final updated = (await repository.updateHighlightNote(
        highlightId: created.id,
        note: 'Verb form',
      )).dataOrNull!;
      expect(updated.note, 'Verb form');

      // Clear note
      final cleared = (await repository.updateHighlightNote(
        highlightId: created.id,
        note: null,
      )).dataOrNull!;
      expect(cleared.note, isNull);
      expect(cleared.hasNote, isFalse);
    });

    test('updateHighlightColor updates highlight color', () async {
      final created = (await repository.createHighlight(
        bookId: testBookId,
        chapterId: testChapter1Id,
        startOffset: 5,
        endOffset: 7,
        selectedText: 'is',
      )).dataOrNull!;

      final updated = (await repository.updateHighlightColor(
        highlightId: created.id,
        colorValue: 0xFF90CAF9, // Blue
      )).dataOrNull!;
      expect(updated.colorValue, 0xFF90CAF9);
    });

    test('deleteHighlight deletes highlight from database', () async {
      final created = (await repository.createHighlight(
        bookId: testBookId,
        chapterId: testChapter1Id,
        startOffset: 5,
        endOffset: 7,
        selectedText: 'is',
      )).dataOrNull!;

      final delRes = await repository.deleteHighlight(created.id);
      expect(delRes.isSuccess, isTrue);

      final list = (await repository.getHighlightsForBook(testBookId))
          .dataOrNull!;
      expect(list.isEmpty, isTrue);
    });

    test('getHighlightsForChapter isolates highlights per chapter', () async {
      await repository.createHighlight(
        bookId: testBookId,
        chapterId: testChapter1Id,
        startOffset: 0,
        endOffset: 4,
        selectedText: 'This',
      );
      await repository.createHighlight(
        bookId: testBookId,
        chapterId: testChapter2Id,
        startOffset: 0,
        endOffset: 4,
        selectedText: 'This',
      );

      final ch1List = (await repository.getHighlightsForChapter(
        bookId: testBookId,
        chapterId: testChapter1Id,
      )).dataOrNull!;
      expect(ch1List.length, 1);

      final ch2List = (await repository.getHighlightsForChapter(
        bookId: testBookId,
        chapterId: testChapter2Id,
      )).dataOrNull!;
      expect(ch2List.length, 1);

      final allList = (await repository.getHighlightsForBook(testBookId))
          .dataOrNull!;
      expect(allList.length, 2);
    });

    test(
      'Cascade deletion purges bookmarks and highlights when book is deleted',
      () async {
        await repository.addBookmark(
          bookId: testBookId,
          chapterId: testChapter1Id,
          location: '10',
        );
        await repository.createHighlight(
          bookId: testBookId,
          chapterId: testChapter1Id,
          startOffset: 0,
          endOffset: 4,
          selectedText: 'This',
        );

        // Verify exist
        expect(
          (await repository.getBookmarksForBook(testBookId)).dataOrNull!.length,
          1,
        );
        expect(
          (await repository.getHighlightsForBook(testBookId))
              .dataOrNull!
              .length,
          1,
        );

        // Delete book
        await db.deleteBook(testBookId);

        // Verify cascade deleted
        expect(
          (await repository.getBookmarksForBook(testBookId))
              .dataOrNull!
              .isEmpty,
          isTrue,
        );
        expect(
          (await repository.getHighlightsForBook(testBookId))
              .dataOrNull!
              .isEmpty,
          isTrue,
        );
      },
    );
  });

  group('Reactive Stream Watchers', () {
    test('watchBookmarksForBook emits on bookmark changes', () async {
      final stream = repository.watchBookmarksForBook(testBookId);
      final initial = await stream.first;
      expect(initial.isEmpty, isTrue);

      await repository.addBookmark(
        bookId: testBookId,
        chapterId: testChapter1Id,
        location: '5',
      );

      final updated = await stream.first;
      expect(updated.length, 1);
    });

    test('watchHighlightsForChapter emits on highlight changes', () async {
      final stream = repository.watchHighlightsForChapter(
        bookId: testBookId,
        chapterId: testChapter1Id,
      );
      final initial = await stream.first;
      expect(initial.isEmpty, isTrue);

      await repository.createHighlight(
        bookId: testBookId,
        chapterId: testChapter1Id,
        startOffset: 0,
        endOffset: 4,
        selectedText: 'This',
      );

      final updated = await stream.first;
      expect(updated.length, 1);
    });
  });
}
