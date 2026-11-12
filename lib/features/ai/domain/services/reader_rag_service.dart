import '../../../search/domain/entities/search_result_entity.dart';
import '../entities/ai_inference_entities.dart';

abstract interface class ReaderRagService {
  Future<List<ContentSearchResult>> retrieveSpoilerSafePassages({
    required String bookId,
    required String query,
    required int currentChapterIndex,
    int maxPassages = 5,
  });

  AiPromptEntity buildSpoilerSafePrompt({
    required String bookTitle,
    required String query,
    required int currentChapterIndex,
    required List<ContentSearchResult> passages,
    String? currentChapterExcerpt,
  });
}
