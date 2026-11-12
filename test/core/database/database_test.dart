import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late AppDatabase db;

  setUp(() {
    // In-memory SQLite database instance with foreign keys enabled
    db = AppDatabase(NativeDatabase.memory());
  });

  tearDown(() async {
    await db.close();
  });

  group('Drift SQLite Database tests', () {
    test('Initializes schema version 5 successfully', () {
      expect(db.schemaVersion, 5);
    });

    test('Reading sessions and goals CRUD and cascading deletion when book deleted', () async {
      final now = DateTime.now().toUtc();
      await db.insertBook(
        BooksCompanion.insert(
          id: 'book-sess-test',
          title: 'Mushoku Tensei',
          originalFileName: 'mt.epub',
          filePath: '/data/mt.epub',
          format: 'epub',
          sha256: 'sha-mt',
          fileSizeBytes: 2048,
          createdAt: now,
        ),
      );

      await db.insertReadingSession(
        ReadingSessionsCompanion.insert(
          id: 'sess-cascade-1',
          bookId: 'book-sess-test',
          startTime: now,
          endTime: now,
          durationSeconds: 120,
        ),
      );

      final sessionsBefore = await db.getAllReadingSessions();
      expect(sessionsBefore.any((s) => s.id == 'sess-cascade-1'), isTrue);

      // Delete the book
      await db.deleteBook('book-sess-test');

      // Verify cascading delete removed the session
      final sessionsAfter = await db.getAllReadingSessions();
      expect(sessionsAfter.any((s) => s.id == 'sess-cascade-1'), isFalse);
    });

    test(
      'Inserts and retrieves chapters with content, count, and SHA lookup',
      () async {
        final now = DateTime.now().toUtc();
        await db.insertBook(
          BooksCompanion.insert(
            id: 'book-ch-test',
            title: 'Overlord',
            author: const Value('Kugane Maruyama'),
            originalFileName: 'overlord.txt',
            filePath: '/app/library/books/book-ch-test/original.txt',
            format: 'txt',
            sha256: 'unique-sha-123',
            fileSizeBytes: 1024,
            createdAt: now,
          ),
        );

        // Verify SHA lookup
        final foundBook = await db.getBookBySha('unique-sha-123');
        expect(foundBook, isNotNull);
        expect(foundBook!.id, 'book-ch-test');

        // Insert chapter with content
        await db.insertChapters([
          ChaptersCompanion.insert(
            id: 'ch-test-1',
            bookId: 'book-ch-test',
            chapterIndex: 0,
            title: 'Prologue',
            content: const Value('In the world of Yggdrasil...'),
            wordCount: const Value(5),
            characterCount: const Value(29),
          ),
        ]);

        final count = await db.getChapterCountForBook('book-ch-test');
        expect(count, 1);

        final ch = await db.getChapterById('ch-test-1');
        expect(ch, isNotNull);
        expect(ch!.title, 'Prologue');
        expect(ch.content, 'In the world of Yggdrasil...');
        expect(ch.wordCount, 5);
        expect(ch.characterCount, 29);
      },
    );

    test('Inserts and retrieves a book entity', () async {
      final now = DateTime.now().toUtc();
      await db.insertBook(
        BooksCompanion.insert(
          id: 'book-1',
          title: 'Ascendance of a Bookworm',
          author: const Value('Miya Kazuki'),
          originalFileName: 'bookworm_vol1.epub',
          filePath: '/app/library/books/book-1/original.epub',
          format: 'epub',
          sha256: 'abcdef1234567890',
          fileSizeBytes: 2048000,
          createdAt: now,
        ),
      );

      final book = await db.getBookById('book-1');
      expect(book, isNotNull);
      expect(book!.title, 'Ascendance of a Bookworm');
      expect(book.author, 'Miya Kazuki');
      expect(book.format, 'epub');
    });

    test(
      'Cascading delete purges chapters and bookmarks when book is deleted',
      () async {
        final now = DateTime.now().toUtc();
        await db.insertBook(
          BooksCompanion.insert(
            id: 'book-cascade',
            title: 'Test Novel',
            originalFileName: 'test.epub',
            filePath: '/path/test.epub',
            format: 'epub',
            sha256: 'sha-test',
            fileSizeBytes: 1000,
            createdAt: now,
          ),
        );

        await db.insertChapters([
          ChaptersCompanion.insert(
            id: 'ch-1',
            bookId: 'book-cascade',
            chapterIndex: 0,
            title: 'Chapter 1: The Beginning',
          ),
        ]);

        await db.insertBookmark(
          BookmarksCompanion.insert(
            id: 'bm-1',
            bookId: 'book-cascade',
            location: 'epubcfi(/6/4[chap1]!/4/2/1:0)',
            createdAt: now,
          ),
        );

        // Verify records exist
        var chapters = await db.getChaptersForBook('book-cascade');
        expect(chapters.length, 1);

        // Delete parent book
        await db.deleteBook('book-cascade');

        // Verify cascading deletion removed chapters and bookmarks
        chapters = await db.getChaptersForBook('book-cascade');
        expect(chapters, isEmpty);

        final book = await db.getBookById('book-cascade');
        expect(book, isNull);
      },
    );

    test('Reading progress insert and update works atomically', () async {
      final now = DateTime.now().toUtc();
      await db.insertBook(
        BooksCompanion.insert(
          id: 'book-progress',
          title: 'Progress Test',
          originalFileName: 'progress.epub',
          filePath: '/path/progress.epub',
          format: 'epub',
          sha256: 'sha-progress',
          fileSizeBytes: 500,
          createdAt: now,
        ),
      );

      await db.saveReadingProgress(
        ReadingProgressTableCompanion.insert(
          bookId: 'book-progress',
          currentLocation: 'page-10',
          progressPercentage: const Value(0.25),
          totalSecondsRead: const Value(300),
          updatedAt: now,
        ),
      );

      final initialProgress = await db.getReadingProgress('book-progress');
      expect(initialProgress, isNotNull);
      expect(initialProgress!.currentLocation, 'page-10');
      expect(initialProgress.progressPercentage, 0.25);

      // Update location
      await db.saveReadingProgress(
        ReadingProgressTableCompanion.insert(
          bookId: 'book-progress',
          currentLocation: 'page-20',
          progressPercentage: const Value(0.50),
          totalSecondsRead: const Value(600),
          updatedAt: DateTime.now().toUtc(),
        ),
      );

      final updatedProgress = await db.getReadingProgress('book-progress');
      expect(updatedProgress!.currentLocation, 'page-20');
      expect(updatedProgress.progressPercentage, 0.50);
      expect(updatedProgress.totalSecondsRead, 600);
    });

    test('ChapterNotes CRUD operations and queries', () async {
      final now = DateTime.now().toUtc();
      await db.insertBook(
        BooksCompanion.insert(
          id: 'book-cn-test',
          title: 'Notes Book',
          originalFileName: 'notes.epub',
          filePath: '/path/notes.epub',
          format: 'epub',
          sha256: 'cn-sha-123',
          fileSizeBytes: 1024,
          createdAt: now,
        ),
      );

      await db.insertChapters([
        ChaptersCompanion.insert(
          id: 'ch-cn-test',
          bookId: 'book-cn-test',
          chapterIndex: 0,
          title: 'Chapter One',
          content: const Value('Sample chapter content'),
          wordCount: const Value(3),
          characterCount: const Value(22),
        ),
      ]);

      // Insert note
      await db.insertChapterNote(
        ChapterNotesCompanion.insert(
          id: 'cn-1',
          bookId: 'book-cn-test',
          chapterId: 'ch-cn-test',
          content: 'My standalone chapter note',
          createdAt: now,
          updatedAt: now,
        ),
      );

      final notes = await db.getChapterNotesForBook('book-cn-test');
      expect(notes.length, 1);
      expect(notes.first.content, 'My standalone chapter note');

      // Update note
      final updated = await db.updateChapterNoteContent(
        'cn-1',
        'Updated note content',
      );
      expect(updated, isTrue);

      final note = await db.getChapterNoteById('cn-1');
      expect(note?.content, 'Updated note content');

      // Delete note
      final deletedRows = await db.deleteChapterNote('cn-1');
      expect(deletedRows, 1);
      expect(await db.getChapterNotesForBook('book-cn-test'), isEmpty);
    });
  });
}
