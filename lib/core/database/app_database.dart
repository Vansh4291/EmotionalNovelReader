import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';
import 'tables.dart';

part 'app_database.g.dart';

@DriftDatabase(tables: [Books, Chapters, Bookmarks, Highlights, ReadingProgressTable])
class AppDatabase extends _$AppDatabase {
  AppDatabase([QueryExecutor? e]) : super(e ?? _openConnection());

  @override
  int get schemaVersion => 3;

  static QueryExecutor _openConnection() {
    return driftDatabase(
      name: 'enr_database',
      native: const DriftNativeOptions(
        shareAcrossIsolates: false,
      ),
    );
  }

  @override
  MigrationStrategy get migration => MigrationStrategy(
        beforeOpen: (details) async {
          // Strictly enforce foreign keys in SQLite WAL mode
          await customStatement('PRAGMA foreign_keys = ON;');
          await customStatement('PRAGMA journal_mode = WAL;');
        },
        onCreate: (m) async {
          await m.createAll();
          await customStatement('''
            CREATE VIRTUAL TABLE IF NOT EXISTS chapter_fts USING fts5(
              chapter_id UNINDEXED,
              book_id UNINDEXED,
              chapter_index UNINDEXED,
              book_title,
              chapter_title,
              content,
              tokenize="trigram"
            );
          ''');
        },
        onUpgrade: (m, from, to) async {
          if (from < 2) {
            await m.addColumn(chapters, chapters.content);
          }
          if (from < 3) {
            await customStatement('''
              CREATE VIRTUAL TABLE IF NOT EXISTS chapter_fts USING fts5(
                chapter_id UNINDEXED,
                book_id UNINDEXED,
                chapter_index UNINDEXED,
                book_title,
                chapter_title,
                content,
                tokenize="trigram"
              );
            ''');
            await customStatement('''
              INSERT INTO chapter_fts(chapter_id, book_id, chapter_index, book_title, chapter_title, content)
              SELECT c.id, c.book_id, c.chapter_index, b.title, c.title, c.content
              FROM chapters c
              JOIN books b ON b.id = c.book_id;
            ''');
          }
        },
      );

  // ==========================================
  // Books CRUD & Reactive Stream Methods
  // ==========================================

  Stream<List<Book>> watchAllBooks() {
    return (select(books)..orderBy([(b) => OrderingTerm.desc(b.createdAt)])).watch();
  }

  Future<List<Book>> getAllBooks() {
    return (select(books)..orderBy([(b) => OrderingTerm.desc(b.createdAt)])).get();
  }

  Future<Book?> getBookById(String id) {
    return (select(books)..where((b) => b.id.equals(id))).getSingleOrNull();
  }

  Future<Book?> getBookBySha(String sha256) {
    return (select(books)..where((b) => b.sha256.equals(sha256))).getSingleOrNull();
  }

  Future<int> insertBook(BooksCompanion book) {
    return into(books).insert(book);
  }

  Future<bool> updateBook(BooksCompanion book) {
    return update(books).replace(book);
  }

  Future<int> deleteBook(String id) {
    return (delete(books)..where((b) => b.id.equals(id))).go();
  }

  // ==========================================
  // Chapters Methods
  // ==========================================

  Future<void> insertChapters(List<ChaptersCompanion> chaptersList) {
    return batch((b) {
      b.insertAll(chapters, chaptersList);
    });
  }

  Future<List<Chapter>> getChaptersForBook(String bookId) {
    return (select(chapters)
          ..where((c) => c.bookId.equals(bookId))
          ..orderBy([(c) => OrderingTerm.asc(c.chapterIndex)]))
        .get();
  }

  Future<Chapter?> getChapterById(String id) {
    return (select(chapters)..where((c) => c.id.equals(id))).getSingleOrNull();
  }

  Future<int> getChapterCountForBook(String bookId) async {
    final countExp = chapters.id.count();
    final query = selectOnly(chapters)
      ..addColumns([countExp])
      ..where(chapters.bookId.equals(bookId));
    final result = await query.map((row) => row.read(countExp)).getSingle();
    return result ?? 0;
  }

  // ==========================================
  // Reading Progress Methods
  // ==========================================

  Stream<ReadingProgressTableData?> watchReadingProgress(String bookId) {
    return (select(readingProgressTable)..where((p) => p.bookId.equals(bookId)))
        .watchSingleOrNull();
  }

  Future<ReadingProgressTableData?> getReadingProgress(String bookId) {
    return (select(readingProgressTable)..where((p) => p.bookId.equals(bookId)))
        .getSingleOrNull();
  }

  Future<void> saveReadingProgress(ReadingProgressTableCompanion progress) {
    return into(readingProgressTable).insertOnConflictUpdate(progress);
  }

  // ==========================================
  // Bookmarks & Highlights Methods
  // ==========================================

  Stream<List<Bookmark>> watchBookmarksForBook(String bookId) {
    return (select(bookmarks)
          ..where((b) => b.bookId.equals(bookId))
          ..orderBy([(b) => OrderingTerm.desc(b.createdAt)]))
        .watch();
  }

  Future<int> insertBookmark(BookmarksCompanion bookmark) {
    return into(bookmarks).insert(bookmark);
  }

  Future<int> deleteBookmark(String bookmarkId) {
    return (delete(bookmarks)..where((b) => b.id.equals(bookmarkId))).go();
  }

  Stream<List<Highlight>> watchHighlightsForBook(String bookId) {
    return (select(highlights)
          ..where((h) => h.bookId.equals(bookId))
          ..orderBy([(h) => OrderingTerm.desc(h.createdAt)]))
        .watch();
  }

  Future<int> insertHighlight(HighlightsCompanion highlight) {
    return into(highlights).insert(highlight);
  }

  Future<int> deleteHighlight(String highlightId) {
    return (delete(highlights)..where((h) => h.id.equals(highlightId))).go();
  }

  // ==========================================
  // Full-Text Search (FTS5) & Search Index Methods
  // ==========================================

  Future<void> indexChaptersForBook({
    required String bookId,
    required String bookTitle,
    required List<ChaptersCompanion> chaptersList,
  }) async {
    await deleteFtsForBook(bookId);
    for (final ch in chaptersList) {
      final chId = ch.id.value;
      final chIndex = ch.chapterIndex.value;
      final chTitle = ch.title.value;
      final chContent = ch.content.value;
      await customStatement(
        'INSERT INTO chapter_fts(chapter_id, book_id, chapter_index, book_title, chapter_title, content) VALUES (?, ?, ?, ?, ?, ?)',
        [chId, bookId, chIndex, bookTitle, chTitle, chContent],
      );
    }
  }

  Future<void> deleteFtsForBook(String bookId) async {
    await customStatement('DELETE FROM chapter_fts WHERE book_id = ?', [bookId]);
  }

  Future<void> rebuildFtsIndex() async {
    await customStatement('DELETE FROM chapter_fts;');
    await customStatement('''
      INSERT INTO chapter_fts(chapter_id, book_id, chapter_index, book_title, chapter_title, content)
      SELECT c.id, c.book_id, c.chapter_index, b.title, c.title, c.content
      FROM chapters c
      JOIN books b ON b.id = c.book_id;
    ''');
  }

  Future<List<Book>> searchBooks(String query) {
    final clean = query.trim();
    if (clean.isEmpty) return getAllBooks();
    final pattern = '%$clean%';
    return (select(books)
          ..where((b) => b.title.like(pattern) | b.author.like(pattern))
          ..orderBy([(b) => OrderingTerm.desc(b.createdAt)]))
        .get();
  }

  Future<List<Map<String, dynamic>>> searchContentFts(
    String query, {
    String? bookId,
    int limit = 50,
  }) async {
    final cleanQuery = query.trim();
    if (cleanQuery.isEmpty) return [];

    if (cleanQuery.length >= 3) {
      // In FTS5, escape double quotes
      final escaped = cleanQuery.replaceAll('"', '""');
      final matchClause = '"$escaped"';
      final sql = '''
        SELECT 
          chapter_id,
          book_id,
          chapter_index,
          book_title,
          chapter_title,
          snippet(chapter_fts, 5, '<mark>', '</mark>', '...', 20) as snippet,
          bm25(chapter_fts) as rank
        FROM chapter_fts
        WHERE chapter_fts MATCH ?
        ${bookId != null ? 'AND book_id = ?' : ''}
        ORDER BY rank
        LIMIT ?;
      ''';
      final params = bookId != null ? [matchClause, bookId, limit] : [matchClause, limit];
      try {
        final rows = await customSelect(sql, variables: params.map((p) => Variable(p)).toList()).get();
        if (rows.isNotEmpty) {
          return rows.map((r) => r.data).toList();
        }
        // If FTS returned 0 results, also try substring fallback for edge cases
        return await _searchContentLike(cleanQuery, bookId: bookId, limit: limit);
      } catch (_) {
        return await _searchContentLike(cleanQuery, bookId: bookId, limit: limit);
      }
    } else {
      // For short queries (<3 chars), use LIKE fallback
      return _searchContentLike(cleanQuery, bookId: bookId, limit: limit);
    }
  }

  Future<List<Map<String, dynamic>>> _searchContentLike(
    String query, {
    String? bookId,
    int limit = 50,
  }) async {
    final pattern = '%$query%';
    final sql = '''
      SELECT 
        c.id as chapter_id,
        c.book_id,
        c.chapter_index,
        b.title as book_title,
        c.title as chapter_title,
        c.content
      FROM chapters c
      JOIN books b ON b.id = c.book_id
      WHERE (c.content LIKE ? OR c.title LIKE ? OR b.title LIKE ?)
      ${bookId != null ? 'AND c.book_id = ?' : ''}
      ORDER BY c.chapter_index ASC
      LIMIT ?;
    ''';
    final params = bookId != null
        ? [pattern, pattern, pattern, bookId, limit]
        : [pattern, pattern, pattern, limit];
    final rows = await customSelect(sql, variables: params.map((p) => Variable(p)).toList()).get();

    return rows.map((r) {
      final content = r.data['content'] as String? ?? '';
      final snippet = _createSnippet(content, query);
      return {
        'chapter_id': r.data['chapter_id'],
        'book_id': r.data['book_id'],
        'chapter_index': r.data['chapter_index'],
        'book_title': r.data['book_title'],
        'chapter_title': r.data['chapter_title'],
        'snippet': snippet,
        'rank': 0.0,
      };
    }).toList();
  }

  static String _createSnippet(String text, String term, {int contextLength = 40}) {
    final lowerText = text.toLowerCase();
    final lowerTerm = term.toLowerCase();
    final index = lowerText.indexOf(lowerTerm);
    if (index == -1) {
      return text.length > 80 ? '${text.substring(0, 80)}...' : text;
    }
    final start = (index - contextLength).clamp(0, text.length);
    final end = (index + term.length + contextLength).clamp(0, text.length);
    final prefix = start > 0 ? '...' : '';
    final suffix = end < text.length ? '...' : '';
    final match = text.substring(index, index + term.length);
    final before = text.substring(start, index);
    final after = text.substring(index + term.length, end);
    return '$prefix$before<mark>$match</mark>$after$suffix';
  }
}

