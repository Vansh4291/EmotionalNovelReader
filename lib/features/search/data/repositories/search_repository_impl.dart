import '../../../../core/database/app_database.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/search_result_entity.dart';
import '../../domain/repositories/search_repository.dart';

class SearchRepositoryImpl implements SearchRepository {
  const SearchRepositoryImpl({required this.database});

  final AppDatabase database;

  @override
  Future<Result<List<BookSearchResult>>> searchBooks(String query) async {
    try {
      final clean = query.trim();
      if (clean.isEmpty) {
        return const Result.success([]);
      }
      final books = await database.searchBooks(clean);
      final results = books.map((b) {
        return BookSearchResult(
          id: b.id,
          title: b.title,
          author: b.author,
          format: b.format,
          coverImagePath: b.coverImagePath,
        );
      }).toList();
      return Result.success(results);
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to search book metadata: $e', e, stack),
      );
    }
  }

  @override
  Future<Result<List<ContentSearchResult>>> searchContent(
    String query, {
    String? bookId,
    int limit = 50,
  }) async {
    try {
      final clean = query.trim();
      if (clean.isEmpty) {
        return const Result.success([]);
      }
      final rows = await database.searchContentFts(
        clean,
        bookId: bookId,
        limit: limit,
      );
      final results = rows.map((r) {
        return ContentSearchResult(
          chapterId: r['chapter_id'] as String? ?? '',
          bookId: r['book_id'] as String? ?? '',
          chapterIndex: r['chapter_index'] is int
              ? r['chapter_index'] as int
              : int.tryParse(r['chapter_index']?.toString() ?? '0') ?? 0,
          bookTitle: r['book_title'] as String? ?? '',
          chapterTitle: r['chapter_title'] as String? ?? '',
          snippet: r['snippet'] as String? ?? '',
          rank: (r['rank'] is num) ? (r['rank'] as num).toDouble() : 0.0,
        );
      }).toList();
      return Result.success(results);
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to search chapter content: $e', e, stack),
      );
    }
  }

  @override
  Future<Result<void>> reindexAllContent() async {
    try {
      await database.rebuildFtsIndex();
      return const Result.success(null);
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to rebuild search index: $e', e, stack),
      );
    }
  }
}
