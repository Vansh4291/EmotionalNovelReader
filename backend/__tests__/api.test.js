const request = require('supertest');
const path = require('path');
const fs = require('fs');

process.env.API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';

const app = require('../app');

describe('Health Check', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('memory');
    expect(res.body).toHaveProperty('env');
  });
});

describe('Authentication', () => {
  test('returns 401 without API key', async () => {
    const res = await request(app).get('/api/books');
    expect(res.status).toBe(401);
  });

  test('returns 401 with wrong API key', async () => {
    const res = await request(app)
      .get('/api/books')
      .set('x-api-key', 'wrong-key');
    expect(res.status).toBe(401);
  });

  test('accepts valid API key', async () => {
    const res = await request(app)
      .get('/api/books')
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
  });
});

describe('Emotion Analysis', () => {
  test('POST /api/emotion/analyze analyzes sentences', async () => {
    const res = await request(app)
      .post('/api/emotion/analyze')
      .set('x-api-key', 'test-api-key')
      .send({ sentences: ['I am very happy and joyful!'] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results[0].emotion).toBe('joy');
  });

  test('returns 400 for missing sentences', async () => {
    const res = await request(app)
      .post('/api/emotion/analyze')
      .set('x-api-key', 'test-api-key')
      .send({});
    expect(res.status).toBe(400);
  });

  test('returns 400 for too many sentences', async () => {
    const sentences = new Array(5001).fill('test.');
    const res = await request(app)
      .post('/api/emotion/analyze')
      .set('x-api-key', 'test-api-key')
      .send({ sentences });
    expect(res.status).toBe(400);
  });

  test('GET /api/emotion/status returns status', async () => {
    const res = await request(app)
      .get('/api/emotion/status/test123')
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('isAnalyzed');
  });
});

describe('Progress', () => {
  test('GET /api/progress/:bookId returns progress', async () => {
    const res = await request(app)
      .get('/api/progress/test-book')
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.body.bookId).toBe('test-book');
    expect(res.body).toHaveProperty('currentChapterIndex');
    expect(res.body).toHaveProperty('completionPercent');
  });

  test('POST /api/progress/:bookId updates progress', async () => {
    const res = await request(app)
      .post('/api/progress/test-book')
      .set('x-api-key', 'test-api-key')
      .send({ currentChapterIndex: 1, completionPercent: 0.5 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.progress.currentChapterIndex).toBe(1);
    expect(res.body.progress.completionPercent).toBe(0.5);
  });

  test('POST rejects invalid chapterIndex', async () => {
    const res = await request(app)
      .post('/api/progress/test-book')
      .set('x-api-key', 'test-api-key')
      .send({ currentChapterIndex: -1 });
    expect(res.status).toBe(400);
  });
});

describe('Bookmarks', () => {
  test('GET /api/progress/:bookId/bookmarks returns list', async () => {
    const res = await request(app)
      .get('/api/progress/test-book/bookmarks')
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/progress/:bookId/bookmarks creates bookmark', async () => {
    const res = await request(app)
      .post('/api/progress/test-book/bookmarks')
      .set('x-api-key', 'test-api-key')
      .send({ chapterIndex: 0, note: 'test bookmark' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.bookmark).toHaveProperty('_id');
    expect(res.body.bookmark.chapterIndex).toBe(0);
    expect(res.body.bookmark.note).toBe('test bookmark');
  });

  test('POST rejects invalid chapterIndex', async () => {
    const res = await request(app)
      .post('/api/progress/test-book/bookmarks')
      .set('x-api-key', 'test-api-key')
      .send({ chapterIndex: -1 });
    expect(res.status).toBe(400);
  });
});

describe('Books', () => {
  const testFilePath = path.join(__dirname, '..', 'uploads', 'test-book.txt');

  beforeAll(() => {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    fs.writeFileSync(testFilePath, 'Chapter 1\nThis is the first sentence. This is the second sentence.\n\nChapter 2\nThe second chapter begins here.', 'utf-8');
  });

  afterAll(() => {
    try { fs.unlinkSync(testFilePath); } catch (e) { }
  });

  test('POST /api/books/import imports a text file', async () => {
    const res = await request(app)
      .post('/api/books/import')
      .set('x-api-key', 'test-api-key')
      .attach('book', testFilePath);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.book).toHaveProperty('_id');
    expect(res.body.book).toHaveProperty('title');
    expect(res.body.book).toHaveProperty('totalChapters');
    expect(res.body.book.fileType).toBe('txt');
  });

  test('GET /api/books returns book list', async () => {
    const res = await request(app)
      .get('/api/books')
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/books/:id returns 404 for unknown book', async () => {
    const res = await request(app)
      .get('/api/books/nonexistent')
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(404);
  });

  test('GET /api/books/:id/chapters returns chapters list', async () => {
    const res = await request(app)
      .get('/api/books/nonexistent/chapters')
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(404);
  });

  test('POST /api/books/import returns 400 without file', async () => {
    const res = await request(app)
      .post('/api/books/import')
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(400);
  });
});

describe('TTS Routes', () => {
  test('POST /api/tts/speak returns voice params', async () => {
    const res = await request(app)
      .post('/api/tts/speak')
      .set('x-api-key', 'test-api-key')
      .send({ text: 'Hello world', emotion: 'joy' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.emotion).toBe('joy');
    expect(res.body).toHaveProperty('voiceParams');
    expect(res.body).toHaveProperty('profile');
  });

  test('POST /api/tts/speak returns 400 without text', async () => {
    const res = await request(app)
      .post('/api/tts/speak')
      .set('x-api-key', 'test-api-key')
      .send({});
    expect(res.status).toBe(400);
  });

  test('POST /api/tts/speak rejects text over 10000 chars', async () => {
    const res = await request(app)
      .post('/api/tts/speak')
      .set('x-api-key', 'test-api-key')
      .send({ text: 'x'.repeat(10001) });
    expect(res.status).toBe(400);
  });

  test('GET /api/tts/voices returns voice list', async () => {
    const res = await request(app)
      .get('/api/tts/voices')
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.availableVoices)).toBe(true);
  });

  test('GET /api/tts/profiles returns emotion profiles', async () => {
    const res = await request(app)
      .get('/api/tts/profiles')
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profiles).toHaveProperty('joy');
    expect(res.body.profiles).toHaveProperty('sadness');
  });

  test('POST /api/tts/voice-params returns params', async () => {
    const res = await request(app)
      .post('/api/tts/voice-params')
      .set('x-api-key', 'test-api-key')
      .send({ emotion: 'anger' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/tts/pause returns success', async () => {
    const res = await request(app)
      .post('/api/tts/pause')
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/tts/resume returns success', async () => {
    const res = await request(app)
      .post('/api/tts/resume')
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/tts/stop returns success', async () => {
    const res = await request(app)
      .post('/api/tts/stop')
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Bookmark Deletion', () => {
  let createdBookmarkId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/progress/test-book/bookmarks')
      .set('x-api-key', 'test-api-key')
      .send({ chapterIndex: 1, note: 'to-delete' });
    createdBookmarkId = res.body.bookmark._id;
  });

  test('DELETE /api/progress/bookmarks/:id deletes bookmark', async () => {
    const res = await request(app)
      .delete(`/api/progress/bookmarks/${createdBookmarkId}`)
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE returns 404 for unknown bookmark', async () => {
    const res = await request(app)
      .delete('/api/progress/bookmarks/nonexistent')
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(404);
  });
});

describe('Full Book Flow', () => {
  let importedBookId;

  test('import book and get its id', async () => {
    const res = await request(app)
      .post('/api/books/import')
      .set('x-api-key', 'test-api-key')
      .attach('book', Buffer.from('Chapter 1\nTest content here. More sentences.', 'utf-8'), 'flow-test.txt');
    expect(res.status).toBe(200);
    importedBookId = res.body.book._id;
    expect(importedBookId).toBeDefined();
  });

  test('get imported book details', async () => {
    const res = await request(app)
      .get(`/api/books/${importedBookId}`)
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(importedBookId);
  });

  test('get chapters of imported book', async () => {
    const res = await request(app)
      .get(`/api/books/${importedBookId}/chapters`)
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('analyze chapter emotions', async () => {
    const chaptersRes = await request(app)
      .get(`/api/books/${importedBookId}/chapters`)
      .set('x-api-key', 'test-api-key');
    const res = await request(app)
      .post('/api/emotion/analyze')
      .set('x-api-key', 'test-api-key')
      .send({ sentences: ['I am happy and joyful!', 'This is a sad moment.'], chapterId: importedBookId });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results).toHaveLength(2);
  });

  test('emotion status after analysis', async () => {
    const res = await request(app)
      .get(`/api/emotion/status/${importedBookId}`)
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('isAnalyzed');
  });

  test('delete imported book', async () => {
    const res = await request(app)
      .delete(`/api/books/${importedBookId}`)
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('book is gone after deletion', async () => {
    const res = await request(app)
      .get(`/api/books/${importedBookId}`)
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(404);
  });
});

describe('Error Handling', () => {
  test('rejects unsupported file type', async () => {
    const res = await request(app)
      .post('/api/books/import')
      .set('x-api-key', 'test-api-key')
      .attach('book', Buffer.from('test'), 'test.exe');
    expect([400, 429]).toContain(res.status);
  });

  test('analysis full queue returns 503', async () => {
    const manySentences = new Array(5000).fill('Test sentence for analysis.');
    const res = await request(app)
      .post('/api/emotion/analyze')
      .set('x-api-key', 'test-api-key')
      .send({ sentences: manySentences });
    expect([200, 400, 503]).toContain(res.status);
  });
});

describe('Rate Limiting', () => {
  test('import limiter rejects excessive imports', async () => {
    const promises = [];
    for (let i = 0; i < 6; i++) {
      const buf = Buffer.from('Chapter 1\nRate limit test.', 'utf-8');
      promises.push(
        request(app)
          .post('/api/books/import')
          .set('x-api-key', 'test-api-key')
          .attach('book', buf, `rate-test-${i}.txt`)
      );
    }
    const results = await Promise.all(promises);
    const rateLimited = results.some(r => r.status === 429);
    expect(rateLimited).toBe(true);
  });
});

describe('404 Handling', () => {
  test('returns 404 for unknown routes', async () => {
    const res = await request(app)
      .get('/api/nonexistent')
      .set('x-api-key', 'test-api-key');
    expect(res.status).toBe(404);
  });
});
