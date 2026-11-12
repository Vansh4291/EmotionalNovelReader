import 'package:drift/drift.dart' show Value;
import 'package:drift/native.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:emotional_novel_reader/features/annotations/data/repositories/annotation_repository_impl.dart';
import 'package:emotional_novel_reader/features/annotations/domain/entities/highlight_entity.dart';
import 'package:emotional_novel_reader/features/annotations/presentation/cubit/annotation_cubit.dart';
import 'package:emotional_novel_reader/features/annotations/presentation/cubit/annotation_state.dart';
import 'package:emotional_novel_reader/features/annotations/presentation/widgets/highlight_color_picker.dart';
import 'package:emotional_novel_reader/features/annotations/presentation/widgets/note_editor_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Annotation End-to-End Workflow & Widget Tests', () {
    late AppDatabase db;
    late AnnotationRepositoryImpl repository;
    late AnnotationCubit cubit;

    const bookId = 'book-e2e-1';
    const ch1Id = 'ch-e2e-1';
    const ch2Id = 'ch-e2e-2';

    setUp(() async {
      db = AppDatabase(NativeDatabase.memory());
      repository = AnnotationRepositoryImpl(database: db);
      cubit = AnnotationCubit(repository: repository);

      final now = DateTime.now().toUtc();
      await db.insertBook(
        BooksCompanion.insert(
          id: bookId,
          title: 'A Journey Through Time',
          originalFileName: 'journey.txt',
          filePath: '/data/books/journey.txt',
          format: 'txt',
          sha256: 'sha-e2e-time-123',
          fileSizeBytes: 4096,
          createdAt: now,
        ),
      );

      await db.insertChapters([
        ChaptersCompanion.insert(
          id: ch1Id,
          bookId: bookId,
          chapterIndex: 0,
          title: 'Chapter 1: The Clockwork City',
          content: const Value(
            'In the center of the clockwork city, a bronze bell tolled twelve times.',
          ),
          wordCount: const Value(12),
          characterCount: const Value(71),
        ),
        ChaptersCompanion.insert(
          id: ch2Id,
          bookId: bookId,
          chapterIndex: 1,
          title: 'Chapter 2: The Gearmaker',
          content: const Value(
            'The old gearmaker peered through his magnifying lens with immense focus.',
          ),
          wordCount: const Value(11),
          characterCount: const Value(69),
        ),
      ]);
    });

    tearDown(() async {
      await cubit.close();
      await db.close();
    });

    test('Full End-to-End lifecycle: Bookmarks, Highlights, Notes, Filtering, and Cascading Delete', () async {
      // 1. Add Bookmark for Chapter 1
      final b1Res = await repository.addBookmark(
        bookId: bookId,
        chapterId: ch1Id,
        chapterIndex: 0,
        chapterTitle: 'Chapter 1: The Clockwork City',
        location: '50.0',
        label: 'Twelve tolls mark the beginning',
      );
      expect(b1Res.isSuccess, isTrue);

      // 2. Prevent duplicate bookmark for Chapter 1 at the same location
      final bDupRes = await repository.addBookmark(
        bookId: bookId,
        chapterId: ch1Id,
        location: '50.0',
      );
      expect(bDupRes.isSuccess, isTrue);
      expect(bDupRes.dataOrNull!.id, b1Res.dataOrNull!.id);

      // 3. Create Highlight without note
      final h1Res = await repository.createHighlight(
        bookId: bookId,
        chapterId: ch1Id,
        chapterIndex: 0,
        chapterTitle: 'Chapter 1: The Clockwork City',
        startOffset: 24,
        endOffset: 38,
        selectedText: 'clockwork city',
        colorValue: HighlightEntity.defaultHighlightColor,
      );
      expect(h1Res.isSuccess, isTrue);

      // 4. Create Highlight with note and custom pink color
      final h2Res = await repository.createHighlight(
        bookId: bookId,
        chapterId: ch1Id,
        chapterIndex: 0,
        chapterTitle: 'Chapter 1: The Clockwork City',
        startOffset: 42,
        endOffset: 53,
        selectedText: 'bronze bell',
        note: 'Symbolism of mortality and mechanical fate',
        colorValue: 0xFFF48FB1, // Pink
      );
      expect(h2Res.isSuccess, isTrue);

      // 5. Load through AnnotationCubit
      await cubit.loadAnnotations(bookId);
      var state = cubit.state as AnnotationLoaded;
      expect(state.allBookmarks.length, 1);
      expect(state.allHighlights.length, 2);
      expect(state.displayedBookmarks.length, 1);
      expect(state.displayedHighlights.length, 2);

      // 6. Test Filter: Bookmarks only
      cubit.setFilter(AnnotationFilter.bookmarks);
      state = cubit.state as AnnotationLoaded;
      expect(state.displayedBookmarks.length, 1);
      expect(state.displayedHighlights.isEmpty, isTrue);

      // 7. Test Filter: Highlights only
      cubit.setFilter(AnnotationFilter.highlights);
      state = cubit.state as AnnotationLoaded;
      expect(state.displayedBookmarks.isEmpty, isTrue);
      expect(state.displayedHighlights.length, 2);

      // 8. Test Filter: Notes only
      cubit.setFilter(AnnotationFilter.notes);
      state = cubit.state as AnnotationLoaded;
      expect(state.displayedBookmarks.isEmpty, isTrue);
      expect(state.displayedHighlights.length, 1);
      expect(
        state.displayedHighlights.first.note,
        contains('Symbolism of mortality'),
      );

      // 9. Search within annotations
      cubit.setFilter(AnnotationFilter.all);
      cubit.setSearchQuery('bronze');
      state = cubit.state as AnnotationLoaded;
      expect(state.displayedBookmarks.isEmpty, isTrue);
      expect(state.displayedHighlights.length, 1);
      expect(state.displayedHighlights.first.selectedText, 'bronze bell');

      // 10. Update note
      await cubit.updateNote(h2Res.dataOrNull!.id, 'Updated symbolism note');
      state = cubit.state as AnnotationLoaded;
      expect(
        state.allHighlights
            .firstWhere((h) => h.id == h2Res.dataOrNull!.id)
            .note,
        'Updated symbolism note',
      );

      // 11. Update color
      await cubit.updateColor(h1Res.dataOrNull!.id, 0xFFA5D6A7); // Green
      state = cubit.state as AnnotationLoaded;
      expect(
        state.allHighlights
            .firstWhere((h) => h.id == h1Res.dataOrNull!.id)
            .colorValue,
        0xFFA5D6A7,
      );

      // 12. Delete highlight
      await cubit.deleteHighlight(h1Res.dataOrNull!.id);
      state = cubit.state as AnnotationLoaded;
      expect(state.allHighlights.length, 1);

      // 13. Cascade Delete on Book Deletion
      await db.deleteBook(bookId);
      final remainingBookmarks = (await repository.getBookmarksForBook(bookId))
          .dataOrNull!;
      final remainingHighlights = (await repository.getHighlightsForBook(
        bookId,
      )).dataOrNull!;
      expect(remainingBookmarks.isEmpty, isTrue);
      expect(remainingHighlights.isEmpty, isTrue);
    });

    testWidgets(
      'HighlightColorPicker renders all standard colors and responds to selection',
      (tester) async {
        int selectedColor = HighlightEntity.defaultHighlightColor;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: StatefulBuilder(
                builder: (context, setState) {
                  return HighlightColorPicker(
                    selectedColor: selectedColor,
                    onColorSelected: (c) {
                      setState(() => selectedColor = c);
                    },
                  );
                },
              ),
            ),
          ),
        );

        // Expect 5 color circles rendered
        expect(find.byType(InkWell), findsNWidgets(5));
        expect(find.byIcon(Icons.check), findsOneWidget);

        // Tap the second circle (Green: 0xFFA5D6A7)
        await tester.tap(find.byType(InkWell).at(1));
        await tester.pumpAndSettle();

        expect(selectedColor, 0xFFA5D6A7);
      },
    );

    testWidgets(
      'NoteEditorDialog displays selected text excerpt, allows typing, and returns result',
      (tester) async {
        NoteEditorResult? dialogResult;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) {
                  return ElevatedButton(
                    onPressed: () async {
                      dialogResult = await NoteEditorDialog.show(
                        context: context,
                        selectedText:
                            'A mysterious key was found inside the drawer.',
                        title: 'Add Note',
                      );
                    },
                    child: const Text('Open Dialog'),
                  );
                },
              ),
            ),
          ),
        );

        // Open dialog
        await tester.tap(find.text('Open Dialog'));
        await tester.pumpAndSettle();

        expect(find.text('Add Note'), findsOneWidget);
        expect(
          find.text('A mysterious key was found inside the drawer.'),
          findsOneWidget,
        );

        // Enter text into the note text field
        await tester.enterText(
          find.byType(TextField),
          'This key unlocks the tower.',
        );
        await tester.pump();

        // Tap Save button
        await tester.tap(find.text('Save'));
        await tester.pumpAndSettle();

        expect(dialogResult, isNotNull);
        expect(dialogResult!.note, 'This key unlocks the tower.');
        expect(dialogResult!.colorValue, HighlightEntity.defaultHighlightColor);
      },
    );
  });
}
