/**
 * End-to-end API journey: mirrors a real user flow through the backend.
 *
 * 1. Health check
 * 2. Import a book (synthetic multi-chapter novel)
 * 3. Browse library
 * 4. Open book + read a chapter (sentences with emotion metadata)
 * 5. Save + reload reading progress (resume position)
 * 6. Bookmarks
 * 7. Narration voice parameters per emotion (backend contract)
 * 8. Invalid PDF rejected cleanly (no crash, no residue)
 * 9. Auth enforcement + rate limits on the journey paths
 * 10. PDF integrity metadata recorded on import
 *
 * Runs against the in-process app with isolated DATA_DIR (see jest globalSetup)
 * so it never touches real data.
 */
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const os = require('os');

process.env.API_KEY = 'e2e-test-api-key';
process.env.NODE_ENV = 'test';

const { buildPdf } = require('../tests/helpers/pdfFixture');
const { resetAllLimiters } = require('../middleware/rateLimiter');

const app = require('../app');

// pdf.js's text layer normalizes straight apostrophes/quotes to typographic
// ones (e.g. ' -> U+2019) during extraction. This is a known, uniform,
// lossless-equivalent mapping (not an app-side rewrite), so containment
// checks compare against a normalized form of both sides.
function normalizeForComparison(s) {
  return s
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ');
}

// Synthetic novel used for the journey. Chapters are deliberately longer than
// the chapter detector's minimum so each becomes its own chapter.
const NOVEL = {
  title: 'The E2E Journey Novel',
  pages: [
    [
      'Chapter 1 — The Quiet Garden',
      'Mara walked slowly through the quiet garden outside her grandmother\'s house.',
      'The morning air felt calm and soft against her face as she thought about nothing in particular.',
      'A gentle breeze moved through the old oak trees while birds sang somewhere high above the wall.',
      'She sat down on the stone bench and watched the light change across the water of the small pond.',
    ],
    [
      'Chapter 2 — The Broken Letter',
      'Mara read the letter twice and felt her heart sink with sorrow at every line.',
      'Tears filled her eyes as she realized her friend had been gone for many months already.',
      'The sad truth hurt deeply, and she wept quietly for the loss of someone truly dear to her.',
      'Nothing in the garden seemed beautiful anymore; everything felt gray, heavy, and full of grief.',
    ],
    [
      'Chapter 3 — The Telegram',
      'A loud shout from the gate shattered the silence and Mara jumped up in fear.',
      '"Run!" her brother screamed, his voice full of terror and anger as soldiers poured through the trees.',
      'The house burst into chaos; everyone was shouting and panicking while danger came closer and closer.',
      'Her heart pounded with rage and fear at once as she grabbed the telegram and ran into the woods.',
    ],
  ],
};

describe('E2E API journey', () => {
  let tmpDir;
  let bookId;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'enr-e2e-'));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    resetAllLimiters();
  });

  test('step 1: health endpoint responds', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('step 2: import a PDF novel', async () => {
    const buf = buildPdf(NOVEL.pages, { title: NOVEL.title, author: 'E2E Author' });
    const res = await request(app)
      .post('/api/books/import')
      .set('x-api-key', 'e2e-test-api-key')
      .attach('book', buf, { filename: 'journey-novel.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.book.title).toBe(NOVEL.title);

    bookId = res.body.book._id;
    expect(bookId).toMatch(/^book_/);

    // PDF integrity metadata recorded: source hash + extraction counts.
    expect(res.body.book.integrity).toMatchObject({
      pageCount: 3,
      extraction: { chapterCount: 3 },
    });
    expect(res.body.book.integrity.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.book.integrity.sourceSizeBytes).toBe(buf.length);
  }, 30000);

  test('step 3: library lists the imported book', async () => {
    const res = await request(app).get('/api/books').set('x-api-key', 'e2e-test-api-key');
    expect(res.status).toBe(200);
    const imported = res.body.find((b) => b._id === bookId);
    expect(imported).toBeDefined();
    expect(imported.title).toBe(NOVEL.title);
    expect(imported.totalChapters).toBe(3);
  });

  test('step 4: open the book and read chapter sentences with emotion metadata', async () => {
    const res = await request(app).get(`/api/books/${bookId}`).set('x-api-key', 'e2e-test-api-key');
    expect(res.status).toBe(200);

    const book = res.body.book || res.body;
    const chapters = book.chapters || [];
    expect(chapters.length).toBe(3);

    const ch1 = chapters[0];
    const sentenceRes = await request(app)
      .get(`/api/books/${bookId}/chapters/0`)
      .set('x-api-key', 'e2e-test-api-key');
    expect(sentenceRes.status).toBe(200);

    const sentences = sentenceRes.body.sentences;
    expect(Array.isArray(sentences)).toBe(true);
    expect(sentences.length).toBeGreaterThan(3);
    for (const s of sentences) {
      expect(typeof s.text).toBe('string');
      expect(s.text.length).toBeGreaterThan(0);
      expect(typeof s.emotion).toBe('string');
      expect(typeof s.confidence).toBe('number');
    }

    // Extracted text must contain the actual prose (integrity of content).
    const joined = sentences.map((s) => s.text).join(' ');
    expect(joined).toContain('grandmother');
    expect(joined).toContain('stone bench');

    // No generated/AI text injected: every sentence must exist in the source
    // (modulo the documented quote normalization of the extractor).
    const source = normalizeForComparison(NOVEL.pages[0].join('\n'));
    for (const s of sentences) {
      expect(source).toContain(normalizeForComparison(s.text.trim()));
    }
  }, 30000);

  test('step 5: emotion differs across chapters (neutral vs sad vs anger/fear)', async () => {
    const emotionsByChapter = [];
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .get(`/api/books/${bookId}/chapters/${i}`)
        .set('x-api-key', 'e2e-test-api-key');
      const nonNeutral = res.body.sentences.filter((s) => s.emotion !== 'neutral').map((s) => s.emotion);
      emotionsByChapter.push(nonNeutral);
    }
    // Calm chapter is legitimately neutral (calm == default delivery).
    expect(emotionsByChapter[0].join(',')).not.toMatch(/sadness|anger|fear/);
    expect(emotionsByChapter[1].join(',')).toMatch(/sadness/);
    expect(emotionsByChapter[2].join(',')).toMatch(/anger|fear/);
  }, 30000);

  test('step 6: save progress, then resume from saved position', async () => {
    const save = await request(app)
      .post(`/api/progress/${bookId}`)
      .set('x-api-key', 'e2e-test-api-key')
      .send({ currentChapterIndex: 1, currentSentenceIndex: 2, completionPercent: 42.5 });
    expect(save.status).toBe(200);
    expect(save.body.success).toBe(true);

    // Fresh app open = new process reads the same store; simulate by re-get.
    const loaded = await request(app).get(`/api/progress/${bookId}`).set('x-api-key', 'e2e-test-api-key');
    expect(loaded.status).toBe(200);
    expect(loaded.body.currentChapterIndex).toBe(1);
    expect(loaded.body.currentSentenceIndex).toBe(2);
    expect(loaded.body.completionPercent).toBeCloseTo(42.5);
  });

  test('step 7: bookmark a sentence and list bookmarks', async () => {
    const created = await request(app)
      .post(`/api/progress/${bookId}/bookmarks`)
      .set('x-api-key', 'e2e-test-api-key')
      .send({ chapterIndex: 2, sentenceIndex: 1, note: 'the telegram scene' });
    expect(created.status).toBe(200);
    expect(created.body.success).toBe(true);

    const list = await request(app)
      .get(`/api/progress/${bookId}/bookmarks`)
      .set('x-api-key', 'e2e-test-api-key');
    expect(list.status).toBe(200);
    const mine = list.body.filter((b) => b.bookId === bookId);
    expect(mine.length).toBeGreaterThanOrEqual(1);
    expect(mine.some((b) => b.note === 'the telegram scene')).toBe(true);
  });

  test('step 8: narration voice params adapt to emotion (backend contract)', async () => {
    const sad = await request(app)
      .post('/api/tts/voice-params')
      .set('x-api-key', 'e2e-test-api-key')
      .send({ emotion: 'sadness', userDefaults: { defaultSpeed: 1.0, defaultPitch: 1.0 } });
    expect(sad.status).toBe(200);

    const excited = await request(app)
      .post('/api/tts/voice-params')
      .set('x-api-key', 'e2e-test-api-key')
      .send({ emotion: 'joy', userDefaults: { defaultSpeed: 1.0, defaultPitch: 1.0 } });

    expect(sad.body.speed).toBeLessThan(excited.body.speed);
    expect(sad.body.pitch).toBeLessThanOrEqual(excited.body.pitch);
    expect(sad.body.pauseAfterMs).toBeGreaterThanOrEqual(excited.body.pauseAfterMs);
  });

  test('step 9: invalid PDF is rejected cleanly with 422', async () => {
    const before = fs.readdirSync(process.env.UPLOAD_DIR).length;
    const res = await request(app)
      .post('/api/books/import')
      .set('x-api-key', 'e2e-test-api-key')
      .attach('book', Buffer.from('this is not a pdf at all'), {
        filename: 'corrupt.pdf',
        contentType: 'application/pdf',
      });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/parse/i);

    // No leftover file in uploads after failure.
    const after = fs.readdirSync(process.env.UPLOAD_DIR).length;
    expect(after).toBe(before);
  });

  test('step 10: unauthenticated request is rejected with 401', async () => {
    const res = await request(app).get('/api/books');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  test('step 11: rate limiter engages on import flood', async () => {
    let saw429 = false;
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post('/api/books/import')
        .set('x-api-key', 'e2e-test-api-key')
        .attach('book', Buffer.from(`Chapter 1\nFlood import ${i} content line here.`), 'flood.txt');
      if (res.status === 429) {
        saw429 = true;
        break;
      }
    }
    expect(saw429).toBe(true);
  }, 60000);

  test('step 12: unknown API route returns JSON 404', async () => {
    const res = await request(app).get('/api/definitely-not-a-route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});
