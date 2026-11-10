# EmotionalNovelReader (ENR)
# CHANGELOG.md

All notable changes to EmotionalNovelReader are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses Semantic Versioning, with Android build numbers and data-format versions managed independently.

> **Accuracy rule:** This file records changes that actually happened. Planned work belongs in `ROADMAP.md` and `TASKS.md`. Investigations and recommendations belong in `DECISIONS.md`. Do not describe a proposed, partially implemented, unverified, or experimental capability as a completed production feature.

---

## 1. Changelog policy

### 1.1 What belongs here

Record meaningful changes to the product and its engineering lifecycle, including:

- User-visible features and behavior.
- Bug fixes, regressions, and reverts.
- Architecture, refactoring, and module-boundary changes.
- Dependencies, third-party packages, models, and external services.
- Security, privacy, and data-handling changes.
- Performance, memory, battery, and resource improvements or regressions.
- Accessibility and localization.
- Database schemas, migrations, backup formats, and data compatibility.
- Android platform integrations and API-level requirements.
- Document import, parsing, rendering, search, and reading behavior.
- Local AI, cloud AI, model lifecycle, retrieval, and spoiler protection.
- TTS, voices, playback, background execution, and media controls.
- Testing, quality gates, CI/CD, build, signing, and release operations.
- Documentation and governance changes.
- Infrastructure and operational improvements.

Routine code edits with no meaningful effect do not need individual entries. Group related changes when that improves readability, but preserve traceability.

### 1.2 What does not belong here

Do not use this file as:

- A future feature wishlist.
- A substitute for `TASKS.md`.
- A technical investigation log or decision register.
- A commit-by-commit dump.
- A place to claim tests or device checks that were not run.
- A record of legacy React Native or Node.js/Express functionality as if it were part of the new Flutter app.

The new ENR application is a fresh Flutter project. Historical work from the deleted legacy frontend/backend or incomplete migration must not be represented as implemented functionality in the new application.

### 1.3 Entry timing

Create or update an entry when a meaningful change is implemented. Update its metadata as verification, review, and release readiness progress.

For larger changes, draft the entry during implementation and finalize it during review. For small changes, update it when the task is completed.

Do not wait until release day to reconstruct months of development history.

---

## 2. Entry categories

Use the standard categories in this order under `Unreleased` and each release.

| Category | Use |
|---|---|
| Added | New features, capabilities, workflows, or supported behavior. |
| Changed | Changes to existing behavior, architecture, configuration, or user experience. |
| Deprecated | Features or interfaces that remain temporarily available but are scheduled for removal. |
| Removed | Features, behavior, dependencies, or interfaces removed from the product. |
| Fixed | Bug fixes, regressions, correctness, stability, and reliability improvements. |
| Security | Security and privacy protections, vulnerability remediation, and security-relevant changes. |

Additional engineering details may be included within these categories or in a clearly identified engineering subsection of a release summary. Do not invent new top-level categories without a reason.

### 2.1 Category guidance

- Use `Added` for genuinely new behavior, not merely a refactor.
- Use `Changed` when an existing behavior or internal design changes.
- Use `Deprecated` before removal when users or integrators need notice.
- Use `Removed` only when the capability or dependency is actually gone.
- Use `Fixed` for a defect that has been corrected.
- Use `Security` for security-sensitive changes. Do not expose sensitive vulnerability details before coordinated disclosure or remediation is appropriate.
- A change may warrant a short entry in more than one category only when each entry describes a distinct effect. Avoid duplicate wording.

---

## 3. Unreleased development tracking

All changes made since the most recent release belong under `## [Unreleased]`.

The `Unreleased` section is divided into the standard categories. It must not be used to list future tasks that have not started.

### 3.1 Change lifecycle metadata

A meaningful entry may include these independent fields:

| Dimension | Values |
|---|---|
| Implementation | Partial, Implemented |
| Verification | Not Run, Awaiting Verification, Passed, Failed, Partially Passed, Not Applicable |
| Review | Not Reviewed, In Review, Reviewed |
| Release readiness | Not Assessed, Blocked, Ready, Excluded from Release |
| Availability | Internal, Experimental, Feature-Flagged, Limited Rollout, Generally Available |
| Platform | Android, Flutter Shared, Development Tooling, or another explicitly supported target |

These fields are independent. For example, a change can be `Implemented`, `Awaiting Verification`, `Reviewed`, and `Blocked` at the same time.

Do not call a change release-ready merely because implementation and code review are complete.

### 3.2 Unreleased entry requirements

For significant changes, record:

- Concise description of the actual change.
- Implementation and verification state.
- Affected feature/module and platform.
- Related `TASKS.md` task ID(s).
- Related `DECISIONS.md` ID(s), when applicable.
- Commit/PR reference, when available.
- Breaking-change, migration, or user-action notice, when applicable.
- Test/device/build evidence and known limitations.

For minor changes, use a concise entry with only the relevant metadata.

### 3.3 Status progression

Typical progression:

1. A real implementation change exists.
2. The entry is recorded as `Partial` or `Implemented`.
3. Relevant verification is run and the result is recorded.
4. Review is completed.
5. Release impact and compatibility are assessed.
6. The change is included in a release or explicitly excluded.

Never infer one state from another. For example, a merged commit does not prove tests passed, and a passed unit test does not prove Android device behavior.

### 3.4 Experimental and feature-flagged work

Clearly identify:

- Whether the feature is experimental, internal, feature-flagged, or in limited rollout.
- Intended audience and availability.
- Flag name or activation mechanism, if safe and useful to disclose.
- Activation/deactivation conditions.
- Known limitations and unsupported scenarios.
- Rollout and rollback strategy.
- Telemetry and privacy implications.
- Criteria for promotion to stable functionality.

Do not present experimental behavior as generally available. Document whether a feature is disabled by default and whether any user data is processed differently.

---

## 4. Traceability requirements

Each significant entry should link to relevant project records.

| Reference | Purpose |
|---|---|
| Task IDs | Connect the change to implementation and acceptance criteria in `TASKS.md`. |
| Decision IDs | Connect architecture and technical rationale to `DECISIONS.md`. |
| Roadmap phase | Identify the planned delivery phase in `ROADMAP.md`. |
| PRD/TRD sections | Connect behavior or technical work to requirements. |
| Commit hash | Identify the exact source change, when available. |
| Pull request | Link review, discussion, and merge evidence, when available. |
| Issue/incident | Link the defect, incident, or investigation, when available. |
| Test/build report | Support verification claims with actual evidence. |
| Release artifact | Link the published APK/AAB, notes, or distribution record, when available. |

Do not fabricate task IDs, decision IDs, commit hashes, PR links, issue numbers, test results, or artifact URLs. Use `Not assigned`, `Pending`, or omit an optional reference until it exists.

### 4.1 Entry metadata template

Use this metadata for significant entries:

```text
- Status: Implemented | Partial
- Verification: Passed | Awaiting Verification | Failed | Not Applicable
- Review: Reviewed | In Review | Not Reviewed
- Release readiness: Ready | Blocked | Not Assessed
- Availability: Internal | Experimental | Feature-Flagged | Limited Rollout | Generally Available
- Platform: Android | Flutter Shared | Development Tooling
- Modules: <affected modules>
- Tasks: ENR-0000
- Decisions: ENR-DEC-000
- Commits/PRs: <actual references>
- Verification evidence: <actual report, command, device, or CI run>
```

Include only fields that add value for the particular entry. Do not turn every tiny change into a paperwork exercise.

---

## 5. Bug fixes and regression records

A significant bug-fix entry should capture:

- Defect summary and user-visible impact.
- Severity and reproducibility, when known.
- Affected feature, module, platform, and app version.
- Root cause, when established.
- Fix implemented.
- Regression test(s) added or updated.
- Actual verification result and environment.
- Related issue/task/decision references.
- Known limitations and residual risks.

Do not label a suspected cause as the confirmed root cause. Use `Root cause under investigation` until evidence establishes it.

For regressions, identify the version or change that introduced the problem when known. If unknown, state that it has not been established.

---

## 6. Breaking changes and compatibility

Mark breaking changes explicitly with `BREAKING CHANGE:` or a clear `Breaking change` label.

Document:

- Affected feature, interface, module, platform, or data format.
- What changed and why.
- Who or what is affected.
- Compatibility with earlier application versions.
- Required user or developer action.
- Migration steps and prerequisites.
- Database and backup precautions.
- Data-loss or corruption risks.
- Rollback and recovery guidance.
- Tests and verification evidence.
- Related decision, task, commit, and release references.

### 6.1 Data-sensitive breaking changes

Changes involving library records, reading progress, annotations, imported documents, statistics, AI history, settings, database schema, or backup contents require explicit data-integrity analysis.

Before release, verify:

- Supported upgrade paths.
- Backup compatibility.
- Migration success and failure behavior.
- Interrupted migration recovery.
- Restore behavior.
- Whether downgrade is supported.
- Whether any data conversion is lossy.

Never claim rollback is supported if the migration is destructive or no tested reverse path exists. In such cases, document the actual recovery strategy.

---

## 7. Security and privacy entries

Security-related changes use the `Security` category and should include, as appropriate:

- Affected component and vulnerability/advisory reference.
- Severity and impact.
- Remediation and protection added.
- Dependency or platform advisory reference.
- Verification and regression evidence.
- Privacy and data-transmission implications.
- Required user action.
- Disclosure considerations.

Do not publish exploit details, credentials, private user data, or sensitive vulnerability information before remediation and coordinated disclosure are appropriate.

For changes to cloud AI, diagnostics, model downloads, external services, or backups, describe whether data collection, transmission, retention, consent, or user controls changed.

---

## 8. Documentation changes

Record meaningful documentation changes, including:

- Document and section affected.
- What changed and why.
- Related tasks and decisions.
- Associated implementation changes, if any.
- Review status.

The project documentation set includes:

- `prd.md`
- `AGENT.md`
- `trd.md`
- `ROADMAP.md`
- `TASKS.md`
- `DECISIONS.md`
- `CHANGELOG.md`
- Additional architecture, testing, security, release, and operational documentation as introduced.

Documentation-only work must not imply that the corresponding software feature has been implemented.

---

## 9. Platform-specific entries

Identify affected platforms and environments explicitly.

For Android-specific changes, record where relevant:

- Minimum or affected Android API levels.
- Device or manufacturer-specific behavior.
- Permissions and platform restrictions.
- Native Kotlin/platform integration versus shared Flutter behavior.
- Compatibility limitations.
- Device/emulator used for verification.
- Platform-specific test evidence.

For shared Flutter changes, identify that the behavior is shared rather than implying that every platform has been validated.

The initial production target is Android 12+ (API 31+). Flutter Web may be used for development/testing where useful, but it is not a substitute for Android-native verification.

---

## 10. Database, backup, and data-format changes

For changes affecting persistence or exported data, record:

- Database schema version.
- Backup/archive format version.
- Affected entities, tables, fields, and indexes.
- Migration behavior and supported source/target versions.
- Backup/restore compatibility.
- Integrity checks and migration test results.
- Interrupted migration behavior.
- Recovery and rollback procedure.
- Data-loss risk and user action.
- Compatibility across application versions.

Database schema versioning and backup-format versioning are independent of application Semantic Versioning.

Do not imply that an application version number identifies a database schema version.

---

## 11. AI, models, and external services

For local AI, cloud AI, retrieval, and model-related changes, include relevant details:

- AI feature and affected workflow.
- Runtime and version.
- Model name, version, format, and provider/source.
- Model license and provenance.
- Quantization and compatibility changes.
- Device/resource requirements.
- Download, import, update, deletion, or rollback behavior.
- Performance/quality results and test conditions.
- Privacy, consent, and data-transmission implications.
- Local/cloud routing and fallback behavior.
- Known limitations and reproducibility information.
- Related decision and task IDs.

Clearly distinguish:

- Changes to application AI logic.
- Changes to retrieval/indexing.
- Changes to model weights or model version.
- Changes to inference runtime.
- Changes to cloud provider or service.

Never imply that a model is bundled, downloadable, licensed for redistribution, or supported on a device without evidence.

---

## 12. TTS and audio changes

For speech and audio-related changes, document:

- Engine, provider, voice, and language.
- Offline availability and downloadable voice packs.
- Playback and narration behavior.
- Background playback and Android media controls.
- Audio focus, interruption, and recovery behavior.
- Bluetooth and external-device behavior.
- Reading-position/narration synchronization accuracy.
- Performance and device verification.
- Engine-specific compatibility and limitations.

If word-level timing is unavailable from an engine, do not imply word-level synchronization is supported.

---

## 13. Performance changes

Performance entries should be measurable and reproducible.

Record, when relevant:

- Operation and user-visible effect.
- Device model and Android version.
- Test environment and workload.
- Before/after measurements.
- Startup, rendering, scrolling, search, import, memory, battery, CPU, storage, or thermal results.
- Profiling evidence and test procedure.
- Regression thresholds.
- Trade-offs and limitations.

Do not claim a performance improvement based only on subjective observation. If no reliable baseline exists, label the result as qualitative or provisional.

---

## 14. Testing and quality changes

Record meaningful changes to:

- Unit, widget, integration, and end-to-end tests.
- Test coverage and quality gates.
- Flaky-test fixes.
- Static analysis, formatting, and CI.
- Android emulator and real-device testing.
- Offline/online and process-death testing.
- Accessibility and TalkBack verification.
- Security and privacy testing.
- Performance and resource testing.
- Backup, restore, migration, and recovery testing.
- Release-gate evidence.

Record actual commands, CI run identifiers, device details, test counts, and results when available. Do not invent or round test counts.

---

## 15. Dependencies and third-party services

For significant dependency changes, record:

- Package, service, or model name.
- Previous and new versions.
- Added, updated, replaced, or removed state.
- Reason for the change.
- License and compatibility.
- Maintenance and security posture.
- Direct and transitive dependency effects.
- Supply-chain risks.
- Data handling and privacy implications.
- Vendor lock-in and exit strategy.
- Migration or replacement implications.
- Related decision ID.

Do not list every routine transitive package update as a separate user-facing entry. Group related dependency changes while preserving a link to the lockfile, PR, or dependency report.

---

## 16. Reverts and rollback entries

When a change is reverted, record:

- Original change and original release/Unreleased entry.
- Reason for the revert.
- Revert commit/PR.
- Affected users, features, platforms, and versions.
- Data/configuration recovery required.
- Replacement implementation, if any.
- Regression verification.
- Whether the original decision needs review.

Do not delete the original entry. Add a new entry explaining the revert and link the two.

---

## 17. Release readiness

A release is not ready merely because code is merged.

Before a release is marked ready, applicable gates must be satisfied:

- [ ] Automated tests pass.
- [ ] Static analysis and formatting checks pass.
- [ ] Required debug/release builds succeed.
- [ ] Code review is complete.
- [ ] Android device testing is complete for affected behavior.
- [ ] Documentation is updated.
- [ ] Security and privacy checks are complete.
- [ ] Accessibility checks are complete.
- [ ] Performance and resource checks are complete where applicable.
- [ ] Backup, restore, migration, and data-integrity checks are complete where applicable.
- [ ] Regression checks pass.
- [ ] Known issues and unresolved risks are documented.
- [ ] Release notes and upgrade instructions are complete.
- [ ] Signing and artifact provenance are verified.
- [ ] Required human release approval is recorded.

A release may proceed with an explicitly accepted exception only if the release authority permits it and the exception, risk, owner, and mitigation are recorded. Do not silently waive a gate.

---

## 18. Versioning policy

### 18.1 Application version

Use Semantic Versioning:

`MAJOR.MINOR.PATCH`

- **MAJOR:** Incompatible public behavior or product/data compatibility changes.
- **MINOR:** Backward-compatible functionality additions.
- **PATCH:** Backward-compatible bug fixes and maintenance changes.

Before the first stable `1.0.0` release, use `0.y.z` versions. The project may use prerelease identifiers such as:

- `0.1.0-alpha.1`
- `0.1.0-beta.1`
- `0.1.0-rc.1`

The exact release cadence and point at which `1.0.0` is justified are release decisions, not assumptions made by this changelog.

### 18.2 Android version fields

Keep Android build fields distinct:

- `versionName`: human-readable application version, aligned with the application version policy.
- `versionCode`: monotonically increasing Android build identifier, managed independently.

Document both in release records when an Android artifact is produced.

### 18.3 Independent version domains

Track separately:

- Application version.
- Android `versionCode`.
- Database schema version.
- Backup/archive format version.
- AI model version and format.
- Model manifest/catalog version, if introduced.
- Import/index format versions, if independently versioned.

A change in one domain does not automatically imply a change in another. Record compatibility explicitly.

### 18.4 Version changes and release notes

Every tagged release must have a dated section. The `Unreleased` section becomes the source for release notes after review, categorization, and version assignment.

Do not create a release entry for an artifact that was never built or distributed. If a release is cancelled or withdrawn, record that event and its reason.

---

## 19. Automated changelog assistance

Automation may prepare draft entries from:

- Commit messages.
- Merged pull requests.
- Completed task records.
- Decision records.
- Test and build reports.
- Release metadata.

Automation must not:

- Treat a commit as proof of successful verification.
- Treat a merged PR as proof of release readiness.
- Invent user impact, root cause, test evidence, or compatibility.
- Duplicate an existing entry.
- Mark a change as completed when its task is still partial or blocked.
- Publish sensitive security details prematurely.
- Convert planned tasks into completed changes.

All generated entries require review by the responsible developer/agent. The reviewed entry must reflect actual repository state and evidence.

---

## 20. Release organization

Use one `Unreleased` section followed by versioned releases in reverse chronological order.

Each release should include:

- Version and release date.
- A concise summary/highlights section when the release contains substantial changes.
- Standard Keep a Changelog categories.
- Compatibility and platform information.
- Breaking changes and migration instructions.
- Known issues and accepted risks.
- Upgrade guidance.
- Links to release notes, source tag, PRs, and APK/AAB artifacts where available.

Example structure:

```markdown
## [Unreleased]

### Added
- Fresh Android-only Flutter foundation initialized with Flutter 3.47.9 and Dart 3.13.7.
- Minimum Android version explicitly enforced at Android 12 (API 31) in `android/app/build.gradle.kts`.
- Feature-first clean directory structure in `lib/` with composition root `EmotionalNovelReaderApp`, Material 3 theming, app constants, failure abstraction, and module placeholders (`library`, `reader`, `audio`, `ai`, `settings`).
- Strict analysis options configured in `analysis_options.yaml` (strict casts, strict inference, strict raw types).
- Baseline smoke widget test in `test/widget_test.dart` verified and passing.
- Root `.gitignore` created protecting user settings, build outputs, and keystores while preserving existing project metadata.
- Full verification completed: `flutter analyze` (0 issues), `flutter test` (100% passed), and `flutter build apk --debug` (successfully built `build/app/outputs/flutter-apk/app-debug.apk`).
- Comprehensive Stage A technical investigation report archived at `artifacts/PROJECT_INITIALIZATION_INVESTIGATION.md`.

### Changed
- Reconciled Phase 1 tasks in `TASKS.md` (`ENR-0010`, `ENR-0011`, `ENR-0012`, `ENR-0014`, and `ENR-0015` completed with empirical evidence).

### Deprecated

### Removed

### Fixed

### Security

## [0.1.0-beta.1] - YYYY-MM-DD

### Highlights
- ...

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Security
- ...

### Compatibility
- Android API range: ...
- Database schema: ...
- Backup format: ...

### Upgrade notes
- ...

### Known issues
- ...

### Release evidence
- Source tag: ...
- Build: ...
- Artifact: ...
- Approval: ...
```

Do not create empty release sections merely to reserve future version numbers.

---

## 21. Initial `Unreleased` baseline

The fresh Flutter application has not been established by this document. Do not claim that reader features, database infrastructure, AI, TTS, Android integrations, or production builds are implemented.

The initial project documentation baseline has been prepared as separate artifacts:

- `prd.md`
- `AGENT.md`
- `trd.md`
- `ROADMAP.md`
- `TASKS.md`
- `DECISIONS.md`
- `CHANGELOG.md`

The documentation baseline may be recorded as a documentation change once these files are present in the actual project repository and their contents have been checked there. Creating a downloadable document in a preparation environment does not prove that it has been committed to the target repository.

### Current state

- New Flutter application implementation: Not established by this document.
- Application release: None recorded.
- Application version: Not assigned.
- Android `versionCode`: Not assigned.
- Database schema version: Not assigned.
- Backup format version: Not assigned.
- Production release approval: Not applicable.

---

## 22. Entry templates

### 22.1 Standard change

```markdown
- **Change:** Concise description of the implemented change.
  - Status: Implemented
  - Verification: Awaiting Verification
  - Review: Not Reviewed
  - Release readiness: Not Assessed
  - Platform: Android / Flutter Shared / Development Tooling
  - Modules: ...
  - Tasks: ENR-0000
  - Decisions: ENR-DEC-000
  - Commits/PRs: ...
  - Evidence: ...
```

### 22.2 Bug fix

```markdown
- **Fix:** What is now corrected.
  - Severity: Critical / High / Medium / Low
  - Reproducibility: ...
  - Root cause: ...
  - Affected versions/platforms: ...
  - Regression tests: ...
  - Verification: ...
  - Tasks/issues: ...
  - Known limitations: ...
```

### 22.3 Breaking change

```markdown
- **BREAKING CHANGE:** What is incompatible and why.
  - Affected features/modules/platforms: ...
  - Compatibility impact: ...
  - Required user/developer action: ...
  - Migration: ...
  - Backup/data precautions: ...
  - Rollback/recovery: ...
  - Verification: ...
  - Tasks/decisions/PRs: ...
```

### 22.4 Security change

```markdown
- **Security:** Protection or remediation implemented.
  - Affected component: ...
  - Advisory/reference: ...
  - Severity and impact: ...
  - Remediation: ...
  - Privacy implications: ...
  - User action: ...
  - Verification: ...
  - Disclosure status: ...
```

### 22.5 Database or backup change

```markdown
- **Data change:** Schema or backup-format behavior changed.
  - Database schema version: ...
  - Backup format version: ...
  - Affected entities/fields: ...
  - Migration path: ...
  - Compatibility: ...
  - Integrity tests: ...
  - Interrupted operation behavior: ...
  - Recovery/rollback: ...
  - Data-loss risk: ...
```

### 22.6 AI/model change

```markdown
- **AI change:** Feature/runtime/model/provider behavior changed.
  - Feature: ...
  - Runtime/version: ...
  - Model/version/source/license: ...
  - Quantization/format: ...
  - Resource requirements: ...
  - Privacy/data transmission: ...
  - Download/update/fallback behavior: ...
  - Performance/quality evidence: ...
  - Limitations: ...
```

### 22.7 TTS/audio change

```markdown
- **Audio change:** Narration, voice, playback, or media behavior changed.
  - Engine/voice/language: ...
  - Offline support: ...
  - Background/media controls: ...
  - Audio focus/interruption: ...
  - Bluetooth/device behavior: ...
  - Synchronization accuracy: ...
  - Device verification: ...
  - Limitations: ...
```

### 22.8 Performance change

```markdown
- **Performance:** Operation improved or regressed.
  - Device/Android version: ...
  - Workload/test conditions: ...
  - Before: ...
  - After: ...
  - Metrics: ...
  - Profiling evidence: ...
  - Trade-offs/regression thresholds: ...
```

### 22.9 Documentation change

```markdown
- **Documentation:** Document/section updated.
  - Reason: ...
  - Related tasks: ...
  - Related decisions: ...
  - Implementation relationship: ...
  - Review status: ...
```

### 22.10 Revert

```markdown
- **Reverted:** Original change and reference.
  - Reason: ...
  - Revert commit/PR: ...
  - User/platform impact: ...
  - Data/configuration recovery: ...
  - Replacement: ...
  - Regression verification: ...
  - Decision review required: Yes / No, with rationale.
```

---

## 23. Maintenance responsibilities

- **Document owner:** Project owner or explicitly designated lead.
- **Contributors:** Developers and AI agents working within their approved scope.
- **Update responsibility:** The person/agent implementing a meaningful change prepares the entry; reviewer checks accuracy and evidence.
- **Task completion:** Update the relevant entry during task completion and review.
- **Milestone review:** Review the `Unreleased` section at roadmap milestones.
- **Release audit:** Reconcile entries with merged work, task status, decision records, tests, builds, and release artifacts.
- **Consistency:** Keep this file aligned with `TASKS.md`, `DECISIONS.md`, `ROADMAP.md`, `CHANGELOG.md`, and release documentation.
- **History:** Do not rewrite released history to hide defects or reverts. Add a corrective entry and preserve the record.
- **Ownership changes:** Record the new maintainer in project governance documentation when responsibility changes.

---

## 24. Release audit checklist

Before cutting a release:

- [ ] Every included change exists in the target source revision.
- [ ] No planned-only task is described as implemented.
- [ ] Partial, experimental, and feature-flagged functionality is labelled accurately.
- [ ] Every significant entry links to relevant task and decision records.
- [ ] Commit/PR references are real and resolve to the correct changes.
- [ ] Breaking changes and required actions are explicit.
- [ ] Database and backup compatibility are documented.
- [ ] Security and privacy entries are reviewed for disclosure safety.
- [ ] Platform and Android API requirements are accurate.
- [ ] AI model/runtime and TTS compatibility is accurate.
- [ ] Verification claims match actual test/build/device evidence.
- [ ] Known limitations and unresolved risks are included.
- [ ] Reverts and superseding changes are reflected.
- [ ] Release version and date are correct.
- [ ] Android `versionCode` and `versionName` are correct.
- [ ] Release artifact links point to actual artifacts.
- [ ] Release approval is recorded.
- [ ] `Unreleased` entries are either included, retained, or explicitly excluded.
- [ ] Release notes are understandable to their intended audience.

---

## 25. Change log for this document

| Version | Date | Changes |
|---|---|---|
| 1.0-draft | 2026-11-08 | Established the initial changelog policy, Keep a Changelog categories, Semantic Versioning rules, Unreleased lifecycle metadata, traceability, breaking-change and data migration requirements, security/privacy disclosure rules, AI/model and TTS records, platform and performance evidence, release gates, automation review, templates, and maintenance responsibilities. |

---

## 26. Related project documents

- `prd.md` - Product requirements and approved product scope.
- `AGENT.md` - Agent operating instructions and approval boundaries.
- `trd.md` - Technical requirements and investigation scope.
- `ROADMAP.md` - Phases, sequencing, dependencies, and release gates.
- `TASKS.md` - Executable work, ownership, status, acceptance criteria, and verification.
- `DECISIONS.md` - Product constraints, ADRs, technical decisions, and unresolved investigations.

This changelog records actual changes. It does not authorize implementation, approve a technical decision, or replace the release process.
