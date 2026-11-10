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
    tempDir = Directory.systemTemp.createTempSync('enr_migration_v3_to_v4_test_');
    dbFile = File('${tempDir.path}/legacy_v3.db');
  });

  tearDown(() async {
    await appDb?.close();
    if (tempDir.existsSync()) {
      tempDir.deleteSync(recursive: true);
    }
  });

  group('Drift SQLite Schema v3 to v4 Migration tests', () {
    test('Migrates existing schema v3 database to v4 while preserving all records and creating chapter_notes', () async {
      // 1. Establish authentic schema v3 SQLite database directly via raw sqlite3
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

        CREATE TABLE chapters (
          id TEXT NOT NULL PRIMARY KEY,
          book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
          chapter_index INTEGER NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL DEFAULT '',
          href TEXT,
          word_count INTEGER NOT NULL DEFAULT 0,
          character_count INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE bookmarks (
          id TEXT NOT NULL PRIMARY KEY,
          book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
          chapter_id TEXT REFERENCES chapters(id) ON DELETE CASCADE,
          location TEXT NOT NULL,
          label TEXT,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE highlights (
          id TEXT NOT NULL PRIMARY KEY,
          book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
          chapter_id TEXT REFERENCES chapters(id) ON DELETE CASCADE,
          start_location TEXT NOT NULL,
          end_location TEXT NOT NULL,
          selected_text TEXT NOT NULL,
          note TEXT,
          color_value INTEGER NOT NULL DEFAULT 16774523,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE reading_progress_table (
          book_id TEXT NOT NULL PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
          current_location TEXT NOT NULL,
          current_chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
          progress_percentage REAL NOT NULL DEFAULT 0.0,
          total_seconds_read INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL
        );

        CREATE VIRTUAL TABLE chapter_fts USING fts5(
          chapter_id UNINDEXED,
          book_id UNINDEXED,
          chapter_index UNINDEXED,
          book_title,
          chapter_title,
          content,
          tokenize="trigram"
        );

        PRAGMA user_version = 3;
      ''');

      final nowMs = DateTime.now().toUtc().millisecondsSinceEpoch;

      rawDb.execute('''
        INSERT INTO books (id, title, author, original_file_name, file_path, format, sha256, file_size_bytes, created_at)
        VALUES ('book-v3-1', 'The Star Wanderer', 'Astrid Vance', 'wanderer.epub', '/books/wanderer.epub', 'epub', 'sha3-999', 8192, $nowMs);

        INSERT INTO chapters (id, book_id, chapter_index, title, content, word_count, character_count)
        VALUES ('ch-v3-1', 'book-v3-1', 0, 'Orbiting Orion', 'The starship cruised silently past the blazing nebulae of Orion.', 10, 64);

        INSERT INTO bookmarks (id, book_id, chapter_id, location, label, created_at)
        VALUES ('bm-v3-1', 'book-v3-1', 'ch-v3-1', 'char:25', 'Orion passage', $nowMs);

        INSERT INTO highlights (id, book_id, chapter_id, start_location, end_location, selected_text, note, color_value, created_at)
        VALUES ('hl-v3-1', 'book-v3-1', 'ch-v3-1', '13', '21', 'cruised', 'Interesting verb choice', 16774523, $nowMs);

        INSERT INTO reading_progress_table (book_id, current_location, current_chapter_id, progress_percentage, total_seconds_read, updated_at)
        VALUES ('book-v3-1', 'char:25', 'ch-v3-1', 0.25, 600, $nowMs);

        INSERT INTO chapter_fts (chapter_id, book_id, chapter_index, book_title, chapter_title, content)
        VALUES ('ch-v3-1', 'book-v3-1', 0, 'The Star Wanderer', 'Orbiting Orion', 'The starship cruised silently past the blazing nebulae of Orion.');
      ''');

      rawDb.dispose();

      // 2. Open via AppDatabase, triggering migration to v4
      appDb = AppDatabase(NativeDatabase(dbFile));

      expect(appDb!.schemaVersion, 4);

      // 3. Verify existing data preserved
      final book = await appDb!.getBookById('book-v3-1');
      expect(book, isNotNull);
      expect(book!.title, 'The Star Wanderer');

      final chapters = await appDb!.getChaptersForBook('book-v3-1');
      expect(chapters.length, 1);
      expect(chapters.first.title, 'Orbiting Orion');

      final bookmarks = await appDb!.getBookmarksForBook('book-v3-1');
      expect(bookmarks.length, 1);
      expect(bookmarks.first.location, 'char:25');

      final highlights = await appDb!.getHighlightsForBook('book-v3-1');
      expect(highlights.length, 1);
      expect(highlights.first.selectedText, 'cruised');
      expect(highlights.first.note, 'Interesting verb choice');

      final searchResults = await appDb!.searchContentFts('nebulae');
      expect(searchResults, isNotEmpty);
      expect(searchResults.first['chapter_id'], 'ch-v3-1');

      // 4. Verify new chapter_notes table functions properly
      await appDb!.insertChapterNote(
        ChapterNotesCompanion.insert(
          id: 'note-v4-1',
          bookId: 'book-v3-1',
          chapterId: 'ch-v3-1',
          content: 'Important thoughts on cosmic imagery in chapter 1.',
          createdAt: DateTime.now().toUtc(),
          updatedAt: DateTime.now().toUtc(),
        ),
      );

      final chapterNotes = await appDb!.getChapterNotesForBook('book-v3-1');
      expect(chapterNotes.length, 1);
      expect(chapterNotes.first.content, 'Important thoughts on cosmic imagery in chapter 1.');

      // 5. Verify cascading deletion works
      await appDb!.deleteBook('book-v3-1');
      expect(await appDb!.getBookById('book-v3-1'), isNull);
      expect(await appDb!.getChaptersForBook('book-v3-1'), isEmpty);
      expect(await appDb!.getBookmarksForBook('book-v3-1'), isEmpty);
      expect(await appDb!.getHighlightsForBook('book-v3-1'), isEmpty);
      expect(await appDb!.getChapterNotesForBook('book-v3-1'), isEmpty);
    });
  });
}
