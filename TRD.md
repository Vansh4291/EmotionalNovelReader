# Technical Requirements Document (TRD)
## Emotional Novel Reader (ENR)

| Document field | Value |
|---|---|
| Product | Emotional Novel Reader |
| Document | Technical Requirements Document |
| File | `TRD.md` |
| Version | 1.0-draft |
| Status | Technical discovery complete; technology evaluation and implementation validation pending |
| Date | 8 November 2026 |
| Primary platform | Android 12+ (API 31+) |
| Application framework | Flutter (fresh application) |
| Product requirements source | `prd.md` |
| Engineering governance source | `AGENT.md` |

---

## 1. Purpose

This document translates the approved Emotional Novel Reader product requirements and the 30-question technical discovery process into an engineering-oriented technical specification.

It defines confirmed product and platform constraints, technical domains requiring investigation, architectural qualities, functional and non-functional technical requirements, data/storage/offline/AI/document/narration/security/testing/release considerations, and the evidence required before technical choices are final.

**Decision-status rule:** The questionnaire answers primarily select an investigation and recommendation approach. They do not automatically approve a particular package, database, rendering engine, AI runtime, cloud vendor, or CI/CD service. Unless explicitly identified as a confirmed product constraint below, a technology remains a candidate pending documented evaluation.

This TRD complements `prd.md`; it does not replace it. If a conflict is discovered, record it, identify the authoritative requirement, and resolve it through the project's decision-governance process rather than silently changing either document.

## 2. Source of truth and precedence

1. **Approved product decisions in `prd.md`** define user-visible behavior, scope, privacy expectations, and product constraints.
2. **This `TRD.md`** defines technical requirements, evaluation criteria, architectural boundaries, and accepted technical decisions once explicitly marked as such.
3. **`AGENT.md`** defines agent/developer operating rules, autonomy boundaries, Git safety, testing, documentation, and completion reporting.
4. **Architecture Decision Records (ADRs)** capture specific accepted technical decisions. An ADR must not silently override a product requirement.
5. **Implementation and tests** show current behavior. If they disagree with approved documentation, report the discrepancy; do not assume implementation is correct merely because it exists.

The fresh Flutter application is the target. The legacy React Native frontend and Node.js/Express backend are not implementation foundations and must not be reintroduced as runtime dependencies. Existing documentation may be retained as historical reference, but old code, data models, and architecture must not be copied without a new evidence-based justification.

## 3. Product and platform context

### 3.1 Product summary

Emotional Novel Reader is a personal reading ecosystem for importing, organizing, reading, listening to, understanding, and reflecting on novels and other supported documents. It combines a customizable reading experience with optional local and cloud AI capabilities, offline narration, library management, annotations, reading progress, statistics, and user-controlled backup/export.

### 3.2 Confirmed scope constraints

| Area | Confirmed requirement |
|---|---|
| Primary client | Fresh Flutter application |
| Initial production platform | Android 12+ / API 31+ |
| Web | Flutter Web may be used for development or testing, but does not replace Android-native verification |
| Out of current scope | iOS, Windows, macOS, Linux |
| Backend | No dependency on the former Node.js/Express backend |
| Accounts | No user accounts or authentication for the core product |
| Core operation | Core library, reading, progress, and other supported core functions must work offline |
| Data migration | No automatic migration from legacy React Native, Realm, or backend user data |
| Legacy source | Do not reuse automatically; start from a clean Flutter application |
| Online services | Optional, isolated, replaceable, and consent-controlled |
| Cloud AI | Disabled by default; explicit consent and clear data-transmission disclosure |
| Cloud backup | Manually initiated and optional |
| Device transfer | Manual user-controlled transfer; no automatic cross-device sync |
| Diagnostics | Local by default; anonymous crash reporting only with explicit consent |
| Release | Internal, closed, and open testing before production rollout as appropriate |

### 3.3 Product capabilities in technical scope

The architecture must be capable of supporting these product areas, subject to the PRD's phased delivery plan:

- Book import, library organization, metadata, and search.
- EPUB, PDF, TXT, DOCX, HTML, RTF, Markdown, CBZ, CBR, MOBI/AZW/AZW3, and additional formats where technically and legally feasible.
- Reading progress, bookmarks, highlights, annotations, and reader customization.
- AI-assisted emotion analysis, summaries, character and relationship insights, story-structure insights, recommendations, and text-only assistant conversations.
- Local AI models and optional cloud AI providers.
- TTS narration, playback controls, reading/audio synchronization, and optional ambient audio.
- Reading goals and time-based statistics.
- Local backups, exports, selective restore, and optional manually initiated cloud destinations.
- Accessibility, localization, privacy controls, help content, and diagnostics.

Format support must be reported honestly per format. A format that can be imported or indexed is not automatically considered fully readable, paginated, annotatable, or narratable.

## 4. Architectural principles

1. **Offline-first:** Local data and core reading workflows are authoritative and usable without network access.
2. **Local-first privacy:** Book content, reading history, annotations, and conversations remain on-device unless the user explicitly authorizes a specific transmission.
3. **Explicit online boundaries:** Catalog lookup, downloads, cloud AI, and cloud backup are optional capabilities behind replaceable service interfaces.
4. **No hidden fallback:** A failed local AI operation must not silently send content to a cloud provider.
5. **Preserve originals:** Imported source files are retained unchanged unless the user explicitly deletes them.
6. **Replaceable engines:** Document parsers, renderers, AI runtimes, TTS engines, and external providers must be isolated behind suitable interfaces.
7. **Format-specific correctness:** Do not force unrelated document formats into one engine when that harms fidelity or accessibility.
8. **Evidence-driven technology selection:** Evaluate maintenance, compatibility, licensing, security, performance, and total complexity before adoption.
9. **Simplicity with deliberate extensibility:** Avoid speculative abstraction and unnecessary packages while preserving clear seams for genuinely variable capabilities.
10. **Resource awareness:** Treat memory, storage, battery, thermal behavior, and background execution as first-class mobile constraints.
11. **Recoverability:** Protect user data through transactional operations, validated migrations, integrity checks, and tested restore paths.
12. **Observable quality:** Important requirements must have measurable acceptance criteria and repeatable verification evidence.

## 5. System context and high-level architecture

### 5.1 Logical architecture

The implementation should be organized around clear feature and platform boundaries. The exact folder structure and architectural pattern are to be selected after evaluating feature-first, layer-first, Clean Architecture, modular Clean Architecture, and pragmatic alternatives.

The following logical layers are required regardless of the final pattern:

| Logical area | Responsibilities |
|---|---|
| Presentation | Screens, reader UI, navigation, accessibility semantics, view state |
| Application / use cases | User workflows, orchestration, domain policies, task coordination |
| Domain | Core entities, value objects, business rules, interfaces, invariants |
| Data | Repositories, local persistence, indexing, import metadata, backup manifests |
| Platform adapters | Android APIs, document access, TTS, media controls, notifications, background work |
| Engine adapters | Format parsers/renderers, AI runtimes, embedding engines, TTS engines |
| Optional online adapters | Catalogs, metadata services, cloud AI providers, cloud backup destinations |
| Shared infrastructure | Logging, error mapping, configuration, dependency management, lifecycle coordination |

Do not introduce all layers mechanically into every feature. Use the smallest structure that maintains clear ownership, testability, and dependency direction.

### 5.2 Dependency direction

- Presentation may depend on application-facing abstractions, not directly on storage engines or provider SDKs.
- Application workflows coordinate domain rules and repository/service interfaces.
- Domain logic must not depend on Flutter widgets, Android APIs, database packages, or cloud SDKs.
- Data and platform adapters implement interfaces owned by an appropriate inner layer.
- Optional online services must not be required to construct or use core offline features.
- Provider-specific types must not leak into product-facing domain models.
- Dependency wiring must be explicit, test-overridable, and lifecycle-aware.

### 5.3 Startup and lifecycle

The application must define and test:

- Deterministic startup ordering for configuration, database opening, migrations, dependency initialization, and UI launch.
- Recoverable handling for database-open or migration failures.
- Correct disposal of streams, subscriptions, isolates, media sessions, and engine instances.
- App pause/resume behavior for narration, imports, downloads, and AI inference.
- Safe handling of process death and Android activity recreation.

## 6. Technical discovery outcomes and evaluation requirements

All 30 technical discovery questions are complete. The selections below define the investigation posture, not an automatic final technology selection.

| # | Technical area | Selected approach |
|---:|---|---|
| 1 | Existing Flutter migration | Discard incomplete migration and rebuild cleanly; preserve useful documentation and Git history where practical |
| 2 | Flutter architecture | Research and recommend |
| 3 | State management | Research and recommend |
| 4 | Local database | Research hybrid persistence options and recommend a justified minimal combination |
| 5 | Imported file storage | Android Storage Access Framework / user-selected storage |
| 6 | Document rendering | Hybrid, format-specific engines behind a unified reader abstraction |
| 7 | Full-text search | Hybrid search strategy; evaluate keyword, fuzzy, multilingual, and semantic options |
| 8 | Local AI inference | Research and recommend |
| 9 | Cloud AI providers | Common provider interface, direct integrations where justified, optional gateway support |
| 10 | TTS | Hybrid native, downloadable/offline engine, and optional cloud TTS |
| 11 | Android integration | Maintained plugins for standard features; typed/generated interfaces and Kotlin modules where justified |
| 12 | Background processing | WorkManager, eligible foreground services, isolates, and ordinary async work according to task type |
| 13 | Import pipeline | Format-specific engines behind a common import workflow |
| 14 | Database migrations | Research-driven, versioned, tested migration and recovery strategy |
| 15 | Local AI model management | Curated catalog plus user-controlled import/download/update/delete where feasible |
| 16 | AI retrieval | Hybrid RAG: keyword, semantic, metadata filtering, and hybrid ranking |
| 17 | AI safety | Research and recommend enforcement architecture; application must retain authority over policy |
| 18 | Diagnostics | Local-first, optional consent-based anonymous crash reporting, manual exports |
| 19 | Networking | Shared foundation, isolated provider adapters, generated interfaces where useful |
| 20 | QA | Research and recommend layered, Android-aware, real-device quality strategy |
| 21 | CI/CD | Automated verification and builds; protected signing; controlled human production release approval |
| 22 | Credential storage | Flutter secure-storage package backed by Android Keystore, subject to package/security evaluation |
| 23 | Navigation | Research declarative routing; Navigator APIs may support local flows |
| 24 | Dependency injection | Research and recommend |
| 25 | Performance | Research and recommend measurable targets and optimization strategies |
| 26 | Backup/restore | Research and recommend |
| 27 | Security | Threat-model-driven investigation |
| 28 | Accessibility | Research and recommend |
| 29 | Localization | Research and recommend |
| 30 | Technical governance | Research alternatives, document evidence and trade-offs, recommend; record unresolved decisions |

### 6.1 Required evaluation record

Every major technical selection must include:

- Candidate technologies and versions evaluated.
- Official documentation and authoritative evidence consulted.
- Compatibility with selected Flutter/Dart and Android toolchain.
- Maintenance health, release activity, issue quality, and ecosystem maturity.
- License and redistribution implications.
- Security posture and known limitations.
- Runtime performance, memory, battery, storage, and application-size impact.
- Offline capability and behavior under interrupted connectivity.
- Testing and observability support.
- Integration complexity and long-term replacement cost.
- Recommendation, rejected alternatives, assumptions, risks, and confidence level.

Do not fabricate benchmarks or claim a package is maintained, secure, or compatible without checking current evidence during implementation investigation.

## 7. Architecture and state management requirements

### 7.1 Architecture evaluation

Compare feature-first, layer-first, Clean Architecture, modular Clean Architecture, and pragmatic combinations. Evaluate fit for a large feature set with substantial offline data, separation of UI/workflows/domain/platform engines, testability, dependency direction, module boundaries, reactive persistence, AI/TTS/document integration, complexity, boilerplate, onboarding cost, and refactorability.

The chosen architecture must be documented with a module/dependency diagram and representative feature flow before broad implementation.

### 7.2 State management evaluation

Compare Riverpod, BLoC/Cubit, Provider, and other viable approaches. Evaluate:

- Async loading, error, retry, and cancellation behavior.
- Reactive database streams and invalidation.
- Feature-level and app-level state ownership.
- Lifecycle/disposal semantics.
- Test overrides and deterministic tests.
- Dependency injection overlap and circular dependency risk.
- Debuggability, performance, ecosystem maturity, and boilerplate.

Avoid mixing multiple state-management systems without a concrete boundary and documented reason.

### 7.3 Navigation

Evaluate GoRouter, AutoRoute, Navigator 2.0, and other suitable approaches for declarative routing, deep links, nested navigation, state restoration, route lifecycle, type safety, testing, and state-management integration. A declarative routing framework is the expected application-level direction, but the final package remains subject to evaluation.

### 7.4 Dependency injection

Evaluate Riverpod-based dependency providers, GetIt/Injectable, manual constructor injection, and hybrid approaches. Require explicit dependency ownership/lifecycle, test-time replacement, async initialization/disposal, no hidden global mutable service state, no circular dependencies, and clear separation between wiring and business logic.

## 8. Local persistence and data architecture

### 8.1 Database selection

Evaluate SQLite/Drift, Isar, ObjectBox, Hive, and other credible candidates. Consider relational integrity, transactions, reactive query streams, FTS5 support, schema migrations, recovery, large libraries, concurrent workloads, query plans, memory use, database size, backup/restore behavior, platform support, licensing, maintenance, and ecosystem maturity.

Prefer one primary database where it can satisfy requirements. Introduce a second persistence engine only when a concrete workload justifies the operational and consistency cost.

### 8.2 Data ownership and consistency

The local application database is authoritative for core user data. Network responses must never silently overwrite newer local changes. The product does not require multi-device automatic synchronization.

Data categories likely to require structured persistence include:

- Library entries and source-file references.
- Book metadata and format capabilities.
- Reading positions and reading sessions.
- Bookmarks, highlights, annotations, and notes.
- Reader settings and profiles.
- AI analysis artifacts, user corrections, and conversation history.
- TTS preferences and narration state where useful.
- Reading goals and statistics.
- Import jobs, background task state, and diagnostics metadata.
- Backup manifests and restore history.

Final schema design must be based on approved PRD requirements and implementation flows. Avoid speculative tables before feature requirements are understood.

### 8.3 Migration requirements

- Maintain explicit database schema versioning and ordered deterministic migrations.
- Use atomic migrations where supported.
- Validate preconditions and postconditions.
- Define interruption and retry behavior.
- Preserve user data and report failures clearly.
- Test fresh install, every supported upgrade path, interrupted migration, corrupted input, and recovery.
- Provide backup-before-migration safeguards where appropriate and feasible.
- Do not assume reverse migration is safe; document forward-recovery strategy.
- Do not import legacy Realm or server data automatically.

## 9. Imported file storage and document processing

### 9.1 User-selected storage

Use Android Storage Access Framework (SAF) and persisted URI permissions where appropriate. Evaluate persistable URI grants and revocation, moved/renamed/deleted files, cloud-backed providers, large-file streaming, temporary copies/cache cleanup, export, and relinking workflows.

Do not assume a selected URI is a permanent filesystem path. Do not modify imported originals during parsing, conversion, indexing, or annotation.

### 9.2 Import pipeline

Create common orchestration with format-specific adapters. Standardize:

1. User selection and permission acquisition.
2. File identity, size, extension, and content-signature checks.
3. Safe staging or streaming access.
4. Format detection independent of filename alone.
5. Parser invocation and bounded resource use.
6. Metadata extraction and normalization.
7. Chapter/section structure extraction where applicable.
8. Validation and import diagnostics.
9. Persistence of library metadata and source reference.
10. Search indexing and optional analysis scheduling.
11. Progress, cancellation, retry, and user-visible errors.

### 9.3 Format-specific capability matrix

This is a target evaluation scope, not a claim that all formats are already supported.

| Format | Required investigation |
|---|---|
| EPUB | Package/container parsing, XHTML/CSS rendering, navigation, images, fonts, pagination, annotations, accessibility |
| PDF | Rendering options, text extraction, scanned pages, selection, page navigation, memory and page rendering |
| TXT | Encoding detection, line endings, chapter heuristics, paragraph preservation, large-file streaming |
| DOCX | ZIP/XML safety, styles, headings, tables, images, footnotes, layout fidelity |
| HTML | Sanitization, CSS subset, local assets, navigation, script prohibition |
| RTF | Parser maturity, formatting fidelity, encoding and embedded content |
| Markdown | CommonMark/GFM scope, links, images, code, headings, safe rendering |
| CBZ/CBR | Archive safety, image ordering, decompression limits, page navigation |
| MOBI/AZW/AZW3 | Legal/technical feasibility, parser maturity, limitations, DRM policy |
| Additional formats | Add only after capability, licensing, user value, and maintenance evaluation |

No DRM bypass is permitted. Unsupported, encrypted, malformed, or partially supported files must produce clear user-facing explanations.

### 9.4 Reader engine abstraction

Provide a common reader-facing abstraction for document metadata, navigation, location/progress, selection, and supported annotations. Do not require EPUB and PDF to share the same internal renderer or pagination model.

The abstraction must expose capability differences explicitly. A renderer may support text selection but not reflow, or page-based navigation but not word-level positions.

## 10. Search and indexing

Evaluate SQLite FTS5, dedicated local search engines, application-level indexes, and semantic retrieval. Search requirements include offline keyword search, phrase/exact matching, prefix/fuzzy behavior where justified, multilingual tokenization/normalization, search across titles/authors/metadata/permitted book text, incremental indexing, cancellation/progress, recovery, bounded storage/memory, index rebuild, and clear behavior when source files are unavailable.

Semantic search and embeddings are optional capabilities. They must not make basic keyword search dependent on AI models or network access.

## 11. Local AI inference and model lifecycle

### 11.1 Runtime evaluation

Investigate llama.cpp/GGUF, ONNX Runtime, MediaPipe, LiteRT, native Android inference options, and other viable engines. Evaluate supported model families/formats, quantization trade-offs, CPU/GPU/NPU availability and actual acceleration support, Flutter integration/native bridge complexity, RAM/storage/startup/token throughput/thermal behavior, streaming/cancellation/concurrency/background restrictions, model license and provenance, and runtime maintenance.

Do not assume a device has a usable NPU/GPU inference path simply because the hardware advertises one. Verify supported runtime/operator/model combinations.

### 11.2 Model catalog and lifecycle

Target capabilities:

- Curated catalog of reviewed model entries.
- Model metadata: publisher, provenance, license, size, format, quantization, context length, supported tasks, runtime compatibility, checksum, and version.
- Device capability assessment and model recommendations.
- User-controlled download, pause/resume where supported, update, selection, and deletion.
- Manual model import where technically and legally feasible.
- Integrity verification before activation.
- Storage accounting and cleanup safeguards.
- Prevention of deleting models currently in use.
- Clear compatibility/resource warnings.
- Model lifecycle and rollback strategy for failed updates.

The application must not silently download large models or silently replace a user's selected model.

### 11.3 Resource scheduling

Coordinate AI inference with TTS, rendering, imports, and other workloads. Define concurrency limits, cancellation behavior, memory-pressure response, thermal safeguards, and user-visible status. Prefer deferring or stopping nonessential work over destabilizing the reader.

## 12. AI provider architecture, retrieval, and safety

### 12.1 Provider abstraction

Use a common provider-facing contract while retaining provider-specific adapters. Evaluate direct provider SDK/API integrations and optional gateway support.

The contract should cover text generation and streaming, structured output, tool calling where required, token/context limits and usage metadata, cancellation and timeout, error classification/retryability, model capability metadata, and provider-specific feature declarations.

Do not flatten provider differences into false guarantees. Capability negotiation must allow providers to declare unsupported features.

### 12.2 Credential handling

- Cloud AI is disabled by default.
- The user must explicitly enable and authorize each relevant cloud capability.
- Explain what content or metadata will be transmitted before sending it.
- Provide provider transparency, credential management, and revocation.
- Store user-supplied credentials using an evaluated Flutter secure-storage package backed by Android Keystore.
- Do not log credentials or include them in crash reports.
- Do not embed private provider keys in the distributed application.
- Secure local storage protects credentials at rest but cannot make a client-distributed application secret.
- Do not introduce an application-owned proxy/backend unless product scope is explicitly revised and approved.

### 12.3 Hybrid RAG

Use retrieval components appropriate to each data type:

- Structured database queries for known entities and reading state.
- Keyword search for exact terms and phrases.
- Semantic retrieval where a suitable local or authorized embedding capability exists.
- Metadata filtering for book, chapter, character, annotation, and other relevant context.
- Hybrid ranking when it demonstrably improves relevance.

Retrieval must work offline to the extent supported by installed local components. Semantic retrieval must not be required for ordinary search.

### 12.4 Spoiler safety and AI correctness

The application must remain the policy authority. Investigate application-level enforcement, retrieval filtering before model context construction, model instructions, output validation/post-processing, provider-specific controls, and adversarial regression tests.

Spoiler restrictions must be based on the user's current reading position and explicit overrides. Filtering must occur before content is sent to any local or cloud model. Prompt instructions alone are insufficient enforcement.

AI outputs must distinguish source-supported facts from interpretation, communicate uncertainty, provide evidence/context where practical, and allow user correction. Emotion analysis is interpretive guidance, not objective truth. User corrections should be represented as user-provided data rather than silently rewritten model facts.

### 12.5 Assistant history and memory

Support text-only assistant interactions as defined in the PRD. Conversation history and any assistant memory must be local-first, searchable/manageable as required by product decisions, and governed by explicit retention and deletion behavior. Cloud transmission requires the same per-feature consent and preview rules as other cloud AI operations.

## 13. Text-to-Speech and audio architecture

### 13.1 Hybrid narration system

Provide a unified narration interface that can route to Android native TextToSpeech, optional downloadable offline voices or dedicated engines, and optional cloud TTS when explicitly enabled and authorized.

Evaluate Flutter TTS plugins, Android APIs, downloadable engines, and cloud TTS providers. Native voice availability depends on the device, installed engines, and downloaded voice data; do not promise offline availability for a language or voice without checking it.

### 13.2 Playback requirements

- Background narration within Android execution restrictions.
- Media/lock-screen controls where supported.
- Bluetooth and headset controls where supported.
- Audio focus and interruption handling.
- Correct pause, resume, stop, seek, and lifecycle behavior.
- Sleep timer behavior if included in the approved PRD.
- Clear voice/language availability and quality information.
- Cancellation and cleanup of engine resources.
- Optional ambient audio kept independent from narration.

### 13.3 Reading synchronization

Maintain a shared reading-location abstraction between reader and narration. Word-level highlighting is supported only when the active engine provides reliable timing callbacks. Otherwise use sentence, paragraph, or chunk-level synchronization and disclose the capability honestly.

## 14. Android platform integration and background work

### 14.1 Integration strategy

Prefer maintained Flutter plugins for standard capabilities. Use typed/generated platform interfaces where beneficial and custom Kotlin modules for advanced Android-specific functions. Evaluate Pigeon or equivalent typed bridges where they reduce contract drift.

Platform adapters must handle Android lifecycle/process recreation, runtime permissions/revocation, SAF URI grants, media session/audio focus, TTS engines, notifications/foreground-service requirements, work scheduling/battery restrictions, and native document/rendering libraries where selected.

### 14.2 Background task classification

| Work type | Candidate execution approach | Requirements |
|---|---|---|
| Short UI-related async work | Dart async | Cancellation and error propagation |
| CPU-heavy parsing/indexing | Dart isolate or native worker | Bounded memory, progress, cancellation |
| Deferrable persistent work | WorkManager | Constraints, retry/backoff, idempotency |
| Eligible long-running visible work | Android foreground service | User-visible notification and current Android policy compliance |
| Streaming/network operations | Async client/service | Timeout, cancellation, connectivity handling |

Do not assume a foreground service can be used for every long-running task. Confirm current Android foreground-service types, permissions, launch restrictions, and Play policy before implementation.

### 14.3 Task infrastructure

Provide a consistent task model for progress, state, cancellation, retry, failure, and recovery. Operations must be idempotent or guarded against duplicate execution where practical. Interrupted imports, downloads, backups, and indexing must recover safely.

## 15. Networking and optional online ecosystem

### 15.1 Networking foundation

Evaluate Dio, Dart HTTP clients, Retrofit/generated clients, and other suitable approaches. A shared foundation must provide consistent timeouts/cancellation, error normalization, retry policy based on operation idempotency and error type, connectivity awareness, streaming, safe logging/redaction, test adapters/fakes, and provider isolation.

### 15.2 Optional services

Potential online adapters include authorized book catalogs, metadata lookup, book downloads, cloud AI, and user-selected cloud backup destinations.

- Core reading must not depend on these services.
- Each service must be independently enabled and disabled.
- Explain data transmitted and service identity.
- Do not transmit library content, annotations, reading history, or other private data unless required for a user-authorized action and clearly disclosed.
- Handle rate limits, outages, partial responses, and provider changes.
- Do not scrape or download copyrighted content without authorization.
- Keep provider-specific data out of core domain models.

## 16. Backup, restore, and data integrity

Investigate SQLite-consistent backup APIs, application-level archives, selective exports, SAF, checksums, encryption options, and cloud destinations.

The solution must support consistent database snapshots; complete and selective exports; versioned manifests and compatibility; checksums; explicit warnings for unencrypted exports; optional encryption with defined key lifecycle/recovery; user-selected SAF destinations; optional manually initiated cloud destinations; selective restore and preview; staging before commit where practical; duplicate/conflict handling; protection against accidental overwrite; recovery for corrupt/incomplete/unsupported/interrupted backups; and compatibility testing across app/backup versions.

Never automatically initiate a cloud backup or overwrite existing user data during restore. The user must understand what will be restored and what may be replaced or merged.

## 17. Security and privacy requirements

### 17.1 Threat-model-driven investigation

Create a threat model covering malicious/malformed files and archives, path traversal, decompression bombs, oversized images, parser vulnerabilities, untrusted markup/script execution, local database/export exposure, credential theft, network interception, AI prompt injection from book content, spoiler leakage, dependency/build supply-chain compromise, backup tampering, and excessive permissions.

### 17.2 Required controls

- Validate file signatures, sizes, archive entries, decompression limits, and parser resource use.
- Treat imported content as untrusted data, never executable instructions.
- Disable script execution in rendered book content.
- Apply least privilege to Android permissions.
- Use TLS for network services and validate endpoint configuration.
- Store user credentials using the selected secure-storage mechanism.
- Redact secrets and sensitive content from logs.
- Keep diagnostics local unless explicit consent is granted.
- Minimize data collection and retention.
- Verify dependencies, licenses, known vulnerabilities, and provenance.
- Test restore and import paths as security-sensitive operations.
- Document limitations and residual risks.

Do not add a separate app lock; rely on Android device security as specified by the PRD.

## 18. Diagnostics and observability

Local diagnostics are the default. Evaluate Android-native diagnostics, Firebase Crashlytics, Sentry, self-hosted alternatives, and local-only reporting.

Requirements:

- Structured, severity-based local logs.
- Bounded log retention and user-controlled export.
- Optional anonymous crash reporting only after explicit consent.
- No book text, reading history, personal data, annotations, or AI conversations in telemetry.
- Redaction of paths, credentials, tokens, and sensitive metadata.
- Crash reports must not block core offline workflows.
- Consent revocation and clear reporting status.
- Diagnostic exports must explain that exported files may contain technical metadata.

Do not add product analytics or behavioral tracking without a separate approved product requirement.

## 19. Accessibility

Research Flutter Semantics, TalkBack, Android accessibility services, automated scanners, and real-device validation.

The implementation must address correct labels/roles/values/state announcements; TalkBack navigation and focus order; text scaling and large controls; high contrast and color-independent status communication; dyslexia-friendly font options where included in the PRD; reduced motion; accessible reader navigation, selection, annotations, playback, and controls; keyboard/focus navigation where applicable; and meaningful error/progress announcements.

Accessibility must be tested in actual reader workflows, not only on settings and forms.

## 20. Localization and internationalization

Investigate Flutter's official localization tooling, ARB files, generated localization classes, `intl`/ICU formatting, runtime language switching, font fallback, and RTL support.

Initial UI language scope includes English, Japanese, Hindi, and Gujarati. The architecture must permit future languages without scattering translation logic through widgets.

Requirements:

- No hard-coded user-facing strings in feature code.
- Locale-aware date, number, and plural formatting.
- Translation completeness checks.
- Font fallback for scripts and glyphs.
- Runtime language change without inconsistent mixed-locale screens.
- RTL support if/when RTL locales are included.
- Separate UI language from a book's language and AI processing language.
- Preserve original book text and encoding.

## 21. Performance and resource budgets

Do not invent performance numbers before measuring representative workflows and devices. Establish baseline and target budgets during technical spikes.

Measure at minimum cold/warm startup; library rendering and scrolling at realistic sizes; search latency and index build time; import throughput and peak memory by format; EPUB navigation and PDF render latency; database read/write performance and growth; TTS startup/interruption/resume; AI model load, first-token latency, throughput, memory, and thermal behavior; background task duration/battery impact/recovery; backup/restore throughput and temporary storage; and crash-free behavior/resource leaks.

Use Flutter DevTools, Android Studio profiling, Android system diagnostics, and engine-specific tools as appropriate. Benchmark on representative low-, mid-, and high-capability Android hardware. Optimize based on evidence, not premature micro-optimization.

## 22. Testing and quality assurance

### 22.1 Test layers

Evaluate and use a balanced combination of unit tests, widget tests, repository/data tests, integration tests, Android instrumentation/platform tests, golden tests where justified, end-to-end tests, property/fuzz tests for parsers and archives, performance/memory tests, security/privacy tests, and manual exploratory testing on real Android devices.

### 22.2 Required scenario coverage

- Fresh install and first launch.
- Offline use and network transitions.
- Interrupted and resumed import/download/backup tasks.
- Missing, moved, or revoked document URI access.
- Large, malformed, unsupported, and maliciously structured documents.
- Database migration and recovery.
- Search index creation, update, and rebuild.
- TTS engine missing, voice unavailable, interruption, Bluetooth, and process recreation.
- AI model unavailable, insufficient resources, cancellation, and corrupted model files.
- Cloud AI consent, transmission preview, provider failure, and credential removal.
- Spoiler-boundary enforcement and adversarial prompt injection from book content.
- Backup integrity, partial/corrupt archive, selective restore, and overwrite protection.
- TalkBack and large-text workflows.
- Locale switching and multilingual text rendering.
- Low storage, low memory, thermal pressure, and app background/foreground transitions.

### 22.3 Feature completion gate

A feature is not complete merely because its primary happy path works. Completion requires requirements and acceptance criteria met; relevant automated tests passing; static analysis and formatting passing; Android build verification; relevant real-device/emulator validation; offline/online and failure-path behavior verified where applicable; security/privacy/accessibility/performance concerns addressed; documentation/tracking updated; and known limitations/residual risks reported.

If a required verification cannot be performed, report it as blocked or unverified; do not claim success.

## 23. CI/CD and release engineering

Evaluate GitHub Actions, Codemagic, GitLab CI, and other viable CI providers based on repository hosting, Flutter/Android support, signing security, build reproducibility, test execution, artifacts, cost, and maintenance.

### 23.1 CI requirements

Automate where practical dependency resolution and lockfile checks, formatting/static analysis, unit/widget tests, integration tests suitable for CI, Android debug/release build verification, dependency/license/security checks, artifact retention/build metadata, and documentation/generated-code consistency checks.

### 23.2 Release requirements

- Protected signing material and least-privilege access.
- No signing keys or secrets committed to source control.
- Reproducible, traceable APK/AAB artifacts.
- Version name and version code policy.
- Release notes and known limitations.
- Internal, closed, and open testing tracks as appropriate.
- Controlled human approval before production publication.
- Staged rollout and monitoring plan.
- Rollback/recovery plan and release tags.
- Build provenance and source commit traceability.

CI may prepare and verify production artifacts, but production publication requires the defined human approval gate.

## 24. Configuration and secrets

Use build flavors/configuration for non-secret environment values. For user-provided credentials, evaluate a maintained Flutter secure-storage package backed by Android Keystore.

- Never commit credentials or signing secrets.
- Never embed private provider keys in the client.
- Separate public configuration from secrets.
- Keep credentials out of logs, crash reports, and backup exports unless the user explicitly chooses a secure export mechanism with clear warnings.
- Support credential update, removal, and revocation.
- Handle key invalidation and device security changes.
- Document backup/restore behavior for secure-storage entries.
- Test storage behavior on supported Android API levels.

Secure storage is protection at rest, not a guarantee against a compromised device or runtime instrumentation.

## 25. Project documentation and technical governance

Maintain the following project records in the repository, with exact locations confirmed during repository setup:

| Document | Purpose |
|---|---|
| `prd.md` | Product requirements and approved product behavior |
| `TRD.md` | Technical requirements and evaluation status |
| `AGENT.md` | Agent/developer operating rules |
| `ROADMAP.md` | Phases, milestones, dependencies |
| `TASKS.md` | Actionable work and status |
| `CHANGELOG.md` | User- and engineering-relevant changes |
| `DECISIONS.md` or `docs/adr/` | Architecture Decision Records |
| `docs/` | Detailed architecture, security, data, testing, release, and operational references as needed |

Update documentation alongside implementation. Avoid duplicate or contradictory sources of truth.

### 25.1 ADR requirements

An ADR should contain title, identifier, date, status, owners, context/problem, constraints, options considered, evidence/evaluation criteria, decision/rationale, consequences/trade-offs, risks/mitigation, and revisit triggers.

Material product changes require explicit approval under `AGENT.md`. Ordinary technical choices within approved scope may be made autonomously when supported by evidence and documented.

## 26. Fresh-project setup and repository safety

The implementation target is a clean Flutter application, not a continuation of the incomplete migration.

Before cleanup or project creation that could affect existing files:

1. Verify the exact target directory.
2. Inspect Git status, current branch, remotes, and uncommitted/untracked files.
3. Identify and preserve approved documentation (`prd.md`, `TRD.md`, `AGENT.md`) and useful historical records.
4. Confirm the intended project root and avoid deleting unrelated workspace content.
5. Preserve Git history where practical.
6. Do not restore legacy frontend/backend source folders.
7. Do not overwrite user changes or perform destructive cleanup without approval required by `AGENT.md`.

The user has indicated that legacy React Native/backend folders and some incomplete Flutter migration content were manually removed. Do not assume those files still exist, and do not spend implementation time reconstructing them.

## 27. Implementation phases and technical gates

The following is a proposed sequencing framework. Exact scope, estimates, and milestone dates must be created in `ROADMAP.md` after repository setup and technical spikes.

### Phase 0 — Repository and architecture foundation

- Verify target path and Git state.
- Establish clean Flutter project and Android toolchain baseline.
- Confirm Flutter/Dart/Gradle/Android SDK compatibility.
- Evaluate architecture, state management, navigation, and dependency injection.
- Establish linting, formatting, tests, CI baseline, and documentation structure.
- Produce initial ADRs and architecture diagrams.

**Exit gate:** Clean reproducible Android build; architecture boundaries and development workflow documented; no unapproved destructive changes.

### Phase 1 — Local data and library foundation

- Evaluate and select primary local database.
- Implement versioned schema and migration harness.
- Implement SAF-based file access and source-file reference management.
- Establish library repository and core domain models.
- Implement safe import orchestration and metadata handling.
- Add local diagnostics and error conventions.

**Exit gate:** Core local data is durable, testable, and usable without network access; migration and file-access failure paths are covered.

### Phase 2 — Reader and format engines

- Select and integrate initial EPUB and PDF engines based on capability evidence.
- Add TXT and other formats according to PRD priority and feasibility.
- Implement common reader location/navigation abstractions.
- Implement reader customization, bookmarks, annotations, and progress.
- Add format capability reporting and parser security tests.

**Exit gate:** Initial reader workflows work offline on Android devices with validated persistence and accessibility behavior.

### Phase 3 — Search, library intelligence, and statistics

- Implement local keyword search and indexing.
- Add metadata and multilingual search improvements.
- Implement reading-session tracking, goals, and statistics.
- Validate large-library performance and index recovery.

**Exit gate:** Search and reading statistics remain correct across app restarts, offline operation, and index rebuilds.

### Phase 4 — Narration and audio experience

- Evaluate native TTS and optional engine integration.
- Implement narration abstraction and playback lifecycle.
- Add media/lock-screen controls and audio focus handling.
- Add reader/audio synchronization at the precision supported by the engine.
- Validate interruption, background, Bluetooth, and process-recreation cases.

**Exit gate:** Reliable supported-device narration with truthful voice availability and tested lifecycle behavior.

### Phase 5 — Local AI and retrieval

- Evaluate and select local inference runtime.
- Implement model catalog and lifecycle.
- Implement device capability assessment and resource scheduling.
- Implement local AI tasks and hybrid retrieval.
- Enforce spoiler restrictions and validate evidence/uncertainty behavior.
- Test resource limits, cancellation, and thermal conditions.

**Exit gate:** Local AI capabilities work without cloud transmission and cannot bypass application-level spoiler policies through ordinary retrieval paths.

### Phase 6 — Optional online ecosystem

- Implement consent and transmission-preview infrastructure.
- Integrate optional catalog/metadata services.
- Implement provider abstraction and selected direct cloud AI integrations.
- Add optional cloud TTS and manual cloud backup destinations if approved.
- Implement credential lifecycle and provider failure handling.

**Exit gate:** Online features are isolated, disabled by default where required, transparent, revocable, and do not compromise offline core workflows.

### Phase 7 — Backup, hardening, accessibility, and release readiness

- Complete full/selective backup and restore.
- Complete security threat-model mitigation and testing.
- Complete accessibility and localization verification.
- Complete performance and device compatibility testing.
- Establish CI/CD, signing, release tracks, crash consent, and rollback plan.
- Complete regression and release documentation.

**Exit gate:** Release checklist passes with evidence; unresolved issues and accepted risks are documented; production publication receives human approval.

## 28. Risks and mitigations

| Risk | Impact | Mitigation / investigation |
|---|---|---|
| Flutter package or engine abandonment | High | Verify maintenance, license, alternatives, and replacement boundary before adoption |
| Inconsistent document fidelity | High | Use format-specific engines and explicit capability matrix |
| SAF URI becomes unavailable | Medium/High | Detect revoked/missing access and provide relink workflow |
| Large file or archive exhausts memory/storage | High | Stream, enforce limits, isolate processing, test adversarial inputs |
| Local AI exceeds device resources | High | Capability profiling, quantization evaluation, workload scheduling, user-controlled model choice |
| AI leaks spoilers | High | Enforce policy before context construction and test adversarial cases |
| Cloud transmission surprises user | High | Default-off controls, per-feature consent, transmission preview, provider transparency |
| TTS voice unavailable offline | Medium | Inspect device engine/voice availability and provide clear fallback messaging |
| Background work restricted by Android | Medium/High | Use correct WorkManager/foreground-service model and validate current platform rules |
| Database migration corrupts data | Critical | Versioned migrations, backups, transactional execution, recovery tests |
| Backup restore overwrites user data | Critical | Preview, staging, explicit conflict resolution, confirmation |
| Too many architectural abstractions | Medium | Evidence-based boundaries, simplicity reviews, avoid speculative modules |
| Android hardware variability | High | Representative physical-device test matrix and adaptive resource policies |
| Dependency supply-chain vulnerability | High | Lockfiles, vulnerability review, provenance checks, controlled upgrades |

## 29. Unresolved technical decisions

The following remain open until current evidence is collected and reviewed:

1. Flutter architecture style and module boundaries.
2. State-management solution.
3. Primary local database and whether any secondary store is justified.
4. EPUB rendering engine and PDF engine.
5. Format-specific parsers and supported fidelity levels.
6. Search indexing engine and whether semantic indexing is justified locally.
7. Local AI inference runtime and initial supported model formats.
8. Embedding model/runtime and vector index implementation.
9. Cloud AI provider abstraction details and any gateway use.
10. TTS plugins, Android integration, downloadable engine options, and cloud provider.
11. Background task package/native integration choices.
12. Navigation framework.
13. Dependency injection strategy.
14. Networking client and code generation strategy.
15. Backup archive format, encryption design, and restore merge policy.
16. Secure-storage package and Android Keystore behavior.
17. Crash reporting vendor, if any, subject to consent.
18. CI/CD provider.
19. Localization package/tooling details.
20. Quantitative performance budgets and supported-device baseline.

Each item must be assigned an owner/status and closed by an ADR or an explicit decision entry. Do not disguise an unresolved choice as a finalized architecture.

## 30. Definition of technical readiness

The project is technically ready to begin full feature implementation when:

- The fresh Flutter repository and Android toolchain are verified.
- Architecture, state management, navigation, and dependency-management decisions are documented.
- Local database and file-access strategy are selected.
- Initial document engine feasibility is proven with a small technical spike.
- AI/TTS platform feasibility and licensing risks are understood sufficiently for planned phases.
- Security and privacy boundaries are documented.
- Test, lint, build, and CI baselines are operational.
- ADRs capture high-impact decisions.
- The roadmap identifies dependencies, risks, and measurable phase gates.

A technical spike is not a production feature. It must include its question, alternatives, test conditions, results, limitations, and recommendation.

## 31. Final status

**Technical discovery: COMPLETE (30/30 questions).**

**Technology selection: PENDING EVIDENCE-BASED INVESTIGATION.**

**Implementation status: NOT AUTHORIZED BY THIS DOCUMENT ALONE.** This TRD records requirements and the agreed investigation approach. Implementation proceeds under the scope and autonomy rules in `AGENT.md` and any explicit user approvals required by those rules.

This document should be updated when technical evaluations close, ADRs are accepted, implementation reveals a material constraint, or the approved PRD changes. Keep the PRD and TRD aligned, and record the reason for every material change.
