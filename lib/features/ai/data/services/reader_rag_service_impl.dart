import '../../../search/domain/entities/search_result_entity.dart';
import '../../../search/domain/repositories/search_repository.dart';
import '../../domain/entities/ai_inference_entities.dart';
import '../../domain/services/reader_rag_service.dart';

class ReaderRagServiceImpl implements ReaderRagService {
  ReaderRagServiceImpl({required this.searchRepository});

  final SearchRepository searchRepository;

  @override
  Future<List<ContentSearchResult>> retrieveSpoilerSafePassages({
    required String bookId,
    required String query,
    required int currentChapterIndex,
    int maxPassages = 5,
  }) async {
    if (query.trim().isEmpty) return const [];

    final result = await searchRepository.searchContent(query, bookId: bookId);

    final rawResults = result.dataOrNull ?? const [];

    // Enforce strict deterministic spoiler boundary:
    // Only passages from chapters the user has already reached (chapterIndex <= currentChapterIndex)
    final spoilerSafe = rawResults
        .where((item) => item.chapterIndex <= currentChapterIndex)
        .take(maxPassages)
        .toList();

    return spoilerSafe;
  }

  @override
  AiPromptEntity buildSpoilerSafePrompt({
    required String bookTitle,
    required String query,
    required int currentChapterIndex,
    required List<ContentSearchResult> passages,
    String? currentChapterExcerpt,
  }) {
    final systemPrompt =
        'You are an emotionally intelligent literary reading companion for the novel "$bookTitle".\n'
        'STRICT SPOILER BOUNDARY: The user is currently reading Chapter ${currentChapterIndex + 1}.\n'
        'Under NO circumstances should you reveal, foreshadow, hint at, or discuss any plot developments, character deaths, '
        'or relationship changes that occur in later chapters (Chapter ${currentChapterIndex + 2} and beyond).\n'
        'Base your explanations, emotional analysis, and character recaps ONLY on the provided verified context passages '
        'from the chapters the reader has completed. If a question asks about unrevealed future events, politely state that '
        'this has not been revealed yet in the story up to their current chapter.';

    final contextBuffer = StringBuffer();
    if (currentChapterExcerpt != null &&
        currentChapterExcerpt.trim().isNotEmpty) {
      final cleanExcerpt = currentChapterExcerpt.length > 1000
          ? '${currentChapterExcerpt.substring(0, 1000)}...'
          : currentChapterExcerpt;
      contextBuffer.writeln(
        '--- [CURRENT CHAPTER EXCERPT (Chapter ${currentChapterIndex + 1})] ---',
      );
      contextBuffer.writeln(cleanExcerpt);
      contextBuffer.writeln();
    }

    if (passages.isNotEmpty) {
      contextBuffer.writeln('--- [VERIFIED HISTORICAL CHAPTER PASSAGES] ---');
      for (final p in passages) {
        contextBuffer.writeln(
          '[Chapter ${p.chapterIndex + 1}: ${p.chapterTitle}]',
        );
        contextBuffer.writeln('"${p.snippet}"');
        contextBuffer.writeln();
      }
    }

    final userPrompt =
        '${contextBuffer.toString()}'
        'User Question: $query\n\n'
        'Assistant (Emotionally aware, grounded in chapters up to Chapter ${currentChapterIndex + 1}):';

    return AiPromptEntity(
      systemPrompt: systemPrompt,
      userPrompt: userPrompt,
      temperature: 0.7,
      maxTokens: 512,
    );
  }
}
