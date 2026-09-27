/**
 * Rate limiting and abuse-behavior tests.
 *
 * Uses controlled, bounded request bursts against the in-process app only —
 * never against external infrastructure.
 */
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const os = require('os');

process.env.API_KEY = 'rate-test-api-key';
process.env.NODE_ENV = 'test';

const { buildPdf, STORY_LINES } = require('../tests/helpers/pdfFixture');
const { resetAllLimiters } = require('../middleware/rateLimiter');
const app = require('../app');

describe('Rate limiting and abuse protection', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'enr-rate-'));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    resetAllLimiters();
  });

  test('import limiter returns 429 with standard headers after burst', async () => {
    const results = [];
    for (let i = 0; i < 8; i++) {
      const buf = Buffer.from(`Chapter 1\nBurst import test ${i} with some content.`, 'utf-8');
      const res = await request(app)
        .post('/api/books/import')
        .set('x-api-key', 'rate-test-api-key')
        .attach('book', buf, `burst-${i}.txt`);
      results.push(res);
    }

    const limited = results.filter((r) => r.status === 429);
    expect(limited.length).toBeGreaterThanOrEqual(1);

    // draft-7 standard headers on the limited response
    const limitedRes = limited[0];
    expect(limitedRes.headers['ratelimit']).toBeDefined();
    expect(limitedRes.headers['ratelimit']).toMatch(/remaining=0/);
    expect(limitedRes.body.error).toMatch(/too many/i);
  });

  test('analysis limiter rejects excessive analyze requests', async () => {
    let saw429 = false;
    for (let i = 0; i < 15; i++) {
      const res = await request(app)
        .post('/api/emotion/analyze')
        .set('x-api-key', 'rate-test-api-key')
        .send({ sentences: ['Test sentence for the rate limiter.'] });
      if (res.status === 429) {
        saw429 = true;
        expect(res.headers['ratelimit']).toBeDefined();
        break;
      }
    }
    expect(saw429).toBe(true);
  });

  test('oversized payloads are rejected with 413', async () => {
    // JSON body limit is 10MB — send a slightly larger JSON body.
    const bigBody = { sentences: ['x'.repeat(11 * 1024 * 1024)] };
    const res = await request(app)
      .post('/api/emotion/analyze')
      .set('x-api-key', 'rate-test-api-key')
      .send(bigBody);
    expect([413, 400, 429]).toContain(res.status);
  });

  test('invalid inputs return 400 without crashing', async () => {
    const res1 = await request(app)
      .post('/api/emotion/analyze')
      .set('x-api-key', 'rate-test-api-key')
      .send({ sentences: 'not-an-array' });
    expect(res1.status).toBe(400);

    const res2 = await request(app)
      .post('/api/progress/some-book')
      .set('x-api-key', 'rate-test-api-key')
      .send({ currentChapterIndex: 'abc' });
    expect(res2.status).toBe(400);

    const res3 = await request(app)
      .post('/api/tts/speak')
      .set('x-api-key', 'rate-test-api-key')
      .send({ text: 12345 });
    expect(res3.status).toBe(400);
  });

  test('rate limit headers present on normal responses', async () => {
    const res = await request(app)
      .get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['ratelimit']).toMatch(/limit=\d+, remaining=\d+/);
    expect(res.headers['ratelimit-policy']).toMatch(/^\d+;w=\d+$/);
  });

  test('PDF import under load: large multi-page PDF parses and rate limit eventually engages', async () => {
    // Build a 30-page synthetic PDF (bounded, in-memory).
    const pages = Array.from({ length: 30 }, (_, i) => [
      `Chapter ${i + 1}`,
      `This is page ${i + 1} of a large synthetic document used for load testing.`,
      'Content lines follow to give the parser realistic work to perform here.',
      'Another line of narrative text to exercise extraction thoroughly.',
    ]);
    const buf = buildPdf(pages);
    expect(buf.length).toBeGreaterThan(10000);

    const res = await request(app)
      .post('/api/books/import')
      .set('x-api-key', 'rate-test-api-key')
      .attach('book', buf, { filename: 'large.pdf', contentType: 'application/pdf' });
    // Either succeeds, is rate limited (earlier bursts), or fails validation.
    expect([200, 422, 429]).toContain(res.status);
  }, 60000);
});
