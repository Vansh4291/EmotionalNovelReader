import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/presentation/widgets/empty_view.dart';
import '../../../../core/presentation/widgets/error_view.dart';
import '../../../../core/presentation/widgets/loading_view.dart';
import '../../../import/presentation/cubit/import_cubit.dart';
import '../../../import/presentation/cubit/import_state.dart';
import '../../domain/entities/book_entity.dart';
import '../cubit/library_cubit.dart';
import '../cubit/library_state.dart';

class LibraryScreen extends StatelessWidget {
  const LibraryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocListener<ImportCubit, ImportState>(
      listener: (context, state) {
        if (state is ImportError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: Theme.of(context).colorScheme.error,
              behavior: SnackBarBehavior.floating,
            ),
          );
        } else if (state is ImportSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Successfully imported "${state.book.title}"'),
              backgroundColor: Theme.of(context).colorScheme.primary,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Emotional Novel Reader'),
          actions: [
            IconButton(
              icon: const Icon(Icons.search_rounded),
              tooltip: 'Search Library and Content',
              onPressed: () => context.push('/search'),
            ),
            IconButton(
              icon: const Icon(Icons.insights_rounded),
              tooltip: 'Reading Statistics & Goals',
              onPressed: () => context.push('/statistics'),
            ),
            BlocBuilder<LibraryCubit, LibraryState>(
              builder: (context, state) {
                if (state is! LibraryLoaded) return const SizedBox.shrink();

                return IconButton(
                  icon: Icon(
                    state.viewMode == LibraryViewMode.list
                        ? Icons.grid_view_rounded
                        : Icons.view_list_rounded,
                  ),
                  tooltip: state.viewMode == LibraryViewMode.list
                      ? 'Switch to Grid View'
                      : 'Switch to List View',
                  onPressed: () =>
                      context.read<LibraryCubit>().toggleViewMode(),
                );
              },
            ),
            PopupMenuButton<LibrarySortOption>(
              icon: const Icon(Icons.sort_rounded),
              tooltip: 'Sort Options',
              onSelected: (option) =>
                  context.read<LibraryCubit>().setSortOption(option),
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: LibrarySortOption.dateAddedDesc,
                  child: Text('Date Added (Newest first)'),
                ),
                const PopupMenuItem(
                  value: LibrarySortOption.dateAddedAsc,
                  child: Text('Date Added (Oldest first)'),
                ),
                const PopupMenuItem(
                  value: LibrarySortOption.titleAsc,
                  child: Text('Title (A to Z)'),
                ),
                const PopupMenuItem(
                  value: LibrarySortOption.titleDesc,
                  child: Text('Title (Z to A)'),
                ),
              ],
            ),
            IconButton(
              icon: const Icon(Icons.settings_outlined),
              tooltip: 'Settings',
              onPressed: () => context.push('/settings'),
            ),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () {
            context.read<ImportCubit>().pickAndImport();
          },
          icon: const Icon(Icons.add),
          label: const Text('Import Novel'),
        ),
        body: Column(
          children: [
            // Import Progress Indicator bar if an import is active
            BlocBuilder<ImportCubit, ImportState>(
              builder: (context, importState) {
                if (importState is ImportInProgress) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    color: Theme.of(context).colorScheme.primaryContainer,
                    child: Row(
                      children: [
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            value: importState.progress > 0
                                ? importState.progress
                                : null,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            '${importState.status} (${(importState.progress * 100).toInt()}%)',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onPrimaryContainer,
                                  fontWeight: FontWeight.w600,
                                ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  );
                }
                return const SizedBox.shrink();
              },
            ),

            // Filter Chips
            BlocBuilder<LibraryCubit, LibraryState>(
              builder: (context, state) {
                if (state is! LibraryLoaded || state.allBooks.isEmpty) {
                  return const SizedBox.shrink();
                }

                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: Row(
                    children: [
                      _FilterChip(
                        label: 'All',
                        isSelected:
                            state.filterOption == LibraryFilterOption.all,
                        onSelected: () => context
                            .read<LibraryCubit>()
                            .setFilterOption(LibraryFilterOption.all),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: 'EPUB',
                        isSelected:
                            state.filterOption == LibraryFilterOption.epub,
                        onSelected: () => context
                            .read<LibraryCubit>()
                            .setFilterOption(LibraryFilterOption.epub),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: 'TXT',
                        isSelected:
                            state.filterOption == LibraryFilterOption.txt,
                        onSelected: () => context
                            .read<LibraryCubit>()
                            .setFilterOption(LibraryFilterOption.txt),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: 'PDF',
                        isSelected:
                            state.filterOption == LibraryFilterOption.pdf,
                        onSelected: () => context
                            .read<LibraryCubit>()
                            .setFilterOption(LibraryFilterOption.pdf),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: 'DOCX',
                        isSelected:
                            state.filterOption == LibraryFilterOption.docx,
                        onSelected: () => context
                            .read<LibraryCubit>()
                            .setFilterOption(LibraryFilterOption.docx),
                      ),
                    ],
                  ),
                );
              },
            ),

            // Main Bookshelf View
            Expanded(
              child: BlocBuilder<LibraryCubit, LibraryState>(
                builder: (context, state) {
                  return switch (state) {
                    LibraryInitial() || LibraryLoading() => const LoadingView(
                      message: 'Loading bookshelf...',
                    ),
                    LibraryError(:final message) => ErrorView(
                      message: message,
                      onRetry: () => context.read<LibraryCubit>().loadBooks(),
                    ),
                    LibraryLoaded(
                      :final allBooks,
                      :final displayedBooks,
                      :final viewMode,
                    ) =>
                      allBooks.isEmpty
                          ? EmptyView(
                              title: 'Your Library is Empty',
                              message: 'Import your favorite EPUB, PDF, or TXT novels to begin your offline reading journey.',
                              icon: Icons.menu_book_outlined,
                              actionLabel: 'Import Novel',
                              onAction: () =>
                                  context.read<ImportCubit>().pickAndImport(),
                            )
                          : displayedBooks.isEmpty
                          ? const Center(
                              child: Text(
                                'No novels match your filter or search query.',
                              ),
                            )
                          : viewMode == LibraryViewMode.list
                          ? _buildListView(context, displayedBooks)
                          : _buildGridView(context, displayedBooks),
                  };
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildListView(BuildContext context, List<BookEntity> books) {
    return ListView.builder(
      itemCount: books.length,
      padding: const EdgeInsets.only(left: 16, right: 16, top: 8, bottom: 80),
      itemBuilder: (context, index) {
        final book = books[index];
        final hasCover =
            book.coverImagePath != null &&
            File(book.coverImagePath!).existsSync();

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 8,
            ),
            leading: ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Container(
                width: 44,
                height: 60,
                color: Theme.of(context).colorScheme.primaryContainer,
                child: hasCover
                    ? Image.file(File(book.coverImagePath!), fit: BoxFit.cover)
                    : Icon(
                        Icons.book_rounded,
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                      ),
              ),
            ),
            title: Text(
              book.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Text(
              book.author ?? 'Unknown Author',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            trailing: Chip(
              label: Text(book.format.toUpperCase()),
              padding: EdgeInsets.zero,
              visualDensity: VisualDensity.compact,
            ),
            onTap: () {
              context.push('/book/${book.id}');
            },
          ),
        );
      },
    );
  }

  Widget _buildGridView(BuildContext context, List<BookEntity> books) {
    return GridView.builder(
      itemCount: books.length,
      padding: const EdgeInsets.only(left: 16, right: 16, top: 8, bottom: 80),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.65,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemBuilder: (context, index) {
        final book = books[index];
        final hasCover =
            book.coverImagePath != null &&
            File(book.coverImagePath!).existsSync();

        return Card(
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () {
              context.push('/book/${book.id}');
            },
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Container(
                    width: double.infinity,
                    color: Theme.of(context).colorScheme.primaryContainer,
                    child: hasCover
                        ? Image.file(
                            File(book.coverImagePath!),
                            fit: BoxFit.cover,
                          )
                        : Icon(
                            Icons.auto_stories,
                            size: 48,
                            color: Theme.of(context)
                                .colorScheme
                                .onPrimaryContainer,
                          ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        book.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        book.author ?? 'Unknown Author',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        book.format.toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onSelected,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onSelected(),
      visualDensity: VisualDensity.compact,
    );
  }
}
