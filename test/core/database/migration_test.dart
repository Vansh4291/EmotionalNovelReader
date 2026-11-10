import 'dart:io';
import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqlite3/sqlite3.dart';

void main() {
  late Directory tempDir;
  late File dbFile;
  AppDatabase? appDb;

  setUp(() {
    tempDir = Directory.systemTemp.createTempSync('enr_migration_test_');
    dbFile = File('${tempDir.path}/legacy_v1.db');
  });

  tearDown(() async {
    await appDb?.close();
    if (tempDir.existsSync()) {
      tempDir.deleteSync(recursive: true);
    }
  });

  group('Drift SQLite Schema v1 to v2 Migration tests', () {
    test('Migrates existing schema v1 database to v2 while preserving all records and foreign keys', () async {
      // 1. Establish an authentic schema v1 SQLite database directly via sqlite3
      final rawDb = sqlite3.open(dbFile.path);

      rawDb.execute('''
        PRAGMA foreign_keys = ON;

        CREATE TABLE books (
          id TEXT NOT NULL PRIMARY KEY,
          title TEXT NOT NULL,
          author TEXT,
          original_file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          format TEXT NOT NULL,
          sha256 TEXT NOT NULL,
          file_size_bytes INTEGER NOT NULL,
          cover_image_path TEXT,
          created_at INTEGER NOT NULL,
          last_read_at INTEGER
        );

        -- In schema v1, chapters did NOT have the 'content' column
        CREATE TABLE chapters (
          id TEXT NOT NULL PRIMARY KEY,
          book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
          chapter_index INTEGER NOT NULL,
          title TEXT NOT NULL,
          href TEXT,
          word_count INTEGER,
          character_count INTEGER
        );

        CREATE TABLE bookmarks (
          id TEXT NOT NULL PRIMARY KEY,
          book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
          chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
          location TEXT NOT NULL,
          title TEXT,
          snippet TEXT,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE reading_progress_table (
          book_id TEXT NOT NULL PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
          current_location TEXT NOT NULL,
          current_chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
          progress_percentage REAL NOT NULL,
          total_seconds_read INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        PRAGMA user_version = 1;
      ''');

      final nowMs = DateTime.now().toUtc().millisecondsSinceEpoch;

      // Populate with realistic v1 user data
      rawDb.execute('''
        INSERT INTO books (id, title, author, original_file_name, file_path, format, sha256, file_size_bytes, created_at)
        VALUES ('book-v1', 'Spice and Wolf', 'Isuna Hasekura', 'spice.epub', '/app/books/spice.epub', 'epub', 'sha-v1-abc', 2048, $nowMs);

        INSERT INTO chapters (id, book_id, chapter_index, title, href, word_count, character_count)
        VALUES ('ch-v1-1', 'book-v1', 0, 'Chapter 1: The Wheat Peddler', 'ch1.xhtml', 1200, 6500);

        INSERT INTO bookmarks (id, book_id, chapter_id, location, title, created_at)
        VALUES ('bm-v1-1', 'book-v1', 'ch-v1-1', 'pos-500', 'Important Contract', $nowMs);

        INSERT INTO reading_progress_table (book_id, current_location, current_chapter_id, progress_percentage, total_seconds_read, updated_at)
        VALUES ('book-v1', '250.0', 'ch-v1-1', 0.25, 450, $nowMs);
      ''');

      rawDb.dispose();

      // 2. Open the legacy v1 database using AppDatabase (v2 schema)
      appDb = AppDatabase(NativeDatabase(dbFile));

      // Trigger database open and migration
      expect(appDb!.schemaVersion, 3);

      // 3. Verify existing data preserved intact
      final migratedBook = await appDb!.getBookById('book-v1');
      expect(migratedBook, isNotNull);
      expect(migratedBook!.title, 'Spice and Wolf');
      expect(migratedBook.author, 'Isuna Hasekura');
      expect(migratedBook.format, 'epub');

      // Verify existing chapter survived and received default empty content
      final migratedChapter = await appDb!.getChapterById('ch-v1-1');
      expect(migratedChapter, isNotNull);
      expect(migratedChapter!.title, 'Chapter 1: The Wheat Peddler');
      expect(migratedChapter.content, ''); // Default constant value from v2 migration
      expect(migratedChapter.wordCount, 1200);

      // Verify existing reading progress survived intact
      final migratedProgress = await appDb!.getReadingProgress('book-v1');
      expect(migratedProgress, isNotNull);
      expect(migratedProgress!.currentLocation, '250.0');
      expect(migratedProgress.currentChapterId, 'ch-v1-1');
      expect(migratedProgress.progressPercentage, 0.25);
      expect(migratedProgress.totalSecondsRead, 450);

      // 4. Verify v2 features: inserting a new chapter with content succeeds
      await appDb!.insertChapters([
        ChaptersCompanion.insert(
          id: 'ch-v2-2',
          bookId: 'book-v1',
          chapterIndex: 1,
          title: 'Chapter 2: The Harvest God',
          content: const Value('Holo leaped down from the wagon...'),
          wordCount: const Value(1500),
          characterCount: const Value(7800),
        ),
      ]);

      final ch2 = await appDb!.getChapterById('ch-v2-2');
      expect(ch2, isNotNull);
      expect(ch2!.content, 'Holo leaped down from the wagon...');

      // 5. Verify foreign keys and cascading deletion remain functional in migrated schema
      await appDb!.deleteBook('book-v1');

      final remainingChapters = await appDb!.getChaptersForBook('book-v1');
      expect(remainingChapters, isEmpty);

      final remainingProgress = await appDb!.getReadingProgress('book-v1');
      expect(remainingProgress, isNull);
    });
  });
}
