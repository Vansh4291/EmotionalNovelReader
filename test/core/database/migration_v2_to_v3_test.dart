import 'dart:io';
import 'package:drift/native.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqlite3/sqlite3.dart';

void main() {
  late Directory tempDir;
  late File dbFile;
  AppDatabase? appDb;

  setUp(() {
    tempDir = Directory.systemTemp.createTempSync('enr_migration_v2_to_v3_test_');
    dbFile = File('${tempDir.path}/legacy_v2.db');
  });

  tearDown(() async {
    await appDb?.close();
    if (tempDir.existsSync()) {
      tempDir.deleteSync(recursive: true);
    }
  });

  group('Drift SQLite Schema v2 to v3 Migration tests', () {
    test('Migrates existing schema v2 database to v3 while preserving all records and initializing FTS5', () async {
      // 1. Establish an authentic schema v2 SQLite database directly via raw sqlite3
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

        -- In schema v2, chapters has the 'content' column
        CREATE TABLE chapters (
          id TEXT NOT NULL PRIMARY KEY,
          book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
          chapter_index INTEGER NOT NULL,
          title TEXT NOT NULL,
          href TEXT,
          content TEXT NOT NULL DEFAULT '',
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

        PRAGMA user_version = 2;
      ''');

      final nowMs = DateTime.now().toUtc().millisecondsSinceEpoch;

      // Populate with realistic v2 user data
      rawDb.execute('''
        INSERT INTO books (id, title, author, original_file_name, file_path, format, sha256, file_size_bytes, created_at)
        VALUES ('book-v2-1', 'The Great Adventure', 'Arthur Pendelton', 'adventure.epub', '/app/books/adv.epub', 'epub', 'sha-v2-123', 4096, $nowMs);

        INSERT INTO chapters (id, book_id, chapter_index, title, href, content, word_count, character_count)
        VALUES ('ch-v2-1', 'book-v2-1', 0, 'Arrival at the Harbor', 'ch1.xhtml', 'The ship dropped its massive iron anchor into the foggy harbor at dawn.', 12, 70);

        INSERT INTO chapters (id, book_id, chapter_index, title, href, content, word_count, character_count)
        VALUES ('ch-v2-2', 'book-v2-1', 1, 'The Mysterious Guild', 'ch2.xhtml', 'Inside the merchant guild, trade secrets were whispered in shadowy corners.', 11, 72);

        INSERT INTO bookmarks (id, book_id, chapter_id, location, title, created_at)
        VALUES ('bm-v2-1', 'book-v2-1', 'ch-v2-1', 'offset-150', 'Harbor Arrival Note', $nowMs);

        INSERT INTO reading_progress_table (book_id, current_location, current_chapter_id, progress_percentage, total_seconds_read, updated_at)
        VALUES ('book-v2-1', '50.0', 'ch-v2-1', 0.5, 300, $nowMs);
      ''');

      rawDb.dispose();

      // 2. Open the legacy v2 database using AppDatabase (which migrates to v3)
      appDb = AppDatabase(NativeDatabase(dbFile));

      // Trigger database open and verify schema version
      expect(appDb!.schemaVersion, 4);

      // 3. Verify existing data preserved intact
      final migratedBook = await appDb!.getBookById('book-v2-1');
      expect(migratedBook, isNotNull);
      expect(migratedBook!.title, 'The Great Adventure');
      expect(migratedBook.author, 'Arthur Pendelton');

      final chapters = await appDb!.getChaptersForBook('book-v2-1');
      expect(chapters.length, 2);
      expect(chapters[0].content, contains('massive iron anchor'));
      expect(chapters[1].content, contains('merchant guild'));

      final progress = await appDb!.getReadingProgress('book-v2-1');
      expect(progress, isNotNull);
      expect(progress!.currentLocation, '50.0');

      // 4. Verify FTS5 virtual table was created and pre-existing chapters were indexed
      final searchResults = await appDb!.searchContentFts('merchant guild');
      expect(searchResults, isNotEmpty);
      expect(searchResults.first['chapter_id'], 'ch-v2-2');
      expect(searchResults.first['snippet'], contains('<mark>'));
      expect(searchResults.first['snippet'], contains('merchant'));

      // 5. Verify book search works
      final bookResults = await appDb!.searchBooks('Adventure');
      expect(bookResults.length, 1);
      expect(bookResults.first.id, 'book-v2-1');
    });
  });
}
