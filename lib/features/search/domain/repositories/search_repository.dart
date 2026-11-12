import '../../../../core/errors/failures.dart';
import '../entities/search_result_entity.dart';

abstract interface class SearchRepository {
  Future<Result<List<BookSearchResult>>> searchBooks(String query);

  Future<Result<List<ContentSearchResult>>> searchContent(
    String query, {
    String? bookId,
    int limit = 50,
  });

  Future<Result<void>> reindexAllContent();
}
