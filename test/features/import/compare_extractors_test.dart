import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:emotional_novel_reader/features/import/domain/extractors/pdf_extractor.dart';
import 'package:pdfrx/pdfrx.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    await pdfrxInitialize(tmpPath: Directory.systemTemp.path);
  });

  final pdfs = [
    'Books/Atomic Habits James Clear.pdf',
    'Books/Deep Work.pdf',
    'Books/Haunting Adeline.pdf',
    'Books/How to Read a Book.pdf',
    'Books/Lord of the Mysteries/Clown - LotM Vol. 1.pdf',
  ];

  test('Compare Old Extractor vs PDFium Extractor on all 5 PDFs', timeout: const Timeout(Duration(minutes: 3)), () async {
    for (final pdfPath in pdfs) {
      final file = File(pdfPath);
      print('\n===============================================================');
      print('FILE: $pdfPath (${(file.lengthSync() / (1024 * 1024)).toStringAsFixed(2)} MB)');
      print('===============================================================');

      // --- 1. OLD EXTRACTOR ---
      final oldStopwatch = Stopwatch()..start();
      const oldExtractor = PdfExtractor();
      final oldResult = await oldExtractor.extract(file);
      oldStopwatch.stop();

      var oldTotalPages = 0;
      var oldNonEmptyPages = 0;
      var oldCharCount = 0;
      var oldWordCount = 0;
      var oldReplacementCount = 0;
      var oldNulCount = 0;
      var oldFirstPageSample = '';
      var oldMidPageSample = '';
      var oldLastPageSample = '';

      if (oldResult.isSuccess) {
        final data = oldResult.dataOrNull!;
        oldTotalPages = data.chapters.length;
        for (var i = 0; i < data.chapters.length; i++) {
          final ch = data.chapters[i];
          if (ch.content.trim().isNotEmpty) oldNonEmptyPages++;
          oldCharCount += ch.content.length;
          oldWordCount += ch.wordCount;
          oldReplacementCount += RegExp(r'[\uFFFD\uE000-\uF8FF]').allMatches(ch.content).length;
          oldNulCount += '\u0000'.allMatches(ch.content).length;
        }
        if (data.chapters.isNotEmpty) {
          oldFirstPageSample = data.chapters.first.content.take(200);
          final midIdx = data.chapters.length ~/ 2;
          oldMidPageSample = data.chapters[midIdx].content.take(200);
          oldLastPageSample = data.chapters.last.content.take(200);
        }
      }

      print('--- OLD EXTRACTOR ---');
      print('Status: ${oldResult.isSuccess ? "SUCCESS" : "ERROR: " + (oldResult.failureOrNull?.message ?? "")}');
      print('Duration: ${oldStopwatch.elapsedMilliseconds} ms');
      print('Pages (Chapters): $oldTotalPages (Non-empty: $oldNonEmptyPages, Empty: ${oldTotalPages - oldNonEmptyPages})');
      print('Chars: $oldCharCount, Words: $oldWordCount');
      print('PUA/Replacement glyphs: $oldReplacementCount, NUL bytes: $oldNulCount');
      print('First page sample:\n  $oldFirstPageSample');
      print('Middle page sample:\n  $oldMidPageSample');
      print('Last page sample:\n  $oldLastPageSample');

      // --- 2. PDFIUM EXTRACTOR ---
      final pdfiumStopwatch = Stopwatch()..start();
      final doc = await PdfDocument.openFile(file.path);
      var pdfiumTotalPages = doc.pages.length;
      var pdfiumNonEmptyPages = 0;
      var pdfiumCharCount = 0;
      var pdfiumWordCount = 0;
      var pdfiumReplacementCount = 0;
      var pdfiumNulCount = 0;
      var pdfiumFirstPageSample = '';
      var pdfiumMidPageSample = '';
      var pdfiumLastPageSample = '';

      final pageTexts = <int, String>{};
      for (var i = 0; i < doc.pages.length; i++) {
        final page = doc.pages[i];
        final rawText = await page.loadText();
        final content = rawText?.fullText ?? '';
        pageTexts[i] = content;
        if (content.trim().isNotEmpty) {
          pdfiumNonEmptyPages++;
        }
        pdfiumCharCount += content.length;
        final words = content.trim().isEmpty ? 0 : content.trim().split(RegExp(r'\s+')).length;
        pdfiumWordCount += words;
        pdfiumReplacementCount += RegExp(r'[\uFFFD\uE000-\uF8FF]').allMatches(content).length;
        pdfiumNulCount += '\u0000'.allMatches(content).length;
      }
      pdfiumStopwatch.stop();

      // Find first non-empty, middle non-empty, and last non-empty
      final nonEmptyIndices = pageTexts.entries.where((e) => e.value.trim().isNotEmpty).map((e) => e.key).toList();
      if (nonEmptyIndices.isNotEmpty) {
        pdfiumFirstPageSample = pageTexts[nonEmptyIndices.first]!.trim().take(200);
        final mid = nonEmptyIndices[nonEmptyIndices.length ~/ 2];
        pdfiumMidPageSample = pageTexts[mid]!.trim().take(200);
        pdfiumLastPageSample = pageTexts[nonEmptyIndices.last]!.trim().take(200);
      }

      await doc.dispose();

      print('\n--- PDFIUM EXTRACTOR ---');
      print('Duration: ${pdfiumStopwatch.elapsedMilliseconds} ms');
      print('Pages: $pdfiumTotalPages (Non-empty: $pdfiumNonEmptyPages, Empty: ${pdfiumTotalPages - pdfiumNonEmptyPages})');
      print('Chars: $pdfiumCharCount, Words: $pdfiumWordCount');
      print('PUA/Replacement glyphs: $pdfiumReplacementCount, NUL bytes: $pdfiumNulCount');
      print('First non-empty page sample:\n  $pdfiumFirstPageSample');
      print('Middle non-empty page sample:\n  $pdfiumMidPageSample');
      print('Last non-empty page sample:\n  $pdfiumLastPageSample');
    }
  });
}

extension on String {
  String take(int n) => length <= n ? this : substring(0, n);
}

