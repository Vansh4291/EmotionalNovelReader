import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/repositories/annotation_repository.dart';
import 'annotation_state.dart';

class AnnotationCubit extends Cubit<AnnotationState> {
  AnnotationCubit({required this.repository})
    : super(const AnnotationInitial());

  final AnnotationRepository repository;

  Future<void> loadAnnotations(String bookId) async {
    emit(const AnnotationLoading());
    final bookmarksResult = await repository.getBookmarksForBook(bookId);
    final highlightsResult = await repository.getHighlightsForBook(bookId);
    final chapterNotesResult = await repository.getChapterNotesForBook(bookId);

    if (bookmarksResult.isError) {
      emit(AnnotationError(bookmarksResult.failureOrNull!.message));
      return;
    }
    if (highlightsResult.isError) {
      emit(AnnotationError(highlightsResult.failureOrNull!.message));
      return;
    }
    if (chapterNotesResult.isError) {
      emit(AnnotationError(chapterNotesResult.failureOrNull!.message));
      return;
    }

    emit(
      AnnotationLoaded(
        bookId: bookId,
        allBookmarks: bookmarksResult.dataOrNull ?? [],
        allHighlights: highlightsResult.dataOrNull ?? [],
        allChapterNotes: chapterNotesResult.dataOrNull ?? [],
      ),
    );
  }

  void setFilter(AnnotationFilter filter) {
    final current = state;
    if (current is AnnotationLoaded) {
      emit(current.copyWith(filter: filter));
    }
  }

  void setSearchQuery(String query) {
    final current = state;
    if (current is AnnotationLoaded) {
      emit(current.copyWith(searchQuery: query));
    }
  }

  Future<void> deleteBookmark(String bookmarkId) async {
    final current = state;
    if (current is! AnnotationLoaded) return;

    final result = await repository.deleteBookmark(bookmarkId);
    if (result.isSuccess) {
      final updated = current.allBookmarks
          .where((b) => b.id != bookmarkId)
          .toList(growable: false);
      emit(current.copyWith(allBookmarks: updated));
    }
  }

  Future<void> deleteHighlight(String highlightId) async {
    final current = state;
    if (current is! AnnotationLoaded) return;

    final result = await repository.deleteHighlight(highlightId);
    if (result.isSuccess) {
      final updated = current.allHighlights
          .where((h) => h.id != highlightId)
          .toList(growable: false);
      emit(current.copyWith(allHighlights: updated));
    }
  }

  Future<void> updateNote(String highlightId, String? note) async {
    final current = state;
    if (current is! AnnotationLoaded) return;

    final result = await repository.updateHighlightNote(
      highlightId: highlightId,
      note: note,
    );
    if (result.isSuccess) {
      final updatedEntity = result.dataOrNull!;
      final updated = current.allHighlights
          .map((h) {
            return h.id == highlightId ? updatedEntity : h;
          })
          .toList(growable: false);
      emit(current.copyWith(allHighlights: updated));
    }
  }

  Future<void> updateColor(String highlightId, int colorValue) async {
    final current = state;
    if (current is! AnnotationLoaded) return;

    final result = await repository.updateHighlightColor(
      highlightId: highlightId,
      colorValue: colorValue,
    );
    if (result.isSuccess) {
      final updatedEntity = result.dataOrNull!;
      final updated = current.allHighlights
          .map((h) {
            return h.id == highlightId ? updatedEntity : h;
          })
          .toList(growable: false);
      emit(current.copyWith(allHighlights: updated));
    }
  }

  Future<void> createChapterNote({
    required String chapterId,
    int? chapterIndex,
    String? chapterTitle,
    required String content,
  }) async {
    final current = state;
    if (current is! AnnotationLoaded) return;

    final result = await repository.createChapterNote(
      bookId: current.bookId,
      chapterId: chapterId,
      chapterIndex: chapterIndex,
      chapterTitle: chapterTitle,
      content: content,
    );
    if (result.isSuccess) {
      final updated = [result.dataOrNull!, ...current.allChapterNotes];
      emit(current.copyWith(allChapterNotes: updated));
    }
  }

  Future<void> updateChapterNote(String noteId, String content) async {
    final current = state;
    if (current is! AnnotationLoaded) return;

    final result = await repository.updateChapterNote(
      id: noteId,
      content: content,
    );
    if (result.isSuccess) {
      final updatedEntity = result.dataOrNull!;
      final updated = current.allChapterNotes
          .map((cn) {
            return cn.id == noteId ? updatedEntity : cn;
          })
          .toList(growable: false);
      emit(current.copyWith(allChapterNotes: updated));
    }
  }

  Future<void> deleteChapterNote(String noteId) async {
    final current = state;
    if (current is! AnnotationLoaded) return;

    final result = await repository.deleteChapterNote(noteId);
    if (result.isSuccess) {
      final updated = current.allChapterNotes
          .where((cn) => cn.id != noteId)
          .toList(growable: false);
      emit(current.copyWith(allChapterNotes: updated));
    }
  }

  Future<void> refresh() async {
    final current = state;
    if (current is AnnotationLoaded) {
      await loadAnnotations(current.bookId);
    }
  }
}
