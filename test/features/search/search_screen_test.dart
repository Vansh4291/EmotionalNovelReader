import 'package:emotional_novel_reader/core/errors/failures.dart';
import 'package:emotional_novel_reader/features/search/domain/entities/search_result_entity.dart';
import 'package:emotional_novel_reader/features/search/domain/repositories/search_repository.dart';
import 'package:emotional_novel_reader/features/search/presentation/cubit/search_cubit.dart';
import 'package:emotional_novel_reader/features/search/presentation/screens/search_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';

class MockSearchRepo implements SearchRepository {
  List<BookSearchResult> books = [];
  List<ContentSearchResult> content = [];
  Failure? failure;

  @override
  Future<Result<List<BookSearchResult>>> searchBooks(String query) async {
    if (failure != null) return Result.error(failure!);
    return Result.success(books);
  }

  @override
  Future<Result<List<ContentSearchResult>>> searchContent(
    String query, {
    String? bookId,
    int limit = 50,
  }) async {
    if (failure != null) return Result.error(failure!);
    return Result.success(content);
  }

  @override
  Future<Result<void>> reindexAllContent() async {
    if (failure != null) return Result.error(failure!);
    return const Result.success(null);
  }
}

void main() {
  late MockSearchRepo mockRepo;

  setUp(() {
    mockRepo = MockSearchRepo();
  });

  Widget createWidget({String? scopedBookId, String initialQuery = ''}) {
    return MaterialApp(
      home: BlocProvider<SearchCubit>(
        create: (_) =>
            SearchCubit(searchRepository: mockRepo, scopedBookId: scopedBookId),
        child: SearchScreen(
          scopedBookId: scopedBookId,
          initialQuery: initialQuery,
        ),
      ),
    );
  }

  group('SearchScreen widget tests', () {
    testWidgets('Renders search input with initial placeholder', (
      tester,
    ) async {
      await tester.pumpWidget(createWidget());
      expect(find.byType(TextField), findsOneWidget);
      expect(
        find.text('Search books, authors, chapter text...'),
        findsOneWidget,
      );
      expect(find.text('Search Your Library'), findsOneWidget);
    });

    testWidgets('Renders scope chips when not scoped to a book', (
      tester,
    ) async {
      await tester.pumpWidget(createWidget());
      expect(find.text('All'), findsOneWidget);
      expect(find.text('Books'), findsOneWidget);
      expect(find.text('Chapter Content'), findsOneWidget);
    });

    testWidgets('Hides scope chips when scoped to a specific book', (
      tester,
    ) async {
      await tester.pumpWidget(createWidget(scopedBookId: 'book-123'));
      expect(find.text('Search within this book...'), findsOneWidget);
      expect(find.text('Books'), findsNothing);
      expect(find.text('Chapter Content'), findsNothing);
    });

    testWidgets(
      'Displays book and content search results with snippet highlighting',
      (tester) async {
        mockRepo.books = [
          const BookSearchResult(
            id: 'b1',
            title: 'Foundation',
            author: 'Isaac Asimov',
            format: 'epub',
          ),
        ];
        mockRepo.content = [
          const ContentSearchResult(
            chapterId: 'c1',
            bookId: 'b1',
            chapterIndex: 0,
            bookTitle: 'Foundation',
            chapterTitle: 'Psychohistory',
            snippet:
                'Hari Seldon was born in the <mark>Galactic</mark> Empire.',
          ),
        ];

        await tester.pumpWidget(createWidget());

        // Enter query and wait for debounce
        await tester.enterText(find.byType(TextField), 'Galactic');
        await tester.pump(const Duration(milliseconds: 350));
        await tester.pump();

        expect(find.text('Books (1)'), findsOneWidget);
        expect(find.text('Foundation'), findsOneWidget);
        expect(find.text('Isaac Asimov'), findsOneWidget);

        expect(find.text('Chapter Content (1)'), findsOneWidget);
        expect(find.textContaining('Psychohistory'), findsOneWidget);
        expect(find.textContaining('Galactic'), findsOneWidget);
      },
    );

    testWidgets('Displays empty state message when no results found', (
      tester,
    ) async {
      mockRepo.books = [];
      mockRepo.content = [];

      await tester.pumpWidget(createWidget());
      await tester.enterText(find.byType(TextField), 'Unicorns');
      await tester.pump(const Duration(milliseconds: 350));
      await tester.pump();

      expect(
        find.textContaining(
          'No books or chapter text found matching "Unicorns"',
        ),
        findsOneWidget,
      );
    });

    testWidgets('Displays error view when repository fails', (tester) async {
      mockRepo.failure = const DatabaseFailure('Database locked');

      await tester.pumpWidget(createWidget());
      await tester.enterText(find.byType(TextField), 'FailQuery');
      await tester.pump(const Duration(milliseconds: 350));
      await tester.pump();

      expect(find.text('Database locked'), findsOneWidget);
      expect(find.text('Rebuild Index'), findsOneWidget);
    });
  });
}
