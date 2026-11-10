import 'package:flutter/material.dart';

import '../../domain/entities/highlight_entity.dart';
import 'highlight_color_picker.dart';

class NoteEditorResult {
  const NoteEditorResult({
    required this.note,
    required this.colorValue,
  });

  final String note;
  final int colorValue;
}

class NoteEditorDialog extends StatefulWidget {
  const NoteEditorDialog({
    super.key,
    required this.selectedText,
    this.initialNote,
    this.initialColor = HighlightEntity.defaultHighlightColor,
    this.title = 'Add Note',
  });

  final String selectedText;
  final String? initialNote;
  final int initialColor;
  final String title;

  static Future<NoteEditorResult?> show({
    required BuildContext context,
    required String selectedText,
    String? initialNote,
    int initialColor = HighlightEntity.defaultHighlightColor,
    String title = 'Add Note',
  }) {
    return showDialog<NoteEditorResult>(
      context: context,
      builder: (ctx) => NoteEditorDialog(
        selectedText: selectedText,
        initialNote: initialNote,
        initialColor: initialColor,
        title: title,
      ),
    );
  }

  @override
  State<NoteEditorDialog> createState() => _NoteEditorDialogState();
}

class _NoteEditorDialogState extends State<NoteEditorDialog> {
  late final TextEditingController _controller;
  late int _currentColor;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialNote ?? '');
    _currentColor = widget.initialColor;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Limit excerpt preview to 150 characters
    final previewText = widget.selectedText.length > 150
        ? '${widget.selectedText.substring(0, 150)}...'
        : widget.selectedText;

    return AlertDialog(
      title: Text(widget.title),
      content: SingleChildScrollView(
        child: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Selected text preview card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Color(_currentColor).withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: Color(_currentColor),
                    width: 1.5,
                  ),
                ),
                child: Text(
                  previewText,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Highlight Color',
                style: theme.textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              HighlightColorPicker(
                selectedColor: _currentColor,
                onColorSelected: (color) {
                  setState(() {
                    _currentColor = color;
                  });
                },
              ),
              const SizedBox(height: 16),
              Text(
                'Note',
                style: theme.textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _controller,
                maxLines: 4,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: 'Write your thoughts or reflections here...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  contentPadding: const EdgeInsets.all(12),
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            Navigator.of(context).pop(
              NoteEditorResult(
                note: _controller.text.trim(),
                colorValue: _currentColor,
              ),
            );
          },
          child: const Text('Save'),
        ),
      ],
    );
  }
}

