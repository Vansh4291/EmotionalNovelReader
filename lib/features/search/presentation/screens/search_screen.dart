import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../domain/entities/search_result_entity.dart';
import '../cubit/search_cubit.dart';
import '../cubit/search_state.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key, this.initialQuery = '', this.scopedBookId});

  final String initialQuery;
  final String? scopedBookId;

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialQuery);
    if (widget.initialQuery.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        context.read<SearchCubit>().onQueryChanged(widget.initialQuery);
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: TextField(
          controller: _controller,
          autofocus: true,
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            hintText: widget.scopedBookId != null
                ? 'Search within this book...'
                : 'Search books, authors, chapter text...',
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16),
            suffixIcon: _controller.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear),
                    tooltip: 'Clear query',
                    onPressed: () {
                      _controller.clear();
                      context.read<SearchCubit>().clear();
                      setState(() {});
                    },
                  )
                : null,
          ),
          onChanged: (val) {
            context.read<SearchCubit>().onQueryChanged(val);
            setState(() {});
          },
          onSubmitted: (val) {
            context.read<SearchCubit>().executeSearch(val);
          },
        ),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Search options',
            icon: const Icon(Icons.more_vert),
            onSelected: (val) {
              if (val == 'reindex') {
                context.read<SearchCubit>().reindex();
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'reindex',
                child: Row(
                  children: [
                    Icon(Icons.refresh, size: 20),
                    SizedBox(width: 8),
                    Text('Rebuild Search Index'),
                  ],
                ),
              ),
            ],
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: BlocBuilder<SearchCubit, SearchState>(
            builder: (context, state) {
              final currentScope = context.read<SearchCubit>().currentScope;
              if (widget.scopedBookId != null) {
                return const SizedBox.shrink();
              }
              return Container(
                height: 48,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                alignment: Alignment.centerLeft,
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: SearchScope.values.map((scope) {
                      final isSelected = currentScope == scope;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          selected: isSelected,
                          label: Text(scope.displayName),
                          onSelected: (_) {
                            context.read<SearchCubit>().setScope(scope);
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
              );
            },
          ),
        ),
      ),
      body: BlocBuilder<SearchCubit, SearchState>(
        builder: (context, state) {
          return switch (state) {
            SearchInitial() => _buildInitialView(theme),
            SearchLoading() => _buildLoadingView(theme),
            SearchEmpty(:final message) => _buildEmptyView(theme, message),
            SearchError(:final message) => _buildErrorView(theme, message),
            SearchLoaded(
              :final bookResults,
              :final contentResults,
              :final scope,
            ) =>
              _buildResultsView(theme, bookResults, contentResults, scope),
          };
        },
      ),
    );
  }

  Widget _buildInitialView(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.manage_search,
              size: 72,
              color: theme.colorScheme.primary.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 16),
            Text('Search Your Library', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              'Type to search by novel title, author, or search inside full chapter text.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingView(ThemeData theme) {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Searching...'),
        ],
      ),
    );
  }

  Widget _buildEmptyView(ThemeData theme, String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.search_off,
              size: 64,
              color: theme.colorScheme.error.withValues(alpha: 0.6),
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorView(ThemeData theme, String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: theme.colorScheme.error),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton.tonalIcon(
              onPressed: () {
                context.read<SearchCubit>().reindex();
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Rebuild Index'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultsView(
    ThemeData theme,
    List<BookSearchResult> books,
    List<ContentSearchResult> content,
    SearchScope scope,
  ) {
    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 8),
      children: [
        if (books.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
            child: Text(
              'Books (${books.length})',
              style: theme.textTheme.titleSmall?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          ...books.map((b) => _buildBookTile(b, theme)),
          if (content.isNotEmpty) const Divider(height: 24),
        ],
        if (content.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
            child: Text(
              'Chapter Content (${content.length})',
              style: theme.textTheme.titleSmall?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          ...content.map((c) => _buildContentTile(c, theme)),
        ],
      ],
    );
  }

  Widget _buildBookTile(BookSearchResult book, ThemeData theme) {
    return ListTile(
      leading: Container(
        width: 44,
        height: 60,
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(4),
        ),
        clipBehavior: Clip.antiAlias,
        child:
            book.coverImagePath != null &&
                File(book.coverImagePath!).existsSync()
            ? Image.file(File(book.coverImagePath!), fit: BoxFit.cover)
            : Icon(Icons.book, color: theme.colorScheme.onSurfaceVariant),
      ),
      title: Text(
        book.title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontWeight: FontWeight.bold),
      ),
      subtitle: Text(
        book.author?.isNotEmpty == true ? book.author! : 'Unknown author',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: Chip(
        label: Text(
          book.format.toUpperCase(),
          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
        ),
        padding: EdgeInsets.zero,
        visualDensity: VisualDensity.compact,
      ),
      onTap: () {
        context.push('/book/${book.id}');
      },
    );
  }

  Widget _buildContentTile(ContentSearchResult item, ThemeData theme) {
    return InkWell(
      onTap: () {
        context.push(
          '/reader/${item.bookId}?chapterIndex=${item.chapterIndex}',
        );
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.menu_book,
                  size: 16,
                  color: theme.colorScheme.secondary,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    '${item.bookTitle} • ${item.chapterTitle}',
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: theme.colorScheme.secondary,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            _buildHighlightedText(item.snippet, theme),
          ],
        ),
      ),
    );
  }

  Widget _buildHighlightedText(String snippet, ThemeData theme) {
    final spans = <TextSpan>[];
    final markRegex = RegExp(
      r'<mark>(.*?)</mark>',
      caseSensitive: false,
      dotAll: true,
    );
    var lastIndex = 0;

    for (final match in markRegex.allMatches(snippet)) {
      if (match.start > lastIndex) {
        spans.add(
          TextSpan(
            text: snippet.substring(lastIndex, match.start),
            style: theme.textTheme.bodyMedium,
          ),
        );
      }
      spans.add(
        TextSpan(
          text: match.group(1),
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.bold,
            backgroundColor: theme.colorScheme.primaryContainer,
            color: theme.colorScheme.onPrimaryContainer,
          ),
        ),
      );
      lastIndex = match.end;
    }

    if (lastIndex < snippet.length) {
      spans.add(
        TextSpan(
          text: snippet.substring(lastIndex),
          style: theme.textTheme.bodyMedium,
        ),
      );
    }

    return RichText(
      text: TextSpan(children: spans),
      maxLines: 3,
      overflow: TextOverflow.ellipsis,
    );
  }
}
