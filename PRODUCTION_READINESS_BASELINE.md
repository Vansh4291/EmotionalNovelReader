# Production Readiness Baseline — EmotionalNovelReader

> Captured 2026-09-27, before any changes. This report reflects the repository as found at commit `00a379b` (main) with unstaged local modifications adding `expo` to `frontend/package.json`.

---

## 1. Current Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Mobile app (frontend/) — React Native 0.76.9 + TypeScript  │
│  Navigation: @react-navigation v6 (bottom tabs + native     │
│  stack)         State: Zustand v4      DB: Realm 12.14.0    │
│  TTS: react-native-tts 4.1.0 (device engines)               │
└──────────────────────┬─────────────────────────────────────┘
                       │ HTTP + x-api-key header
┌──────────────────────▼─────────────────────────────────────┐
│  Backend (backend/) — Express 4.21.2 on Node 18+            │
│  Routes: books (import/list/detail/chapters), emotion       │
│  (analyze), tts (voice params), progress (+ bookmarks)      │
│  Storage: JSON files (books_db.json, progress_db.json,      │
│  bookmarks_db.json) written atomically behind a mutex       │
│  Parsers: pdf-parse, epub, txt (regex chapter detection)    │
│  Emotion: keyword heuristic (shared/emotionKeywords.js)     │
│           + optional Python/transformers child process      │
└────────────────────────────────────────────────────────────┘
```

- **Auth**: single shared static API key (`x-api-key`), default `dev-key-change-in-production` when env var missing.
- **State management (app)**: Zustand stores (`libraryStore`, `playerStore`, `settingsStore`) + a large parallel "narrative core" (`src/core/**`) that duplicates playback state in a `PlaybackMachine` + `NarrationEngine`.
- **PDF flow**: mobile picks file → uploads to backend → `pdf-parse` extracts text → regex chapter detection → chapters persisted in JSON → *original PDF deleted after parse* → app stores extracted text/sentences in Realm. Originals are not retained, but never modified.
- **TTS flow**: two parallel engines exist:
  1. `usePlayerScreenState` (used by `PlayerScreen`, the screen actually reachable from Library → BookDetail)
  2. `NarrationEngine` via `useNarration` (used only by `NarrativeFocusPlayer`, which is **not reachable** in the current navigator)

## 2. Current Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Mobile | React Native | 0.76.9 |
| Mobile language | TypeScript / JS mix | TS 5.0.4, ~50% of screens are .jsx |
| Navigation | @react-navigation | v6 (native-stack + bottom-tabs) |
| State | Zustand | 4.5.5 |
| Local DB | Realm | 12.14.0 |
| TTS | react-native-tts | 4.1.0 |
| Backend | Express | 4.21.2 |
| Rate limiting | express-rate-limit | 8.5.2 |
| Uploads | multer | 1.4.5-lts.1 |
| PDF | pdf-parse | 1.1.1 |
| EPUB | epub | 1.2.1 |
| Tests | Jest + supertest | 30.4.2 (backend), 29.6.3 (frontend) |

## 3. Currently Working Functionality

Verified by running the existing test suites during investigation:

- Backend API: health, auth (401s), books import/list/detail/delete, chapter retrieval, progress get/set, bookmarks CRUD, TTS voice-param routes, emotion analyze route — **41/41 backend tests pass**.
- Frontend unit tests: sentence splitter, emotion analyzer, chapter processor, theme tokens — **27/27 pass**.
- Local TXT import pipeline end-to-end on-device (Realm persistence, progress, bookmarks).
- Backend chapter text → sentence splitting → keyword emotion analysis → per-sentence voice params.
- Rate limiting middleware works (verified by test): import=5/min, analysis=10/min, general=100/min.
- Realm persistence for books, chapters, sentences, progress, bookmarks, settings.

## 4. Broken / Incomplete Functionality

| # | Issue | Severity |
|---|---|---|
| B1 | **PDF import silently strips narrative start.** `bookProcessor.js` runs `detectNarrativeStart` on PDF/EPUB imports and *drops leading chapters* (front-matter heuristic). A short PDF can lose its only chapter. Also drops prologue content. | High |
| B2 | **Hardcoded API key in app code** — `frontend/src/config/api.js` and `bookProcessor.js` embed `dev-key-change-in-production`. Any shipped build leaks the "secret". | High |
| B3 | **Hardcoded LAN host** — `getHost()` returns `192.168.2.4` for Android, breaking on any other network. | High |
| B4 | **`perceptualSpeed()` hack mangles narration speed.** UI speed 1.0x → device rate 0.40 — narration is >2x slower than the user asked for. Emotion profiles multiply on top. | High |
| B5 | **Python emotion model path is broken**: `emotionAnalyzer.js` spawns `python_emotion_model.py` with a path relative to `emotion/`, but the file lives in `backend/emotion/` — wait, it resolves `__dirname`-relative and *does* exist; however `analysisQueue.js` spawns with `spawn('python')` and the module *also* duplicates the spawn logic (`analyzeChapterAsync`) — two divergent implementations, one without timeout/queue (used by `chapterProcessor`), one with (used by `/api/emotion/analyze`). The chapter-processing path never goes through the queue → unbounded concurrent `python` spawns under load. | Medium |
| B6 | **Duplicate/competing screens**: `LibraryScreen.tsx` ("Worlds" from NarrativeMemory) vs `LibraryScreen.jsx` (real library from Realm). The `.tsx` variant is *wired into the navigator* and shows derived-from-bookId fake titles/authors ("By Ab"). BookDetail/Player flows are unreachable from that screen. | High |
| B7 | **Tab bar exposes non-functional screens** (Journey/Sanctuary/Immersion read from `NarrativeMemoryPersistence` that nothing writes). Content is decorative; buttons navigate nowhere meaningful. | Medium |
| B8 | **`HomeScreen` navigates to `Player` with `bookId: undefined`** when memory records exist for books deleted locally. | Medium |
| B9 | **TTS listener leaks**: `Tts.addEventListener('tts-finish', …)` registered in `usePlayerScreenState` effect without removal; each PlayerScreen mount adds another handler → double-speaking after navigating back and forth. | High |
| B10 | **Sentence splitting drops content**: `sentenceSplitter.js` filters sentences `<= 2 chars`, `> 25 words` get soft-chunked, single-word lines (e.g. "\"No.\"") can be dropped; *punctuation-heavy lines* (e.g. `"…"` alone) vanish. Content loss without user awareness. | Medium |
| B11 | **`processChapterText` sets `startChar/endChar` wrong** (always `0 / len`) — breaks any char-accurate highlighting. | Low |
| B12 | **No offline error handling**: library/reader assume backend success; network failures surface as console errors. | Medium |
| B13 | **Settings "Clear Cache" does nothing** (shows success alert only). | Low |
| B14 | **`expo` dependency added locally** (unstaged) to an otherwise bare React Native CLI project; `.expo/` artifacts untracked. Inconsistent tooling state. | Low |
| B15 | **No security headers** (helmet), no `trust proxy` config, no request body schema validation beyond ad-hoc checks, no global 404 handler for `/api/*` (falls through to error middleware → 500 shape). | Medium |
| B16 | **Logging**: request logger logs every URL unconditionally; error handler prints full stack to stdout in production; frontend logs API requests/responses at INFO in release builds. | Medium |
| B17 | **uploads/ left dirty**: a real user PDF (`Atomic Habits…pdf`) sits in `backend/uploads/` after a failed/abandoned import — the code deletes files after parse but not on all failure paths. | Medium |
| B18 | **JSON-file "database"**: whole DB rewritten per mutation (books/progress/bookmarks). Fine for single-user local use, unscalable for multi-user production. Documented as accepted design boundary. | Low |
| B19 | **`frontend/jest.config.js` haste uses `defaultPlatform: 'ios'`** — fragile on Windows/Android dev boxes. | Low |

## 5. Partially Implemented

- **Emotional narration**: keyword heuristic + per-emotion speed/pitch/pause profiles exist in 3 places with *different* values (backend `voiceMapper.js`, frontend `usePlayerScreenState.js`, core `EmotionEngine.ts`). Only one is actually used at runtime (frontend `usePlayerScreenState`).
- **Narrative core** (`src/core/**`, ~20 files): event governor, playback machine, memory persistence, weather/scar/gravity systems — mostly unwired, untested, and unreachable from the current navigation graph.
- **Sleep timer**: modal exists (`SleepTimerModal.jsx`), reducer exists in `usePlayerScreenState`, but no timer is ever started (never wired).
- **Bookmarks UI**: `BookmarkPanel.jsx` exists but is not rendered by `PlayerScreen`.
- **E2E**: none. No UI test infrastructure (no Detox/Maestro). Backend API tests are the only integration coverage.

## 6. Security Concerns

| # | Concern | Priority |
|---|---|---|
| S1 | Static shared API key committed to both codebases (`dev-key-change-in-production` default, fallback if env unset → auth is bypassable-by-default in dev). | High |
| S2 | No security headers (helmet absent). | Medium |
| S3 | CORS defaults to `origin: true` (reflect any origin) when `CORS_ORIGIN` unset. | Medium |
| S4 | Upload validation is extension-based only — no MIME sniffing / magic-byte check for PDFs/EPUBs. `txt` allowed via `allFiles` picker → any file can be posted as `.txt`. Parse is sandboxed by libraries, but path handling should stay defensive. `uploads/` filename is sanitized + random, mitigating traversal. | Medium |
| S5 | 10MB JSON body limit with 50MB upload limit; no per-route size differences. | Low |
| S6 | Error middleware returns generic 500 but logs full stack; health endpoint exposes memory/env details publicly (unauthenticated). | Low |
| S7 | No `trust proxy` setting → rate limiting keys on direct socket IP; correct only when not behind a reverse proxy; needs env flag. | Low |
| S8 | Frontend stores nothing sensitive; API key is the only secret — but see B2/S1. | — |
| S9 | Dependencies unscanned in CI (no CI at all). | Medium |

## 7. Testing Gaps

- Backend: no PDF parser tests (no PDF fixture), no epub tests, no sentence-splitter tests on the backend copy, no rate-limit header assertions, no upload-size tests.
- Frontend: no component tests, no store tests, no progress-calculation tests, no narration-delivery unit tests, no tests for `bookProcessor` import logic (including B1 regression).
- No E2E. No CI. No coverage thresholds.

## 8. UI/UX Problems

- Two "Library" concepts shipped at once (Worlds vs real library); navigator points to the decorative one (B6).
- Tab icons are text glyphs (`⌂`, `☰`, `→`) with no a11y labels; several tabs lead to empty/decorative content.
- Reader: no font-size/line-height controls in reader; fixed sizes in `SentenceList` (`fontSize: 18`); no reader themes applied from settings (theme engine exists but PlayerScreen uses `themeContext`); no tap-to-hide chrome; no continuous scroll pagination concept; progress = thin 1px line.
- Library: list rows only, no grid option; import UX lacks per-file feedback and error surfaces beyond alert; search exists but no sort/filter; long-press-to-delete is undiscoverable.
- BookDetail: no description/metadata beyond chapter list; no cover art (letter avatars); progress only shown if > 0.
- Settings: sliders unlabeled for a11y; theme picker lacks preview; "Clear Cache" fake; no storage stats; version hardcoded.
- Inconsistent design systems: `utils/themeContext.js` (used by real screens) vs `theme/NarrativeThemeEngine.ts` (used by decorative screens) — two token systems.
- No empty/error/retry states on Home/Journey/Sanctuary/Immersion.
- Accessibility: no `accessibilityLabel`s on icon-only controls; fixed font sizes ignore OS scaling in many places (React `Text` uses `allowFontScaling` default true, but fixed line-heights don't adapt); small touch targets (< 44px) on transport buttons.

## 9. PDF Risks

- Originals are **read-only and deleted after extraction** — good: no code path writes to PDFs, no OCR, no generated PDFs. Risk is *extraction quality*, not corruption.
- `pdf-parse` on multi-column or image-heavy PDFs yields jumbled order or empty text → empty chapters silently created (`chapters.length===0` → "Full Text" fallback may be empty string).
- `cleanText` collapses newlines: paragraph boundaries lost (`\s+ → ' '`), then re-inserted *between sentences* — paragraphs merge in reader display.
- Page numbers/headers/footers are **not** filtered → they get spoken by TTS ("12 Chapter 3 …").
- No integrity record: after import, nothing lets us verify extraction was complete vs source.

## 10. TTS / Narration Limitations

- `perceptualSpeed()` table (B4) makes speed control unpredictable; emotion profiles silently stack.
- Sentence-by-sentence `Tts.speak` with JS-side sleeps; `setDefaultRate/Pitch` races with ongoing speech on some Android engines.
- No queue/deduplication of speak calls (listener leak B9 causes overlapping speech).
- Pauses are fixed per-emotion constants; no paragraph-boundary pause; no chapter-title announcement.
- No punctuation normalization (`--` → pause, all-caps shouting not slowed, abbreviations ("Mr.", "Dr.") can end sentences).
- The high-quality path (`NarrationEngine` + `EmotionEngine` context-aware classification) exists but is unreachable; its emotion engine uses narrative arc context — a good foundation worth wiring.
- No fallback when device TTS lacks an English voice; no `tts-error` handling → narration silently dies.

## 11. Dependency Concerns

- `expo` mixed into bare RN project (B14).
- `multer 1.4.5-lts.1` is the security-patched line; fine, but should be pinned and audited.
- `pdf-parse` is unmaintained (last release years ago) but stable for text extraction; acceptable with integrity tests.
- `epub 1.2.1` old; works for basic EPUB2/3.
- No lockfile audit step; no dependabot/renovate config.

## 12. Recommended Improvements (Priority Order)

1. **P0 — Security/config**: env-driven API key (fail-fast if missing in production), remove hardcoded key/host from app code, add helmet, tighten CORS default, `trust proxy` env, redact logs, build-mode logging.
2. **P0 — Correctness**: fix PDF front-matter dropping (B1), preserve paragraph breaks through extraction (P9), TTS listener leak (B9), `perceptualSpeed` removal (B4).
3. **P0 — Navigation**: single Library (Realm-backed), wire BookDetail → Reader as the only reading path; keep the strongest pieces of the narrative core (context-aware emotion) behind a clean module.
4. **P1 — PDF integrity**: SHA-256 of original at import, page count + per-page text fingerprint, extraction invariants (no empty chapters silently, artifact filters for page numbers/running heads with conservative rules), integrity test fixtures.
5. **P1 — Reader UX**: font size/line-height controls persisted, tap-to-toggle chrome, paragraph-aware display, progress bar + % + chapter count, resume position, themes (dark/light/sepia) applied in reader.
6. **P1 — TTS**: unified narration service (single speak queue, listener management, punctuation/abbreviation handling, paragraph pauses, chapter title), emotion → rate/pitch/pause mapping in one module, graceful fallback + error state.
7. **P2 — Rate limiting**: keep current limits, add per-route limit headers test, trust-proxy-aware keying, 413 for oversized uploads, retry-after.
8. **P2 — Tests**: PDF fixtures (small generated PDFs, not copyrighted), extraction invariants, narration unit tests, rate-limit tests, API journey E2E via supertest.
9. **P2 — A11y**: labels on all icon buttons, ≥44px targets, font scaling respected in reader (allowFontScaling + maxFontSizeMultiplier), contrast-checked emotion colors.
10. **P3 — Observability**: pino-style leveled logging, request IDs, no PII/token logging.

## 13. Architecture Recommendations

- Keep **React Native + Express** (both working; migration cost unjustified).
- Consolidate to **one reader engine**: the realm-backed `PlayerScreen` flow, with the `NarrationEngine`'s context-aware emotion classification extracted into a shared `services/narration` module. Delete the decorative screens that read from a store nothing writes (Journey/Sanctuary/Immersion/Worlds-Library) — or keep them only if wired to real data. Decision: remove unreachable decorative screens, keep `NarrativeFocusPlayer`-style focus mode as a reader setting.
- Extract **pure domain modules** (sentence splitting, emotion classification, voice mapping, text cleanup) into `shared/` so backend and frontend test the same code.
- Keep JSON storage; add schema validation on load and per-book file layout is unnecessary for single-user.

## 14. Environment Configuration (as found)

- `.env.example` documents `BACKEND_PORT`, `API_KEY`, `CORS_ORIGIN`.
- No env for `NODE_ENV` enforcement, upload size, log level, trust proxy.
- Frontend has **no env story** (hardcoded host/key).

---

## 15. BASELINE → FINAL (post-implementation note)

This document recorded the state **before** implementation. The outcome is
documented in [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md). Summary of
what changed relative to this baseline:

- All Phase-3 items fixed: config/env hardening, security headers, auth on all
  routes, rate limiting with standard headers, PDF integrity verification,
  narration speed-hack removal, chapter-detection fix, dead screen/core removal,
  reader settings persistence, a11y improvements, E2E journey tests.
- Every issue in this baseline is either resolved (see §13 of the final report)
  or explicitly listed as an accepted risk with rationale (git history cleanup
  requires user approval; JSON stores acceptable at current scale).
- Test status at baseline: 41 backend + 38 frontend passing. Final: 69 backend
  + 49 frontend passing, TypeScript clean, 3× repeat-stable.
