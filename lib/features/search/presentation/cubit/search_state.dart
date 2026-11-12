import '../../domain/entities/search_result_entity.dart';

sealed class SearchState {
  const SearchState();
}

class SearchInitial extends SearchState {
  const SearchInitial({this.scope = SearchScope.all});
  final SearchScope scope;
}

class SearchLoading extends SearchState {
  const SearchLoading({required this.query, required this.scope});
  final String query;
  final SearchScope scope;
}

class SearchLoaded extends SearchState {
  const SearchLoaded({
    required this.query,
    required this.scope,
    required this.bookResults,
    required this.contentResults,
  });

  final String query;
  final SearchScope scope;
  final List<BookSearchResult> bookResults;
  final List<ContentSearchResult> contentResults;

  bool get isEmpty => bookResults.isEmpty && contentResults.isEmpty;
}

class SearchEmpty extends SearchState {
  const SearchEmpty({
    required this.query,
    required this.scope,
    required this.message,
  });

  final String query;
  final SearchScope scope;
  final String message;
}

class SearchError extends SearchState {
  const SearchError(this.message);
  final String message;
}
