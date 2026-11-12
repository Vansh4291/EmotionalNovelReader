import 'dart:io';

import 'package:drift/drift.dart' as drift;
import 'package:drift/native.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqlite3/sqlite3.dart';

void main() {
  late Directory tempDir;
  late File dbFile;
  AppDatabase? appDb;

  setUp(() {
    tempDir = Directory.systemTemp.createTempSync(
      'enr_migration_v4_to_v5_test_',
    );
    dbFile = File('${tempDir.path}/legacy_v4.db');
  });

  tearDown(() async {
    await appDb?.close();
    if (tempDir.existsSync()) {
      tempDir.deleteSync(recursive: true);
    }
  });

  group('Drift SQLite Schema v4 to v5 Migration tests', () {
    test('Migrates existing schema v4 database to v5 while preserving all records and creating reading_sessions and reading_goals', () async {
      // 1. Establish authentic schema v4 SQLite database directly via raw sqlite3
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

        CREATE TABLE chapter_notes (
          id TEXT NOT NULL PRIMARY KEY,
          book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
          chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at INTEGER NOT NULL,
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

        PRAGMA user_version = 4;
      ''');

      final nowMs = DateTime.now().toUtc().millisecondsSinceEpoch;

      // Seed test records into v4 tables
      rawDb.execute('''
        INSERT INTO books (id, title, author, original_file_name, file_path, format, sha256, file_size_bytes, created_at)
        VALUES ('book-1', 'Sword Art Online', 'Reki Kawahara', 'sao.epub', '/data/sao.epub', 'epub', 'sha123', 1024, $nowMs);

        INSERT INTO chapters (id, book_id, chapter_index, title, content, word_count, character_count)
        VALUES ('chap-1', 'book-1', 0, 'Aincrad Prologue', 'Welcome to the world of sword art.', 7, 34);

        INSERT INTO bookmarks (id, book_id, chapter_id, location, label, created_at)
        VALUES ('bm-1', 'book-1', 'chap-1', 'char:10', 'First bookmark', $nowMs);

        INSERT INTO highlights (id, book_id, chapter_id, start_location, end_location, selected_text, note, color_value, created_at)
        VALUES ('hl-1', 'book-1', 'chap-1', 'char:0', 'char:7', 'Welcome', 'Note on welcome', 16774523, $nowMs);

        INSERT INTO reading_progress_table (book_id, current_location, current_chapter_id, progress_percentage, total_seconds_read, updated_at)
        VALUES ('book-1', 'char:15', 'chap-1', 0.25, 120, $nowMs);

        INSERT INTO chapter_notes (id, book_id, chapter_id, content, created_at, updated_at)
        VALUES ('cn-1', 'book-1', 'chap-1', 'Important battle scene.', $nowMs, $nowMs);
      ''');

      rawDb.dispose();

      // 2. Open database via Drift AppDatabase, triggering migration 4 -> 5
      appDb = AppDatabase(NativeDatabase(dbFile));

      // 3. Verify user_version is now 5
      final versionResult = await appDb!
          .customSelect('PRAGMA user_version;')
          .getSingle();
      expect(versionResult.data['user_version'], equals(5));

      // 4. Verify existing records are intact
      final book = await appDb!.getBookById('book-1');
      expect(book, isNotNull);
      expect(book!.title, equals('Sword Art Online'));

      final chapters = await appDb!.getChaptersForBook('book-1');
      expect(chapters.length, equals(1));
      expect(chapters.first.title, equals('Aincrad Prologue'));

      final bookmarks = await appDb!.getBookmarksForBook('book-1');
      expect(bookmarks.length, equals(1));
      expect(bookmarks.first.label, equals('First bookmark'));

      final highlights = await appDb!.getHighlightsForChapter(
        'book-1',
        'chap-1',
      );
      expect(highlights.length, equals(1));
      expect(highlights.first.selectedText, equals('Welcome'));

      final progress = await appDb!.getReadingProgress('book-1');
      expect(progress, isNotNull);
      expect(progress!.totalSecondsRead, equals(120));

      final notes = await appDb!.getChapterNotesForChapter('book-1', 'chap-1');
      expect(notes.length, equals(1));
      expect(notes.first.content, equals('Important battle scene.'));

      // 5. Verify reading_sessions and reading_goals tables accept insertions and query properly
      await appDb!.insertReadingSession(
        ReadingSessionsCompanion(
          id: const drift.Value('sess-1'),
          bookId: const drift.Value('book-1'),
          chapterId: const drift.Value('chap-1'),
          startTime: drift.Value(DateTime.now().toUtc()),
          endTime: drift.Value(DateTime.now().toUtc()),
          durationSeconds: const drift.Value(300),
          charactersRead: const drift.Value(1500),
          chaptersCompleted: const drift.Value(1),
        ),
      );

      final sessions = await appDb!.getAllReadingSessions();
      expect(sessions.length, equals(1));
      expect(sessions.first.durationSeconds, equals(300));

      await appDb!.insertOrUpdateReadingGoal(
        ReadingGoalsCompanion(
          id: const drift.Value('daily_time'),
          goalType: const drift.Value('time_minutes'),
          targetValue: const drift.Value(30),
          isEnabled: const drift.Value(true),
          createdAt: drift.Value(DateTime.now().toUtc()),
          updatedAt: drift.Value(DateTime.now().toUtc()),
        ),
      );

      final goals = await appDb!.getAllReadingGoals();
      expect(goals.length, equals(1));
      expect(goals.first.targetValue, equals(30));
    });
  });
}
