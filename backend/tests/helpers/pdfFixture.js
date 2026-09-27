/**
 * Generates minimal valid single/multi-page PDF fixtures for tests.
 * Text is drawn with a standard font, using synthetic (non-copyrighted)
 * sentences authored for this project.
 */

function escapePdfText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function makeTextPage(lines) {
  const contentParts = ['BT /F1 12 Tf 50 750 Td 14 TL'];
  for (const line of lines) {
    contentParts.push(`(${escapePdfText(line)}) Tj T*`);
  }
  contentParts.push('ET');
  return contentParts.join('\n');
}

function buildPdf(pages, { title, author } = {}) {
  const objects = [];
  // 0: catalog (added below), pages tree, page objects, content streams, font
  const pageObjectStart = 3; // 1: catalog, 2: pages tree, 3+: pages

  const pageObjects = pages.map((lines, i) => {
    const contentObjNum = pageObjectStart + pages.length + i;
    return {
      num: pageObjectStart + i,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 ${pageObjectStart + pages.length * 2} 0 R >> >> >>`,
    };
  });

  const contentObjects = pages.map((lines, i) => {
    const stream = makeTextPage(lines);
    return {
      num: pageObjectStart + pages.length + i,
      body: `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    };
  });

  const fontObjNum = pageObjectStart + pages.length * 2;
  // Optional /Info dictionary so tests can exercise metadata extraction.
  const infoParts = [];
  if (title) infoParts.push(`/Title (${escapePdfText(title)})`);
  if (author) infoParts.push(`/Author (${escapePdfText(author)})`);
  const infoObjNum = infoParts.length ? fontObjNum + 1 : null;
  objects.push({ num: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' });
  objects.push({
    num: 2,
    body: `<< /Type /Pages /Kids [${pageObjects.map((p) => `${p.num} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  });
  objects.push(...pageObjects, ...contentObjects);
  objects.push({ num: fontObjNum, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' });
  if (infoObjNum) {
    objects.push({ num: infoObjNum, body: `<< ${infoParts.join(' ')} >>` });
  }

  const maxNum = infoObjNum || fontObjNum;
  let out = '%PDF-1.4\n';
  // xref offsets must point at the start of "N 0 obj" lines in BYTE units.
  const offsets = new Array(maxNum + 1).fill(0);
  for (const obj of objects) {
    offsets[obj.num] = Buffer.byteLength(out, 'latin1');
    out += `${obj.num} 0 obj\n${obj.body}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${maxNum + 1}\n`;
  out += '0000000000 65535 f \n';
  for (let i = 1; i <= maxNum; i++) {
    out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  const trailerDict = infoObjNum
    ? `<< /Size ${maxNum + 1} /Root 1 0 R /Info ${infoObjNum} 0 R >>`
    : `<< /Size ${maxNum + 1} /Root 1 0 R >>`;
  out += `trailer\n${trailerDict}\nstartxref\n${xrefStart}\n%%EOF\n`;
  // Everything so far is ASCII/latin1-safe; produce a byte-exact buffer.
  return Buffer.from(out, 'latin1');
}

// Synthetic test content (authored for this project — no copyrighted text).
const STORY_LINES = {
  chapter1: [
    'Chapter 1',
    'The morning light crept through the shutters.',
    'She smiled and laughed at the sight of the blooming garden.',
    'What a wonderful day to be alive, she thought.',
    'Everything felt bright and hopeful and full of joy.',
  ],
  chapter2: [
    'Chapter 2',
    'The letter arrived at dusk, later than anyone expected.',
    'He read it twice, and his hands began to tremble with dread.',
    'Tears filled her eyes as the grief washed over her entirely.',
    'The house felt empty and cold without him, impossibly silent now.',
    'She wandered the empty halls remembering better days long past.',
    'Nothing could have prepared her for a loss quite like this one.',
  ],
  chapter3: [
    'Chapter 3',
    '"Get out!" he shouted, slamming the door.',
    'Her fury burned hotter than any forge.',
    'The rage in his voice frightened the children.',
    'How dare you speak to me that way, she yelled.',
  ],
  dialogue: [
    'Chapter 4',
    '"Where are we going?" Anna asked.',
    '"Somewhere safe," he whispered.',
    '"I am afraid of the dark," she said.',
    '"Do not worry. I am here."',
  ],
  numbersAndSymbols: [
    'Chapter 5',
    'It cost $12.50 in 1999, exactly 50% more.',
    'Dr. Smith and Mrs. Jones met at 3 p.m. on Feb. 5.',
    'The code was 42-A-9; the answer, of course, was 42.',
    'Special characters: caf\u00E9 na\u00EFve \u2014 em-dash \u201Cquotes\u201D',
  ],
  pageArtifacts: [
    'Chapter 6',
    '12',
    'The story continues here with real content.',
    'This line is long enough to be counted as narrative.',
    '13',
    'More story content follows on this page as well.',
  ],
};

module.exports = { buildPdf, STORY_LINES };
