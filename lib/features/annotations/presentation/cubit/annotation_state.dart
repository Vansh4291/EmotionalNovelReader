import '../../domain/entities/bookmark_entity.dart';
import '../../domain/entities/chapter_note_entity.dart';
import '../../domain/entities/highlight_entity.dart';

enum AnnotationFilter { all, bookmarks, highlights, notes }

sealed class AnnotationState {
  const AnnotationState();
}

class AnnotationInitial extends AnnotationState {
  const AnnotationInitial();
}

class AnnotationLoading extends AnnotationState {
  const AnnotationLoading();
}

class AnnotationLoaded extends AnnotationState {
  const AnnotationLoaded({
    required this.bookId,
    required this.allBookmarks,
    required this.allHighlights,
    this.allChapterNotes = const [],
    this.filter = AnnotationFilter.all,
    this.searchQuery = '',
  });

  final String bookId;
  final List<BookmarkEntity> allBookmarks;
  final List<HighlightEntity> allHighlights;
  final List<ChapterNoteEntity> allChapterNotes;
  final AnnotationFilter filter;
  final String searchQuery;

  List<BookmarkEntity> get displayedBookmarks {
    if (filter == AnnotationFilter.highlights ||
        filter == AnnotationFilter.notes) {
      return [];
    }
    if (searchQuery.trim().isEmpty) {
      return allBookmarks;
    }
    final q = searchQuery.trim().toLowerCase();
    return allBookmarks.where((b) {
      final title = b.chapterTitle?.toLowerCase() ?? '';
      final label = b.label?.toLowerCase() ?? '';
      return title.contains(q) || label.contains(q);
    }).toList();
  }

  List<HighlightEntity> get displayedHighlights {
    var list = allHighlights;
    if (filter == AnnotationFilter.bookmarks) {
      return [];
    }
    if (filter == AnnotationFilter.notes) {
      list = list.where((h) => h.hasNote).toList();
    }
    if (searchQuery.trim().isEmpty) {
      return list;
    }
    final q = searchQuery.trim().toLowerCase();
    return list.where((h) {
      final text = h.selectedText.toLowerCase();
      final note = h.note?.toLowerCase() ?? '';
      final chTitle = h.chapterTitle?.toLowerCase() ?? '';
      return text.contains(q) || note.contains(q) || chTitle.contains(q);
    }).toList();
  }

  List<ChapterNoteEntity> get displayedChapterNotes {
    if (filter == AnnotationFilter.bookmarks ||
        filter == AnnotationFilter.highlights) {
      return [];
    }
    if (searchQuery.trim().isEmpty) {
      return allChapterNotes;
    }
    final q = searchQuery.trim().toLowerCase();
    return allChapterNotes.where((cn) {
      final content = cn.content.toLowerCase();
      final chTitle = cn.chapterTitle?.toLowerCase() ?? '';
      return content.contains(q) || chTitle.contains(q);
    }).toList();
  }

  bool get isEmpty =>
      displayedBookmarks.isEmpty &&
      displayedHighlights.isEmpty &&
      displayedChapterNotes.isEmpty;

  AnnotationLoaded copyWith({
    String? bookId,
    List<BookmarkEntity>? allBookmarks,
    List<HighlightEntity>? allHighlights,
    List<ChapterNoteEntity>? allChapterNotes,
    AnnotationFilter? filter,
    String? searchQuery,
  }) {
    return AnnotationLoaded(
      bookId: bookId ?? this.bookId,
      allBookmarks: allBookmarks ?? this.allBookmarks,
      allHighlights: allHighlights ?? this.allHighlights,
      allChapterNotes: allChapterNotes ?? this.allChapterNotes,
      filter: filter ?? this.filter,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}

class AnnotationError extends AnnotationState {
  const AnnotationError(this.message);
  final String message;
}
