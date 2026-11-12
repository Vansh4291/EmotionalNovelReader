import 'dart:async';

import 'package:bloc/bloc.dart';

import '../../domain/entities/search_result_entity.dart';
import '../../domain/repositories/search_repository.dart';
import 'search_state.dart';

class SearchCubit extends Cubit<SearchState> {
  SearchCubit({required this.searchRepository, this.scopedBookId})
    : super(const SearchInitial());

  final SearchRepository searchRepository;
  final String? scopedBookId;

  SearchScope _scope = SearchScope.all;
  String _currentQuery = '';
  Timer? _debounceTimer;
  int _querySequence = 0;

  SearchScope get currentScope => _scope;
  String get currentQuery => _currentQuery;

  void onQueryChanged(
    String query, {
    Duration debounceDuration = const Duration(milliseconds: 300),
  }) {
    _debounceTimer?.cancel();
    final trimmed = query.trim();
    _currentQuery = trimmed;

    if (trimmed.isEmpty) {
      _querySequence++;
      emit(SearchInitial(scope: _scope));
      return;
    }

    _debounceTimer = Timer(debounceDuration, () {
      executeSearch(trimmed);
    });
  }

  Future<void> executeSearch(String query) async {
    final cleanQuery = query.trim();
    _currentQuery = cleanQuery;
    if (cleanQuery.isEmpty) {
      emit(SearchInitial(scope: _scope));
      return;
    }

    final queryId = ++_querySequence;
    emit(SearchLoading(query: cleanQuery, scope: _scope));

    try {
      List<BookSearchResult> bookResults = [];
      List<ContentSearchResult> contentResults = [];

      // 1. Search books metadata if scope includes books
      if (_scope == SearchScope.all || _scope == SearchScope.books) {
        if (scopedBookId == null) {
          final booksRes = await searchRepository.searchBooks(cleanQuery);
          if (queryId != _querySequence) return; // Stale query suppression
          if (booksRes.isError) {
            emit(
              SearchError(
                booksRes.failureOrNull?.message ?? 'Book search failed',
              ),
            );
            return;
          }
          bookResults = booksRes.dataOrNull!;
        }
      }

      // 2. Search chapter content if scope includes content
      if (_scope == SearchScope.all || _scope == SearchScope.content) {
        final contentRes = await searchRepository.searchContent(
          cleanQuery,
          bookId: scopedBookId,
        );
        if (queryId != _querySequence) return; // Stale query suppression
        if (contentRes.isError) {
          emit(
            SearchError(
              contentRes.failureOrNull?.message ?? 'Content search failed',
            ),
          );
          return;
        }
        contentResults = contentRes.dataOrNull!;
      }

      if (queryId != _querySequence) return;

      if (bookResults.isEmpty && contentResults.isEmpty) {
        final message = switch (_scope) {
          SearchScope.books => 'No books found matching "$cleanQuery"',
          SearchScope.content => 'No chapter text found matching "$cleanQuery"',
          SearchScope.all =>
            'No books or chapter text found matching "$cleanQuery"',
        };
        emit(SearchEmpty(query: cleanQuery, scope: _scope, message: message));
      } else {
        emit(
          SearchLoaded(
            query: cleanQuery,
            scope: _scope,
            bookResults: bookResults,
            contentResults: contentResults,
          ),
        );
      }
    } catch (e) {
      if (queryId != _querySequence) return;
      emit(SearchError('Search failed: ${e.toString()}'));
    }
  }

  void setScope(SearchScope scope) {
    if (_scope == scope) return;
    _scope = scope;
    if (_currentQuery.isNotEmpty) {
      executeSearch(_currentQuery);
    } else {
      emit(SearchInitial(scope: _scope));
    }
  }

  void clear() {
    _debounceTimer?.cancel();
    _querySequence++;
    _currentQuery = '';
    emit(SearchInitial(scope: _scope));
  }

  Future<void> reindex() async {
    emit(SearchLoading(query: _currentQuery, scope: _scope));
    final res = await searchRepository.reindexAllContent();
    if (res.isError) {
      emit(
        SearchError(
          res.failureOrNull?.message ?? 'Failed to rebuild search index.',
        ),
      );
    } else if (_currentQuery.isNotEmpty) {
      await executeSearch(_currentQuery);
    } else {
      emit(SearchInitial(scope: _scope));
    }
  }

  @override
  Future<void> close() {
    _debounceTimer?.cancel();
    return super.close();
  }
}
