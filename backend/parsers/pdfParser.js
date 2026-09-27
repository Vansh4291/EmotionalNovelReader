const fs = require('fs').promises;
const pdf = require('pdf-parse');

/**
 * Parse a PDF into chapters. Strictly read-only: the original file is never
 * opened for writing and no generated text is added. Only whitespace is
 * normalized (see cleanText); prose characters are never altered.
 * Paragraph breaks (newlines) are preserved for the reader and narration.
 */
async function parsePdf(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    // Pass a plain Uint8Array (not a Node Buffer): the bundled pdf.js inside
    // pdf-parse mis-parses xref tables when given Buffer instances whose
    // prototype chain has been altered by test frameworks (e.g. jest).
    const data = await pdf(new Uint8Array(dataBuffer));

    const fullText = data.text;
    const chapters = detectChapters(fullText);
    
    return {
      title: data.info?.Title || 'Unknown Title',
      author: data.info?.Author || 'Unknown Author',
      coverImagePath: null,
      chapters
    };
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Capture source-document integrity facts used by the import route to verify
 * the source stayed immutable and extraction produced content. Read-only.
 */
async function getPdfIntegrity(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    // Collect per-page text through the pagerender hook — pdf-parse's flat
    // text output does not reliably mark page boundaries.
    const pageTexts = [];
    const data = await pdf(new Uint8Array(dataBuffer), {
      pagerender: (pageData) =>
        pageData.getTextContent().then((textContent) => {
          let lastY = undefined;
          let text = '';
          for (const item of textContent.items) {
            if (lastY === item.transform[5] || lastY === undefined) {
              text += item.str;
            } else {
              text += '\n' + item.str;
            }
            lastY = item.transform[5];
          }
          pageTexts.push(text);
          return text;
        }),
    });
    return {
      pageCount: data.numpages || pageTexts.length,
      perPageCharCounts: pageTexts.map((p) => p.length),
      extractedCharCount: pageTexts.join('').length,
    };
  } catch (error) {
    throw new Error(`Failed to read PDF integrity data: ${error.message}`);
  }
}

function detectChapters(text) {
  const chapterPatterns = [
    /^chapter\s+(\d+)/i,
    /^ch\.\s*(\d+)/i,
    /^第(\d+)章/i,
    /^part\s+(\d+)/i,
    /^section\s+(\d+)/i
  ];

  const lines = text.split('\n');
  const chapters = [];
  let currentChapter = {
    title: 'Chapter 1',
    text: '',
    startLine: 0
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    let isChapterStart = false;

    for (const pattern of chapterPatterns) {
      if (pattern.test(line) && line.length < 50) {
        isChapterStart = true;
        break;
      }
    }

    if (isChapterStart) {
      if (chapters.length > 0 || currentChapter.text.trim().length > 0) {
        currentChapter.text = cleanText(currentChapter.text);
        if (currentChapter.text.length > 0) {
          chapters.push({
            index: chapters.length,
            title: currentChapter.title,
            text: currentChapter.text,
            wordCount: currentChapter.text.split(/\s+/).length
          });
        }
        currentChapter = {
          title: line,
          text: '',
          startLine: i
        };
      } else {
        // First heading of the document with no preceding prose: name the
        // opening chapter instead of treating the heading as body text.
        currentChapter.title = line;
      }
    } else {
      currentChapter.text += line + '\n';
    }
  }

  if (currentChapter.text.length > 0) {
    currentChapter.text = cleanText(currentChapter.text);
    chapters.push({
      index: chapters.length,
      title: currentChapter.title,
      text: currentChapter.text,
      wordCount: currentChapter.text.split(/\s+/).length
    });
  }

  if (chapters.length === 0) {
    const cleaned = cleanText(text);
    if (cleaned.length > 0) {
      chapters.push({
        index: 0,
        title: 'Full Text',
        text: cleaned,
        wordCount: cleaned.split(/\s+/).length
      });
    }
  }

  return chapters;
}

/**
 * Whitespace normalization only — never alters prose characters:
 * - collapses spaces/tabs within a line
 * - collapses 3+ newlines to a paragraph break
 * - trims outer whitespace
 */
function cleanText(text) {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = { parsePdf, getPdfIntegrity };