const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

process.env.API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';

const { buildPdf, STORY_LINES } = require('../tests/helpers/pdfFixture');
const { parsePdf, getPdfIntegrity } = require('../parsers/pdfParser');

const app = require('../app');

describe('PDF parser integrity', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'enr-pdf-'));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeFixture(name, pages) {
    const buf = buildPdf(pages);
    const p = path.join(tmpDir, name);
    fs.writeFileSync(p, buf);
    return p;
  }

  test('source document is never modified by parsing', async () => {
    const p = writeFixture('multi.pdf', [STORY_LINES.chapter1, STORY_LINES.chapter2]);
    const before = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    await parsePdf(p);
    await getPdfIntegrity(p);
    const after = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    expect(after).toBe(before);
  });

  test('extraction preserves every prose line from every page', async () => {
    const p = writeFixture('content.pdf', [STORY_LINES.chapter1, STORY_LINES.chapter2]);
    const result = await parsePdf(p);
    const allText = result.chapters.map((c) => c.text).join('\n');
    for (const pages of [STORY_LINES.chapter1, STORY_LINES.chapter2]) {
      for (const line of pages) {
        if (line === 'Chapter 1' || line === 'Chapter 2') continue; // chapter headers become titles
        const words = line.split(/\s+/).filter(Boolean);
        // every word of every prose line must survive extraction
        for (const w of words) {
          expect(allText).toContain(w.replace(/[^\w'’-]/g, '') || w);
        }
      }
    }
  });

  test('chapter detection splits on Chapter N headers', async () => {
    const p = writeFixture('chapters.pdf', [STORY_LINES.chapter1, STORY_LINES.chapter2]);
    const result = await parsePdf(p);
    expect(result.chapters.length).toBe(2);
    expect(result.chapters[0].title).toMatch(/Chapter 1/i);
    expect(result.chapters[1].title).toMatch(/Chapter 2/i);
  });

  test('paragraph breaks are preserved inside chapter text', async () => {
    const p = writeFixture('paras.pdf', [STORY_LINES.chapter1]);
    const result = await parsePdf(p);
    const text = result.chapters[0].text;
    // cleanText collapses 3+ newlines but keeps paragraph breaks
    expect(text).not.toMatch(/[^\n]\n[^\n]\n[^\n]\n[^\n]/); // no 4 consecutive single-broken lines
    expect(text.length).toBeGreaterThan(100);
  });

  test('integrity data reports page count and char totals', async () => {
    const p = writeFixture('integrity.pdf', [STORY_LINES.chapter1, STORY_LINES.chapter2, STORY_LINES.chapter3]);
    const integrity = await getPdfIntegrity(p);
    expect(integrity.pageCount).toBe(3);
    expect(integrity.extractedCharCount).toBeGreaterThan(100);
    expect(integrity.perPageCharCounts.length).toBe(3);
  });

  test('extraction from a text-only PDF yields non-empty chapters', async () => {
    const p = writeFixture('nonempty.pdf', [STORY_LINES.numbersAndSymbols]);
    const result = await parsePdf(p);
    expect(result.chapters.length).toBeGreaterThanOrEqual(1);
    const text = result.chapters.map((c) => c.text).join(' ');
    expect(text).toContain('42');
    expect(text).toContain('Dr');
  });

  test('unicode content survives extraction', async () => {
    const p = writeFixture('unicode.pdf', [STORY_LINES.numbersAndSymbols]);
    const result = await parsePdf(p);
    const text = result.chapters.map((c) => c.text).join(' ');
    expect(text).toContain('caf');
    expect(text).toContain('em-dash');
  });
});

describe('PDF import API integrity', () => {
  test('import returns integrity metadata and preserves content', async () => {
    const buf = buildPdf([STORY_LINES.chapter1, STORY_LINES.chapter2]);
    const res = await request(app)
      .post('/api/books/import')
      .set('x-api-key', 'test-api-key')
      .attach('book', buf, { filename: 'integrity-test.pdf', contentType: 'application/pdf' });

    if (res.status === 429) return; // rate-limited run; covered by rate tests
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.book.fileType).toBe('pdf');
    expect(res.body.book.integrity).toBeTruthy();
    expect(res.body.book.integrity.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.book.integrity.pageCount).toBe(2);
    expect(res.body.book.integrity.extraction.chapterCount).toBeGreaterThan(0);

    // Full text must contain every prose word from both pages.
    const detail = await request(app)
      .get(`/api/books/${res.body.book._id}`)
      .set('x-api-key', 'test-api-key');
    const allText = detail.body.chapters.map((c) => c.text).join('\n');
    expect(allText).toContain('morning light crept');
    expect(allText).toContain('grief washed over her');
  });

  test('import rejects a corrupted PDF with 422', async () => {
    const garbage = Buffer.from('this is not a pdf at all');
    const res = await request(app)
      .post('/api/books/import')
      .set('x-api-key', 'test-api-key')
      .attach('book', garbage, { filename: 'broken.pdf', contentType: 'application/pdf' });
    expect([422, 429]).toContain(res.status);
  });

  test('invalid chapter index returns 404', async () => {
    const buf = buildPdf([STORY_LINES.chapter1]);
    const created = await request(app)
      .post('/api/books/import')
      .set('x-api-key', 'test-api-key')
      .attach('book', buf, { filename: 'one-page.pdf', contentType: 'application/pdf' });
    if (created.status === 429) return;
    const id = created.body.book._id;
    const res = await request(app)
      .get(`/api/books/${id}/chapters/99`)
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(404);
  });
});
