# EmotionalNovelReader Roadmap

> **Project:** EmotionalNovelReader (ENR)  
> **Product:** Emotional Novel Reader  
> **Roadmap status:** Initial baseline  
> **Last updated:** 8 November 2026  
> **Planning basis:** PRD, TRD, AGENT.md, and README.md

---

## 1. Purpose

This roadmap defines the intended path from the completed product-definition stage to a dependable Android release of EmotionalNovelReader.

It combines:

- Product milestones and user-facing capabilities.
- Technical investigations and architecture decisions.
- Engineering foundations and implementation workstreams.
- Quality, security, accessibility, and performance requirements.
- Beta testing, release preparation, and production distribution.

The roadmap is a planning and sequencing document. Individual actionable work belongs in `TASKS.md`; approved architecture and technology choices belong in `DECISIONS.md`. This document should remain focused on milestones, outcomes, dependencies, and release readiness.

## 2. Current Project Baseline

| Area | Current state | Notes |
|---|---|---|
| Product discovery | Completed | Product discovery outcomes are captured in `prd.md`. |
| Product Requirements Document | Prepared | Product scope and constraints are defined in `prd.md`. |
| Technical Requirements Document | Prepared | Technical investigation areas and open decisions are in `trd.md`. |
| Agent and execution governance | Prepared | `AGENT.md` defines execution, approval, Git, testing, and reporting expectations. |
| Project README | Prepared | `README.md` provides the initial product and developer guide. |
| Fresh Flutter project | Not started | Create a clean project after verifying the target directory and Git state. |
| Architecture and package selection | Pending investigation | Do not treat candidate technologies in the TRD as final selections. |
| Application implementation | Not started | No feature should be represented as implemented until verified. |
| CI/CD | Not configured | Establish after repository and build foundations exist. |
| Public release | Not available | No production release is currently available. |

### Current immediate objective

Establish a clean Flutter project safely, validate the development environment, and investigate high-impact technical decisions before committing to the application architecture and dependencies.

The old React Native frontend and Node.js/Express backend are out of scope for the new implementation. Do not automatically restore, migrate, or reuse their source code or architecture.

## 3. Roadmap Planning Principles

### 3.1 Prioritization

Priorities are assigned using four considerations:

1. **Dependencies:** Foundational work must precede work that relies on it.
2. **Product value:** Deliver a useful, dependable reading experience early.
3. **Technical risk:** Investigate high-risk or expensive-to-change areas early.
4. **Release readiness:** Security, recovery, accessibility, performance, and verification are part of delivery, not optional follow-up work.

### 3.2 Priority definitions

| Priority | Meaning |
|---|---|
| P0 - Critical | Blocks project setup, data integrity, core reading, security, or release progression. |
| P1 - High | Required for the MVP or a major product capability. |
| P2 - Medium | Important capability that can follow the core MVP without compromising it. |
| P3 - Later | Optional enhancement or capability deferred until its value and feasibility are established. |

Priority is not a substitute for dependency order. A P1 feature may remain blocked until its P0 foundation is complete.

### 3.3 Status definitions

Use these statuses consistently in roadmap and task tracking:

| Status | Meaning |
|---|---|
| Planned | Accepted into the roadmap but work has not started. |
| Investigating | Evidence gathering, feasibility checks, or technical evaluation is underway. |
| Blocked | Progress cannot continue because a dependency, decision, or external condition is unresolved. |
| Ready | Scope, dependencies, and acceptance criteria are sufficiently clear to begin. |
| In Progress | Implementation or execution is underway. |
| In Review | Implementation is complete and awaiting review. |
| Testing | Verification is underway. |
| Completed | Acceptance criteria are met and supporting evidence is recorded. |
| Deferred | Intentionally postponed; reason and revisit condition are recorded. |
| Cancelled | Removed from scope with rationale documented. |

### 3.4 Progress and completion evidence

- Use progress percentages only when there is a meaningful basis, such as completed verified sub-deliverables.
- Do not estimate progress from elapsed time or lines of code.
- A milestone is not complete because an agent reports that work is finished.
- Record test results, analysis output, build results, device verification, review findings, and relevant documentation.
- Keep blockers, dependencies, risks, and last-updated dates visible.
- Update this roadmap when milestone scope or sequencing materially changes.

### 3.5 Execution capacity

Planning assumes one primary developer supported by AI coding agents.

Agents may work on separate investigations, tests, implementation areas, and documentation when parallelization is safe. Avoid overlapping edits to the same files or shared architectural decisions. The primary developer coordinates work and reviews delegated results.

Production publication and other approval-gated actions remain subject to explicit human approval as defined by `AGENT.md`.

---

## 4. High-Level Development Phases

| Phase | Focus | Priority | Dependency | Initial status |
|---|---|---:|---|---|
| 0 | Product and documentation baseline | P0 | None | Completed |
| 1 | Fresh Flutter project and development environment | P0 | Phase 0 | Planned |
| 2 | Technical investigations and architecture decisions | P0 | Phase 1 may begin; selected investigations can run in parallel | Planned |
| 3 | Application foundation and offline data layer | P0 | Architecture and persistence decisions | Planned |
| 4 | Core library, import, and reader MVP | P0 | Phases 1-3 and relevant reader-engine decisions | Planned |
| 5 | Complete reading experience and offline reliability | P1 | Phase 4 | Completed |
| 6 | Backup, restore, and data protection | P1 | Persistence and file-storage foundations | Completed |
| 7 | Text-to-speech and Android media integration | P1 | Reader text and platform integration | Completed |
| 8 | Local AI foundation and model lifecycle | P1 | Early investigation can run in parallel; implementation needs stable app foundation | Completed |
| 9 | RAG, spoiler-aware AI, and reader intelligence | P1/P2 | Phase 8 and indexed book content | Completed |
| 10 | Optional cloud AI and cloud services | P2 | Privacy architecture, consent flows, and local AI boundaries | Completed |
| 11 | Product hardening and release candidate | P0 | Required MVP capabilities and verification | Completed |
| 12 | Internal, closed beta, and production distribution | P0 | Release candidate and human approval | Planned |

The phases are a planning sequence, not a requirement to finish every investigation before any implementation begins. Low-risk foundations may proceed while independent investigations run, provided unresolved decisions do not force premature commitments.

---

## 5. Detailed Phase Plan

## Phase 0 - Product and Documentation Baseline

<badge>Completed</badge>

**Objective:** Establish a shared understanding of the product, technical constraints, and execution rules.

### Scope

- Complete product discovery and capture requirements.
- Prepare the Product Requirements Document.
- Prepare the Technical Requirements Document.
- Define agent autonomy, approval boundaries, Git safety, testing, and reporting.
- Establish the initial README and documentation index.

### Deliverables

- `prd.md`
- `trd.md`
- `AGENT.md`
- `README.md`
- Initial project documentation plan.

### Exit criteria

- Product scope and non-goals are documented.
- Technical unknowns are visible rather than silently assumed.
- Project governance and approval boundaries are documented.
- The new project is clearly separated from legacy React Native and backend implementation.

### Follow-up

Create and maintain `ROADMAP.md`, `TASKS.md`, `DECISIONS.md`, and `CHANGELOG.md` as the project tracking baseline is established.

---

## Phase 1 - Fresh Flutter Project and Development Environment

**Priority:** P0 - Critical  
**Status:** Planned

**Objective:** Establish a clean, reproducible Flutter development environment and a fresh Android-first project.

### Workstreams

**1.1 Repository and workspace verification**
- Confirm the intended repository and project directory.
- Inspect Git branch, status, uncommitted changes, remotes, and existing documentation.
- Preserve existing user work and useful Git history where practical.
- Verify that no cleanup or replacement operation would remove required files.
- Establish the new project boundary and repository conventions.

**1.2 Development environment**
- Verify Flutter and bundled Dart versions.
- Verify Android Studio, Android SDK, platform tools, and compatible JDK.
- Verify emulator and physical-device availability.
- Record environment setup and known requirements.
- Confirm `flutter doctor` and device discovery.

**1.3 Fresh project bootstrap**
- Generate a new Flutter project using supported Flutter tooling.
- Configure Android application identity and baseline metadata when known.
- Add existing project documentation without overwriting user work.
- Establish initial formatting, linting, test, and build commands.
- Verify a clean debug build on an Android target.

**1.4 Git and collaboration foundations**
- Establish branch naming and commit conventions.
- Configure protected branches and repository checks where hosting supports them.
- Define safe merge, checkpoint, rollback, and review procedures.
- Configure AI-agent task boundaries to prevent overlapping edits.

### Deliverables

- Fresh Flutter project.
- Verified local development environment.
- Reproducible project setup instructions.
- Initial Git workflow.
- Baseline debug build and test command results.

### Dependencies

- Phase 0 documentation baseline.
- Confirmed target repository and directory.
- Access to required development tools.

### Exit criteria

- Flutter and Android toolchain checks pass or documented blockers are accepted.
- Fresh application launches on an Android emulator or physical device.
- Formatting, static analysis, and baseline tests run.
- Git state and project documentation are preserved.
- No legacy source has been reused without an explicit, evidence-based decision.

---

## Phase 2 - Technical Investigations and Architecture Decisions

**Priority:** P0 - Critical  
**Status:** Planned

**Objective:** Resolve high-impact technical unknowns through evidence-based evaluation before committing to long-lived dependencies and architecture.

Investigations may proceed in parallel where they do not create conflicting implementation assumptions.

### Workstreams

**2.1 Application architecture**
- Compare feature-first, layered, Clean Architecture, and modular approaches.
- Evaluate complexity, testability, dependency boundaries, offline workflows, and long-term maintainability.
- Recommend a structure appropriate to the actual product scope.

**2.2 State management and dependency injection**
- Compare Riverpod, BLoC/Cubit, Provider, and viable alternatives.
- Evaluate reactive persistence, asynchronous operations, lifecycle, testing, and maintainability.
- Evaluate dependency injection options and code-generation trade-offs.

**2.3 Local persistence and data lifecycle**
- Compare SQLite/Drift, Isar, ObjectBox, Hive, and other viable options.
- Evaluate relational queries, transactions, reactive streams, migrations, search, performance, durability, and recovery.
- Avoid multiple databases unless a concrete requirement justifies them.
- Define data ownership and the separation of source files, metadata, indexes, and caches.

**2.4 Android file access and import**
- Evaluate Android Storage Access Framework and persisted URI permissions.
- Investigate moved, deleted, revoked, or cloud-backed document URIs.
- Evaluate large-file streaming, temporary files, cleanup, and export behavior.
- Define a safe import pipeline that preserves originals.

**2.5 Reader and rendering engines**
- Evaluate EPUB, PDF, text, office-document, web, comic, and other format support.
- Compare rendering quality, pagination, typography, annotations, accessibility, performance, licensing, and maintenance.
- Design a unified reader-facing interface where practical, while allowing format-specific engines.

**2.6 Search and indexing**
- Evaluate SQLite FTS5, dedicated local search engines, and application-level indexing.
- Cover keyword, phrase, fuzzy, multilingual, incremental, and metadata search.
- Assess semantic search only where it provides measurable value.

**2.7 Local AI inference**
- Compare llama.cpp/GGUF, ONNX Runtime, MediaPipe, LiteRT, native Android inference, and viable alternatives.
- Evaluate model compatibility, quantization, Android acceleration, memory, thermal behavior, streaming, cancellation, and Flutter integration.
- Assess model licensing, provenance, download, import, update, and deletion lifecycle.

**2.8 AI retrieval and spoiler safety**
- Evaluate keyword, semantic, metadata-filtered, and hybrid retrieval.
- Define how book position and spoiler scope constrain retrieval.
- Ensure spoiler enforcement is application-controlled rather than prompt-only.
- Define evidence presentation, uncertainty, and user correction flows.

**2.9 Text-to-speech and Android services**
- Evaluate native Android TTS, offline voice availability, optional cloud voices, and playback integration.
- Investigate audio focus, foreground-service eligibility, media controls, Bluetooth, lifecycle, and Android background restrictions.

**2.10 Networking, credentials, and diagnostics**
- Define isolated external provider adapters.
- Evaluate secure credential storage and Android Keystore integration.
- Define local-first diagnostics and consent-based reporting.
- Establish clear network failure behavior.

**2.11 Backup, restore, and migrations**
- Evaluate backup format, compatibility, integrity validation, selective restore, and recovery.
- Define migration versioning and failure handling.
- Ensure restore cannot silently overwrite or destroy user data.

**2.12 Security, accessibility, localization, and performance**
- Perform threat-model-driven security investigation.
- Evaluate accessibility architecture and verification.
- Evaluate localization and locale-aware formatting.
- Establish measurable performance targets and representative Android device classes.

### Deliverables

- Architecture recommendation and approved decision records.
- Dependency and package evaluation.
- Reader-engine comparison.
- Persistence and migration recommendation.
- AI inference and retrieval recommendation.
- TTS and Android integration recommendation.
- Security, accessibility, performance, and backup design inputs.
- Updated TRD and `DECISIONS.md`.

### Exit criteria

- High-impact decisions have documented alternatives, evidence, trade-offs, and recommendations.
- Material product or architecture conflicts have required approval.
- Licensing, maintenance, platform compatibility, and security have been evaluated for selected dependencies.
- Unresolved decisions have owners, impact, and a revisit condition.
- The selected design is sufficient to implement the application foundation without avoidable architectural guesswork.

---

## Phase 3 - Application Foundation and Offline Data Layer

**Priority:** P0 - Critical  
**Status:** Planned

**Objective:** Build the maintainable application foundation and reliable local data capabilities required by all major features.

### Workstreams

**3.1 Application structure**
- Implement the approved module and layer structure.
- Configure navigation and dependency injection.
- Establish error handling, logging, configuration, and shared utilities.
- Define feature boundaries and shared UI foundations.

**3.2 Local database**
- Implement the selected persistence engine.
- Define versioned schemas, constraints, indexes, and migrations.
- Add transaction and recovery handling.
- Establish repository and data-source conventions.

**3.3 File and storage services**
- Implement safe document URI handling and persisted access where supported.
- Separate original files from derived content, indexes, and caches.
- Handle unavailable sources and storage errors.
- Establish storage visibility and safe cleanup rules.

**3.4 Offline behavior**
- Ensure local reads do not depend on network access.
- Define local-first mutation and persistence patterns for supported data.
- Handle interrupted operations and application lifecycle changes.
- Ensure optional network services cannot break core reading.

**3.5 Quality foundations**
- Configure unit, widget, and integration test infrastructure.
- Establish CI checks when repository hosting is ready.
- Add dependency and license tracking.
- Add baseline performance and diagnostic instrumentation without collecting sensitive content.

### Deliverables

- Approved application foundation.
- Local persistence and migration framework.
- File access and storage abstractions.
- Error handling and diagnostics foundation.
- Test infrastructure and baseline CI checks.

### Dependencies

- Phase 1.
- Relevant Phase 2 architecture, persistence, file access, and security decisions.

### Exit criteria

- Core data can be persisted and retrieved locally.
- Database migrations are versioned and tested.
- File access failures are handled without data loss.
- Core local operations work without network connectivity.
- Architecture boundaries and test patterns are documented.
- Automated checks run reliably.

---

## Phase 4 - Core Library, Import, and Reader MVP

**Priority:** P0 - Critical  
**Status:** Planned

**Objective:** Deliver the first genuinely useful reading experience.

### Workstreams

**4.1 Library**
- Add and organize books.
- Display book metadata and reading state.
- Support library browsing and basic filtering.
- Handle unavailable source files clearly.

**4.2 Import pipeline**
- Implement the initial supported format set based on engine evaluation.
- Validate file type and content safely.
- Handle large files and import failures.
- Preserve original files.
- Record import metadata and source references.

**4.3 Reader**
- Open supported books.
- Implement reading layout and navigation.
- Support chapter or page navigation appropriate to the format.
- Save and restore reading position.
- Handle reader lifecycle and reopening.

**4.4 Reading preferences**
- Add initial typography, spacing, theme, and background controls.
- Persist reader preferences locally.
- Ensure controls remain usable with accessibility settings.

**4.5 Core regression and device verification**
- Test import, open, navigate, close, and resume workflows.
- Verify behavior after process termination and device restart where relevant.
- Test representative small and large documents.
- Validate on real Android hardware.

### Deliverables

- Usable local library.
- Initial supported import formats.
- Functional reader and navigation.
- Persistent reading progress.
- Initial reader customization.
- Automated and Android-device verification.

### Dependencies

- Phase 3.
- Reader-engine and import decisions from Phase 2.

### Exit criteria

A user can import a supported book, find it in the library, open it, read and navigate it, close the application, and resume at the correct position without requiring internet access.

---

## Phase 5 - Complete Reading Experience and Offline Reliability

<badge>Completed</badge>

**Priority:** P1 - High  
**Status:** Completed

**Objective:** Expand the basic reader into a complete, dependable offline reading experience.

### Workstreams

**5.1 Reading customization**
- Expand themes, typography, spacing, margins, and reading modes.
- Add relevant navigation preferences.
- Validate text scaling and accessibility behavior.

**5.2 Search**
- Add library and book-content search according to the selected indexing strategy.
- Support incremental indexing and index recovery.
- Validate search behavior across supported languages and formats.

**5.3 Book interaction**
- Add bookmarks.
- Add highlights and annotations.
- Persist and retrieve user-created reading data.
- Handle source-document changes or unavailable files safely.

**5.4 Reading statistics and goals**
- Add basic goals for time, pages, or chapters.
- Add daily, weekly, monthly, and yearly reading-time views.
- Avoid competitive achievements, streak pressure, and excluded reminder patterns.

**5.5 Offline and recovery verification**
- Test airplane mode and network transitions.
- Test local data durability after process termination.
- Verify consistency between library, reader, progress, and annotations.
- Test large libraries and long reading sessions.

### Deliverables

- Complete reading customization.
- Search and indexing.
- Bookmarks, highlights, and annotations.
- Basic reading goals and statistics.
- Offline reliability test evidence.

### Dependencies

- Phase 4.
- Search and annotation architecture decisions.

### Exit criteria

- Core reading and supported book interactions work offline.
- Search and indexing recover safely from interruption.
- Reading progress and annotations remain consistent.
- Accessibility behavior is verified for the delivered UI.
- Critical reader regression tests pass.

---

## Phase 6 - Backup, Restore, and Data Protection

**Priority:** P1 - High  
**Status:** Completed

**Objective:** Protect user data and make backup and recovery understandable and dependable.

### Workstreams

**6.1 Backup format**
- Define supported data, metadata, file references, and version information.
- Define compatibility rules and backup versioning.
- Decide how original imported files are represented or included.

**6.2 Local export and import**
- Implement manually initiated backup export.
- Implement backup selection and import.
- Explain whether exported files are encrypted.
- Warn users that unencrypted exports can be read by anyone who obtains them.

**6.3 Validation and restore**
- Validate archive structure, metadata, checksums, and compatibility.
- Detect incomplete or corrupted backups.
- Define preview and selection behavior where supported.
- Prevent accidental destructive overwrite.
- Handle interrupted restore and recovery.

**6.4 Optional cloud destinations**
- Evaluate manually initiated cloud destinations only after local backup is reliable.
- Require explicit user action and clear data-transfer disclosure.
- Do not introduce automatic multi-device synchronization into the initial scope.

### Deliverables

- Documented backup format.
- Manual local backup and restore.
- Integrity validation and recovery handling.
- Backup/restore documentation and test suite.
- Optional cloud backup decision, if justified.

### Dependencies

- Phase 3 persistence and file storage.
- Phase 4 and Phase 5 data models.
- Phase 2 backup and migration decisions.

### Exit criteria

- A supported user dataset can be exported and restored.
- Invalid, incompatible, or incomplete backups are detected safely.
- Restore behavior is tested, including interruption and recovery.
- Existing data is not silently destroyed.
- Export encryption status and user responsibilities are clearly communicated.

---

## Phase 7 - Text-to-Speech and Android Media Integration

**Priority:** P1 - High  
**Status:** Completed

**Objective:** Provide reliable narration while respecting Android platform behavior and device capabilities.

### Workstreams

**7.1 Early investigation**
- Evaluate native Android TTS and Flutter integration.
- Determine installed-engine and offline-voice availability behavior.
- Investigate language, voice, rate, pitch, and supported text extraction.
- Confirm Android background execution and media-control requirements.

**7.2 Basic narration**
- Add narration for supported reader content.
- Add play, pause, stop, and relevant playback controls.
- Handle unsupported text and engine failures.

**7.3 Background playback**
- Add background narration where platform rules permit.
- Add media-session and lock-screen controls where supported.
- Handle audio focus, interruptions, Bluetooth, and lifecycle.
- Respect foreground-service and notification requirements.

**7.4 Reading-position synchronization**
- Synchronize reader and narration position when reliable timing is available.
- Do not promise word-level synchronization when the engine does not expose word timing.

**7.5 Optional cloud voices**
- Evaluate cloud voices as a separate opt-in capability.
- Disclose external processing and data transfer.
- Keep offline/native narration independent.

### Deliverables

- Basic narration.
- Playback controls.
- Android background/media integration.
- Supported reading-position synchronization.
- TTS documentation and device verification.

### Dependencies

- Phase 4 reader content and text extraction.
- Phase 2 TTS and Android integration decisions.

### Exit criteria

- Narration works for supported content and installed engines.
- Playback handles interruptions and lifecycle changes.
- Background behavior follows Android requirements.
- Offline behavior is accurately represented.
- No unsupported word-timing guarantees are made.

---

## Phase 8 - Local AI Foundation and Model Lifecycle

**Priority:** P1 - High  
**Status:** Completed

**Objective:** Establish on-device AI infrastructure without making core reading depend on AI availability.

### Workstreams

**8.1 Runtime integration**
- Integrate the selected local inference engine behind an application-owned interface.
- Verify model loading, generation, cancellation, streaming, and error handling.
- Evaluate CPU/GPU/NPU acceleration only where supported and beneficial.

**8.2 Model management**
- Define a curated model catalog where appropriate.
- Support user-controlled model import, download, update, and deletion where feasible.
- Track model identity, version, provenance, license, size, and capabilities.
- Validate downloads and imported model files.

**8.3 Resource management**
- Evaluate memory, CPU/GPU usage, battery, thermal behavior, and storage.
- Add capability-aware model recommendations.
- Allow user override where safe.
- Handle unsupported devices and insufficient resources gracefully.

**8.4 AI service foundation**
- Define task-specific AI interfaces.
- Separate model execution from product workflows.
- Add structured errors, cancellation, and diagnostics.
- Keep AI output distinguishable from source-book content.

### Deliverables

- Local inference foundation.
- Model lifecycle and provenance handling.
- Device capability and resource handling.
- AI service contracts and tests.

### Dependencies

- Phase 2 AI inference and security decisions.
- Phase 3 application architecture.
- Reader content access from Phase 4.

### Exit criteria

- A selected supported model can be installed and invoked on verified Android hardware.
- Unsupported devices and model failures are handled safely.
- Model license and provenance are tracked.
- Core reading remains functional if AI is unavailable.
- Resource behavior is measured on representative devices.

---

## Phase 9 - RAG, Spoiler-Aware AI, and Reader Intelligence

**Priority:** P1/P2 - High, staged by capability  
**Status:** Completed

**Objective:** Deliver trustworthy, book-aware AI features with application-enforced spoiler boundaries.

### Workstreams

**9.1 Book indexing and retrieval**
- Extract and normalize supported book content.
- Build local keyword and metadata indexes.
- Evaluate semantic retrieval and hybrid ranking where justified.
- Support incremental indexing and index invalidation.

**9.2 Spoiler enforcement**
- Represent the reader's current position and allowed story scope.
- Filter retrieval candidates against the allowed scope.
- Ensure summaries and assistant context cannot include unreached content by default.
- Support explicit user override with clear scope disclosure.
- Test adversarial and boundary cases.

**9.3 AI answer quality**
- Ground answers in retrieved story evidence where possible.
- Distinguish explicit text facts from interpretation.
- Communicate uncertainty and limitations.
- Allow users to correct or challenge insights.
- Avoid presenting emotion analysis as objective truth.

**9.4 Product capabilities**
- Chapter and book summaries.
- Emotion exploration.
- Character insights and development.
- Relationship analysis.
- Story structure exploration.
- Context-aware reading assistant.
- Reading recommendations where supported by adequate data.

**9.5 Assistant history and controls**
- Add conversation history and management according to product requirements.
- Provide relevant search and memory controls.
- Apply spoiler scope consistently to conversation context and retrieval.

### Deliverables

- Local retrieval pipeline.
- Application-controlled spoiler enforcement.
- Evidence-aware AI response flow.
- Initial AI reading capabilities.
- AI quality, privacy, and regression tests.

### Dependencies

- Phase 8 local AI foundation.
- Phase 4 reader and content extraction.
- Phase 5 search/indexing foundations where shared.
- Phase 2 retrieval and spoiler-safety decisions.

### Exit criteria

- AI features operate on supported content and models.
- Spoiler boundaries are enforced by application logic and tested.
- Responses communicate uncertainty and evidence appropriately.
- AI failures do not damage or block core reading.
- Performance and resource impact are acceptable on declared target devices.

---

## Phase 10 - Optional Cloud AI and External Services

**Priority:** P2 - Medium  
**Status:** Completed

**Objective:** Add optional remote capabilities without weakening local-first behavior or user privacy.

### Workstreams

- Define provider adapters behind application-owned interfaces.
- Evaluate provider terms, data handling, retention, security, and cost.
- Add user-controlled credentials or approved configuration.
- Keep cloud AI disabled by default where required by the PRD.
- Explain exactly what data will be transmitted and to which provider.
- Obtain explicit consent before transmitting book content or other user data.
- Provide feature-level and data-level controls where specified.
- Prevent silent fallback from local to cloud inference.
- Handle rate limits, timeouts, cancellation, and provider outages.
- Keep optional catalog, metadata, download, and backup services isolated from core reading.

### Deliverables

- Cloud provider architecture.
- Consent and disclosure flows.
- Provider configuration and credential handling.
- Network failure and cost-transparency behavior.
- Privacy and security verification.

### Dependencies

- Phase 2 networking, credential, and privacy decisions.
- Phase 8 AI service boundaries.
- Phase 9 retrieval and context controls.

### Exit criteria

- External processing is explicit and user-controlled.
- Data disclosure matches actual transmitted content.
- Credentials are protected.
- Cloud failure does not break local reading or local AI.
- No silent cloud fallback exists.
- Provider terms and data practices are reviewed and documented.

---

## Phase 11 - Product Hardening and Release Candidate

**Priority:** P0 - Critical  
**Status:** Completed

**Objective:** Verify the agreed release scope and resolve release-blocking defects before distribution.

### Workstreams

**11.1 Functional and regression testing**
- Verify all release-scope acceptance criteria.
- Run unit, widget, integration, and regression suites.
- Validate imports, reading, progress, annotations, search, backup, and narration as included in the release.
- Verify AI and cloud behavior only for capabilities included in the release.

**11.2 Offline and recovery**
- Test airplane mode, network transitions, and provider outages.
- Test process termination and device restart.
- Test interrupted imports, indexing, backup, and restore.
- Validate database migrations and backup compatibility.

**11.3 Security and privacy**
- Review permissions, file handling, credentials, logs, and network boundaries.
- Verify consent and disclosure behavior.
- Review dependency vulnerabilities and licenses.
- Validate data export and deletion workflows.

**11.4 Performance and compatibility**
- Measure startup, scrolling, rendering, import, search, and storage performance.
- Measure AI resource consumption for included AI features.
- Test low-end, mid-range, and high-end representative Android devices.
- Review battery, memory, CPU/GPU, and thermal behavior.

**11.5 Accessibility and localization**
- Verify TalkBack navigation and semantics.
- Test text scaling, contrast, reduced motion, and touch targets.
- Validate translations and locale-specific formatting for supported locales.
- Record and triage accessibility defects.

**11.6 Release engineering**
- Configure release variants and protected signing.
- Verify application identity, version, permissions, and artifacts.
- Configure CI build and verification pipelines.
- Prepare release notes, known limitations, support guidance, and rollback plan.

### Deliverables

- Release-scope verification report.
- Resolved release-blocking defects.
- Security and privacy review.
- Performance and accessibility evidence.
- Signed release candidate artifacts.
- Release notes and rollback plan.

### Exit criteria

- All release-critical acceptance criteria pass.
- Required automated tests and device checks pass.
- No unresolved critical security, data-loss, or core-reading defects remain.
- Known limitations are documented and accepted.
- Release signing and artifact provenance are verified.
- Human release approval is obtained before publication.

---

## Phase 12 - Internal, Closed Beta, and Production Distribution

**Priority:** P0 - Critical  
**Status:** Planned

**Objective:** Distribute the application progressively, collect useful feedback, and release safely.

### Workstreams

**12.1 Internal testing**
- Generate developer and internal APK builds.
- Verify installation, upgrade, data retention, and basic device compatibility.
- Validate release configuration and signing.

**12.2 Closed beta**
- Select a controlled tester group.
- Provide a clear feedback and bug-reporting path.
- Track crash reports and reproducible defects with appropriate privacy controls.
- Monitor core workflows, device compatibility, and performance.
- Fix and re-verify release-blocking issues.

**12.3 Store testing**
- Configure applicable Google Play testing tracks.
- Prepare store metadata, privacy disclosures, screenshots, and policy declarations.
- Verify app bundle and signing configuration.
- Confirm distribution eligibility and release requirements.

**12.4 Production release**
- Obtain explicit human approval.
- Use a staged rollout where supported.
- Monitor crash and stability signals.
- Maintain a rollback or halt plan.
- Publish release notes and update the changelog.

### Deliverables

- Internal APK artifacts.
- Closed beta distribution and feedback summary.
- Store testing release.
- Approved production release.
- Release notes and post-release review.

### Exit criteria

- Distribution artifacts are signed and traceable to a source revision.
- Beta feedback is triaged and critical defects are resolved.
- Store and privacy declarations are accurate.
- Human approval is recorded.
- Monitoring and rollback procedures are ready.

---

## 6. Product Module Roadmap

This view complements the phase plan. It is a module-oriented summary, not a second task tracker.

| Module | Planned progression | Priority |
|---|---|---:|
| Project foundation | Fresh project, architecture, tooling, CI | P0 |
| Local persistence | Database, migrations, repositories, recovery | P0 |
| File import | Android file access, validation, format pipelines | P0 |
| Library | Book management, metadata, progress | P0 |
| Reader | Rendering, navigation, position, preferences | P0 |
| Search | Library and full-text search, indexing | P1 |
| Annotations | Bookmarks, highlights, notes | P1 |
| Statistics and goals | Time-based statistics and basic goals | P2 |
| Backup and restore | Local export, validation, restore, recovery | P1 |
| Text-to-speech | Basic narration, background/media integration | P1 |
| Local AI | Runtime, model management, resource controls | P1 |
| AI retrieval | RAG, evidence, spoiler enforcement | P1 |
| AI reader features | Emotion, summaries, character, relationship, story insights | P1/P2 |
| Cloud AI | Optional provider adapters and consent | P2 |
| Accessibility | TalkBack, contrast, text scaling, reduced motion | P0/P1 |
| Localization | Translation and locale-aware formatting | P1 |
| Security and privacy | Threat model, secure storage, data controls | P0 |
| Release engineering | Signing, CI/CD, beta, production | P0 |

---

## 7. Cross-Cutting Workstreams

These workstreams apply throughout the roadmap and must not be postponed to a single final phase.

### 7.1 Testing and quality

- Test each feature as it is implemented.
- Add regression tests for important bug fixes.
- Maintain unit, widget, integration, and Android device verification.
- Test offline and online behavior.
- Include performance, accessibility, security, migration, and recovery testing.
- Run dedicated release verification before beta and production.

### 7.2 Documentation

- Update documentation alongside implementation.
- Record material architecture and technology choices in `DECISIONS.md`.
- Keep `TASKS.md` actionable and current.
- Update `CHANGELOG.md` for significant user-visible or technical changes.
- Create detailed technical documents when the corresponding design is established.
- Prepare setup, troubleshooting, backup, and release guidance before distribution.

### 7.3 Git and change management

- Establish repository conventions during project setup.
- Use focused branches and descriptive atomic commits.
- Preserve uncommitted work and useful history.
- Use checkpoints before risky changes.
- Review delegated work and inspect final diffs.
- Run required checks before merging.
- Use safe merges, rollback procedures, and release tags.
- Do not force-push or rewrite shared history without explicit approval.

### 7.4 Performance and device coverage

- Establish measurable baselines early.
- Test low-end, mid-range, and high-end Android devices.
- Measure reader startup, scrolling, rendering, imports, indexing, and storage.
- Measure local AI memory, CPU/GPU use, battery, and thermal behavior.
- Investigate performance regressions before release.

### 7.5 Accessibility and localization

- Establish accessible UI and localization foundations early.
- Implement accessible semantics and interaction behavior with each feature.
- Validate TalkBack, contrast, text scaling, reduced motion, and touch targets.
- Validate supported translations and locale-specific formatting.
- Conduct dedicated audits before production.

### 7.6 Security and privacy

- Maintain a threat model and risk register.
- Validate imported content and external inputs.
- Protect credentials and sensitive local data.
- Avoid sensitive content in logs and diagnostics.
- Keep cloud processing explicit and consent-based.
- Verify data export, deletion, backup, and restore behavior.

---

## 8. Risk and Uncertainty Register

This is an initial risk register. Probability and impact are qualitative starting assessments, not measured facts. Reassess them as investigations produce evidence.

| ID | Risk / uncertainty | Initial probability | Initial impact | Priority | Mitigation / next action |
|---|---|---|---|---:|---|
| R-01 | Reader engine limitations or poor rendering fidelity across formats | Medium | High | P0 | Evaluate engines with representative real documents before selection. |
| R-02 | Android document URI access may be revoked or source files moved/deleted | Medium | High | P0 | Prototype SAF access, persisted permissions, unavailable-source handling, and recovery. |
| R-03 | Local AI models may exceed device memory, thermal, or battery budgets | High | High | P1 | Benchmark candidate runtimes and models on representative Android hardware early. |
| R-04 | AI retrieval may reveal future plot details | Medium | Critical | P0 | Enforce spoiler scope in application retrieval and context construction; test boundary cases. |
| R-05 | Database or backup migration may corrupt or lose user data | Medium | Critical | P0 | Version schemas and backups; test interrupted migrations, validation, restore, and recovery. |
| R-06 | Android background execution restrictions may disrupt narration | Medium | High | P1 | Prototype TTS lifecycle and eligible foreground-service/media behavior early. |
| R-07 | Candidate packages may be unmaintained, incompatible, or license-restricted | Medium | High | P0 | Evaluate maintenance, compatibility, security, and licenses before adoption. |
| R-08 | Broad format support may expand scope beyond the MVP | High | Medium | P1 | Define a verified initial format set and defer formats that fail feasibility or quality gates. |
| R-09 | Cloud provider data practices, cost, or availability may conflict with product expectations | Medium | High | P2 | Keep cloud optional; review provider terms, cost, data handling, and consent design. |
| R-10 | Performance may vary significantly across Android device classes | High | High | P1 | Establish device matrix and measurable budgets; test early and continuously. |
| R-11 | Accessibility or localization gaps may require structural rework | Medium | High | P1 | Include accessible semantics and localization foundations from the start. |
| R-12 | Parallel AI-agent work may create overlapping changes or inconsistent decisions | Medium | Medium | P1 | Assign non-overlapping scopes, coordinate shared interfaces, and review delegated work. |
| R-13 | Release signing or CI secrets may be mishandled | Low/Medium | Critical | P0 | Use protected secret storage, restricted access, and explicit release procedures. |
| R-14 | Technical investigation may delay the first usable reader if scope is not controlled | Medium | High | P1 | Time-box investigations, prioritize decisions that unblock the MVP, and defer optional features. |

### Risk review rules

For each active risk, record:

- Owner or responsible workstream.
- Affected phase and dependencies.
- Probability and impact.
- Severity and priority.
- Mitigation and contingency.
- Evidence or trigger that changes the assessment.
- Review status and last-updated date.

Add newly discovered risks to this register and link detailed tasks or decisions rather than duplicating their full implementation plans here.

---

## 9. Timeline and Estimation Policy

No fixed delivery dates are committed in this baseline.

### Planning approach

- Use milestone-based progress as the primary measure.
- Add estimated duration ranges after scope, dependencies, and technical risk are understood.
- Use provisional target dates only when there is enough evidence to support them.
- Re-estimate when an investigation changes scope or reveals a major dependency.
- Do not convert guesses into commitments.

### Estimation template

| Phase | Estimate | Confidence | Target window | Notes |
|---|---|---|---|---|
| Phase 1 - Project setup | To estimate | Not assessed | Not scheduled | Depends on environment and repository verification. |
| Phase 2 - Technical investigation | To estimate | Not assessed | Not scheduled | Depends on prototype scope and decision complexity. |
| Phase 3 - Application foundation | To estimate | Not assessed | Not scheduled | Depends on architecture and persistence decisions. |
| Phase 4 - Reader MVP | To estimate | Not assessed | Not scheduled | Depends on import and rendering engine evaluation. |
| Later phases | To estimate | Not assessed | Not scheduled | Re-estimate as earlier milestones complete. |

Do not enter target dates until the primary developer has reviewed the estimates and dependencies.

---

## 10. MVP Definition and Release Gates

### 10.1 First usable release: dependable offline reader

The first usable application release should prioritize a complete, dependable offline reading experience before advanced AI features.

Expected MVP scope:

- Fresh, stable Flutter Android application.
- Local library and supported book import.
- Functional reader and navigation.
- Persistent reading position.
- Useful reader customization.
- Search, bookmarks, highlights, and annotations as defined by the approved MVP scope.
- Offline local persistence and recovery.
- Manual backup and restore with integrity safeguards.
- Accessibility foundations and verified core flows.
- Security, performance, and real-device validation.

The exact initial document format set and inclusion of advanced supporting features must be confirmed through the technical investigation and tracked acceptance criteria.

### 10.2 AI release progression

AI can be investigated early, but should not delay or destabilize the first dependable reader.

Suggested progression:

1. Local inference feasibility and device benchmarks.
2. Local runtime and model lifecycle.
3. Local retrieval and spoiler enforcement.
4. Initial reader intelligence features.
5. Optional cloud AI after consent, privacy, cost, and provider controls are verified.

### 10.3 Release gates

A release candidate must pass all applicable gates:

| Gate | Required evidence |
|---|---|
| Functional | Release-scope acceptance criteria pass. |
| Automated quality | Relevant formatting, analysis, unit, widget, integration, and regression checks pass. |
| Android device | Core workflows verified on representative physical Android devices. |
| Offline | Core reading and local data workflows verified without network. |
| Data integrity | Migration, backup, restore, interruption, and recovery checks pass. |
| Security and privacy | Threat-model controls, permissions, credential handling, logging, and consent flows reviewed. |
| Performance | Agreed performance budgets met or exceptions documented and approved. |
| Accessibility | Required accessibility checks and audits completed. |
| Documentation | Setup, known limitations, support, release notes, and technical documentation updated. |
| Release engineering | Signing, versioning, artifact provenance, and rollback procedures verified. |
| Approval | Explicit human approval before production publication. |

### 10.4 Definition of done

A roadmap item or feature is complete only when:

- Its scope and acceptance criteria are met.
- Relevant tests pass.
- Static analysis and formatting checks pass where applicable.
- Regression impact is reviewed.
- Required Android device verification is complete.
- Security, privacy, accessibility, and performance implications are addressed.
- Documentation and project tracking are updated.
- Remaining limitations and risks are recorded.
- Completion evidence is available for review.

A feature may be marked completed with a documented, accepted limitation only when that limitation does not violate a critical product or safety requirement.

---

## 11. Deferred and Out-of-Scope Items

The following should not enter the initial roadmap without an explicit product-scope decision:

- Reusing or restoring the old React Native frontend as the new application foundation.
- Reintroducing a mandatory Node.js/Express backend for core product functionality.
- Mandatory user accounts or authentication for core reading.
- Automatic multi-device synchronization in the initial product.
- DRM bypass or circumvention.
- Silent cloud AI fallback or undisclosed transmission of book content.
- Competitive achievements, streak pressure, or excluded reading reminders.
- Production release or public publication without explicit human approval.
- Additional platforms as an initial-release commitment.

Future platform expansion may be evaluated after the Android product is stable and the portability of selected dependencies is understood.

---

## 12. Roadmap Maintenance

Update this document when:

- A milestone starts, changes materially, or completes.
- A dependency or priority changes.
- An investigation changes the recommended architecture or technology.
- A major risk is discovered, mitigated, or accepted.
- A release target or scope is revised.
- A phase is deferred, cancelled, or split.

### Related project files

| File | Responsibility |
|---|---|
| `AGENT.md` | Authoritative agent instructions and execution boundaries |
| `README.md` | Product introduction and developer entry point |
| `prd.md` | Product requirements and user-facing scope |
| `trd.md` | Technical requirements and investigation scope |
| `ROADMAP.md` | Milestones, phases, dependencies, and outcomes |
| `TASKS.md` | Actionable work, priority, status, and blockers |
| `DECISIONS.md` | Approved decisions, alternatives, and rationale |
| `CHANGELOG.md` | Significant changes and release history |

### Update checklist

When updating the roadmap:

- [ ] Keep completed milestones supported by evidence.
- [ ] Update phase and module statuses.
- [ ] Review dependencies and priorities.
- [ ] Add or revise risks and uncertainties.
- [ ] Ensure actionable work is represented in `TASKS.md`.
- [ ] Record material decisions in `DECISIONS.md`.
- [ ] Update the last-updated date.
- [ ] Keep the README roadmap summary consistent.

---

## 13. Immediate Next Steps

The next practical work should be limited to the project bootstrap and investigations that unblock it.

1. Verify the intended repository path, Git branch, remotes, and working-tree state.
2. Verify Flutter, Dart, Android SDK, JDK, emulator, and physical-device availability.
3. Establish the fresh Flutter project without deleting or overwriting existing documentation or user work.
4. Create the initial `TASKS.md` entries for setup and technical investigations.
5. Create `DECISIONS.md` with accepted product constraints and an unresolved technical decision register.
6. Begin the prioritized Phase 2 investigations, starting with architecture, persistence, document access, and reader-engine feasibility.
7. Update this roadmap and the TRD as evidence changes the plan.

**Do not begin broad feature implementation until the necessary architecture and data decisions are sufficiently established.** Small prototypes and reversible foundation work may proceed when they are explicitly scoped and do not lock the project into unapproved choices.
