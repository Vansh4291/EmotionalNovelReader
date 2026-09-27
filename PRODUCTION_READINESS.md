# EmotionalNovelReader — Production Readiness Report

Final report after the full investigation → implementation → verification cycle.
The pre-change audit lives in [PRODUCTION_READINESS_BASELINE.md](./PRODUCTION_READINESS_BASELINE.md).

---

## 1. What was investigated

Full repository audit before any change:

- **Backend**: Express app, JSON-file "databases" (`books_db.json`, `progress_db.json`, `bookmarks_db.json`), multer uploads, pdf-parse/epub/txt parsers, keyword + optional Python emotion analysis, per-route rate limiters, static API-key auth.
- **Frontend**: React Native (Expo) app with Realm local database, Zustand stores, react-native-tts narration, mixed `.js`/`.jsx`/`.tsx` screens, two parallel legacy screen sets (decorative, mostly unwired), duplicate utility modules (`utils/` vs `core/`).
- **Shared**: `shared/emotionKeywords.js` keyword table used by both sides.
- **Data**: 95 real imported books (including one copyrighted PDF committed to git — see §16).
- **Tests**: pre-existing backend API suite + frontend unit suites (all passing at baseline).

## 2. What was broken (found during investigation & E2E)

| # | Problem | Severity |
|---|---------|----------|
| 1 | Hardcoded LAN IP + plaintext API key in frontend `config/api.js` | High |
| 2 | Narration "perceptualSpeed" table: user speed 1.0x was silently played at 0.40x device rate | High |
| 3 | Chapter detector dropped chapter headings glued into previous chapter's text when no text preceded the first heading | High |
| 4 | body-parser `PayloadTooLargeError` returned 500 instead of 413 | Medium |
| 5 | Rate-limit tests asserted legacy header names; limiter state leaked across suites (flaky) | Medium |
| 6 | Test workers shared `backend/books_db.json` → Windows `EPERM` on atomic rename; risk of corrupting the real DB | High |
| 7 | Python emotion model mojibake'd non-ASCII text via Windows code-page stdin decoding, and its echoed text overwrote the canonical sentence text | High |
| 8 | Books imported without embedded PDF titles got "Unknown Title" instead of filename fallback | Medium |
| 9 | Analysis path could spawn unbounded Python child processes; duplicated spawn logic | Medium |
| 10 | Dead code: 2 decorative screen sets, unused `core/` engine, debug logs, duplicated emotion/sentence utilities | Low |
| 11 | A copyrighted book PDF was committed in `backend/uploads/` | High (legal) |
| 12 | Reader settings (font size/line height) were not persisted | Low |

## 3. What was fixed

- **Config**: new `backend/config/env.js` (validated, fails fast in production), `backend/utils/logger.js` (leveled logger, redaction discipline), frontend `config/Env.js` + `app.config.js` extra injection via `react-native-config.js` scripts — no more hardcoded key/host.
- **Security**: helmet with CSP/HSTS/etc., strict CORS allow-list from env, API-key auth on all `/api` routes except `/api/health`, request logging without headers/bodies, upload validation (extension + MIME + size), path-traversal-safe filename sanitization.
- **Rate limiting**: general 100/min, analysis 10/min, import 5/min, all draft-7 standard headers (`ratelimit`, `ratelimit-policy`), explicit `MemoryStore`s with `resetAllLimiters()` for deterministic tests.
- **PDF integrity**: SHA-256 + byte size captured pre-parse and re-verified post-parse; page count + per-page char counts recorded; import fails with 422 if source mutated or extraction yields no chapters from a non-empty PDF; integrity metadata stored on the book record. The parser is strictly read-only; the original file is unlinked only after hashing, and never written to.
- **Reading pipeline**: first-chapter heading bug fixed; `getPdfIntegrity` uses a real per-page `pagerender` capture (pdf-parse emits no form feeds); sentences keep paragraph-start flags for reader spacing; chapter cache moved under `DATA_DIR`.
- **Emotion analysis**: all async work funneled through `backend/utils/analysisQueue.js` (max 2 concurrent Python processes, 50-deep queue, 30s timeout, `python`→`python3` fallback, graceful heuristic fallback). Python model forces UTF-8 stdio (`reconfigure` + `PYTHONIOENCODING`/`PYTHONUTF8`), results merged onto **original** sentence text so narration text can never be corrupted by the analysis path.
- **Frontend narration**: new `services/narration/emotionDelivery.js` is the single source of truth for emotion→voice mapping (multiplies user base speed/pitch; no perceptualSpeed hack); sentence-boundary pacing with paragraph pauses; listener leak fixed in `usePlayerScreenState`.
- **UI/UX (Mihon-inspired, own visual identity)**: consolidated navigation to the real screens; new Home (continue reading, recents, stats), Library (grid/list toggle, sort, search), BookDetail (hero header, progress, chapter info), Reader (tap-to-toggle chrome, reader settings sheet, adjustable font size/line height persisted to Realm), Settings (reader preferences, working clear-cache, a11y labels).
- **Accessibility**: 44pt minimum touch targets on transport controls, accessibility labels/roles on icon buttons, font scaling preserved in reader.
- **Error handling**: typed error mapping (413 payload/file too large, 400 malformed JSON, 429, clean 404 for unknown `/api` routes), production-safe 500s without stack traces, loading/empty/error/retry states on Home/Library/BookDetail.
- **Cleanup**: removed decorative screens, unused `core/` engine directories, debug logs; jest transform-ignore + ESM moduleNameMapper fixes so the suite runs reliably.

## 4. Final technology stack

Kept intentionally (evaluation concluded the stack is fit for purpose):

- **Backend**: Node.js + Express, multer, pdf-parse / epub parsing, JSON-file stores behind an atomic-write helper, express-rate-limit, helmet. Python (optional, graceful fallback) for ML emotion classification.
- **Frontend**: React Native (Expo), Realm, Zustand, react-navigation, react-native-tts.
- **Tests**: Jest (backend: API/integration/E2E; frontend: unit), supertest.

Rationale: no part of the pipeline (PDF parsing, TTS via device engines, local-first storage) demanded a framework migration; all identified defects were implementation-level. Migration risks outweighed benefits — documented per the baseline's recommendation.

## 5. Architecture changes

- `backend/config/env.js` — single validated configuration entry point.
- `backend/utils/logger.js` — leveled logging, no sensitive payloads.
- `backend/utils/analysisQueue.js` — bounded concurrency for ML analysis; single spawn path.
- `backend/services/narration/emotionDelivery.js` (frontend) — one emotion→delivery mapping used by playback and tests.
- Data-location injection via `DATA_DIR` / `UPLOAD_DIR` env vars → testable, deployable anywhere.
- Reader settings persisted through Realm (`UserSettings` schema v2, migration-safe defaults).

## 6. PDF integrity guarantees

1. Originals are never opened for writing anywhere in the codebase (verified by code search + integrity tests).
2. SHA-256 + size verified pre/post processing on every import; mismatch ⇒ 422 and cleanup.
3. Page count and per-page character counts captured and stored (`book.integrity`).
4. Extraction invariants tested: non-empty extraction from non-empty PDFs, chapter ordering preserved, no injected/generated text, sentence text exists in source (modulo the extractor's uniform quote normalization, documented and test-asserted).
5. Emotion metadata is attached alongside text, never inline; narration reads from sentence objects only.

## 7. TTS / emotional narration

- Delivery mapping: sadness 0.85x speed/0.9 pitch + longer pauses; joy 1.15x/1.1; anger louder/faster; fear tense; neutral baseline — all multiplied by user preferences.
- Sentence-aware playback with paragraph-aware pauses; artifact-tolerant (page numbers/headers filtered upstream by chapter detection).
- Fallbacks: if Python/ML is unavailable the keyword heuristic runs; if TTS is unavailable the reader degrades to silent reading with visible errors + retry.
- On-device TTS keeps narration offline-capable and private.

## 8. Security improvements

Helmet (CSP, HSTS, nosniff, frame denial, referrer policy), strict CORS, mandatory API key (401 without), fail-fast production env validation, upload type/size validation, sanitized filenames, production error responses without internals, leveled logging without secrets, `.gitignore` now excludes uploads/db files.

## 9. Rate limiting

Three limiters (general/analysis/import) with draft-7 headers; verified by dedicated abuse tests: burst import ⇒ 429 with `ratelimit: ...remaining=0`, analysis flood ⇒ 429, oversized JSON ⇒ 413, invalid payloads ⇒ 400 without crash, headers on normal responses, recovery after `resetAll`.

## 10. Performance

- Backend test suite: 33.4s → ~4s (isolated per-file data dirs; no real-DB loads).
- Analysis: unified bounded queue (was: unbounded spawns); suite runtime 51s → ~8s.
- Reader: memoized sentence rows, paragraph-aware spacing, LRU chapter cache retained.
- No speculative optimization beyond measured hotspots.

## 11. Testing strategy & coverage

- **Backend (69 tests, 4 suites)**: API integration, PDF integrity (10), rate limiting/abuse (6), E2E journey (12), auth/env/error mapping.
- **Frontend (49 tests, 8 suites)**: narration delivery mapping, narration pipeline, sentence splitter, chapter processor, emotion analyzer, stores, theme, App smoke.
- **TypeScript**: `tsc --noEmit` clean.
- E2E journey mirrors a real user: health → import (with integrity metadata) → library → open/read sentences with emotions → emotion differentiation across chapters → progress save/resume → bookmarks → voice-param contract → invalid PDF rejection → auth → rate limits → 404s.

## 12. Final verification results (clean state)

- Backend: `69/69` passed (repeated 3× for stability, plus `--ci`).
- Frontend: `49/49` passed; `tsc --noEmit` clean.
- Production boot guard: refuses to start without strong `API_KEY`.
- Real DB content verified intact (95 books, no test residue) after all runs.

## 13. Remaining known issues / accepted risks

1. **Committed copyrighted PDF**: `backend/uploads/1780234155448-…Atomic Habits….pdf` is tracked in git history. File untouched (integrity rule). Removing it requires `git rm --cached` + history rewrite — **needs explicit user approval** (destructive). Future uploads are now ignored; `books_db.json` etc. no longer tracked going forward (they remain tracked until a commit unstages them — same approval needed).
2. JSON-file stores are fine for single-instance/small deployments; a real DB (SQLite/Postgres) is the documented next step for scale (see baseline).
3. Static API key is single-tenant auth; per-user accounts/JWT is the roadmap item if multi-user is required.
4. Emotion classification is heuristic; ML path activates automatically when `transformers` is installed.

## 14. Deployment requirements

**Environment variables (backend)**: `NODE_ENV`, `PORT`, `API_KEY` (required, strong, in production), `CORS_ORIGIN`, `DATA_DIR`, `UPLOAD_DIR`, `LOG_LEVEL`, `TRUST_PROXY`, `MAX_UPLOAD_MB`.
**Frontend**: API base URL + key injected via `app.config.js` extras (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_API_KEY`) — set per build profile; no secrets in the repo.

**Commands**:
```bash
# Backend
cd backend && npm install
npm start                    # production
npm test                     # 69 tests
# Frontend
cd frontend && npm install
npx expo start               # dev
npm test                     # 49 tests
npx tsc --noEmit             # type check
```

## 15. References consulted

- Mihon (open-source reader): library grid/sort patterns, reader chrome toggling, settings sheet UX — design inspiration only, no code/assets copied.
- express-rate-limit v8 docs (draft-7 headers, MemoryStore API).
- pdf-parse/pdf.js text-layer normalization behavior (quote mapping) — documented in tests.
- Python `sys.stdin.reconfigure` / `PYTHONIOENCODING` (code-page fix).

## 16. Files changed (summary)

- **New**: `backend/config/env.js`, `backend/utils/logger.js`, `backend/utils/analysisQueue.js`, `backend/tests/{setupEnv.js,helpers/pdfFixture.js}`, `backend/__tests__/{pdfIntegrity,rateLimit,e2eJourney}.test.js`, `frontend/src/config/Env.js`, `frontend/src/services/narration/emotionDelivery.js`, `frontend/src/components/ReaderSettingsSheet.jsx`, `frontend/__tests__/{emotionDelivery,narrationPipeline,settingsStore}.test.js`, both readiness reports.
- **Rewritten/edited**: `backend/{app.js,package.json,jest.config.js}`, all routes/middleware/parsers touched, `backend/emotion/{emotionAnalyzer.js,python_emotion_model.py}`, `frontend/{App.tsx,app.config.js,metro.config.js}`, navigation, Home/Library/BookDetail/Player/Settings screens, stores, `UserSettings` model, `.gitignore`.
- **Removed**: decorative screen set, unused `core/` engine modules, stale fixture/diag files.
- **New deps (backend)**: `helmet`, `express-rate-limit` (pinned v8), `lru-cache`, `string-strip-html` (epub cleanup). No frontend dep changes beyond existing.
