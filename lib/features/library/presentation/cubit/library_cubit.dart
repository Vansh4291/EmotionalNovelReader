import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/book_entity.dart';
import '../../domain/repositories/book_repository.dart';
import 'library_state.dart';

/// Cubit managing bookshelf state and reactive updates.
class LibraryCubit extends Cubit<LibraryState> {
  LibraryCubit({required this.bookRepository}) : super(const LibraryInitial());

  final BookRepository bookRepository;
  StreamSubscription<List<BookEntity>>? _booksSubscription;

  void loadBooks() {
    emit(const LibraryLoading());
    _booksSubscription?.cancel();
    _booksSubscription = bookRepository.watchAllBooks().listen(
      (books) {
        final s = state;
        if (s is LibraryLoaded) {
          emit(s.copyWith(allBooks: books));
        } else {
          emit(LibraryLoaded(books));
        }
      },
      onError: (Object error) {
        emit(LibraryError(error.toString()));
      },
    );
  }

  void setSortOption(LibrarySortOption sort) {
    final s = state;
    if (s is LibraryLoaded) {
      emit(s.copyWith(sortOption: sort));
    }
  }

  void setFilterOption(LibraryFilterOption filter) {
    final s = state;
    if (s is LibraryLoaded) {
      emit(s.copyWith(filterOption: filter));
    }
  }

  void setSearchQuery(String query) {
    final s = state;
    if (s is LibraryLoaded) {
      emit(s.copyWith(searchQuery: query));
    }
  }

  void toggleViewMode() {
    final s = state;
    if (s is LibraryLoaded) {
      final newMode = s.viewMode == LibraryViewMode.list
          ? LibraryViewMode.grid
          : LibraryViewMode.list;
      emit(s.copyWith(viewMode: newMode));
    }
  }

  Future<void> deleteBook(String id) async {
    final result = await bookRepository.deleteBook(id);
    result.fold(
      onSuccess: (_) {},
      onError: (failure) {
        emit(LibraryError(failure.message));
      },
    );
  }

  @override
  Future<void> close() {
    _booksSubscription?.cancel();
    return super.close();
  }
}
