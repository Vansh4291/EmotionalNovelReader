import 'package:emotional_novel_reader/core/errors/failures.dart';
import 'package:emotional_novel_reader/features/search/domain/entities/search_result_entity.dart';
import 'package:emotional_novel_reader/features/search/domain/repositories/search_repository.dart';
import 'package:emotional_novel_reader/features/search/presentation/cubit/search_cubit.dart';
import 'package:emotional_novel_reader/features/search/presentation/cubit/search_state.dart';
import 'package:flutter_test/flutter_test.dart';

class MockSearchRepository implements SearchRepository {
  List<BookSearchResult> booksToReturn = [];
  List<ContentSearchResult> contentToReturn = [];
  Failure? failureToReturn;
  Duration delay = Duration.zero;

  @override
  Future<Result<List<BookSearchResult>>> searchBooks(String query) async {
    if (delay > Duration.zero) await Future<void>.delayed(delay);
    if (failureToReturn != null) return Result.error(failureToReturn!);
    return Result.success(booksToReturn);
  }

  @override
  Future<Result<List<ContentSearchResult>>> searchContent(
    String query, {
    String? bookId,
    int limit = 50,
  }) async {
    if (delay > Duration.zero) await Future<void>.delayed(delay);
    if (failureToReturn != null) return Result.error(failureToReturn!);
    return Result.success(contentToReturn);
  }

  @override
  Future<Result<void>> reindexAllContent() async {
    if (failureToReturn != null) return Result.error(failureToReturn!);
    return const Result.success(null);
  }
}

void main() {
  late MockSearchRepository mockRepository;
  late SearchCubit cubit;

  setUp(() {
    mockRepository = MockSearchRepository();
    cubit = SearchCubit(searchRepository: mockRepository);
  });

  tearDown(() {
    cubit.close();
  });

  group('SearchCubit unit tests', () {
    test('Initial state is SearchInitial with SearchScope.all', () {
      expect(cubit.state, isA<SearchInitial>());
      expect(cubit.currentScope, SearchScope.all);
      expect(cubit.currentQuery, '');
    });

    test('onQueryChanged debounces and executes search', () async {
      mockRepository.booksToReturn = [
        const BookSearchResult(
          id: 'b1',
          title: 'Dune',
          author: 'Frank Herbert',
          format: 'epub',
        ),
      ];

      final states = <SearchState>[];
      final subscription = cubit.stream.listen(states.add);

      cubit.onQueryChanged('Dune', debounceDuration: const Duration(milliseconds: 50));
      // Immediately after call, query is recorded but search has not executed
      expect(cubit.currentQuery, 'Dune');

      // Wait for debounce timer to fire
      await Future<void>.delayed(const Duration(milliseconds: 100));

      expect(states.length, 2);
      expect(states[0], isA<SearchLoading>());
      expect(states[1], isA<SearchLoaded>());
      final loaded = states[1] as SearchLoaded;
      expect(loaded.bookResults.length, 1);
      expect(loaded.bookResults.first.title, 'Dune');

      await subscription.cancel();
    });

    test('Empty query resets state to SearchInitial immediately without debounce', () {
      cubit.onQueryChanged('   ');
      expect(cubit.state, isA<SearchInitial>());
    });

    test('Emits SearchEmpty when both books and content return empty lists', () async {
      mockRepository.booksToReturn = [];
      mockRepository.contentToReturn = [];

      await cubit.executeSearch('nonexistent query');

      expect(cubit.state, isA<SearchEmpty>());
      final empty = cubit.state as SearchEmpty;
      expect(empty.query, 'nonexistent query');
    });

    test('Emits SearchError on repository failure', () async {
      mockRepository.failureToReturn = const DatabaseFailure('SQLite disk I/O error');

      await cubit.executeSearch('fail');

      expect(cubit.state, isA<SearchError>());
      final error = cubit.state as SearchError;
      expect(error.message, contains('SQLite disk I/O error'));
    });

    test('setScope updates scope and re-executes active search', () async {
      mockRepository.booksToReturn = [
        const BookSearchResult(id: 'b1', title: 'Book 1', author: 'Author 1', format: 'epub'),
      ];
      mockRepository.contentToReturn = [
        const ContentSearchResult(
          chapterId: 'c1',
          bookId: 'b1',
          chapterIndex: 0,
          bookTitle: 'Book 1',
          chapterTitle: 'Ch 1',
          snippet: 'Snippet with <mark>Book</mark>',
        ),
      ];

      // Execute search for 'Book'
      await cubit.executeSearch('Book');
      expect(cubit.state, isA<SearchLoaded>());
      var loaded = cubit.state as SearchLoaded;
      expect(loaded.bookResults.length, 1);
      expect(loaded.contentResults.length, 1);

      // Switch scope to SearchScope.books only
      cubit.setScope(SearchScope.books);
      await Future<void>.delayed(const Duration(milliseconds: 20));

      expect(cubit.state, isA<SearchLoaded>());
      loaded = cubit.state as SearchLoaded;
      expect(loaded.bookResults.length, 1);
      expect(loaded.contentResults, isEmpty); // Content omitted in books scope
    });

    test('Discards stale out-of-order asynchronous responses', () async {
      // Query 1 will be slow (delay 100ms)
      mockRepository.delay = const Duration(milliseconds: 100);
      mockRepository.booksToReturn = [
        const BookSearchResult(id: 'b1', title: 'Old Result', author: 'Old', format: 'epub'),
      ];

      final future1 = cubit.executeSearch('slow');

      // Immediately trigger Query 2 which is fast (no delay)
      mockRepository.delay = Duration.zero;
      mockRepository.booksToReturn = [
        const BookSearchResult(id: 'b2', title: 'New Result', author: 'New', format: 'epub'),
      ];
      final future2 = cubit.executeSearch('fast');

      await Future.wait([future1, future2]);

      // Verify that the final state is from Query 2 ('fast'), NOT Query 1 ('slow')
      expect(cubit.state, isA<SearchLoaded>());
      final loaded = cubit.state as SearchLoaded;
      expect(loaded.query, 'fast');
      expect(loaded.bookResults.first.title, 'New Result');
    });

    test('clear resets query and emits SearchInitial', () {
      cubit.clear();
      expect(cubit.currentQuery, '');
      expect(cubit.state, isA<SearchInitial>());
    });

    test('reindex rebuilds index and re-executes search', () async {
      mockRepository.booksToReturn = [
        const BookSearchResult(id: 'b1', title: 'Indexed Title', author: 'Author', format: 'epub'),
      ];

      // Reindex with active query
      await cubit.executeSearch('Indexed');
      expect(cubit.state, isA<SearchLoaded>());

      await cubit.reindex();
      expect(cubit.state, isA<SearchLoaded>());
      final loaded = cubit.state as SearchLoaded;
      expect(loaded.bookResults.first.title, 'Indexed Title');
    });
  });
}
