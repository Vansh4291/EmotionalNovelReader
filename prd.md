# EmotionalNovelReader (ENR)
## Product Requirements Document (PRD)

**Document status:** Discovery baseline  
**Version:** 1.0  
**Date:** 1 November 2026  
**Product:** EmotionalNovelReader (ENR)  
**Initial production platform:** Android 12+  
**Development validation platform:** Flutter Web  
**Primary implementation framework:** Flutter

---

## 1. Executive Summary

EmotionalNovelReader (ENR) is an offline-first, highly customizable reading ecosystem for people who read novels, listen to narrated content, organize personal libraries, and explore the emotional, literary, and narrative dimensions of stories.

ENR is intended to go beyond a conventional ebook reader. It combines:

- A flexible reader for a broad range of practical document and ebook formats.
- Local library management, importing, search, annotations, progress tracking, and backups.
- Android text-to-speech (TTS), synchronized reading and listening, and ambient audio.
- Local AI capabilities for emotion analysis, summaries, character intelligence, story understanding, recommendations, and a text-based reading assistant.
- Optional online discovery, authorized content downloads, metadata lookup, and cloud AI.
- Strong privacy controls, user-owned data, accessible design, and adaptive resource management.

The product is **offline-first, local-first, and independent of the existing React Native application and Node.js/Express backend**. Internet connectivity must not be required for core reading, local library management, progress tracking, annotations, or the local features that are supported by the installed models and device capabilities.

The product will be delivered through controlled phases. A feature is not considered complete merely because code has been written: it must meet approved requirements, pass relevant checks, be reviewed, be documented, and have supporting verification evidence.

## 2. Product Vision

Create a complete personal reading ecosystem that brings together reading, listening, emotional understanding, library organization, and intelligent story assistance in one application.

ENR should be:

1. **Offline-first:** Core reading and personal-library workflows continue without an internet connection.
2. **Reader-controlled:** Readers can customize the experience and manage their data.
3. **Emotion-aware:** AI can interpret narrative emotions while clearly communicating uncertainty.
4. **Accessible:** Reading and navigation should work for users with varied visual, motor, and cognitive needs.
5. **Private:** Personal reading content remains on-device unless the reader explicitly authorizes an online service to receive specified data.
6. **Extensible:** Features and providers should be modular, replaceable, and independently testable.
7. **Reliable:** Updates, imports, migrations, crashes, and interrupted tasks must not silently destroy user data.

## 3. Goals

### 3.1 Product goals

- Provide a polished, customizable reading experience.
- Support importing and organizing a broad range of novel and document formats.
- Preserve reading progress, bookmarks, highlights, notes, and library data.
- Provide offline narration and synchronized reading/listening where supported.
- Offer useful local AI analysis with optional cloud enhancement.
- Make online discovery and downloads optional and limited to lawful, authorized sources.
- Provide comprehensive search, library management, backup, recovery, and diagnostics.
- Support Android 12 and newer, subject to feature-specific platform constraints.

### 3.2 Engineering goals

- Build a clean Flutter application independent of the legacy backend.
- Establish a maintainable architecture with clear feature boundaries.
- Use a local database and file-storage layer as the source of truth for core data.
- Make long-running tasks resumable, observable, and resource-aware.
- Provide reliable automated and real-device testing.
- Maintain living product and technical documentation.
- Require evidence-based acceptance before marking work complete.

## 4. Non-Goals and Explicit Exclusions

The following are not part of the initial product direction unless separately approved:

- Reusing or depending on the existing Node.js/Express backend.
- Requiring user registration, login, or an account.
- Automatic cross-device synchronization.
- Automatic cloud synchronization or background cloud backup.
- A separate ENR PIN, password, biometric app lock, or privacy screen.
- Reading reminders, motivational notifications, unfinished-reading alerts, or goal reminders.
- Written user reviews or detailed multi-category ratings; ratings are simple 1–5 stars.
- Elaborate achievement badges, competitive challenges, or social leaderboards.
- Voice interaction with the AI assistant; the assistant is text-chat only.
- iOS, Windows, macOS, or Linux production releases in the initial scope.
- DRM circumvention, unauthorized scraping, or unauthorized redistribution of copyrighted content.
- Guaranteed availability of offline TTS voices on every Android device.
- Guaranteed word-level TTS timing on every Android TTS engine.
- Guaranteed OCR, parsing, or rendering perfection for every possible file.

The existing React Native application, backend, databases, and source files must remain untouched by the new Flutter implementation unless a separate, explicit task authorizes changes. The new application starts with a fresh data model and does not automatically migrate legacy user data.

## 5. Target Users

ENR is designed for a broad range of readers:

- Casual readers.
- Dedicated novel and light-novel readers.
- Readers who prefer listening to text.
- Readers discovering new novels.
- Readers who want a highly customized reading environment.
- Readers interested in characters, themes, emotions, and story analysis.
- Readers who need accessibility features or flexible presentation options.

The product should not assume that all readers want AI assistance or online services. Core reading must remain useful without enabling either.

## 6. Platforms and Compatibility

### 6.1 Initial platform scope

| Platform | Scope |
|---|---|
| Android 12+ (API 31+) | Initial production target |
| Flutter Web | Development and workflow testing only |
| iOS | Out of initial scope |
| Windows/macOS/Linux | Out of initial scope |

Flutter Web testing does not establish that Android-native functionality works. TTS, background playback, media sessions, file access, notifications, battery behavior, scoped storage, and other platform integrations must be tested on real Android devices.

### 6.2 Device range

The app should adapt to budget, mid-range, and flagship Android devices. It must account for varying RAM, CPU, battery, storage, screen dimensions, Android versions, TTS engines, and available hardware acceleration.

## 7. Product Principles

1. **Local source of truth:** Core personal data is stored locally.
2. **No mandatory account:** Users can start using the app without registration.
3. **Offline capability is explicit:** Each feature must declare whether it is fully offline, partially offline, or online-dependent.
4. **Consent before transmission:** Cloud AI and other online services must disclose what data is sent and obtain appropriate consent.
5. **Preserve user data:** Destructive cleanup, replacement, migration, and recovery operations require safeguards.
6. **Original-file preservation:** Imported source files should be retained unless the user explicitly removes them.
7. **AI is interpretive:** AI-generated emotion, character, and literary conclusions must not be presented as objective facts.
8. **Spoiler boundaries are global:** AI features must respect the reader's current progress unless explicitly overridden.
9. **Modular architecture:** Provider-specific and format-specific implementations should be replaceable.
10. **Evidence-based completion:** Work is complete only after implementation, testing, review, documentation, and verification.

## 8. Functional Requirements

Priority labels used in this document:

- **P0:** Required for the first production-ready core release.
- **P1:** Important capability to deliver in planned subsequent phases.
- **P2:** Advanced or optional capability; implement when feasibility and value are validated.

Priority is a planning aid, not authorization to skip foundational work or quality gates.

### 8.1 Onboarding and First-Run Experience

**Requirements**

- Provide a welcome experience and skippable onboarding walkthrough.
- Offer a setup wizard for theme, reading, narration, and accessibility preferences.
- Explain key capabilities through an optional interactive tour.
- Include a sample novel or sample content where licensing permits.
- Demonstrate reading, narration, and emotion features where feasible.
- Guide users through importing their first novel.
- Allow onboarding to be paused, skipped, resumed, and completed later.
- Allow all preferences to be changed from Settings.
- Offer a direct-to-Home path for users who do not want onboarding.

**Acceptance criteria**

- A user can reach the main app without creating an account.
- Every onboarding step can be skipped where it is not essential.
- Skipping onboarding does not disable core functionality.
- Preferences selected during onboarding are persisted locally.

**Priority:** P0 for basic onboarding; advanced tours and demonstrations P1.

### 8.2 Home Dashboard and Navigation

**Requirements**

- Provide a modular Home dashboard.
- Support sections/widgets for:
  - Continue reading and recent activity.
  - Library and favorites.
  - Reading statistics and goals.
  - Recommendations and discovery.
  - Emotional insights.
  - Mini audio player.
  - Downloads and import actions.
  - Smart collections and custom sections.
- Support different states for an empty library, a small library, and a large library.
- Let readers show/hide, reorder, resize, and personalize dashboard sections where practical.
- Support layout profiles and restore-defaults.
- Provide configurable navigation combining bottom navigation, drawer/menu, contextual actions, shortcuts, and persistent audio controls.
- Allow visibility and order of major sections to be customized.

**Potential main sections**

Home, Library, Discover, Reader, Audio, AI Assistant, Emotional Insights, Collections, Bookmarks, Notes, Reading History, Statistics, Goals, Downloads, and Settings.

The interface should not expose every section as a permanent navigation item if doing so harms usability. Navigation customization should preserve discoverability and accessibility.

**Priority:** P0 for core Home, Library, Reader, and Settings navigation; advanced dashboard customization P1/P2.

### 8.3 Library Management

**Requirements**

- Display books in grid, list, or other practical layouts.
- Search, sort, and filter by title, author, genre, series, status, source, format, and download state.
- Support shelves, collections, folders, tags, genres, authors, series, and custom organization.
- Support smart collections and saved filters.
- Support bulk operations.
- Support custom reading statuses, status history, and manual overrides.
- Support simple 1–5 star ratings.
- Support metadata extraction and manual editing.
- Support optional online metadata lookup.
- Detect exact and probable duplicates using file hashes and metadata.
- Compare editions and formats.
- Offer keep, replace, merge, or remove actions where safe.
- Preserve progress and annotations when merging or replacing content where mappings are reliable.
- Distinguish locally imported files from online downloads and retain provenance information.

**Acceptance criteria**

- A reader can organize and retrieve a large local library without internet access.
- Bulk operations show their scope before execution.
- Duplicate handling never silently deletes the only copy.
- Metadata corrections persist locally.

**Priority:** P0 for library, search, sorting, basic filters, metadata, and safe import; advanced smart collections and bulk management P1.

### 8.4 Novel Import and Content Processing

**Requirements**

- Import individual or multiple files.
- Support Android system file picker and Open With/Share flows.
- Support folder scanning only through user-authorized Android access.
- Provide import progress, status, retry, and actionable errors.
- Preserve original files.
- Extract metadata and document structure.
- Detect chapters, parts, volumes, prologues, epilogues, appendices, and nested sections.
- Validate document structure and identify incomplete or corrupt content.
- Index supported content for local search.
- Prepare content for progressive AI analysis without blocking basic reading.
- Support manual correction of detected chapter boundaries.
- Recover readable content where feasible while preserving the original.
- Provide detailed diagnostics for unresolved issues.

**Import pipeline**

1. Acquire user-authorized file access.
2. Identify actual file type, not merely extension.
3. Validate file structure and size.
4. Preserve the original.
5. Extract metadata and content.
6. Detect structure and chapters.
7. Validate completeness and readability.
8. Store normalized reader data and source references.
9. Index searchable content.
10. Schedule optional AI preparation.
11. Present import outcome and any warnings.

**Priority:** P0.

### 8.5 File Format Support

The product aims for maximum practical support, with format-specific rendering or extraction rather than pretending all formats are equivalent.

| Format | Expected handling |
|---|---|
| EPUB | Reflowable ebook rendering, navigation, metadata, images, CSS/HTML, links, footnotes |
| PDF | Native page-oriented viewing, text extraction, search, page navigation, optional OCR |
| TXT | Reflowable text with encoding detection |
| HTML | Sanitized content extraction/rendering |
| Markdown | Structured text rendering |
| DOCX | Text and supported structure extraction |
| RTF | Text and supported formatting extraction |
| CBZ/CBR | Comic archive/page viewing where lawful and technically supported |
| MOBI/AZW/AZW3 | Import or extraction only where technically and legally supported |
| Other formats | Evaluate individually; report limitations clearly |

**Important constraints**

- DRM must not be bypassed.
- Password-protected files may be opened when the reader is authorized and the format/library supports it.
- Passwords must not be logged or unnecessarily retained.
- Authorized DRM integrations may be considered, but DRM compatibility is not guaranteed.
- Scanned PDF OCR depends on the selected OCR engine, language packs, device resources, and licensing.
- Original PDF pages must remain available even when OCR or text extraction is imperfect.
- Unsupported or encrypted files must produce clear explanations rather than silent failures.

**Priority:** P0 for EPUB, PDF, TXT and robust extensible import architecture; remaining formats delivered according to feasibility and phase plan.

### 8.6 Reader Experience

**Requirements**

- Provide reflowable reading for suitable formats and native page-based reading where required.
- Support continuous scrolling and pagination.
- Support horizontal and vertical navigation where appropriate.
- Support page-turn transitions and configurable effects.
- Support chapter jumps, progress scrubbing, gestures, and full-screen reading.
- Preserve position across reader modes.
- Provide customizable font family, size, weight, style, line height, letter spacing, word spacing, paragraph spacing, margins, alignment, and layout.
- Support custom/downloadable fonts where licensing and platform capabilities permit.
- Support dyslexia-friendly typography options.
- Support light, dark, sepia, AMOLED, warm, custom color, gradient, image, and texture themes.
- Separate app theme from reader theme.
- Support per-novel and profile-based settings.
- Support brightness and eye-comfort controls within Android limits.
- Support optional reading ruler/focus mode.
- Provide configurable reader toolbar, auto-hide, contextual actions, and gestures.
- Support keyboard shortcuts where a physical keyboard is available.
- Provide profiles combining typography, layout, theme, narration, atmosphere, and accessibility settings.
- Support reset, copy, and override behavior for global and per-novel preferences.

**Priority:** P0 for reliable reading, typography, themes, navigation, and progress; advanced animation, custom profiles, and atmosphere P1/P2.

### 8.7 Bookmarks, Highlights, Notes, and Annotations

**Requirements**

- Create and manage bookmarks.
- Create multi-color highlights.
- Attach notes to passages or chapters.
- Add tags/categories.
- Search annotations.
- Organize annotations by novel and chapter.
- Edit and delete annotations.
- Export annotations.
- Preserve original text context and a stable location anchor.
- Reconcile annotations when content revisions occur.
- Provide clear status when an annotation cannot be confidently mapped to changed content.

**Priority:** P0.

### 8.8 Reading Progress, History, Goals, and Statistics

**Progress requirements**

- Save progress continuously or at appropriate event/checkpoint boundaries.
- Use atomic database operations for related progress changes.
- Recover from process termination and crashes.
- Track chapter completion and reading position.
- Support multiple re-reading sessions.
- Preserve historical progress where useful.
- Keep progress consistent across reading and audio modes.

**History and statistics**

- Track reading sessions, dates, duration, chapters, and estimated reading activity.
- Provide daily, weekly, monthly, and yearly time-based statistics.
- Allow filtering and export.
- Avoid presenting estimated page or word counts as exact when source structure does not support them.

**Goals**

- Support basic daily reading-time, page, and chapter goals.
- Do not introduce competitive challenges or elaborate achievement systems in the initial scope.

**Notifications distinction**

- Reading reminders, unfinished-book alerts, goal reminders, streak reminders, and motivational notifications are explicitly excluded.
- Essential operational notifications, such as download completion or failure, may be implemented separately and must be configurable.

**Priority:** P0 for progress and basic history; statistics and basic goals P1.

### 8.9 Audio and Text-to-Speech

**Requirements**

- Integrate Android-native TTS.
- Allow voice selection where supported by installed engines.
- Provide speed, pitch, and volume controls where supported.
- Support pronunciation corrections and custom vocabulary where feasible.
- Support pause, resume, stop, seek, skip, chapter navigation, queue, and sleep timer.
- Support continuous chapter playback.
- Support background narration, lock-screen controls, media notifications, media session, and headset/Bluetooth controls.
- Handle audio focus, calls, interruptions, route changes, and process lifecycle.
- Support sentence/paragraph tracking and synchronized highlighting.
- Support word-level highlighting only where engine timing data is available.
- Support automatic scroll and tap-to-replay where feasible.
- Support narration bookmarks and playback history.
- Support character/speaker detection and voice assignment as AI-assisted advanced features.
- Allow manual correction of speaker assignments.
- Support narrator profiles and per-novel voice configurations.
- Support optional ambient audio independent of narration volume.
- Support ambient presets and downloadable offline sound packs where feasible.
- Support audio normalization and quality settings where device/engine capabilities permit.

**Offline voice constraints**

- Native Android TTS voice availability and offline operation depend on the installed engine and downloaded system voice data.
- ENR must inspect/report actual voice availability and must not promise universal offline TTS.
- Downloadable offline voice packs or bundled engines require separate licensing, storage, performance, and quality validation.
- Optional cloud voices require explicit consent and transmission disclosure.

**Priority:** P0 for basic native TTS and reliable playback; advanced character voices, ambient ecosystem, and advanced audio processing P1/P2.

### 8.10 Reading and Audio Synchronization

**Requirements**

- Maintain shared progress across reader and audio modes.
- Map audio position to text/chapter where the engine provides sufficient timing.
- Synchronize bookmarks where mappings are reliable.
- Restore the last active mode and position.
- Allow independent progress preferences if the reader chooses.
- Gracefully handle engines without word-level timing.
- Do not corrupt reading position when switching modes.

**Priority:** P0 for chapter/paragraph-level synchronization where feasible; advanced word-level sync P1.

### 8.11 Emotion Intelligence

**Requirements**

- Analyze basic and nuanced narrative emotions.
- Identify emotion intensity, transitions, mixed emotions, and paragraph context.
- Provide primary and secondary emotions.
- Show confidence/uncertainty.
- Explain interpretations using relevant source passages.
- Support emotion-aware visual atmosphere and expressive narration.
- Let readers control visual adaptation and emotional narration independently.
- Default to automatic emotion detection while allowing correction/override.
- Treat AI interpretations as suggestions, not objective truth.
- Support whole-novel, chapter, paragraph, and passage-level analysis.
- Preserve spoiler boundaries.
- Support local processing where model/device capability allows.

**Priority:** P1, after stable reading and local AI foundations.

### 8.12 AI Summaries, Character Intelligence, and Story Analysis

**Requirements**

- Generate novel and chapter summaries.
- Generate spoiler-safe recaps based on current reading position and previous session.
- Support configurable summary depth.
- Provide character profiles, relationships, personality, motivations, development, appearances, dialogue patterns, and timelines.
- Analyze plot progression, events, themes, writing style, and story structure.
- Progressively update analyses as the reader advances.
- Preserve evidence links to chapters/passages.
- Distinguish extracted story facts from AI inference.
- Show confidence and conflicting information.
- Allow reader corrections.
- Track source version and model version.
- Mark outdated analyses and selectively regenerate them.
- Preserve historical analyses and user edits.

**Priority:** P1/P2.

### 8.13 AI Recommendations

**Requirements**

- Recommend content using genres, themes, reading history, ratings, preferences, writing styles, characters, emotional preferences, and reading habits.
- Provide recommendations from the local library without internet.
- Use online catalogs only when enabled.
- Explain recommendation factors where practical.
- Provide controls to edit, reset, or disable personalization.
- Avoid treating inferred emotional preferences as sensitive or definitive user attributes.

**Priority:** P1/P2.

### 8.14 AI Reading Assistant

**Requirements**

- Provide a text-chat interface only.
- Answer questions about passages, vocabulary, characters, context, themes, emotions, and literary analysis.
- Generate explanations and summaries.
- Support multiple conversations per novel.
- Support topic organization, search, pinning, renaming, archiving, export/import, and deletion.
- Provide session, novel-specific, and persistent memory where enabled.
- Let readers inspect and control context used by the assistant.
- Respect spoiler boundaries across all conversations and generated results.
- Support configurable tone, response length, analytical depth, vocabulary complexity, formatting, and custom instructions.
- Support separate response profiles for novels or topics.
- Store conversations locally by default.

**Priority:** P1/P2.

### 8.15 AI Model Ecosystem

**Requirements**

- Support lightweight built-in models where feasible.
- Provide a catalog of downloadable models.
- Inspect device compatibility and resource needs.
- Support manual selection and adaptive recommendations.
- Support download, pause, resume, retry, integrity verification, versioning, and removal.
- Provide storage usage and limits.
- Fall back to smaller compatible models where appropriate.
- Display model name, publisher, version, license, source, capabilities, limitations, and restrictions.
- Verify license and permitted-use requirements.
- Preserve required attribution and provenance.
- Assess model and package security.
- Support optional model updates and compatibility checks.
- Preserve old analyses and identify results that may be outdated.
- Support rollback where technically feasible.
- Do not lock the product to one model provider.

**Priority:** P1 foundation; model catalog and advanced lifecycle P2.

### 8.16 AI Scheduling and Resource Management

**Requirements**

- Support on-demand, progressive, and background analysis.
- Prioritize the currently read novel.
- Schedule intensive work for suitable idle/charging periods where practical.
- Adapt to battery, RAM, CPU, thermal state, and storage.
- Pause or reduce background work under resource pressure.
- Resume interrupted tasks safely.
- Let users configure scheduling and analysis depth.
- Never allow background AI to make core reading or narration unusable.

**Priority:** P1/P2.

### 8.17 AI Privacy and Cloud Providers

**Default policy**

Cloud AI is disabled by default.

**Requirements**

- Require explicit consent before cloud processing.
- Provide feature-level permissions.
- Provide data-level controls for full novel content, selected passages, summaries, or limited context.
- Request per-operation approval where appropriate.
- Identify provider and model.
- Explain what data will be transmitted and why.
- Preview transmission where practical.
- Provide local alternatives where feasible.
- Allow revocation of permissions.
- Allow deletion of associated local records.
- Support multiple providers and user-configurable credentials.
- Support model selection, capability comparison, cost transparency, provider privacy information, and provider-specific settings.
- Permit automatic routing only when the user has explicitly authorized the applicable behavior.
- Never silently fall back from local processing to cloud processing.

**Priority:** P1 for privacy architecture; cloud integrations P2.

### 8.18 Online Discovery and Content Sources

**Requirements**

- Support public-domain works, openly licensed content, authorized APIs/catalogs, and free author-published content.
- Allow user-added sources where lawful and technically supported.
- Display source, author, publisher, license/copyright information, and attribution where available.
- Provide browse, search, preview, metadata, and download workflows.
- Support curated collections, featured/popular/new sections, filters, and recommendations.
- Cache catalog information for offline viewing where permitted.
- Detect new novels and chapter releases.
- Follow novels and track updates.
- Maintain release history and edition information.
- Support manual and automatic chapter downloads under user-configured policies.
- Preserve reading progress when new chapters are added.
- Detect revisions to existing chapters.
- Compare versions and retain revision history where practical.
- Offer automatic/manual replacement and rollback.
- Map progress, bookmarks, and annotations across revisions; flag uncertain mappings.
- Preserve downloaded content when a source disappears.
- Distinguish temporary outages from permanent removals.
- Search for authorized alternative sources.
- Maintain source and download history.
- Validate downloaded content and report missing/corrupt chapters.

**Legal constraints**

- No unauthorized scraping.
- No DRM circumvention.
- No unauthorized redistribution.
- Source terms, licensing, copyright, attribution, and applicable law must be respected.
- A source being publicly reachable does not automatically mean its content can be downloaded or redistributed.

**Priority:** P1/P2. Core local reading must not depend on discovery services.

### 8.19 Download Manager

**Requirements**

- Queue and bulk downloads.
- Pause, resume, retry, and prioritize.
- Support Wi-Fi-only settings.
- Support background downloads within Android restrictions.
- Display progress and storage impact.
- Verify integrity and completeness.
- Handle interruptions and partial files safely.
- Avoid replacing valid existing content until a new version is verified.
- Provide download history and error details.

**Priority:** P1.

### 8.20 Source and Content Provenance

**Requirements**

- Preserve creator, author, publisher, and source attribution.
- Display copyright and licensing details where known.
- Identify public-domain status only when sufficiently verified.
- Retain import/download history and edition details.
- Allow user-added metadata.
- Distinguish personal imports from online downloads.
- Never imply that importing a file transfers copyright or redistribution rights.

**Priority:** P0 for basic source/metadata retention; expanded provenance P1.

### 8.21 Search

**Requirements**

- Unified search across local library, catalog (when online), novel text, chapters, characters, notes, bookmarks, annotations, AI conversations, emotional insights, metadata, and recommendations.
- Full-text search of downloaded/imported content offline.
- Filters, sorting, relevance, suggestions, recent and saved searches.
- Category-specific and unified result views.
- Respect spoiler boundaries when AI-assisted or semantic search could reveal future content.
- Index updates safely when content changes.

**Priority:** P0 for library and local text search; unified AI/semantic search P1/P2.

### 8.22 Themes, Appearance, and Sound/Haptics

**Requirements**

- Material 3 foundation with premium editorial and immersive emotional design.
- Light, dark, sepia, AMOLED, warm, and custom themes.
- Separate app and reader appearance settings.
- Custom palettes, accents, backgrounds, gradients, images, textures, and transparency.
- Emotion-responsive atmosphere with independent user control.
- Smooth transitions and optional page-turn effects.
- Reduced-motion support and adaptive effects for lower-end devices.
- Interaction sounds, page-turn sounds, haptics, and quiet modes.
- Ambient audio independent from narration.
- Profiles and reset-to-default support.
- A coherent brand identity including app icon, splash screen, typography, colors, and guidelines.

**Priority:** P0 for coherent design system and essential themes; advanced customization P1/P2.

### 8.23 Accessibility

**Requirements**

- TalkBack and Android accessibility semantics.
- Scalable text and accessible controls.
- High-contrast options.
- Dyslexia-friendly typography options.
- Large touch targets.
- One-handed use support.
- Reduced motion.
- Orientation controls.
- Reading ruler/focus mode where feasible.
- Accessible alternatives for charts and visualizations.
- Keyboard and gesture alternatives where applicable.
- Accessibility profiles independent from ordinary reader profiles.
- Test with actual assistive technology, not only automated checks.

**Priority:** P0 baseline accessibility; advanced reader tools P1.

### 8.24 Backup, Restore, and Device Transfer

**Requirements**

- Automatic local backups.
- Manual exports.
- Optional manually initiated cloud destination support.
- User-selected folders and supported removable storage where Android permits.
- Selective backup and restore.
- Device migration through manual export/import.
- Integrity verification.
- Backup schedules and status.
- Clear restore preview and conflict handling.
- Protect against accidental overwrite.
- No automatic cross-device sync.

**Encryption decision**

- Internal app storage/database should use appropriate platform-private storage and security protections.
- Exported backup files are intentionally unencrypted by default, per product decision.
- Clearly warn users that unencrypted exports can be read by anyone who obtains the file.
- Do not silently imply that exported files are encrypted.
- Optional encryption may be considered only as a separately approved future feature; it is not part of the current selected default.

**Priority:** P1 after the core data model stabilizes.

### 8.25 Storage Management and Retention

**Requirements**

- Show storage usage by novels, source files, models, audio, cache, indexes, and backups.
- Detect duplicate files.
- Identify regenerable caches and outdated analyses.
- Allow configurable storage limits and retention policies.
- Offer cleanup recommendations with expected space recovery.
- Safely remove temporary files and regenerable caches.
- Never automatically delete novels, progress, bookmarks, notes, annotations, conversations, or other valuable personal content.
- Require confirmation before deleting valuable data.
- Support relocation where Android storage permissions permit.
- Warn about low storage and protect core data.

**Priority:** P1.

### 8.26 Diagnostics, Crash Reporting, and Help

**Diagnostics requirements**

- Maintain detailed local logs and crash history.
- Support crash recovery.
- Monitor performance and resource usage.
- Allow manual diagnostic report export.
- Allow optional anonymous crash reporting only with explicit consent.
- Provide controls to inspect and delete diagnostic data.
- Never automatically transmit reading content or private data as part of diagnostics.

**Help requirements**

- Provide FAQs, searchable documentation, and app usage instructions.
- Keep the initial support experience simple; an elaborate community or interactive support platform is not required.

**Priority:** P0 basic crash/error handling and help documentation; advanced diagnostics P1.

### 8.27 Android Permissions and Background Execution

**Permissions**

- Request minimum necessary permissions.
- Prefer Android system file picker and Storage Access Framework/scoped access.
- Explain permissions contextually before requesting them.
- Handle denial and revocation gracefully.
- Provide permission status and alternative workflows.
- Avoid unnecessary background access.

**Background execution**

- Use Android-native mechanisms appropriate to each task, including WorkManager and foreground services where required.
- Use an appropriate foreground media service for ongoing narration where platform rules require it.
- Respect Android background execution and battery restrictions.
- Prioritize narration and user-visible work.
- Make optional background AI/download behavior configurable.
- Handle process death, interruptions, connectivity changes, and task resumption.
- Provide transparent battery/resource information.
- Do not request battery-optimization exemptions unless a specific justified use case and policy review support it.

**Priority:** P0 for reliable audio/background behavior; advanced scheduling P1.

### 8.28 Updates and Version Management

**Requirements**

- Provide app version and release notes.
- Support update notifications where appropriate.
- Check database and application compatibility.
- Back up data before risky migrations.
- Make migrations transactional and versioned where possible.
- Validate migrated records and indexes.
- Provide recovery/rollback where technically feasible.
- Preserve library, progress, annotations, settings, and user content across supported upgrades.
- Never claim rollback is guaranteed when a migration is irreversible; define a tested recovery strategy.

**Priority:** P0 migration framework before production; complete lifecycle P1.

### 8.29 Release Management

**Requirements**

- Internal testing.
- Closed/open beta as appropriate.
- Production rollout.
- Signed APK/AAB artifacts.
- Secure signing-key management.
- Versioning and release notes.
- Staged rollout where supported.
- Crash/stability monitoring.
- Rollback and recovery planning.
- Release checklist and evidence.

**Priority:** Required before production release.

## 9. Data and Storage Requirements

### 9.1 Local data domains

The local data model should account for at least:

- Books and editions.
- Original source files and extracted content.
- Chapters, sections, paragraphs, and text locations.
- Metadata and provenance.
- Reading progress and sessions.
- Bookmarks, highlights, notes, and annotations.
- Collections, shelves, tags, and reading statuses.
- Ratings.
- Reader profiles, themes, and preferences.
- Audio configurations and playback state.
- Download jobs and source update history.
- AI model metadata and installed model references.
- AI analysis results and version provenance.
- AI conversations and memory.
- Search indexes.
- Backups and restore history.
- Diagnostics and consent records.

The exact schema must be designed and documented during architecture work. This PRD does not prescribe a final database schema.

### 9.2 Data integrity

- Use transactions for related data changes.
- Use stable identifiers and content anchors.
- Avoid exposing internal database identifiers in user-facing URLs or external integrations.
- Use checksums/hashes for file integrity and duplicate detection.
- Make import, download, migration, and restore operations recoverable.
- Avoid destructive overwrite until replacement data is verified.
- Provide integrity checks and repair diagnostics.

### 9.3 Fresh-start policy

The Flutter app begins with a new data store. Legacy React Native/Realm/backend data is not automatically imported. The old project must remain preserved as a separate reference until the new application is validated.

## 10. Offline and Online Capability Matrix

| Capability | Offline expectation | Online dependency |
|---|---|---|
| Open imported/downloaded novels | Fully offline | None |
| Local library and collections | Fully offline | None |
| Reading progress and annotations | Fully offline | None |
| Local search | Fully offline for indexed content | None |
| Themes and reader customization | Fully offline | Optional theme downloads |
| Native Android TTS | Offline only if installed engine/voice supports it | May require network for some voices |
| Downloaded voice packs | Offline after successful installation | Download/update |
| Local AI | Offline after compatible model is available | Model download/update |
| Cloud AI | Not available offline | Provider connection and consent |
| Local recommendations | Offline | None |
| Online discovery | Cached information only | Authorized catalog/source |
| Novel/chapter downloads | Not available offline | Source connection |
| Metadata lookup | Cached metadata available | Optional provider |
| Manual cloud backup | Existing local data remains available | User-initiated upload |
| Diagnostics | Local logs offline | Optional consented report transmission |

Each feature must declare its offline behavior in its technical specification and tests.

## 11. Privacy, Security, and Legal Requirements

### 11.1 Privacy

- No account is required.
- Personal reading data is local by default.
- Cloud AI is disabled by default.
- Online services must disclose data transmission and require appropriate consent.
- No silent cloud fallback.
- Diagnostic reporting is opt-in.
- Do not include novel content or personal reading data in crash reports by default.
- Provide data export and deletion controls.
- Provide permission and consent status.
- Allow users to revoke online-service permissions.

### 11.2 Local security

- Use Android private application storage.
- Apply secure file handling and database protections appropriate to the threat model.
- Do not log passwords, provider credentials, tokens, or sensitive content.
- Use platform secure storage for credentials where applicable.
- Validate untrusted files and isolate parsers where practical.
- Do not claim that local data is encrypted unless encryption is actually implemented and verified.
- No separate ENR app lock is required.

### 11.3 Content and model legality

- Respect copyright, licenses, source terms, and attribution.
- Do not bypass DRM.
- Use AI models only in accordance with their licenses and permitted use.
- Preserve model attribution and provenance.
- Verify the legality of downloadable content sources.

## 12. UX and Visual Design Requirements

- Material 3 foundations.
- Premium editorial reading aesthetic.
- Emotional visual elements used with restraint and reader control.
- Clear hierarchy and consistent navigation.
- Responsive layouts for supported Android screen sizes.
- Accessible contrast, touch targets, and text scaling.
- Smooth but optional transitions.
- Reduced-motion mode.
- Adaptive rendering for lower-end devices.
- Empty, loading, error, offline, partial-content, and recovery states for major workflows.
- No misleading loading indicators or silent failures.
- Confirm destructive operations and show their scope.

## 13. Non-Functional Requirements

### 13.1 Performance

- App startup should prioritize a usable shell and recently used local content.
- Opening a local book should not require network access.
- Long-running imports and analyses must not block the UI.
- Use pagination/virtualization for large lists and long documents.
- Use background isolates or appropriate worker mechanisms for CPU-heavy processing where safe.
- Adapt AI model selection and processing to device capability.
- Monitor memory, CPU, battery, thermal behavior, and storage.
- Establish measurable performance budgets during technical discovery and validate them on representative devices.

### 13.2 Reliability

- Protect progress and annotations against crashes and process termination.
- Use atomic writes and transaction boundaries.
- Make long-running operations resumable.
- Avoid duplicate or conflicting jobs.
- Handle partial downloads and interrupted imports.
- Provide clear recovery paths.
- Maintain backups before risky migrations.

### 13.3 Maintainability

- Feature-oriented modular architecture.
- Clear domain/data/presentation boundaries.
- Dependency injection.
- Repository abstractions where justified.
- Typed models and explicit error handling.
- Avoid oversized global services and tightly coupled screens.
- Document architecture decisions and constraints.
- Use code generation only where it provides maintainable value and verify generated artifacts.

### 13.4 Accessibility

- Test TalkBack and text scaling on real Android devices.
- Provide semantic labels and accessible controls.
- Ensure non-color cues for important information.
- Provide text alternatives for visual AI charts and diagrams.
- Support reduced motion and contrast options.

### 13.5 Security

- Threat-model imported files, model packages, provider credentials, and online integrations.
- Validate file type and structure.
- Verify downloads and model packages.
- Avoid unsafe embedded scripts and active content.
- Protect credentials and sensitive logs.
- Review third-party dependencies and licenses.

## 14. Proposed Technical Architecture

This is a proposed direction to validate during technical design, not a final implementation mandate.

### 14.1 Architectural style

A modular, feature-oriented Flutter application with clear separation between:

- Presentation/UI.
- Application orchestration/use cases.
- Domain models and business rules.
- Data repositories and local persistence.
- Platform adapters.
- Optional online provider adapters.

### 14.2 Core subsystems

1. App shell and navigation.
2. Local database and migrations.
3. File import and content processing.
4. Reader/rendering engine adapters.
5. Library and metadata.
6. Progress and annotations.
7. Search and indexing.
8. Audio/TTS and media session integration.
9. Local AI runtime and model management.
10. Emotion and story analysis.
11. AI assistant and conversation storage.
12. Online discovery and download adapters.
13. Backup and restore.
14. Settings, themes, and accessibility.
15. Diagnostics and consent management.

### 14.3 Technology selection

Flutter is the selected application framework. Specific choices for state management, routing, database, EPUB/PDF rendering, OCR, search indexing, AI inference, TTS, background work, and secure storage must be validated against current package maturity, platform support, licensing, maintenance, performance, and testability.

Do not select a package solely because it is popular. Create a technology decision record for major dependencies and test high-risk integrations with small prototypes before committing to them.

## 15. Phased Delivery Roadmap

The roadmap should be dependency-aware and risk-aware. The following phases are proposed planning boundaries; exact task order and estimates require repository and technical investigation.

### Phase 0: Product and Technical Baseline

- Approve PRD and resolve ambiguities.
- Inspect the existing Flutter foundation without assuming prior reports are correct.
- Establish repository/Git safety.
- Define architecture and dependency decisions.
- Validate Android build environment.
- Define test strategy, supported device matrix, and acceptance criteria.
- Create risk register and project tracker.

**Exit criteria:** Approved architecture baseline, reproducible Android build, documented dependencies, clean baseline checks, and agreed scope.

### Phase 1: Stable Flutter Foundation

- App shell and navigation.
- Theme and design tokens.
- Local database and versioned migrations.
- Dependency injection.
- Error handling and logging.
- Settings persistence.
- Unit/widget/integration test foundation.
- CI/build verification where available.

**Exit criteria:** Real database operations, tested repositories, migration tests, reproducible Android build, and no unresolved release-blocking static-analysis errors.

### Phase 2: Core Local Library and Import

- File picker and import pipeline.
- EPUB/PDF/TXT initial support.
- Original file preservation.
- Metadata extraction.
- Chapter/section detection.
- Local library and collections.
- Duplicate detection.
- Import validation and recovery.

**Exit criteria:** Users can import representative files, reopen them offline, inspect structure, and recover from interrupted/invalid imports without data loss.

### Phase 3: Core Reader and Personal Data

- Reader modes.
- Typography, themes, and navigation.
- Progress tracking and crash recovery.
- Bookmarks, highlights, and notes.
- Local text search.
- Accessibility baseline.
- Reading history.

**Exit criteria:** Core reading and personal data workflows work offline and pass real-device regression tests.

### Phase 4: Audio and Synchronization

- Android TTS integration.
- Voice availability reporting.
- Playback controls and queue.
- Background media service/session.
- Lock-screen and headset controls.
- Interruption handling.
- Reader/audio progress mapping.
- Sleep timer and narration bookmarks.

**Exit criteria:** Stable playback on supported Android devices, correct lifecycle handling, and tested synchronization behavior with documented engine limitations.

### Phase 5: Backup, Restore, and Storage Protection

- Local automatic backup.
- Manual export/import.
- Selective restore.
- Integrity checks.
- Storage dashboard and safe cleanup.
- Low-storage safeguards.
- Device-transfer workflow.

**Exit criteria:** Backup/restore tests demonstrate recoverability and no silent deletion or overwrite.

### Phase 6: Local AI Foundation

- Device capability assessment.
- Model runtime prototype and selection.
- Model download/catalog.
- License/provenance display.
- Model integrity and versioning.
- Resource-aware scheduling.
- Local AI task persistence.

**Exit criteria:** A validated local model can run on supported device classes without making core reading unusable.

### Phase 7: Emotion and Story Intelligence

- Emotion analysis.
- Summaries and spoiler-safe recaps.
- Character and relationship analysis.
- Evidence links and confidence.
- User correction workflows.
- Version-aware analysis lifecycle.

**Exit criteria:** AI outputs respect reading progress, disclose uncertainty, cite supporting content internally, and can be corrected.

### Phase 8: AI Assistant and Personalization

- Text chat UI.
- Novel-aware context assembly.
- Spoiler enforcement.
- Conversation management and memory.
- Response customization.
- Local personalization and recommendations.

**Exit criteria:** Assistant context is inspectable, locally stored by default, spoiler-safe, and controllable.

### Phase 9: Optional Online Ecosystem

- Authorized source adapters.
- Discovery and metadata lookup.
- Download manager.
- Chapter release tracking.
- Revision comparison and rollback.
- Optional cloud AI providers with consent controls.
- Optional manually initiated cloud backup destinations.

**Exit criteria:** Online services are isolated, consent-controlled, replaceable, and unable to break offline core workflows.

### Phase 10: Production Hardening and Release

- Full regression.
- Security and privacy review.
- Accessibility review.
- Performance and battery testing.
- Real-device matrix.
- Backup/restore and upgrade testing.
- Signed release artifacts.
- Beta and staged rollout.
- Release notes, monitoring, and rollback plan.

**Exit criteria:** All release-blocking requirements meet documented acceptance criteria and the release checklist is approved.

## 16. Testing and Quality Assurance

### 16.1 Required testing layers

- Unit tests.
- Widget tests.
- Repository and database tests.
- Integration tests.
- End-to-end workflow tests.
- Real-device Android tests.
- Offline/online transition tests.
- Import and format compatibility tests.
- Audio lifecycle and interruption tests.
- AI model/resource tests.
- Spoiler-boundary tests.
- Backup/restore tests.
- Migration and crash-recovery tests.
- Security and dependency checks.
- Accessibility tests with TalkBack.
- Performance, memory, battery, and storage tests.
- Regression tests.

### 16.2 Device coverage

Test representative Android 12+ devices across:

- Low, medium, and high RAM.
- Different CPU/performance classes.
- Different screen sizes and densities.
- Different Android versions.
- Different installed TTS engines and voice availability.
- Different storage conditions.
- Battery saver and background restrictions.
- Connectivity loss and restoration.

### 16.3 Feature completion gate

A feature cannot be marked complete until:

1. Approved requirements are implemented.
2. Relevant tests pass.
3. Static analysis and formatting checks pass.
4. Independent review is completed.
5. Real-device verification is completed where applicable.
6. Documentation is updated.
7. Regression checks pass.
8. Evidence supports completion claims.
9. Known limitations and remaining work are documented.

A report must distinguish completed, partially completed, blocked, unverified, and not started work. A passing build alone does not prove feature correctness.

## 17. AI Agent and Development Governance

### 17.1 Controlled autonomy

AI coding agents may investigate, plan, implement, test, debug, review, and collaborate within an explicitly approved scope.

They must:

- Inspect repository state before changes.
- Preserve uncommitted user work.
- Avoid destructive actions.
- Avoid unapproved scope expansion.
- Protect legacy projects and data.
- Document decisions and risks.
- Report tests honestly.
- Request approval for material architectural changes, risky migrations, irreversible actions, and scope changes.

### 17.2 Git governance

- Protected main/release branches.
- Isolated feature branches.
- Pre-change status checks.
- Preserve uncommitted changes.
- Atomic, meaningful commits.
- Backup checkpoints before risky changes.
- Independent review before merge.
- Tested merges.
- Rollback plans.
- Release tags.
- No force-push or history rewriting without explicit approval.

### 17.3 Architecture conflict process

When a requirement conflicts with architecture or feasibility:

1. Stop the affected implementation.
2. Investigate the conflict.
3. Assess feasibility, dependencies, data impact, security, and trade-offs.
4. Document alternatives.
5. Recommend an approach.
6. Obtain approval for material requirement or architecture changes.
7. Implement only within approved boundaries.

## 18. Documentation Requirements

Maintain living documentation, updated alongside implementation:

- PRD and feature specifications.
- Architecture overview and decision records.
- Database schema and migration history.
- File-format support matrix.
- Import and content-processing pipeline.
- Reader and audio architecture.
- AI model catalog, licenses, and runtime decisions.
- Emotion-analysis methodology and limitations.
- Spoiler-protection rules.
- Offline/online capability matrix.
- Privacy and data-flow documentation.
- Security threat model.
- Backup and recovery procedures.
- Testing strategy and device matrix.
- Build, setup, and development instructions.
- Git and agent governance.
- Release and deployment procedures.
- Known issues and technical debt.
- Phase reports and acceptance evidence.

Avoid contradictory or stale documents. Where requirements change, record the decision and update dependent documents.

## 19. Risks and Feasibility Constraints

| Risk | Impact | Required response |
|---|---|---|
| Broad format scope | Inconsistent rendering/extraction | Validate formats individually; maintain a support matrix |
| PDF OCR | High CPU/storage and language limitations | Prototype offline OCR; retain original page view |
| Android TTS variation | Voice/timing differences across devices | Capability detection and real-device testing |
| Background execution restrictions | Interrupted tasks/playback | Use Android-native mechanisms and test lifecycle behavior |
| Local AI resource use | Battery, RAM, heat, storage | Adaptive model selection and task scheduling |
| Character/speaker attribution | Ambiguous dialogue | Confidence, evidence, and manual correction |
| Emotion interpretation | Subjective or incorrect analysis | Explain uncertainty and allow corrections |
| Spoiler leakage | Damaged reading experience | Centralized progress-aware context policy and tests |
| Online source availability | Broken catalogs or removed content | Source adapters, local copies, source history |
| Copyright/licensing | Legal exposure | Authorized sources and model license review |
| Revision mapping | Lost or misplaced progress/annotations | Versioned content anchors and uncertain-mapping workflow |
| Backup/restore | Data loss or overwrite | Integrity checks, previews, recovery tests |
| Large scope | Delayed release and complexity | Phased delivery and explicit P0/P1/P2 priorities |
| Third-party dependency changes | Breakage/security | Dependency review, version pinning, upgrade tests |

## 20. Product Decisions and Reconciliation Notes

The following decisions are explicit and must not be accidentally changed by broad interpretations of other answers:

1. **Notifications:** General notification customization was initially selected, but the later explicit decision rejects reading reminders, unfinished-reading alerts, goal reminders, streak reminders, and motivational notifications. Only essential operational notifications (such as download completion/errors) may be considered.
2. **Backups:** Complete backup and manual device transfer are desired, but automatic device sync is not. Cloud backup destinations are optional and manually initiated.
3. **Backup encryption:** Exported backup files are unencrypted by default. This does not remove the requirement for appropriate protection of internal app storage and credentials.
4. **App lock:** No separate ENR app lock is required. Device-level Android security is relied upon.
5. **AI interaction:** The assistant is text-chat only. This does not prohibit TTS narration of novels.
6. **Goals and achievements:** Basic reading-time, page, and chapter goals are included; elaborate achievements and competitive challenges are excluded.
7. **Statistics:** Time-based daily, weekly, monthly, and yearly statistics are selected.
8. **Ratings:** Simple 1–5 star ratings only; no written reviews.
9. **Emotion adaptation:** Automatic emotion detection is desired, while reader correction and independent controls for visual atmosphere and emotional narration remain available.
10. **Online services:** The app has no legacy backend dependency. Optional online services must be independently designed and strictly optional.
11. **Legacy migration:** No automatic migration from React Native/Realm/backend data. Existing legacy source and data must not be deleted or modified by the Flutter work.
12. **Platform:** Android 12+ is the production target. Flutter Web is for development validation only.
13. **Cloud AI:** Disabled by default, with feature-level and data-level consent and transparent transmission.
14. **Legal content:** Only lawful, authorized sources and permitted model licenses are acceptable.
15. **Feature completeness:** A selected feature is a product direction, not a guarantee that every implementation detail is feasible on every Android device. Validate constraints and document supported behavior.

## 21. Open Decisions for Technical Discovery

The following should be resolved through investigation and technical decision records rather than guessed:

- Final state-management and routing packages.
- Final local database and migration approach.
- Local database encryption requirements and threat model.
- File storage and content indexing architecture.
- EPUB/PDF/DOCX/CBZ/CBR library choices and licenses.
- OCR engine and downloadable language packs.
- Android TTS engine capability detection.
- Whether a bundled/downloadable offline TTS engine is viable.
- Local AI runtime and model formats supported on Android.
- Model catalog hosting and distribution.
- Feasible local emotion-analysis models.
- Search indexing and semantic-search implementation.
- Secure credential storage for optional cloud providers.
- Authorized online catalog/source integrations.
- Backup format and compatibility guarantees.
- Concrete performance budgets and representative test devices.
- Detailed release schedule and staffing/agent allocation.

## 22. Initial Release Definition

The first production release should prioritize a stable, genuinely useful core reading ecosystem rather than attempting to ship every advanced feature at once.

### Required core release capabilities

- Account-free startup.
- Reliable local database and file management.
- Import and offline access to core supported formats.
- Library management and local search.
- Customizable reading experience.
- Chapter navigation and progress protection.
- Bookmarks, highlights, and notes.
- Baseline accessibility.
- Native Android TTS with honest voice capability reporting.
- Stable audio playback and essential reader/audio synchronization.
- Basic backup/recovery strategy appropriate to the delivered data model.
- Crash/error handling and local diagnostics.
- Tested Android 12+ build and release pipeline.

Advanced emotion intelligence, full AI assistant, extensive model ecosystem, online discovery, chapter tracking, cloud AI, and advanced visualizations can be introduced in later validated phases.

## 23. Definition of Product Success

ENR is succeeding when:

- A user can install and begin using it without an account.
- A user can import and read supported novels without internet.
- Reading progress and annotations survive normal app restarts, crashes, and supported upgrades.
- The reader is responsive and customizable across representative Android devices.
- Narration works reliably within documented device and engine capabilities.
- Local AI features, when enabled, do not compromise core reading performance.
- AI results communicate uncertainty and respect spoiler boundaries.
- Online services are optional, transparent, and consent-controlled.
- Users can back up, restore, export, and delete their personal data.
- Releases are supported by reproducible tests, documentation, and evidence.

## 24. Approval and Change Control

This PRD captures the product discovery decisions made through Questions 1–150. It is the baseline for subsequent technical design and phased implementation.

Any material change to product scope, privacy behavior, offline guarantees, data handling, platform targets, legacy-project handling, or release acceptance must be documented and approved before implementation.

A feature may be deferred because of technical or legal constraints, but the reason, user impact, alternatives, and revised acceptance criteria must be documented. Do not silently omit or weaken an approved requirement.

---

**End of PRD**
