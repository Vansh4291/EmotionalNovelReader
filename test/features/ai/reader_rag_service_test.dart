import 'package:emotional_novel_reader/core/errors/failures.dart';
import 'package:emotional_novel_reader/features/ai/data/services/reader_rag_service_impl.dart';
import 'package:emotional_novel_reader/features/search/domain/entities/search_result_entity.dart';
import 'package:emotional_novel_reader/features/search/domain/repositories/search_repository.dart';
import 'package:flutter_test/flutter_test.dart';

class MockSearchRepository implements SearchRepository {
  MockSearchRepository({this.resultsToReturn = const []});
  final List<ContentSearchResult> resultsToReturn;

  @override
  Future<Result<List<BookSearchResult>>> searchBooks(String query) async {
    return const Result.success([]);
  }

  @override
  Future<Result<List<ContentSearchResult>>> searchContent(
    String query, {
    String? bookId,
    int limit = 50,
  }) async {
    return Result.success(resultsToReturn);
  }

  @override
  Future<Result<void>> reindexAllContent() async {
    return const Result.success(null);
  }
}

void main() {
  group('ReaderRagService Tests (Deterministic Spoiler Boundaries)', () {
    test('Empty query returns empty passages list without searching', () async {
      final mockRepo = MockSearchRepository();
      final rag = ReaderRagServiceImpl(searchRepository: mockRepo);

      final passages = await rag.retrieveSpoilerSafePassages(
        bookId: 'book-1',
        query: '   ',
        currentChapterIndex: 5,
      );

      expect(passages, isEmpty);
    });

    test(
      'Strictly filters out search results from future chapters (spoilers)',
      () async {
        // Simulate raw search matches across chapters 0 to 5
        final rawResults = [
          const ContentSearchResult(
            chapterId: 'c0',
            bookId: 'b1',
            chapterIndex: 0,
            bookTitle: 'Test Novel',
            chapterTitle: 'Prologue',
            snippet: 'Meeting in the village...',
          ),
          const ContentSearchResult(
            chapterId: 'c1',
            bookId: 'b1',
            chapterIndex: 1,
            bookTitle: 'Test Novel',
            chapterTitle: 'Chapter 1: Departure',
            snippet: 'Setting out on the journey...',
          ),
          const ContentSearchResult(
            chapterId: 'c2',
            bookId: 'b1',
            chapterIndex: 2,
            bookTitle: 'Test Novel',
            chapterTitle: 'Chapter 2: The Forest',
            snippet: 'Current event in the forest...',
          ),
          const ContentSearchResult(
            chapterId: 'c3',
            bookId: 'b1',
            chapterIndex: 3,
            bookTitle: 'Test Novel',
            chapterTitle: 'Chapter 3: The Betrayal',
            snippet: 'MAJOR SPOILER: The mentor was the villain all along!',
          ),
          const ContentSearchResult(
            chapterId: 'c4',
            bookId: 'b1',
            chapterIndex: 4,
            bookTitle: 'Test Novel',
            chapterTitle: 'Chapter 4: The Final Battle',
            snippet: 'EPIC SPOILER: Hero dies at the summit!',
          ),
        ];

        final mockRepo = MockSearchRepository(resultsToReturn: rawResults);
        final rag = ReaderRagServiceImpl(searchRepository: mockRepo);

        // User is currently reading Chapter 2 (index 2)
        final safePassages = await rag.retrieveSpoilerSafePassages(
          bookId: 'b1',
          query: 'mentor',
          currentChapterIndex: 2,
          maxPassages: 10,
        );

        // Verify that NO results with chapterIndex > 2 are returned
        expect(safePassages.length, equals(3));
        for (final p in safePassages) {
          expect(p.chapterIndex, lessThanOrEqualTo(2));
          expect(p.snippet, isNot(contains('SPOILER')));
        }
      },
    );

    test(
      'buildSpoilerSafePrompt formats system prompt and bounds correctly',
      () {
        final mockRepo = MockSearchRepository();
        final rag = ReaderRagServiceImpl(searchRepository: mockRepo);

        final passages = [
          const ContentSearchResult(
            chapterId: 'c1',
            bookId: 'b1',
            chapterIndex: 1,
            bookTitle: 'Spice and Wolf',
            chapterTitle: 'Chapter 1',
            snippet: 'Lawrence discovered Holo inside the cart wagon sleeping amongst the wheat.',
          ),
        ];

        final prompt = rag.buildSpoilerSafePrompt(
          bookTitle: 'Spice and Wolf',
          query: 'Who was in the cart?',
          currentChapterIndex: 2,
          passages: passages,
          currentChapterExcerpt:
              'Lawrence and Holo arrived at the next trading town.',
        );

        expect(prompt.systemPrompt, contains('Spice and Wolf'));
        expect(
          prompt.systemPrompt,
          contains(
            'STRICT SPOILER BOUNDARY: The user is currently reading Chapter 3',
          ),
        );
        expect(
          prompt.systemPrompt,
          contains(
            'Under NO circumstances should you reveal, foreshadow, hint at, or discuss',
          ),
        );
        expect(
          prompt.userPrompt,
          contains('User Question: Who was in the cart?'),
        );
        expect(prompt.userPrompt, contains('Holo inside the cart wagon'));
        expect(prompt.userPrompt, contains('arrived at the next trading town'));
      },
    );
  });
}
