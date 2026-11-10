import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../app/di/injection.dart';
import '../../../../core/presentation/widgets/loading_view.dart';
import '../../domain/entities/book_entity.dart';
import '../../domain/entities/chapter_entity.dart';
import '../../domain/entities/reading_progress_entity.dart';
import '../../domain/repositories/book_repository.dart';
import '../cubit/library_cubit.dart';

class BookDetailsScreen extends StatefulWidget {
  const BookDetailsScreen({
    super.key,
    required this.bookId,
    required this.libraryCubit,
  });

  final String bookId;
  final LibraryCubit libraryCubit;

  @override
  State<BookDetailsScreen> createState() => _BookDetailsScreenState();
}

class _BookDetailsScreenState extends State<BookDetailsScreen> {
  final BookRepository _bookRepository = getIt<BookRepository>();
  BookEntity? _book;
  List<ChapterEntity> _chapters = [];
  ReadingProgressEntity? _progress;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadBookDetails();
  }

  Future<void> _loadBookDetails() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final bookResult = await _bookRepository.getBookById(widget.bookId);
    if (bookResult.isError) {
      setState(() {
        _isLoading = false;
        _errorMessage = bookResult.failureOrNull!.message;
      });
      return;
    }

    final chaptersResult = await _bookRepository.getChapters(widget.bookId);
    final progressResult = await _bookRepository.getReadingProgress(widget.bookId);

    setState(() {
      _book = bookResult.dataOrNull;
      _chapters = chaptersResult.dataOrNull ?? [];
      _progress = progressResult.dataOrNull;
      _isLoading = false;
    });
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  void _showDeleteConfirmation() {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Novel'),
        content: Text(
          'Are you sure you want to delete "${_book?.title}" from your library?\n\n'
          'This will permanently remove all sandboxed files, reading progress, and chapters.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error),
            onPressed: () async {
              Navigator.of(ctx).pop();
              await widget.libraryCubit.deleteBook(widget.bookId);
              if (mounted) {
                context.pop();
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Book Details')),
        body: const LoadingView(message: 'Loading details...'),
      );
    }

    if (_errorMessage != null || _book == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Book Details')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
                const SizedBox(height: 16),
                Text(_errorMessage ?? 'Book not found'),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _loadBookDetails,
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final book = _book!;
    final progressPercent = (_progress?.progressPercentage ?? 0.0) * 100;
    final hasCover = book.coverImagePath != null && File(book.coverImagePath!).existsSync();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Book Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline),
            tooltip: 'Delete Book',
            onPressed: _showDeleteConfirmation,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Section: Cover & Key Info
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: 100,
                    height: 140,
                    color: theme.colorScheme.primaryContainer,
                    child: hasCover
                        ? Image.file(
                            File(book.coverImagePath!),
                            fit: BoxFit.cover,
                          )
                        : Icon(
                            Icons.auto_stories,
                            size: 48,
                            color: theme.colorScheme.onPrimaryContainer,
                          ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        book.title,
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        book.author ?? 'Unknown Author',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Chip(
                        label: Text(book.format.toUpperCase()),
                        padding: EdgeInsets.zero,
                        visualDensity: VisualDensity.compact,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Reading Progress Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Reading Progress',
                          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          '${progressPercent.toInt()}%',
                          style: theme.textTheme.titleSmall?.copyWith(
                            color: theme.colorScheme.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(
                      value: _progress?.progressPercentage ?? 0.0,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        icon: const Icon(Icons.play_arrow_rounded),
                        label: Text(
                          progressPercent > 0 ? 'Continue Reading' : 'Start Reading',
                        ),
                        onPressed: () {
                          context.push('/reader/${book.id}');
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // File & Storage Metadata
            Text(
              'File Information',
              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _InfoRow(label: 'File Size', value: _formatFileSize(book.fileSizeBytes)),
                    const Divider(height: 16),
                    _InfoRow(label: 'Total Chapters', value: '${_chapters.length}'),
                    const Divider(height: 16),
                    _InfoRow(
                      label: 'Imported Date',
                      value: DateFormat.yMMMd().format(book.createdAt.toLocal()),
                    ),
                    const Divider(height: 16),
                    _InfoRow(
                      label: 'SHA-256',
                      value: '${book.sha256.substring(0, 16)}...',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Chapters Preview
            Text(
              'Chapters (${_chapters.length})',
              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _chapters.length > 5 ? 5 : _chapters.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final ch = _chapters[index];
                return ListTile(
                  dense: true,
                  title: Text(ch.title),
                  trailing: ch.wordCount > 0 ? Text('${ch.wordCount} words') : null,
                );
              },
            ),
            if (_chapters.length > 5) ...[
              const SizedBox(height: 8),
              Center(
                child: Text(
                  'and ${_chapters.length - 5} more chapters',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: Theme.of(context).textTheme.bodySmall),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
      ],
    );
  }
}

