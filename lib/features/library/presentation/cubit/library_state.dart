import '../../domain/entities/book_entity.dart';

enum LibrarySortOption {
  dateAddedDesc,
  dateAddedAsc,
  titleAsc,
  titleDesc,
}

enum LibraryFilterOption {
  all,
  epub,
  txt,
  pdf,
  docx,
}

enum LibraryViewMode {
  list,
  grid,
}

sealed class LibraryState {
  const LibraryState();
}

final class LibraryInitial extends LibraryState {
  const LibraryInitial();
}

final class LibraryLoading extends LibraryState {
  const LibraryLoading();
}

final class LibraryLoaded extends LibraryState {
  const LibraryLoaded(
    this.allBooks, {
    this.sortOption = LibrarySortOption.dateAddedDesc,
    this.filterOption = LibraryFilterOption.all,
    this.searchQuery = '',
    this.viewMode = LibraryViewMode.list,
  });

  final List<BookEntity> allBooks;
  final LibrarySortOption sortOption;
  final LibraryFilterOption filterOption;
  final String searchQuery;
  final LibraryViewMode viewMode;

  /// Returns the books filtered and sorted according to current settings.
  List<BookEntity> get displayedBooks {
    var result = List<BookEntity>.from(allBooks);

    // Apply format filter
    if (filterOption != LibraryFilterOption.all) {
      final targetFormat = filterOption.name.toLowerCase();
      result = result.where((b) => b.format.toLowerCase() == targetFormat).toList();
    }

    // Apply search query
    if (searchQuery.trim().isNotEmpty) {
      final query = searchQuery.trim().toLowerCase();
      result = result.where((b) {
        final titleMatches = b.title.toLowerCase().contains(query);
        final authorMatches = b.author?.toLowerCase().contains(query) ?? false;
        return titleMatches || authorMatches;
      }).toList();
    }

    // Apply sort
    switch (sortOption) {
      case LibrarySortOption.dateAddedDesc:
        result.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      case LibrarySortOption.dateAddedAsc:
        result.sort((a, b) => a.createdAt.compareTo(b.createdAt));
      case LibrarySortOption.titleAsc:
        result.sort((a, b) => a.title.toLowerCase().compareTo(b.title.toLowerCase()));
      case LibrarySortOption.titleDesc:
        result.sort((a, b) => b.title.toLowerCase().compareTo(a.title.toLowerCase()));
    }

    return result;
  }

  /// Backward-compatible alias for displayedBooks
  List<BookEntity> get books => displayedBooks;

  LibraryLoaded copyWith({
    List<BookEntity>? allBooks,
    LibrarySortOption? sortOption,
    LibraryFilterOption? filterOption,
    String? searchQuery,
    LibraryViewMode? viewMode,
  }) {
    return LibraryLoaded(
      allBooks ?? this.allBooks,
      sortOption: sortOption ?? this.sortOption,
      filterOption: filterOption ?? this.filterOption,
      searchQuery: searchQuery ?? this.searchQuery,
      viewMode: viewMode ?? this.viewMode,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LibraryLoaded &&
          sortOption == other.sortOption &&
          filterOption == other.filterOption &&
          searchQuery == other.searchQuery &&
          viewMode == other.viewMode &&
          _listEquals(allBooks, other.allBooks);

  @override
  int get hashCode => Object.hash(sortOption, filterOption, searchQuery, viewMode, allBooks);

  static bool _listEquals(List<BookEntity> a, List<BookEntity> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}

final class LibraryError extends LibraryState {
  const LibraryError(this.message);
  final String message;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LibraryError && runtimeType == other.runtimeType && message == other.message;

  @override
  int get hashCode => message.hashCode;
}
