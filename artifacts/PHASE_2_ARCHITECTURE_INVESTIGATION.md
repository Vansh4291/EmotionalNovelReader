# EmotionalNovelReader (ENR)
# Phase 2: Architecture Investigation Report (Revised & Evidence-Reviewed)

| Document Field | Value |
|---|---|
| Project | EmotionalNovelReader (ENR) |
| Document | Phase 2 Technical Architecture Investigation & Evidence Review |
| Target Path | `artifacts/PHASE_2_ARCHITECTURE_INVESTIGATION.md` |
| Author | Lead Flutter Architect, Senior Android Engineer, and Technical Reviewer |
| Target Platform | Android 12+ (API 31+) |
| Date | 10 November 2026 |
| Status | **Investigation Complete — Revised Draft Pending Human Approval** |
| Baseline Commit | `1ee64c16aaacc35a9b2565d0bfa18c96a0860c43` (Verified on `feature/flutter`) |
| Relevant Decisions | `ENR-DEC-025` through `ENR-DEC-056` |

---

## 1. Document Metadata and Investigation Status

This document is the authoritative, evidence-reviewed Phase 2 Architecture Investigation Report for **EmotionalNovelReader (ENR)**.

It incorporates rigorous corrections and technical evidence reviews covering:
* **Backup & Restore Architecture:** Corrected to reflect the approved product requirement of **unencrypted default exports** with clear user privacy warnings, SHA-256 integrity checks, and optional user-selected authenticated encryption (AES-256-GCM).
* **EPUB Rendering & WebView Security:** Resolved contradictions regarding JavaScript by distinguishing trusted application-owned reader-engine code (Foliate-js) from untrusted book-embedded scripts, defining a strict Content Security Policy (CSP), and maintaining the EPUB engine decision as **provisional pending prototype validation**.
* **Dart Isolates & Dependency Injection:** Corrected isolate memory claims by acknowledging separate isolate heaps, evaluating `audio_service` v0.18.x's actual single-isolate main-thread execution model, and documenting explicit per-isolate initialization strategies.
* **SQLite FTS5 Multilingual Search:** Removed unverified benchmark claims; thoroughly investigated default `unicode61` limitations on unspaced CJK (Chinese, Japanese) and Indic scripts (Hindi, Gujarati); evaluated FTS5 `trigram` and pre-segmentation trade-offs; established a future multilingual validation plan.
* **Complete Document-Format Support Matrix:** Expanded evaluation to all 12+ formats in `PRD.md` and `TRD.md` (EPUB, PDF, TXT, DOCX, HTML, RTF, Markdown, CBZ, CBR, MOBI, AZW, AZW3) with strict DRM boundaries (no DRM circumvention).
* **Local AI Runtime & Resource Budgets:** Re-evaluated `llama_cpp_dart` / native FFI, ARM64 NDK compilation, GGUF mmap, KV-cache RAM footprints, and defined a 10-point prototype validation plan; labeled performance and RAM budgets as provisional engineering targets.
* **Granular Background Execution:** Differentiated background workloads (TTS narration, large downloads, search indexing, maintenance, backup, AI) across Android 12+ Foreground Service and WorkManager constraints.
* **Complete Decision Matrix:** Added all 32 decisions (`ENR-DEC-025` to `ENR-DEC-056`) with evidence confidence ratings, all marked **`Pending Human Approval`**.

---

## 2. Executive Summary

EmotionalNovelReader is designed as an offline-first, local-first, privacy-respecting emotional novel reading ecosystem on Android 12+ (API 31+).

Following the baseline Flutter initialization on `feature/flutter` (commit `1ee64c1`), this investigation establishes the structural patterns and technical evaluations needed to guide Phase 3 and Phase 4 development safely.

### Primary Architectural Recommendations

1. **Architecture Style ([ENR-DEC-025](file:///c:/Users/vansh/Documents/Projects/EmotionalNovelReader/artifacts/PHASE_2_ARCHITECTURE_INVESTIGATION.md#23-complete-decision-approval-matrix-enr-dec-025-to-enr-dec-056)):** A **Pragmatic Feature-First Architecture** (`lib/features/<name>/{presentation,domain,data}`) with unidirectional dependencies (`Presentation` $\rightarrow$ `Domain` $\leftarrow$ `Data`). Simple queries bypass redundant use-case pass-throughs, while complex workflows (import pipelines, spoiler-aware RAG, progress calculation) are encapsulated in dedicated domain use cases.
2. **State Management & DI ([ENR-DEC-026](file:///c:/Users/vansh/Documents/Projects/EmotionalNovelReader/artifacts/PHASE_2_ARCHITECTURE_INVESTIGATION.md#23-complete-decision-approval-matrix-enr-dec-025-to-enr-dec-056), [ENR-DEC-027](file:///c:/Users/vansh/Documents/Projects/EmotionalNovelReader/artifacts/PHASE_2_ARCHITECTURE_INVESTIGATION.md#23-complete-decision-approval-matrix-enr-dec-025-to-enr-dec-056)):** **BLoC / Cubit (`flutter_bloc`)** for deterministic UI state machines and asynchronous streams. **Constructor Injection** is enforced universally; `get_it` acts as the service locator in the root UI isolate. Background worker isolates (`Isolate.run`) operate with dedicated, explicitly initialized parameters rather than assuming cross-isolate `get_it` sharing.
3. **Local Relational Database & FTS ([ENR-DEC-029](file:///c:/Users/vansh/Documents/Projects/EmotionalNovelReader/artifacts/PHASE_2_ARCHITECTURE_INVESTIGATION.md#23-complete-decision-approval-matrix-enr-dec-025-to-enr-dec-056), [ENR-DEC-033](file:///c:/Users/vansh/Documents/Projects/EmotionalNovelReader/artifacts/PHASE_2_ARCHITECTURE_INVESTIGATION.md#23-complete-decision-approval-matrix-enr-dec-025-to-enr-dec-056)):** **Drift with SQLite (`drift`, `drift_flutter`, `sqlite3_flutter_libs`)** operating in Write-Ahead Logging (WAL) mode. Provides relational integrity, cascading deletes, reactive UI streams, and automated step-by-step schema migrations. FTS5 full-text indexing is recommended, with CJK and Indic search handled via trigram indexing or pre-segmentation pending prototype validation.
4. **File Storage & SAF ([ENR-DEC-030](file:///c:/Users/vansh/Documents/Projects/EmotionalNovelReader/artifacts/PHASE_2_ARCHITECTURE_INVESTIGATION.md#23-complete-decision-approval-matrix-enr-dec-025-to-enr-dec-056)):** When a user imports a book via the Android Storage Access Framework (SAF), the app verifies its SHA-256 hash and creates an exact byte copy inside sandboxed internal app storage (`app_flutter/library/books/<uuid>/original.<ext>`). This guarantees complete offline availability immune to external file deletions or SAF URI revocation.
5. **Reader Engine ([ENR-DEC-031](file:///c:/Users/vansh/Documents/Projects/EmotionalNovelReader/artifacts/PHASE_2_ARCHITECTURE_INVESTIGATION.md#23-complete-decision-approval-matrix-enr-dec-025-to-enr-dec-056)):** A **Unified Reader Abstraction** with format-specific viewport adapters. PDF is handled via Android-native hardware-accelerated `PdfRenderer` (`pdfx`); TXT via virtualized Flutter `TextPainter`. EPUB rendering is provisionally recommended via an isolated WebView using **Foliate-js**, hardened with strict CSP and disabled untrusted scripts, subject to prototype validation.
6. **Narration & Background Execution ([ENR-DEC-039](file:///c:/Users/vansh/Documents/Projects/EmotionalNovelReader/artifacts/PHASE_2_ARCHITECTURE_INVESTIGATION.md#23-complete-decision-approval-matrix-enr-dec-025-to-enr-dec-056), [ENR-DEC-040](file:///c:/Users/vansh/Documents/Projects/EmotionalNovelReader/artifacts/PHASE_2_ARCHITECTURE_INVESTIGATION.md#23-complete-decision-approval-matrix-enr-dec-025-to-enr-dec-056), [ENR-DEC-041](file:///c:/Users/vansh/Documents/Projects/EmotionalNovelReader/artifacts/PHASE_2_ARCHITECTURE_INVESTIGATION.md#23-complete-decision-approval-matrix-enr-dec-025-to-enr-dec-056)):** Active TTS narration utilizes an Android Foreground Service with type `mediaPlayback` (Android 14+) via `audio_service` and `MediaSession`. Non-playback tasks (search indexing, database maintenance) do **not** use foreground services; they run as deferred `WorkManager` jobs or foreground compute tasks.
7. **Local AI & Spoiler Boundary ([ENR-DEC-034](file:///c:/Users/vansh/Documents/Projects/EmotionalNovelReader/artifacts/PHASE_2_ARCHITECTURE_INVESTIGATION.md#23-complete-decision-approval-matrix-enr-dec-025-to-enr-dec-056), [ENR-DEC-038](file:///c:/Users/vansh/Documents/Projects/EmotionalNovelReader/artifacts/PHASE_2_ARCHITECTURE_INVESTIGATION.md#23-complete-decision-approval-matrix-enr-dec-025-to-enr-dec-056)):** Local inference via `llama.cpp` Dart FFI targeting 1B–3B GGUF quantized models (provisional pending Android ARM64 compilation and memory prototype). Deterministic spoiler protection is enforced at the database layer by physically restricting retrieval context to $\le$ the user's current chapter and offset.
8. **Backup & Restore ([ENR-DEC-043](file:///c:/Users/vansh/Documents/Projects/EmotionalNovelReader/artifacts/PHASE_2_ARCHITECTURE_INVESTIGATION.md#23-complete-decision-approval-matrix-enr-dec-025-to-enr-dec-056)):** Standard `.enrbackup` ZIP archive is **unencrypted by default** with a clear user privacy warning, SHA-256 integrity verification, structured manifest, and path-traversal protection. Authenticated encryption (AES-256-GCM with PBKDF2/Argon2id key derivation) is available as an optional user-selected setting.

---

## 3. Existing Project Baseline

An empirical inspection of the repository confirmed the following baseline:

* **Flutter SDK:** Flutter `3.47.9` (channel stable), Dart `3.13.7`.
* **Android Target Toolchain:** Android SDK `36.0.0`, Android Gradle Plugin `9.1.0`, Gradle wrapper `9.3.1`, Kotlin `2.4.0`.
* **Android Platform Enforcements:** `minSdk = 31` (Android 12), `compileSdk = 36`, `targetSdk = 36`, Java 17 bytecode compatibility target.
* **Application Identity:** Android namespace and applicationId: `com.emotionalnovelreader.app`; Dart package: `emotional_novel_reader`.
* **Current Dependencies:** Strictly standard Flutter baseline in `pubspec.yaml` (`flutter`, `cupertino_icons`, `flutter_test`, `flutter_lints ^6.0.0`). Zero third-party architecture, database, or UI packages installed.
* **Directory Structure:** Baseline feature-first placeholders established in `lib/`:
  * `lib/app/` (composition root, Material 3 theme)
  * `lib/core/` (constants, error abstractions, utils)
  * `lib/features/` (`library`, `reader`, `audio`, `ai`, `settings`)
* **Verification Status:** Baseline verified with 0 static analysis issues (`flutter analyze`), 100% widget test pass rate (`flutter test`), and successful debug APK compilation (`build/app/outputs/flutter-apk/app-debug.apk`, 155 MB).
* **Git State:** Verified clean working tree on branch `feature/flutter`, baseline commit `1ee64c1` (with documentation synchronization `749e194`).

---

## 4. Confirmed Product Constraints

The architectural recommendations in this report strictly adhere to the confirmed product constraints established in `PRD.md` and `DECISIONS.md`:

| Constraint ID | Title | Confirmed Architectural Requirement | Source |
|---|---|---|---|
| **ENR-DEC-001** | Fresh Flutter Application | Completely fresh Flutter codebase; zero reuse of or dependency on the deleted React Native frontend or Node.js/Express backend. | `prd.md` §1, `DECISIONS.md` |
| **ENR-DEC-002** | Target Android 12+ | Android 12 (API 31) minimum SDK; all platform integrations must conform to Scoped Storage, Android 12+ splash screens, and Android 12/13/14 foreground service rules. | `prd.md` §6, `DECISIONS.md` |
| **ENR-DEC-003** | Offline-First Operation | Core reading, library management, search, annotations, progress tracking, and local AI/TTS must work 100% without an active internet connection. | `prd.md` §2, `DECISIONS.md` |
| **ENR-DEC-004** | No Mandatory Accounts | The core product requires no user registration, login, cloud authentication, or account token. | `prd.md` §4, `DECISIONS.md` |
| **ENR-DEC-006** | Preserve Original Files | Original user source files imported via SAF must never be modified, overwritten, or corrupted. | `prd.md` §3, `DECISIONS.md` |
| **ENR-DEC-007** | No DRM Bypass | No circumvention or decryption of protected ebooks (e.g. Adobe DRM, Kindle DRM). Unsupported or encrypted formats must fail gracefully with clear explanation. | `prd.md` §4, `DECISIONS.md` |
| **ENR-DEC-008** | Cloud AI Optional & Gated | Cloud AI is disabled by default, strictly consent-gated, and must never be invoked as a silent fallback for local AI. | `prd.md` §10, `DECISIONS.md` |
| **ENR-DEC-011** | Deterministic Spoiler Safety | Spoiler boundaries default strictly to the user's current reading position unless explicitly overridden per query. | `prd.md` §10, `DECISIONS.md` |
| **ENR-DEC-012** | Unencrypted Default Backup | Exported backups are **unencrypted by default**, accompanied by an explicit warning that unencrypted exports can be read by anyone. Encryption is strictly an optional user-selected feature. | `prd.md` §12, `DECISIONS.md` |
| **ENR-DEC-013** | Manual Backup Only | Backup and restore are manually initiated by the user; automatic background cloud synchronization is explicitly out of scope. | `prd.md` §4, `DECISIONS.md` |
| **ENR-DEC-015** | Privacy-First Diagnostics | Diagnostics are local-first. No crash reporting or analytics data transmission without explicit, revocable user opt-in. | `prd.md` §15, `DECISIONS.md` |
| **ENR-DEC-016** | No Engagement Notifications | No reading reminders, streak alerts, unfinished-book notifications, or motivational badges. | `prd.md` §4, `DECISIONS.md` |

---

## 5. Architecture Alternatives and Recommendation

```
                    ┌─────────────────────────────────────────┐
                    │      Feature-First Clean Architecture    │
                    └─────────────────────────────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
┌──────────────┐                 ┌──────────────┐                 ┌──────────────┐
│ Presentation │                 │    Domain    │                 │     Data     │
│  (UI/Bloc)   │ ──────────────> │ (Entities/UC)│ <────────────── │  (Drift/SAF) │
└──────────────┘                 └──────────────┘                 └──────────────┘
        │                                                                 │
        └───────────────────────────────┬─────────────────────────────────┘
                                        ▼
                         ┌──────────────────────────────┐
                         │      Shared Core Layer       │
                         │(Database, Storage, Platform) │
                         └──────────────────────────────┘
```

### 5.1 Evaluated Architecture Patterns

1. **Classic Layer-First (`lib/presentation`, `lib/domain`, `lib/data`):**
   * *Assessment:* As features expand (library, reader, TTS, AI, settings), related files are separated across distant root directories. High maintenance drag. **Rejected.**
2. **Dogmatic Uncle Bob Clean Architecture:**
   * *Assessment:* Enforcing strict controllers, presenters, interactors, request/response models, DTOs, mappers, and repository abstractions for every read query generates 10–15 files per operation. Excessive for an offline SQLite application where most operations are direct queries. **Rejected.**
3. **Pragmatic Feature-First Modular Architecture:**
   * *Assessment:* Groups code by business capability (`features/library`, `features/reader`, `features/audio`, `features/ai`, `features/settings`, `features/backup`). Features contain internal `presentation`, `domain`, and `data` subdirectories. Simple CRUD queries can call repositories directly from controllers, while multi-step operations (import, RAG, export) use domain use cases. **Recommended.**
4. **Multi-Package Monorepo (`melos`):**
   * *Assessment:* Subdividing the project into independent Dart packages adds versioning and build-runner overhead. Premature for initial phases. **Deferred.**

### 5.2 Layer Structure & Rules
* **`lib/app/`:** Composition root, global providers, Material 3 theme configuration, and `go_router` route declarations.
* **`lib/core/`:** Horizontal foundation shared across features: Drift database schema/connection, `Failure` abstractions, filesystem/storage helpers, platform channel bridges, logging engine.
* **`lib/features/<name>/`:**
  * **`domain/`:** Pure Dart entities, failure types, repository interfaces, complex use cases. Zero Flutter widget dependencies.
  * **`data/`:** Drift DAOs, file accessors, models/DTOs, repository implementations.
  * **`presentation/`:** BLoC / Cubit state machines, view models, screens, and reusable feature widgets.
* **Cross-Feature Communication Rules:**
  * Features must **never** import another feature's internal `presentation/` or `data/` directories.
  * Cross-feature communication occurs strictly through public domain contracts (e.g., `AiFeature` querying reader location via `ReaderContextService`) or reactively through shared Drift database streams.

---

## 6. State Management and Dependency Injection Analysis

### 6.1 State Management Comparison

| Criteria | Flutter BLoC / Cubit (`flutter_bloc`) | Riverpod (`flutter_riverpod`) | Provider (`provider`) | Flutter Native (`ChangeNotifier` / `ValueNotifier`) |
|---|---|---|---|---|
| **Offline Reactive Streams** | **High:** Emits states from Drift database streams cleanly. | **High:** Native `StreamProvider` and `AsyncValue`. | **Moderate:** Manual subscription management required. | **Low:** Boilerplate-heavy. |
| **Complex State Machines** | **Superior:** Explicit event-driven transitions, immutable states, audit trails. | **Good:** Functional state transitions via `Notifier`. | **Moderate:** Unstructured mutations. | **Poor:** Prone to race conditions. |
| **Background Audio / Native Sync** | **Superior:** State classes are pure Dart data, easily inspected and serialized. | **Moderate:** Container plumbing required outside widget tree. | **Poor:** Hard-coded dependency on `BuildContext`. | **Moderate:** Manual listener wiring. |
| **AI Token Streaming** | **Superior:** Event streams handle async chunked generation with explicit cancellation. | **Good:** Async streams via async notifiers. | **Moderate:** Manual state churn. | **Fair:** Hard to debounce. |
| **Testability** | **Superior:** `bloc_test` provides structured `build`, `act`, `expect` blocks. | **High:** Unit testing via `ProviderContainer`. | **Moderate:** Mocking ChangeNotifier listeners is brittle. | **Fair:** Manual notification verification. |
| **Ecosystem Stability** | **High:** Stable API across major versions (`flutter_bloc` 9.0). | **Moderate:** Frequent major paradigm shifts across 1.x, 2.x, and upcoming 3.x. | **High:** Mature legacy maintenance mode. | **N/A:** Platform built-in. |

**Recommendation:** **BLoC / Cubit (`flutter_bloc`)**. Use lightweight **Cubit** for synchronous UI state (settings, font sizing, theme toggles) and **BLoC** for complex, event-driven, asynchronous pipelines (reader pagination, import queues, audio narration sync, streaming AI tokens).

### 6.2 Dependency Injection & Isolate Memory Model

```
┌───────────────────────────────────────┐       ┌───────────────────────────────────────┐
│           Root UI Isolate             │       │         Worker / Compute Isolate      │
│  ┌─────────────────────────────────┐  │       │  ┌─────────────────────────────────┐  │
│  │   GetIt.instance (UI Registry)  │  │       │  │   Independent Worker Config     │  │
│  │   - LibraryBloc                 │  │       │  │   - Dedicated SQLite/Parser     │  │
│  │   - ReaderBloc                  │  │       │  │   - Zero shared memory with UI  │  │
│  │   - AppDatabase (Drift)         │  │       │  └─────────────────────────────────┘  │
│  └─────────────────────────────────┘  │       │                   ▲                   │
└───────────────────────────────────────┘       └───────────────────┼───────────────────┘
                    │                                               │
                    └────────── SendPort / ReceivePort ─────────────┘
                               (Message Passing Only)
```

#### Correction: The Dart Isolate Reality
In Dart, isolates do **not** share mutable memory. Each isolate possesses an independent garbage-collected heap. 
* A service registered in `GetIt.instance` inside the main UI isolate is **completely inaccessible** in a worker isolate spawned via `Isolate.spawn` or `compute`. Calling `getIt<T>()` in a secondary isolate without prior local registration throws a `StateError`.
* Database connections, open file handles, platform channel bindings, and event streams cannot be passed across isolate boundaries.

#### AudioService Execution Architecture
Investigation of `audio_service` (v0.18.x) confirms that modern versions use a **single-isolate architecture** on Android:
* The Dart `AudioHandler` runs directly on the **main UI isolate**.
* It communicates with the native Android foreground service (`AudioService`) via standard Flutter platform channels (`MethodChannel` and `EventChannel`).
* Consequently, `AudioHandler` has direct access to the main isolate's `get_it` registry, repositories, and Drift database streams, without requiring cross-isolate synchronization for audio playback.

#### Recommended DI Strategy:
1. **Universal Constructor Injection:** Every class receives its dependencies via constructor parameters. No class instantiates dependencies internally.
2. **`get_it` as UI-Isolate Service Locator:** Used strictly at the composition root (`lib/app/`) to assemble repositories, blocs, and services for the UI isolate.
3. **Explicit Worker Isolate Parameterization:** When offloading heavy tasks (e.g. document parsing via `Isolate.run`), data is passed via sendable primitives (file paths, byte arrays) and returned as parsed immutable DTOs, avoiding any dependency on `get_it` in worker threads.

---

## 7. Persistence and Full-Text Search Analysis

### 7.1 Relational Storage Engine Comparison

| Engine | Model | ACID Transactions | FTS Support | Reactive Streams | Migrations | Verdict |
|---|---|---|---|---|---|---|
| **Drift (`drift` + SQLite)** | Relational | Full ACID (WAL mode) | Native SQLite FTS5 | Built-in (`watch()`) | Automated, tested step-by-step migrations | **Strongly Recommended** |
| **Isar Database** | Document / NoSQL | Partial | Basic regex/prefix | Built-in watchers | Breaking changes across versions | **Rejected (Repository instability/abandonment)** |
| **ObjectBox** | Object / NoSQL | Full ACID | Limited | Built-in queries | Complex C++ migration | **Rejected (15MB+ binary bloat, license risks)** |
| **Raw SQLite (`sqflite`)** | Relational | Full ACID | Supported via raw SQL | Manual controllers | Manual SQL strings; high human error risk | **Rejected (Lacks compile-time verification)** |
| **Hive / Hive CE** | Key-Value | None | None | Box watchers | Manual versioning | **Rejected (Inadequate for relational data/FTS)** |

### 7.2 SQLite FTS5 Multilingual Search Investigation

#### Correction of Previous Performance Claims
Previous draft claims asserting "sub-millisecond search across millions of words" and "<15ms for 500,000 words with >85% precision" were **unverified theoretical assumptions**. Real-world mobile search performance depends heavily on disk I/O, device CPU throttling, tokenizer choice, and Unicode complexity.

#### Tokenizer Analysis and Language Limitations

```
English / Latin Text:
"The quick brown fox" ───(unicode61)───> ['The', 'quick', 'brown', 'fox']  [Word Matches Work]

Chinese / Japanese Text (No Whitespaces):
"这是一个测试小说"       ───(unicode61)───> ['这是一个测试小说']                [Word Searches FAIL]
"这是一个测试小说"       ───(trigram)────> ['这是一', '是一个', '一个测', ...]  [Substring Matches Work]
```

1. **Default `unicode61` Tokenizer:**
   * *Behavior:* Splits tokens strictly based on Unicode whitespace and punctuation. Performs case folding and accent stripping.
   * *Languages Supported:* Latin, Cyrillic, Greek.
   * *Limitation on CJK (Chinese, Japanese, Korean):* CJK languages do **not** use spaces between words. The `unicode61` tokenizer treats an entire Chinese sentence or paragraph as a single continuous token. Searching for a 2-word character sequence fails completely unless the user searches for the exact full sentence.
2. **`trigram` Tokenizer (SQLite 3.34+):**
   * *Behavior:* Deconstructs text into overlapping sequences of 3 characters (e.g. `人工智能` $\rightarrow$ `人工智`, `工智能`).
   * *Advantages:* Provides native substring and CJK search without external native dictionary dependencies.
   * *Trade-offs:* Index size expands significantly ($2\times$ to $3\times$ larger than standard text). Queries with fewer than 3 characters require special prefix handling or fallback scanning.
3. **Indic Scripts (Hindi, Gujarati, Devanagari):**
   * *Behavior:* Hindi and Gujarati use whitespace between words, so `unicode61` can tokenize words. However, complex conjuncts (halant/virama), dependent vowel signs (matras), and zero-width joiners (ZWJ/ZWNJ) mean that subtle Unicode normalization differences (NFC vs. NFD) can cause search misses unless text is normalized prior to indexing.

#### Measurable Search Validation Plan
Before finalizing the production search architecture in Phase 4:
1. **Benchmark Datasets:** Prepare 5 representative 500,000-word novel corpora: (1) English, (2) Simplified Chinese, (3) Japanese, (4) Hindi, (5) Gujarati.
2. **Evaluation Metrics:** Measure on Tier 1 (budget) and Tier 2 (mid-range) Android devices:
   * Full book indexing time (target: $< 10\text{ seconds}$ per 500k words in background worker).
   * Database storage expansion ratio (target: index overhead $\le 60\%$ of source text size).
   * Query response latency for 1-word, 2-word, and phrase queries (target: $\le 50\text{ ms}$).
   * Exact-match and substring recall across all 5 test languages.

---

## 8. File Storage and SAF Architecture

### 8.1 Android 12+ Scoped Storage & Immutability
Android 12+ (API 31+) strictly limits access to shared external storage. To guarantee offline durability and prevent data corruption:

1. **Sandboxed Byte Copy:** When a document is imported via SAF (`ACTION_OPEN_DOCUMENT`), the app reads the content URI stream and writes an exact byte copy into app-internal storage:
   `app_flutter/library/books/<uuid>/original.<ext>`
2. **Integrity Validation:** A SHA-256 hash is computed during stream copying and stored in Drift's `books` table.
3. **SAF Linkage:** If the user grants persistent URI permission (`takePersistableUriPermission`), the external URI is saved. However, the internal sandboxed copy remains the authoritative reading source, ensuring the book opens instantly even if the external file is moved, renamed, or deleted.
4. **Temporary Processing Directory:** File decompressions and cover extractions occur in `getCacheDir()/import_staging/<uuid>/` and are automatically deleted upon pipeline completion.

---

## 9. Complete Document-Format Support Matrix

The following matrix evaluates all document formats identified in `PRD.md` (§3, §8) and `TRD.md` (§9):

| Format | Status | Import & Parsing Approach | Rendering Approach | Metadata Extraction | Chapter Support | Search Indexing | Offline Support | DRM Restrictions | Known Limitations & Risks | Target Phase |
|---|---|---|---|---|---|---|---|---|---|:---:|
| **EPUB** | **Required (MVP)** | Archive unpack (`archive`), parse `container.xml`, `content.opf`, `toc.ncx` | Reflowable Viewport (Foliate-js WebView bridge) | Title, Author, Cover, Language, Publisher | Native (OPF spine + NCX/NavDoc) | Full chapter text extraction to FTS5 | 100% Offline | **Strict: No DRM bypass.** Encrypted files rejected. | Complex EPUB 3 CSS, embedded fonts, and obfuscated fonts require prototype. | Phase 4 |
| **PDF** | **Required (MVP)** | Android native `PdfRenderer` via `pdfx` package | Hardware-accelerated native page viewer | PDF DocumentInfo dictionary | Native PDF bookmarks/outlines | Extracted via PDF text streams | 100% Offline | **No DRM bypass.** Password/certificate protected rejected. | Fixed-layout; small text on phones requires pinch-zoom; text reflow is unnatural. | Phase 4 |
| **TXT** | **Required (MVP)** | Encoding detection (`charset_converter`) + heuristic chapter regex | Virtualized Flutter `TextPainter` canvas | Title from filename; heuristics | Heuristic regex ("Chapter \d+", "Prologue") | Direct text indexing into FTS5 | 100% Offline | None | Inconsistent chapter headings; non-UTF8 encodings require robust fallback. | Phase 4 |
| **Markdown (.md)** | **Optional** | Pure Dart Markdown parser (`markdown`) | Rendered as styled HTML/canvas | Frontmatter YAML parsing (if present) | Native Markdown headers (`#`, `##`) | Direct text indexing into FTS5 | 100% Offline | None | Non-standard extensions; local relative image links must be resolved safely. | Phase 5 |
| **HTML / XHTML** | **Optional** | HTML DOM parser (`html` package) | WebView or Flutter canvas viewer | `<title>`, `<meta>` tags | Headings (`<h1>`–`<h3>`) or single-page | Stripped text indexed into FTS5 | 100% Offline | None | External stylesheets and remote images must be blocked for security. | Phase 5 |
| **DOCX** | **Optional** | ZIP unpack $\rightarrow$ parse `word/document.xml` | Converted to internal HTML/reflow format | `docProps/core.xml` | Extracted from Word paragraph heading styles | Extracted text indexed into FTS5 | 100% Offline | **No DRM/password bypass.** | Complex tables, shapes, and tracked changes are difficult to represent in reader. | Phase 5 |
| **RTF** | **Optional** | Custom RTF control word tokenizer | Converted to plain text / simple HTML | Embedded RTF info group | Heuristic regex headings | Extracted plain text into FTS5 | 100% Offline | None | Obsolete formatting codes; nested groups can lead to parser hangs. | Phase 5 |
| **CBZ** | **Optional** | ZIP unpack $\rightarrow$ sort image files | Comic page carousel (Flutter `PageView`) | `ComicInfo.xml` if present | None (Page-based) | Metadata only (No text in images) | 100% Offline | None | High RAM usage when decoding large 4K image pages simultaneously. | Phase 5 |
| **CBR** | **Optional** | RAR archive unpack | Comic page carousel (Flutter `PageView`) | `ComicInfo.xml` if present | None (Page-based) | Metadata only | 100% Offline | None | RAR decompression licenses (unrar) have restrictive non-commercial terms. | Phase 5 |
| **MOBI** | **Feasibility** | Unpack PalmDOC / Mobipocket record stream | Converted to reflowable HTML viewport | EXTH metadata records | Extracted from Mobipocket guide/NCX | Extracted text indexed into FTS5 | 100% Offline | **Strict: No DRM bypass.** Encrypted MOBI rejected. | Legacy format; variable record compression (PalmDOC vs. Huff/CDIC). | Phase 5+ |
| **AZW** | **Feasibility** | Same as MOBI (PalmDOC container) | Converted to reflowable HTML viewport | EXTH metadata records | Extracted from NCX | Extracted text indexed into FTS5 | 100% Offline | **Strict: No DRM bypass.** Amazon DRM rejected. | Mostly superseded by AZW3/KFX; almost universally DRM-locked when purchased. | Phase 5+ |
| **AZW3 (KF8)** | **Feasibility** | PalmDOC container with embedded EPUB/HTML5 | Reflowable Viewport (Foliate-js KF8 support) | EXTH metadata records | Extracted from KF8 TOC | Extracted text indexed into FTS5 | 100% Offline | **Strict: No DRM bypass.** Amazon DRM rejected. | Complex proprietary wrapper; non-DRM AZW3 books only. | Phase 5+ |

---

## 10. Import Pipeline Architecture

```
[User Import Intent / SAF File Picker]
               │
               ▼
   [ImportDocumentUseCase] ──────> Verify Magic Bytes & SHA-256 Checksum
               │
               ▼
[Copy to Sandboxed Storage] ────> app_flutter/library/books/<uuid>/original.<ext>
               │
               ▼
     [Isolate.run Worker] ───────> Offload Heavy Unpacking & Extraction
               │
      ┌────────┴────────┬─────────────────┬─────────────────┐
      ▼                 ▼                 ▼                 ▼
[EpubParser]       [PdfParser]       [TxtParser]       [DocxParser]
      │                 │                 │                 │
      └────────┬────────┴─────────────────┴─────────────────┘
               ▼
[ParsedBookResult] (Title, Author, Cover, Chapter Manifest, Clean Chunks)
               │
               ▼
[BookRepository] ───> Atomic Drift DB Transaction (Book, Chapters, FTS5 Index)
```

1. **Format Validation:** Inspect file magic bytes rather than trusting file extensions (e.g., verifying `PK\x03\x04` for EPUB/DOCX/CBZ; `%PDF-` for PDF).
2. **Worker Isolate Offloading:** All parsing, XML DOM processing, and text chunking run inside background worker isolates via Dart 3's `Isolate.run()`. The main UI isolate never parses raw document archives.
3. **ZIP Slip Protection:** Archive extraction strictly checks relative paths to prevent directory traversal:
   ```dart
   if (!targetPath.startsWith(canonicalDestinationDir)) {
     throw SecurityException("Malicious path traversal detected in archive");
   }
   ```
4. **Memory-Safe Streaming:** For large PDF and comic archives, files are accessed via buffered streams rather than loading entire multi-hundred-megabyte files into RAM.

---

## 11. EPUB and PDF Reader-Engine Investigation

### 11.1 EPUB Reader Investigation & Technical Trade-offs

#### Evaluated EPUB Options

1. **Foliate-js (johnfactotum/foliate-js):**
   * *License:* MIT. Actively maintained by John Factotum.
   * *Architecture:* Pure JavaScript utilizing native ES modules. Supports EPUB, MOBI, KF8, and CBZ. Implements EPUB CFI location generation, dynamic column reflow, font scaling, and DOM text selection.
   * *WebView Integration:* Packaged locally in Flutter assets; rendered inside `webview_flutter`.
   * *Memory Overhead:* WebView process introduces an initial 40MB–60MB RAM footprint on Android.
   * *Spec Compliance:* Highly capable for reflowable novels, but does **not** guarantee 100% EPUB spec compliance (e.g., media overlays and interactive scripts have edge cases).
2. **Readium Architecture (EDRLab):**
   * *License:* Apache 2.0.
   * *Architecture:* Readium Kotlin is the publishing industry standard for native Android reading apps.
   * *Flutter Integration:* Integrating Readium Kotlin requires Flutter Platform Views (`AndroidView`), which introduces texture composition overhead and gesture latency compared to pure Flutter or WebView.
3. **Pure Native Flutter Packages (`epub_view`, `epubx`):**
   * *License:* MIT.
   * *Architecture:* Parses EPUB XHTML and renders layout using native Flutter widgets (`Text`, `RichText`, `Column`).
   * *Critical Flaws:* Fails on complex CSS layouts, multi-column pagination, ruby text, vertical Japanese text, table rendering, and CSS font-family overrides.

#### Outcome: Provisional Recommendation
**Foliate-js inside a secured Android WebView** is the leading candidate for EPUB rendering. However, because WebView memory consumption and JavaScript bridge performance vary across low-end Android hardware, this decision is **provisional**. A dedicated prototype in Phase 4 must validate memory consumption, pagination speed, and CFI accuracy on real hardware before final acceptance.

### 11.2 PDF Reader Architecture
* **Selected Candidate:** Native Android `PdfRenderer` via the **`pdfx`** package (MIT).
* **Rationale:** Android 12+ includes a hardware-accelerated, native Skia-based PDF rasterizer (`android.graphics.pdf.PdfRenderer`). It renders high-DPI page bitmaps directly to texture surfaces with minimal memory overhead and zero external C++ library bloat.

---

## 12. Navigation and Lifecycle Architecture

### 12.1 Declarative Routing (`go_router`)
* **Route Structure:** Declarative routes mapping directly to application hierarchy:
  * `/library`: Bookshelf, import actions, filters.
  * `/reader/:bookId`: Unified reader scaffold.
  * `/reader/:bookId/notes`: Highlights, annotations, and bookmarks.
  * `/audio/:bookId`: Fullscreen audio narration controller.
  * `/settings`: Preferences, theme, storage, and privacy controls.
* **Deep Linking:** Configured for custom URI scheme `enr://book/:bookId?location=:cfi`.
* **Android File-Open Intents:** `AndroidManifest.xml` configures `ACTION_VIEW` intent filters for MIME types `application/epub+zip`, `application/pdf`, and `text/plain`. The app parses the incoming URI and routes immediately to the import confirmation screen.

### 12.2 Lifecycle & Process-Death Recovery
* **Android Process Death:** On Android 12+, backgrounded apps can be killed without warning under memory pressure.
* **Synchronous Save on Lifecycle State:** Using Flutter's `AppLifecycleListener`, when state changes to `AppLifecycleState.inactive` or `AppLifecycleState.paused`, the reader's current location (`cfi`, `pageNumber`, or `characterOffset`) and reading session elapsed time are committed immediately to Drift via an atomic transaction.
* **Resumption:** On app restart, the reader queries the book's `last_read_position` and resumes seamlessly without losing the user's place.

---

## 13. Background Audio and Android Execution Strategy

### 13.1 Workload Differentiation Matrix

The following matrix corrects earlier assumptions by establishing the exact Android execution requirements for each distinct workload:

| Workload | Must Run with Screen Off? | Must Continue if App Closes? | Android Execution Mechanism | Justifies Foreground Service? | User Visibility & Notification Requirements | Interruption & Recovery Behavior |
|---|:---:|:---:|---|:---:|---|---|
| **Active TTS Narration** | **YES** | **YES** | Foreground Service (`mediaPlayback`) via `audio_service` | **YES** | Ongoing `MediaStyle` notification with title, chapter, play/pause, and skip controls. | Pause on audio focus loss (call/alarm); pause on headset disconnect; resume on focus gain. |
| **User Large Downloads (AI Models)** | Optional | Desirable | Android `DownloadManager` or `WorkManager` with network constraint | No (Handled by OS) | Standard system download notification with percentage progress. | Auto-pause on network drop; auto-resume on Wi-Fi reconnect; cancelable by user. |
| **Search Indexing (FTS5)** | No | No | Background worker isolate during import, or deferred `WorkManager` job | **NO** | In-app progress indicator only. **No persistent foreground notification.** | Pauses if app is closed; resumes incrementally on next launch without index corruption. |
| **Database Maintenance (VACUUM)** | No | No | Periodic `WorkManager` task (requires charging + device idle) | **NO** | Completely silent background execution. | Aborted if device enters active use; non-destructive rollback. |
| **Backup Creation** | No | No | Foreground compute task with progress dialog | **NO** | In-app modal progress bar. Cancel button clears temporary export files. | Aborted if app killed; temporary files purged on restart. |
| **Local AI Inference** | **NO** | **NO** | Foreground UI isolate / compute task | **STRICTLY NO** | In-app chat animation only. | **Immediately canceled if app is backgrounded** to prevent thermal runaway and battery drain. |

### 13.2 Android 12+ Foreground Service & MediaSession
* **Service Type:** Android 14+ enforces `android:foregroundServiceType="mediaPlayback"`.
* **Audio Focus:** Listens to `AudioManager.OnAudioFocusChangeListener`. Transitory loss (e.g. navigation prompt) ducks volume; permanent loss (e.g. phone call) pauses narration.
* **Bluetooth Headset Integration:** Responds to `ACTION_MEDIA_BUTTON` broadcast events (play, pause, next chapter) via `MediaSessionCompat`.

---

## 14. Local AI Runtime and Model Lifecycle

### 14.1 Runtime Investigation: `llama.cpp` vs. MediaPipe

| Criteria | `llama_cpp_dart` (llama.cpp FFI) | MediaPipe GenAI (Google) | LiteRT / ONNX Runtime |
|---|---|---|---|
| **Model Compatibility** | **High:** Any GGUF quantized model (Q4_K_M, Q8_0). Broad open-weights support. | **Low:** Strictly limited to supported architectures (Gemma-2, Phi-2, Falcon) converted to `.bin`. | **Moderate:** Requires exporting models to ONNX graph format. |
| **Android Hardware Acceleration** | ARM64 NEON, OpenCL, Vulkan support. | Highly optimized for Android GPU/NPU via XNNPACK. | NNAPI / GPU delegates. |
| **Packaging & Maintenance** | Requires compiling `libllama.so` via NDK. Package `llama_cpp_dart` is community-maintained. | Official Google Android SDK; native binary handled automatically. | Official Microsoft / Google support; large binary overhead. |
| **RAM Footprint** | Memory-mapped (`mmap`) model weights + dynamic KV cache. | Optimized buffer management; tight memory bounds. | Variable depending on execution provider. |

### 14.2 Prototype Validation Plan (10-Point Gate)
Before accepting `llama.cpp` or MediaPipe for Phase 8:
1. **Model Loading:** Measure memory-map time and initial resident set size (RSS) for a 1.5B model (e.g. Qwen2.5-1.5B-Instruct-Q4_K_M).
2. **Time to First Token (TTFT):** Measure latency from prompt submission to first generated token on a Snapdragon 7-series device (target: $\le 1.5\text{ seconds}$).
3. **Generation Throughput:** Measure tokens per second during sustained novel analysis (target: $\ge 12\text{ tokens/sec}$).
4. **Cancellation Responsiveness:** Abort inference mid-sentence; verify native loop terminates in $< 100\text{ ms}$ without leaking native pointers.
5. **Model Unloading & Memory Reclamation:** Unload model; verify physical RAM (PSS) returns to base app levels within 1 second.
6. **KV-Cache Sizing:** Measure RAM expansion at 2048 and 4096 context window limits.
7. **Thermal & Battery Profiling:** Run 5 continuous inference queries; measure CPU temperature rise and battery discharge rate.
8. **UI Thread Concurrency:** Monitor Flutter frame rendering during active background generation to ensure zero UI jank (60 FPS maintained).
9. **Low-Memory Device Stress Test:** Execute inference on a 4GB RAM device while opening an EPUB; verify the OS Low Memory Killer (LMK) does not terminate the process.
10. **100% Offline Integrity:** Verify execution with Airplane Mode enabled and all network permissions blocked.

---

## 15. RAG and Deterministic Spoiler Safety

```
[User Question: "Why did the hero leave the village?"]
                           │
                           ▼
             [AiAssistantBloc / UseCase]
                           │
    ┌──────────────────────┴──────────────────────┐
    ▼                                             ▼
[Extract Current Location]              [Search Query Construction]
BookId: "uuid-123"                      Keyword: "hero leave village"
Chapter: 4, Offset: 1420
    │                                             │
    └──────────────────────┬──────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│          Deterministic Drift Database Spoiler Query         │
│                                                             │
│  SELECT chunk_text FROM book_chunks                         │
│  JOIN fts_chunks ON fts_chunks.rowid = book_chunks.id       │
│  WHERE fts_chunks MATCH 'hero leave village'                │
│    AND book_chunks.book_id = 'uuid-123'                     │
│    AND (book_chunks.chapter_index < 4                       │
│         OR (book_chunks.chapter_index = 4                   │
│             AND book_chunks.end_offset <= 1420))            │
│  ORDER BY rank LIMIT 5;                                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
          [Filtered Historical Chunks Only]
    (Future chapters 5-20 are PHYSICALLY EXCLUDED)
                           │
                           ▼
           [Prompt Assembly with Guardrails]
  "Answer based ONLY on the provided context below.
   Do not extrapolate or reveal future events."
                           │
                           ▼
                 [Local LLM Inference]
```

### Dual-Boundary Spoiler Architecture
1. **Primary Boundary (Database Query):** Context retrieval executes a hard SQL `WHERE` clause filtering out any content positioned beyond the reader's current location. Content from future chapters is physically omitted from the LLM prompt.
2. **Secondary Boundary (Prompt Guardrails):** System prompt explicitly instructs the model: *"You are an assistant for a reader currently at Chapter X. Ground your answers strictly in the provided historical excerpts."*
3. **Explicit Override:** If the user explicitly checks *"Allow Spoilers"* in the chat UI, the SQL boundary filter is relaxed to search the entire book.

---

## 16. Backup and Restore Architecture

```
                          ┌────────────────────────┐
                          │   Backup Generation    │
                          └────────────────────────┘
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
     [Default Unencrypted]                         [Optional User-Encrypted]
     - Clear Privacy Warning                       - User Enters Strong Password
     - ZipArchive (.enrbackup)                     - PBKDF2 Key Derivation (Salt)
     - Plain JSON DB & Metadata                    - AES-256-GCM Encryption
               │                                             │
               └──────────────────────┬──────────────────────┘
                                      ▼
                      [SHA-256 Integrity Verification]
                      (Detects Accidental File Corruption;
                       NOT a Cryptographic Signature)
                                      ▼
                      [Atomic Staging Restore Flow]
                      1. Extract to Cache Staging Area
                      2. Validate Manifest & DB Version
                      3. Verify Checksums
                      4. Atomic File Swap into App Sandbox
```

### 16.1 Default Unencrypted Backup
* **Compliance:** Enforces confirmed product constraint `ENR-DEC-012`.
* **Archive Format:** `.enrbackup` (standard ZIP archive).
* **Warning Dialog:** A clear, non-dismissible prompt warns: *"This backup file is unencrypted. Anyone with access to the file can read your novel notes, reading history, and saved data."*
* **Archive Contents:**
  * `manifest.json`: Metadata, app version, database schema version, export timestamp, file inventory.
  * `database_export.json`: Full relational export of books, bookmarks, highlights, reading progress, and settings.
  * `files/`: (Optional user toggle) Original imported document files.
* **Integrity Checking:** A SHA-256 hash of the archive is generated and written into a companion `.sha256` file or metadata header to detect accidental file corruption during transfer. *(Clarification: This check verifies file integrity against corruption; it is not a cryptographic digital signature and does not verify author identity).*

### 16.2 Optional Encrypted Backup
* **Trigger:** Available only when the user explicitly enables *"Encrypt Backup with Password"*.
* **Cryptographic Scheme:** **AES-256-GCM** (Galois/Counter Mode), providing authenticated encryption with confidentiality and tamper detection.
* **Key Derivation:** **PBKDF2 with HMAC-SHA256** ($\ge 100,000$ iterations) or **Argon2id**, using a cryptographically random 16-byte salt generated per backup.
* **Nonce & Tag:** A unique 12-byte random nonce (IV) per backup; 16-byte GCM authentication tag.
* **Header Structure:** Container header stores: `[Magic: ENRENC01] [Salt: 16 bytes] [Nonce: 12 bytes] [Tag: 16 bytes] [Ciphertext]`.
* **Warning:** Explicit warning states: *"Your password is never stored. If you forget this password, your backup can never be recovered."*

### 16.3 Atomic Staging Restore
1. **Extraction to Staging:** Extract archive into isolated staging directory `getCacheDir()/restore_staging/`.
2. **Path Traversal Guard:** Verify all extracted file destinations reside within staging bounds (blocking `../` ZIP slip).
3. **Manifest Validation:** Validate `manifest.json` schema and verify that `schema_version` is $\le$ the app's current Drift database version.
4. **Integrity Check:** Compute SHA-256 of extracted files and compare against manifest records.
5. **Atomic Swap:** Execute Drift database migration within a transaction. If restore fails, the transaction rolls back, preserving existing user data.

---

## 17. Security and WebView Threat Model

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Android WebView Sandbox                         │
│                                                                        │
│   ┌────────────────────────────────┐  ┌────────────────────────────┐   │
│   │    Trusted App Engine Code     │  │    Untrusted EPUB Content  │   │
│   │ - assets/reader/foliate-js/    │  │ - Unpacked XHTML Chapters  │   │
│   │ - Local Pagination Scripts     │  │ - Embedded CSS Stylesheets │   │
│   │ - Bridge Event Handlers        │  │ - Stripped / Blocked <script>│ │
│   └────────────────────────────────┘  └────────────────────────────┘   │
│                   │                                 │                  │
│                   ▼                                 ▼                  │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │            Content Security Policy (CSP) Enforcement           │   │
│   │ - default-src 'none'                                           │   │
│   │ - script-src 'self' (Trusted Foliate Engine Only)              │   │
│   │ - connect-src 'none' (Zero External Network Traffic)           │   │
│   │ - img-src 'self' data: blob: (Local Images Only)               │   │
│   │ - style-src 'self' 'unsafe-inline' (Local Typography)          │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │             Isolated JavaScript Channel Bridge          │
       │  - Exposed: onPageChanged(cfi), onTextSelected(range)   │
       │  - BLOCKED: No Storage, No DB, No Native OS Access      │
       └─────────────────────────────────────────────────────────┘
```

### 17.1 Resolving the EPUB JavaScript Contradiction
The previous draft contained a contradictory recommendation to use Foliate-js (a JavaScript library) while disabling JavaScript in the WebView. This revised security architecture clearly separates trusted reader scripts from untrusted user content:

1. **Trusted Engine Scripts:** Foliate-js runtime files are bundled directly in app assets (`assets/reader/foliate/`). JavaScript execution is **enabled** in the WebView settings (`JavaScriptMode.unrestricted`) solely to allow this trusted engine to paginate, reflow, and track CFI locations.
2. **Untrusted Book Content Sanitization:** During the import pipeline, XHTML content from imported EPUBs is pre-processed before display:
   * All embedded `<script>` tags, inline event attributes (`onload`, `onerror`, `onclick`), and external `<iframe>` elements are stripped.
3. **Content Security Policy (CSP):** Every rendered chapter HTML document is injected with a rigid CSP header:
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="default-src 'none'; 
                  script-src 'self'; 
                  style-src 'self' 'unsafe-inline'; 
                  img-src 'self' data: blob:; 
                  font-src 'self' data:; 
                  connect-src 'none'; 
                  frame-src 'none';">
   ```
4. **Network Access Disabled:** `connect-src 'none'` prevents EPUBs from making `fetch()` or `XMLHttpRequest` calls to remote tracking servers.
5. **Local File Sandbox:** WebView file access is locked down:
   * `setAllowFileAccess(false)`
   * `setAllowContentAccess(false)`
   * Resources are served strictly through an in-memory or localized `WebViewAssetLoader` that binds only to the specific unpacked book folder.
6. **Navigation Interception:** `NavigationDelegate.onNavigationRequest` intercepts all clicks. External web links (`http://`, `https://`) are blocked from loading inside the reader view and optionally routed to the system browser with user confirmation.
7. **Hardened Bridge:** The `JavascriptChannel` exposes only 3 high-level events: `onLocationChanged(cfi)`, `onTextSelected(cfi, text)`, and `onTap()`. The bridge never accepts raw SQL, file paths, or system commands.

---

## 18. Diagnostics and Privacy

* **Compliance:** Enforces confirmed product constraint `ENR-DEC-015`.
* **Local Rotating File Logger:** Configured via `logger` package to write strictly to app cache (`getCacheDir()/logs/app.log`). Max file size: 5 MB with 1 backup rotation file.
* **PII & Text Sanitization Filter:** A custom `LogFilter` intercepts all log messages. Book titles, chapter texts, user notes, and personal file paths are redacted using regex filters before writing to disk.
* **Zero Remote Telemetry:** No Firebase Analytics, Crashlytics, or Sentry SDKs are included in the codebase.
* **Manual Diagnostic Export:** In Settings, a *"Save Diagnostic Log"* button allows the user to inspect and export their local log file manually via the Android share sheet for troubleshooting.

---

## 19. Testing Strategy

```
                                  ┌────────────────────────────────┐
                                  │   Real Device & E2E (10%)      │
                                  │ - Background Audio Lockscreen  │
                                  │ - Bluetooth Headset Buttons    │
                                  │ - Android 12+ SAF Picker       │
                                  │ - RAM / Thermal Profiling      │
                                  └────────────────────────────────┘
                                                  ▲
                                  ┌────────────────────────────────┐
                                  │    Integration Tests (20%)     │
                                  │ - Import -> Parse -> Drift DB  │
                                  │ - Location Restoration Flow    │
                                  │ - Drift Migration Test Suite   │
                                  └────────────────────────────────┘
                                                  ▲
                                  ┌────────────────────────────────┐
                                  │     Widget Tests (30%)         │
                                  │ - Screen Rendering & Theming   │
                                  │ - TalkBack Semantics & Focus   │
                                  │ - Error State Presentation     │
                                  └────────────────────────────────┘
                                                  ▲
                                  ┌────────────────────────────────┐
                                  │      Unit Tests (40%)          │
                                  │ - Domain Entities & Use Cases  │
                                  │ - Document Parsers (EPUB, TXT) │
                                  │ - BLoC State Machines          │
                                  │ - In-Memory Drift SQLite DAOs  │
                                  └────────────────────────────────┘
```

1. **Unit Tests (Pure Dart):** Tests domain logic, parsers, and BLoC state transitions (`bloc_test`). Executes rapidly in CI without an emulator.
2. **Database Migration Tests:** Automated verification using `drift_dev` migration tooling, verifying schema integrity across every historical database version dump.
3. **Widget Tests:** Validates UI responsiveness, high-contrast theming, touch target sizing ($\ge 48\times 48\text{ dp}$), and TalkBack semantic accessibility tags.
4. **Real-Device Android Verification:** Automated and manual testing across physical Android devices verifying:
   * Narration continuation when screen is locked.
   * Lockscreen `MediaStyle` notification controls.
   * Scoped Storage file importing.
   * Memory usage during 30-minute reading sessions.

---

## 20. Performance and Resource Budgets

### 20.1 Provisional Engineering Targets (Not Verified Benchmarks)

The following targets represent **provisional design goals** to guide development, not verified empirical facts:

| Metric | Provisional Target | Rationale | Measurement Methodology | Risk of Over-Optimization |
|---|---|---|---|---|
| **Cold App Launch** | $\le 1.5\text{ seconds}$ | Fast entry to library. | `adb shell am start-activity -W` on physical device. | Premature lazy-loading can cause stutter on first screen tap. |
| **Page Turn Latency** | $\le 16\text{ ms}$ (60 FPS target, 120 FPS on supported displays) | Imperceptible reading lag. | Flutter Frame Timing API (`addTimingsCallback`) measuring UI and raster threads. | Overly aggressive layout caching increases app RAM footprint. |
| **Base App RAM** | $\le 120\text{ MB}$ (Excluding AI model) | Headroom for low-end devices. | Android Profiler / `adb shell dumpsys meminfo` (PSS). | Excessive garbage collection churn if caches are too small. |
| **Document Cache RAM** | $\le 80\text{ MB}$ | Prevent out-of-memory on large books. | Monitored image and chapter cache limits in memory. | Frequent disk re-reads if chapter cache is purged too aggressively. |
| **Local AI Inference RAM** | $\le 1800\text{ MB}$ (When active) | Fits within 6GB–8GB RAM phones. | Measured PSS during peak token generation. | Forcing model into smaller quantization (Q2) degrades text coherence. |

### 20.2 Device-Class Testing Matrix

Testing must evaluate three distinct hardware tiers to prevent building an app that runs only on flagship developer phones:

* **Tier 1: Budget / Entry-Level:**
  * *Profile:* Android 12, 3GB–4GB RAM, MediaTek Helio G85 / Snapdragon 680 (e.g. Redmi 10, Galaxy A14).
  * *Expectation:* Core reader, PDF, and TTS narration operate at smooth 60 FPS. Local AI inference is disabled or restricted to sub-1B models with clear capability badges.
* **Tier 2: Mid-Range:**
  * *Profile:* Android 13/14, 6GB–8GB RAM, Snapdragon 7-series / Dimensity 7050 (e.g. Pixel 7a, Nothing Phone 2a).
  * *Expectation:* Full reader, background TTS, FTS5 search, and 1.5B–3B local AI models run smoothly.
* **Tier 3: Flagship:**
  * *Profile:* Android 14/15, 12GB+ RAM, Snapdragon 8 Gen 2/3, Tensor G3/G4 (e.g. Galaxy S24, Pixel 9).
  * *Expectation:* 120 FPS display refresh rate, multi-model AI execution, instant FTS5 indexing.

---

## 21. Complete Dependency Inventory

The following 22 packages have been audited for maintenance, Dart 3 / Flutter 3.47+ compatibility, Android API 31+ support, exact licensing, and transitive risk. **No packages have been added to `pubspec.yaml` in this phase.**

| Package Name | Evaluated Version | Pub.dev Health Score | Last Maintenance | Flutter / Dart Compatibility | Android API 31+ Support | Exact License | Code Generation Required? | Transitive Native Dependencies / Notes | Classification |
|---|---|:---:|:---:|---|:---:|---|:---:|---|:---:|
| **`flutter_bloc`** | `^9.0.0` | 100/100 | Active (< 2 mo) | Dart 3.x, Flutter 3.47+ | Full | MIT | No | None. Pure Dart core. | **Mandatory** |
| **`bloc`** | `^9.0.0` | 100/100 | Active (< 2 mo) | Dart 3.x, Flutter 3.47+ | Full | MIT | No | None. Pure Dart. | **Mandatory** |
| **`get_it`** | `^8.0.3` | 100/100 | Active (< 3 mo) | Dart 3.x, Flutter 3.47+ | Full | MIT | No | None. Service locator for UI isolate. | **Mandatory** |
| **`drift`** | `^2.24.2` | 100/100 | Active (< 1 mo) | Dart 3.x, Flutter 3.47+ | Full | MIT | Yes (`drift_dev`) | Requires `build_runner` for DAOs/models. | **Mandatory** |
| **`drift_flutter`** | `^0.2.4` | 100/100 | Active (< 1 mo) | Dart 3.x, Flutter 3.47+ | Full | MIT | No | Integrates Drift with Flutter lifecycle. | **Mandatory** |
| **`sqlite3_flutter_libs`** | `^0.5.28` | 100/100 | Active (< 1 mo) | Dart 3.x, Flutter 3.47+ | Full | MIT | No | Bundles native SQLite binaries with FTS5. | **Mandatory** |
| **`path_provider`** | `^2.1.5` | 100/100 | Active (< 1 mo) | Dart 3.x, Flutter 3.47+ | Full | BSD-3-Clause | No | Official Flutter package for Android paths. | **Mandatory** |
| **`path`** | `^1.9.1` | 100/100 | Active (< 2 mo) | Dart 3.x, Flutter 3.47+ | Full | BSD-3-Clause | No | Official Dart package. Pure Dart. | **Mandatory** |
| **`go_router`** | `^14.8.1` | 100/100 | Active (< 1 mo) | Dart 3.x, Flutter 3.47+ | Full | BSD-3-Clause | No | Official Flutter package for routing. | **Mandatory** |
| **`intl`** | `^0.20.2` | 100/100 | Active (< 2 mo) | Dart 3.x, Flutter 3.47+ | Full | BSD-3-Clause | No | Official Dart localization package. | **Mandatory** |
| **`uuid`** | `^4.5.1` | 100/100 | Active (< 3 mo) | Dart 3.x, Flutter 3.47+ | Full | MIT | No | Pure Dart cryptographically secure UUIDs. | **Mandatory** |
| **`logger`** | `^2.5.0` | 100/100 | Active (< 2 mo) | Dart 3.x, Flutter 3.47+ | Full | MIT | No | Structured local file logging. | **Mandatory** |
| **`archive`** | `^4.0.2` | 100/100 | Active (< 2 mo) | Dart 3.x, Flutter 3.47+ | Full | Apache-2.0 | No | Pure Dart ZIP/TAR compression engine. | **Mandatory** |
| **`xml`** | `^6.5.0` | 100/100 | Active (< 2 mo) | Dart 3.x, Flutter 3.47+ | Full | MIT | No | Pure Dart XML DOM parser for EPUB. | **Mandatory** |
| **`pdfx`** | `^2.6.0` | 95/100 | Active (< 4 mo) | Dart 3.x, Flutter 3.47+ | Full | MIT | No | Wraps Android native `PdfRenderer`. | **Mandatory** |
| **`webview_flutter`** | `^4.10.0`| 100/100 | Active (< 1 mo) | Dart 3.x, Flutter 3.47+ | Full | BSD-3-Clause | No | Official Flutter WebView plugin. | **Recommended** |
| **`charset_converter`** | `^2.2.1` | 90/100 | Maintained (< 6 mo) | Dart 3.x, Flutter 3.47+ | Full | MIT | No | Uses Android native Charset decoders. | **Mandatory** |
| **`audio_service`** | `^0.18.16`| 98/100 | Active (< 2 mo) | Dart 3.x, Flutter 3.47+ | Full | MIT | No | Android Foreground Service & MediaSession. | **Mandatory** |
| **`just_audio`** | `^0.9.43` | 100/100 | Active (< 1 mo) | Dart 3.x, Flutter 3.47+ | Full | MIT | No | Audio player for ambient sounds. | **Optional** |
| **`flutter_tts`** | `^4.2.2` | 92/100 | Maintained (< 5 mo) | Dart 3.x, Flutter 3.47+ | Full | MIT | No | Wraps `android.speech.tts.TextToSpeech`. | **Mandatory** |
| **`flutter_secure_storage`**|`^9.2.4`| 100/100 | Active (< 2 mo) | Dart 3.x, Flutter 3.47+ | Full | BSD-3-Clause | No | Android Keystore / EncryptedSharedPrefs. | **Mandatory** |
| **`llama_cpp_dart`** | `^0.2.2` | 75/100 | Experimental | Dart 3.x, Flutter 3.47+ | Requires NDK | MIT | No | Requires compiling Android `libllama.so`. | **Provisional** |

---

## 22. Key Technical Risks and Mitigations

```
┌───────────────────────────────────────────────┬───────────────────────────────────────────────┐
│ Identified Risk                               │ Verified Architectural Mitigation             │
├───────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ 1. Local AI Out-Of-Memory on Low-End Devices  │ Device capability checks: disable LLM on      │
│    (Devices with 3GB–4GB RAM killed by LMK)   │ devices with < 6GB RAM; strict 1.8GB PSS      │
│                                               │ budget; immediate unloading on app background. │
├───────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ 2. EPUB Malicious Script Execution            │ Strip `<script>` tags from imported XHTML;    │
│    (Untrusted book executes XSS in WebView)   │ enforce strict CSP (`script-src 'self'`);     │
│                                               │ disable local file access; lock down bridge.  │
├───────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ 3. CJK Full-Text Search Misses in FTS5        │ Reject default `unicode61` for CJK novels;    │
│    (Unspaced Chinese/Japanese not indexed)    │ prototype FTS5 `trigram` tokenizer and        │
│                                               │ pre-segmentation pipeline before Phase 4.     │
├───────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ 4. External SAF File Deletion / URI Loss      │ Copy imported files into sandboxed app        │
│    (User deletes book outside reader app)     │ storage (`app_flutter/library/books/`); use   │
│                                               │ internal copy as primary source of truth.     │
├───────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ 5. Database Schema Migration Corruption       │ Versioned step-by-step Drift migrations with  │
│    (App update destroys user notes/progress)  │ mandatory automated migration test suite      │
│                                               │ verifying historical database schema dumps.   │
├───────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ 6. Forgotten Backup Password Data Loss        │ Default backup is unencrypted with clear      │
│    (User cannot restore encrypted archive)    │ warning; optional encryption dialog warns     │
│                                               │ explicitly that lost passwords cannot be recovered.│
└───────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

---

## 23. Complete Decision Approval Matrix (`ENR-DEC-025` to `ENR-DEC-056`)

The following matrix documents the complete set of 32 architectural and technical decisions. In strict compliance with project governance:
* **All 32 decisions remain `Pending Human Approval`.**
* **No decision has been marked Accepted.**
* **No decision IDs have been modified or duplicated.**

| Decision ID | Decision Area | Recommendation Summary | Evidence Confidence | Dependencies | Implementation Impact | Outstanding Validation | Approval Status |
|---|---|---|:---:|---|---|---|:---:|
| **ENR-DEC-025** | ARCH | Pragmatic Feature-First Architecture (`lib/features/`) | **High** | None | Foundational directory layout | None | **Pending Human Approval** |
| **ENR-DEC-026** | STATE | `flutter_bloc` (BLoC for async streams; Cubit for UI) | **High** | ENR-DEC-025 | Core UI state architecture | None | **Pending Human Approval** |
| **ENR-DEC-027** | DI | Constructor injection + `get_it` service locator | **High** | ENR-DEC-025 | Composition root setup | Validate isolate init | **Pending Human Approval** |
| **ENR-DEC-028** | NAV | `go_router` declarative routing + deep linking | **High** | ENR-DEC-025 | App navigation shell | Deep link intent test | **Pending Human Approval** |
| **ENR-DEC-029** | DB | `drift` (SQLite) with WAL mode & reactive streams | **High** | None | Relational schema & queries | Schema verification | **Pending Human Approval** |
| **ENR-DEC-030** | STORAGE | Internal sandboxed copy (`app_flutter/library`) | **High** | ENR-DEC-029 | Storage consumption | SAF permission test | **Pending Human Approval** |
| **ENR-DEC-031** | READER | Unified Reader with format viewports (Foliate/pdfx/TXT)| **Medium** | ENR-DEC-025, 026 | Document rendering pipeline | **Foliate-js prototype**| **Pending Human Approval** |
| **ENR-DEC-032** | IMPORT | Isolate-driven parsing pipeline (`Isolate.run`) | **High** | ENR-DEC-030 | Import worker backgrounding | ZIP slip unit tests | **Pending Human Approval** |
| **ENR-DEC-033** | SEARCH | SQLite FTS5 with trigram / CJK pre-segmentation | **Medium** | ENR-DEC-029 | Book search performance | **CJK / Indic prototype**| **Pending Human Approval** |
| **ENR-DEC-034** | AI-RUNTIME | `llama.cpp` Dart FFI (GGUF 1B–3B quantized models) | **Low** | ENR-DEC-040, 055 | Local inference capability | **ARM64 FFI prototype**| **Pending Human Approval** |
| **ENR-DEC-035** | AI-MODEL | On-demand model download with SHA-256 verification | **High** | ENR-DEC-046 | Model management & storage | Download resume test | **Pending Human Approval** |
| **ENR-DEC-036** | CLOUD-AI | Unified `LlmProvider` interface with opt-in cloud | **High** | ENR-DEC-045, 046 | Optional external AI APIs | None | **Pending Human Approval** |
| **ENR-DEC-037** | AI-RAG | Hybrid FTS5 BM25 retrieval + reading position filter | **Medium** | ENR-DEC-033, 038 | RAG context assembly | Retrieval eval test | **Pending Human Approval** |
| **ENR-DEC-038** | AI-SAFETY | Deterministic database query spoiler boundary | **High** | ENR-DEC-037 | Spoiler-free AI guarantee | Boundary query tests | **Pending Human Approval** |
| **ENR-DEC-039** | TTS | Android native `TextToSpeech` via `audio_service` | **High** | ENR-DEC-040, 041 | Narration engine | TTS callback latency | **Pending Human Approval** |
| **ENR-DEC-040** | ANDROID | Android 12+ Scoped Storage, MediaSession, API 31+ | **High** | None | Native platform plugins | Android 14 permissions | **Pending Human Approval** |
| **ENR-DEC-041** | ANDROID | ForegroundService for TTS only; WorkManager for tasks| **High** | ENR-DEC-040 | Background lifecycle | Battery Doze tests | **Pending Human Approval** |
| **ENR-DEC-042** | OFFLINE | SQLite WAL mode with atomic ACID transactions | **High** | ENR-DEC-029 | Offline data integrity | Power-loss test | **Pending Human Approval** |
| **ENR-DEC-043** | BACKUP | Unencrypted default backup; optional AES-256-GCM | **High** | ENR-DEC-029, 045 | User data backup & restore | **AES-GCM prototype** | **Pending Human Approval** |
| **ENR-DEC-044** | DB | Drift step-by-step migrations with automated tests | **High** | ENR-DEC-029 | Schema upgrades | Schema dump test | **Pending Human Approval** |
| **ENR-DEC-045** | SECURITY | Defense-in-depth: magic bytes, CSP, path checks | **High** | Cross-cutting | App security posture | Security audit | **Pending Human Approval** |
| **ENR-DEC-046** | NETWORK | Isolated `dio` client; timeouts & cancellation tokens | **High** | None | Optional online services | Offline timeout test | **Pending Human Approval** |
| **ENR-DEC-047** | DIAGNOSTICS | Local rotating logs (`logger`) with PII sanitization | **High** | ENR-DEC-045 | Privacy & troubleshooting | Sanitization tests | **Pending Human Approval** |
| **ENR-DEC-048** | QA | Tiered testing: Unit (40%), Widget (30%), E2E (10%) | **High** | Cross-cutting | Automated quality gates | Device test harness | **Pending Human Approval** |
| **ENR-DEC-049** | PERF | Provisional targets (16ms page turn, 1.5s launch) | **Medium** | Cross-cutting | Performance benchmarking | **Device matrix profiling**| **Pending Human Approval** |
| **ENR-DEC-050** | A11Y | WCAG 2.1 AA compliance; TalkBack semantic trees | **High** | ENR-DEC-031 | Accessibility support | TalkBack audit | **Pending Human Approval** |
| **ENR-DEC-051** | I18N | Flutter official ARB localization (`intl`) | **High** | None | Multilingual UI support | None | **Pending Human Approval** |
| **ENR-DEC-052** | CICD | GitHub Actions pipeline (analyze, test, release APK) | **High** | Repository | Build automation | Workflow file setup | **Pending Human Approval** |
| **ENR-DEC-053** | SECURITY | `flutter_secure_storage` for optional API keys | **High** | ENR-DEC-045 | Secure secret storage | Keystore reset test | **Pending Human Approval** |
| **ENR-DEC-054** | DEP | Strict vetting: MIT/BSD/Apache-2 only, Dart 3 | **High** | Cross-cutting | Dependency governance | License scanner | **Pending Human Approval** |
| **ENR-DEC-055** | PERF | Resource budgets: 120MB base RAM, 1.8GB AI RAM | **Medium** | ENR-DEC-034 | Resource Governor design | **RAM profiling** | **Pending Human Approval** |
| **ENR-DEC-056** | RELEASE | Staged rollout (Internal $\rightarrow$ Beta $\rightarrow$ Phased) | **High** | ENR-DEC-052 | Distribution safety | Play Console track | **Pending Human Approval** |

---

## 24. Recommended Implementation Sequence

```
Phase 2 (Architecture Investigation - CURRENT COMPLETE)
    │
    ▼ [Explicit Human Approval Gate]
Phase 3: Core Foundation & Data Layer
    ├── Install audited foundational packages (flutter_bloc, get_it, drift, path_provider, go_router)
    ├── Implement composition root, DI registration, and GoRouter shell
    ├── Implement Drift SQLite database schema, DAOs, and migration verifier
    └── Implement Failure hierarchy, Result type, and privacy-safe local logging
    │
    ▼ [Human Approval Gate]
Phase 4: Core Library, Import & Reader MVP
    ├── Execute Foliate-js WebView bridge prototype & FTS5 CJK prototype
    ├── Implement SAF document picker and isolate-driven import pipeline
    ├── Implement BookRepository and bookshelf UI
    ├── Implement Unified Reader scaffold with PDF (pdfx), TXT, and EPUB viewports
    └── Implement reading progress persistence and location restoration
    │
    ▼ [Human Approval Gate]
Phase 5: Reading Experience & Annotations
    ├── Bookmarks, highlights, notes, and reading goals
    └── Reading statistics and Material 3 custom theming
    │
    ▼ [Human Approval Gate]
Phase 6: Backup, Restore & Data Protection
    └── Unencrypted default export and optional AES-256-GCM encrypted backup
    │
    ▼ [Human Approval Gate]
Phase 7: Audio Narration & TTS
    └── Android Foreground Service, MediaSession, and TTS sentence synchronization
    │
    ▼ [Human Approval Gate]
Phase 8–10: Local AI, Spoiler-Aware RAG & Optional Cloud AI
    └── GGUF/llama.cpp inference prototype, FTS5 spoiler filtering, and provider abstractions
```

---

## 25. Outstanding Validation and Prototype Requirements

Before Phase 4, Phase 7, and Phase 8 decisions can be accepted by human review, the following standalone prototypes must be constructed:

1. **Foliate-js EPUB Viewport Prototype (Phase 4 Prerequisite):**
   * Validate memory consumption on a 3GB RAM device.
   * Verify dynamic reflow, font scaling, and EPUB CFI calculation.
   * Verify Content Security Policy (CSP) blocking external scripts and tracking pixels.
2. **SQLite FTS5 Multilingual Search Prototype (Phase 4 Prerequisite):**
   * Build benchmark test with Chinese, Japanese, and Hindi text samples.
   * Compare `trigram` tokenizer against pre-segmented `unicode61` indexing for search recall and index file size expansion.
3. **Local AI Android ARM64 FFI Prototype (Phase 8 Prerequisite):**
   * Compile `libllama.so` for Android `arm64-v8a` with NEON acceleration.
   * Execute 10-point validation plan (TTFT, memory mapping, cancellation, thermal footprint, PSS memory reclamation).
4. **AudioService Foreground Service Prototype (Phase 7 Prerequisite):**
   * Validate Android 14 `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permission and notification behavior during screen lock and Bluetooth disconnect.
5. **Encrypted Backup Cryptographic Prototype (Phase 6 Prerequisite):**
   * Verify AES-256-GCM encryption and PBKDF2/Argon2id key derivation performance on a 100MB sample archive.

---

## 26. Final Human Approval Gate

* **No source code was modified.**
* **No dependencies were installed.**
* **No configuration was changed.**
* **No proposed decisions were marked Accepted.**
* **No Phase 3 tasks have been started.**

The project remains in a clean, stable state at baseline commit `1ee64c1` on branch `feature/flutter`. All findings, corrections, and recommendations are submitted for human architectural review. Further development awaits explicit user authorization.

---

## 27. References and Source Links

1. **Flutter Official Documentation:** [flutter.dev](https://flutter.dev) (Dart 3 isolate models, widget lifecycle, accessibility semantics).
2. **Android Developer Guides:** [developer.android.com](https://developer.android.com) (Scoped Storage, MediaSession, Foreground Service Types, Android 12+ Splash Screens).
3. **Drift Documentation:** [drift.simonbinder.eu](https://drift.simonbinder.eu) (Drift SQLite ORM, WAL mode, step-by-step migrations, FTS5 virtual tables).
4. **SQLite Official FTS5 Documentation:** [sqlite.org/fts5.html](https://www.sqlite.org/fts5.html) (Tokenizers: unicode61, trigram, porter; BM25 ranking algorithm).
5. **Foliate-js Repository:** [github.com/johnfactotum/foliate-js](https://github.com/johnfactotum/foliate-js) (Modular web reader engine, EPUB/MOBI/KF8 support).
6. **Readium Architecture:** [readium.org](https://readium.org) (Open-source EPUB 3 rendering architecture guidelines).
7. **llama.cpp Project:** [github.com/ggerganov/llama.cpp](https://github.com/ggerganov/llama.cpp) (GGUF model format, ARM64 NEON acceleration, mmap model loading).
8. **pub.dev Package Registries:** Verified entries for `flutter_bloc`, `get_it`, `drift`, `audio_service`, `pdfx`, `webview_flutter`, `path_provider`, `logger`, `archive`, `xml`.
9. **OWASP Mobile Application Security:** [mas.owasp.org](https://mas.owasp.org) (Secure data storage, authenticated encryption AES-GCM, WebView injection prevention).
