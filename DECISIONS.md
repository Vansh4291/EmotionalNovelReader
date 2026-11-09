# EmotionalNovelReader (ENR)
# DECISIONS.md
## Product Constraints, Architecture Decision Records, and Technical Decision Register

| Field | Value |
|---|---|
| Project | EmotionalNovelReader (ENR) |
| Document | Decision Register and Architecture Decision Records |
| Version | 1.0-draft |
| Created | 8 November 2026 |
| Status | Initial governance baseline |
| Primary maintainer | Project owner / designated lead |
| Scope | Fresh Flutter Android-first application |
| Related documents | `prd.md`, `AGENT.md`, `trd.md`, `ROADMAP.md`, `TASKS.md` |

> **Authority rule:** This document records decisions and their evidence. A recommendation is not an accepted decision. An accepted decision is not automatically implementation-validated. Product constraints, technical decisions, approval state, and implementation state are tracked separately.

---

# 1. Purpose

`DECISIONS.md` is the authoritative register for significant product constraints, architecture decisions, technical choices, and unresolved investigations for EmotionalNovelReader.

It exists to:

- Preserve why important choices were made.
- Prevent repeated debates and contradictory implementation.
- Distinguish approved requirements from technical proposals.
- Make unresolved decisions actionable and assignable.
- Record alternatives, evidence, uncertainty, risks, and consequences.
- Connect requirements to decisions, implementation tasks, and verification.
- Make changes auditable without erasing history.
- Give human developers and AI agents consistent decision-making rules.

This is a living project document. Update it when a significant decision is proposed, investigated, accepted, rejected, deferred, changed, or validated.

## 1.1 Scope

This register covers:

- Product constraints and approved project boundaries.
- Application architecture and module boundaries.
- Flutter framework, state management, dependency injection, and navigation.
- Database, persistence, file access, imports, rendering, and migrations.
- Offline-first behavior, synchronization, backup, and restore.
- AI runtimes, model management, retrieval, spoiler protection, and cloud providers.
- Text-to-speech, Android integration, background work, and media controls.
- Security, privacy, networking, diagnostics, and data handling.
- Testing, performance, accessibility, localization, CI/CD, and release engineering.
- Significant package, service, and vendor selections.
- Emergency, cross-module, and difficult-to-reverse technical decisions.

Routine local implementation details do not need an ADR unless they create meaningful architectural, security, privacy, data-integrity, performance, maintenance, or product consequences.

## 1.2 Out of scope

- Reconstructing or reusing the deleted React Native frontend.
- Reusing the deleted Node.js/Express backend.
- Treating the incomplete Flutter migration as the foundation of the new app.
- Automatically migrating legacy application data or architecture.
- Recording every trivial code-level choice.

The application is to be built as a fresh Flutter project. Preserve useful documentation and Git history where practical, but do not assume old source code or architecture should be restored.

---

# 2. Decision governance principles

1. **Evidence before preference.** Important choices require evidence proportionate to their impact.
2. **Explicit authority.** The person or agent authorized to accept a decision must be identifiable.
3. **Recommendation is not approval.** Proposed solutions remain provisional until the required approval is recorded.
4. **Product requirements remain authoritative.** Technical convenience does not silently override approved product constraints.
5. **Reversibility matters.** Difficult-to-reverse choices require stronger evidence and planning.
6. **Preserve history.** Never silently overwrite or delete a material decision.
7. **One authoritative answer per scope.** Duplicate or conflicting decisions must be reconciled.
8. **Traceability is mandatory.** Decisions link to requirements, tasks, code, tests, and affected documents where applicable.
9. **Uncertainty is visible.** Facts, assumptions, estimates, interpretations, and unknowns must be distinguished.
10. **Implementation is separately verified.** Architectural acceptance does not prove that implementation is correct.
11. **Privacy and offline-first requirements are foundational.** They cannot be weakened by an unapproved implementation shortcut.
12. **Keep records useful.** Small decisions receive concise records; major decisions receive full ADR treatment.

---

# 3. Decision authority and approval model

The project uses a high-autonomy model with risk-based human review.

## 3.1 AI agent authority

AI agents may independently:

- Investigate technical alternatives.
- Research packages, services, and platform capabilities.
- Build disposable or isolated proof-of-concept implementations.
- Recommend technical approaches.
- Accept routine, low-risk technical decisions within the approved project scope.
- Make implementation-level choices that do not materially alter product behavior, privacy, data ownership, security posture, or project scope.
- Update decision records and linked project documents.
- Execute approved implementation tasks and their normal verification.

Agents must not present a recommendation as accepted merely because they generated it.

## 3.2 Human approval required

Explicit human approval is required for:

- Material product behavior or scope changes.
- Changes to approved privacy, consent, or data-handling commitments.
- Irreversible or destructive operations.
- External publication, distribution, or production release.
- Decisions that materially affect user data ownership, export, deletion, or recovery.
- Material changes to the approved platform or project boundaries.
- Any action that expands the approved scope.

## 3.3 Additional human review

In addition to ordinary decision authority, obtain human review for decisions that are:

- Security-sensitive.
- Privacy-sensitive.
- Data-integrity-critical.
- Difficult or effectively impossible to reverse.
- Major dependency or vendor commitments with significant lock-in.
- High-impact changes to storage, encryption, backup, restore, or migration behavior.

A routine technical decision may be accepted autonomously only if it stays within these boundaries.

## 3.4 Approval record

Every decision requiring approval must identify:

- Proposer.
- Investigator or author, if different.
- Reviewer(s).
- Approver.
- Approval date.
- Approval status.
- Evidence reviewed.
- Any conditions or limitations attached to approval.

Do not invent an approver, approval date, or approval event. Use `Pending` or `Not recorded` until the event actually occurs.

---

# 4. Decision lifecycle and status model

Decision lifecycle and approval are separate fields. Do not combine them into one overloaded status.

## 4.1 Decision lifecycle status

| Status | Meaning |
|---|---|
| Proposed | A decision question or candidate approach has been recorded but not fully investigated. |
| Investigating | Evidence gathering, comparison, or prototyping is underway. |
| Recommended | A preferred option has been identified, but required approval or acceptance is outstanding. |
| Accepted | The decision has been formally accepted by the authorized decision-maker. |
| Rejected | The proposed option or decision has been explicitly rejected. |
| Deferred | A decision is intentionally postponed, with a reason and review trigger. |
| Superseded | A later decision replaces this decision. Preserve the historical record and link the replacement. |
| Deprecated | The decision remains historically relevant but should no longer guide new work. |
| Needs Review | New evidence, changed requirements, an incident, or a review trigger may invalidate the decision. |
| Withdrawn | The proposal or decision record has been withdrawn without being replaced by an accepted decision. |

### Lifecycle rules

- `Recommended` is not equivalent to `Accepted`.
- `Accepted` means the decision itself is approved; it does not mean implementation is complete.
- Use `Superseded` when another decision explicitly replaces the record.
- Use `Deprecated` when guidance is retired but no direct replacement is necessarily available.
- Use `Needs Review` when the existing accepted decision may no longer be valid.
- Use `Deferred` only with a reason, owner, and review trigger.
- Preserve rejected, withdrawn, deprecated, and superseded records for traceability.

## 4.2 Approval status

| Approval status | Meaning |
|---|---|
| Not Required | The decision is within an authority boundary that does not require separate approval. |
| Awaiting Approval | The decision is ready for review but the required approval has not been recorded. |
| Approved | The required authority has explicitly approved the decision. |
| Rejected | The required authority has rejected the decision. |
| Withdrawn | The approval request was withdrawn. |

Approval status is not a substitute for lifecycle status. For example, a decision can be `Recommended` and `Awaiting Approval`, or `Accepted` and `Not Required`.

## 4.3 Implementation validation status

Track implementation validation independently:

- Not Applicable
- Not Started
- In Progress
- Partially Validated
- Validated
- Validation Failed
- Blocked

An accepted architecture decision may remain `Not Started` until implementation exists. Mark it `Validated` only after the required implementation and verification evidence has been recorded.

---

# 5. Priority, impact, and permanence

## 5.1 Decision priority

| Priority | Meaning | Typical response |
|---|---|---|
| Critical | Blocks critical-path work, threatens data integrity/security/privacy, or blocks a release gate. | Escalate immediately; assign an owner and a short review interval. |
| High | Major architectural, product, performance, security, or dependency impact. | Prioritize before dependent implementation. |
| Medium | Meaningful technical choice with manageable impact or workaround. | Resolve before the affected implementation phase. |
| Low | Limited scope, easy to change, and unlikely to block other work. | Resolve when needed; avoid premature investigation. |

Decision priority is separate from implementation task priority. A critical decision does not automatically make every related task critical.

## 5.2 Risk dimensions

Assess relevant dimensions:

- User and product impact.
- Security and privacy.
- Data integrity, durability, and recoverability.
- Architectural reach and coupling.
- Performance, memory, storage, battery, and thermal impact.
- Dependency and vendor risk.
- Platform compatibility.
- Migration and rollback cost.
- Critical-path and release impact.
- Uncertainty and evidence quality.

## 5.3 Permanence and reversibility

Each material decision must classify its expected permanence and reversibility.

| Classification | Meaning |
|---|---|
| Temporary | Intended to apply only until a stated date, phase, or condition. |
| Long-term | Expected to remain until requirements or evidence materially change. |
| Reversible | Can be changed with low cost and limited disruption. |
| Difficult to Reverse | Requires significant migration, refactoring, data conversion, or operational effort. |
| Effectively Irreversible | Creates consequences that cannot realistically be undone. |

A decision can have both a permanence classification and a reversibility classification, for example `Long-term / Difficult to Reverse`.

For difficult-to-reverse or effectively irreversible decisions, require proportionately stronger evidence, human review, migration/rollback planning, and explicit review triggers.

---

# 6. Evidence and research standards

Evidence requirements must be proportionate to the impact and reversibility of the decision.

## 6.1 Expected evidence sources

Where relevant, investigate:

1. Official platform and framework documentation.
2. Official package documentation and source repositories.
3. Release history, maintenance activity, issue response, and compatibility.
4. License terms and redistribution constraints.
5. Security advisories, vulnerability history, and supply-chain posture.
6. Community adoption and ecosystem maturity.
7. Benchmarks and independent comparisons.
8. Device-specific behavior and Android platform restrictions.
9. Practical prototypes or proof-of-concept tests.
10. Real-device tests for decisions that depend on hardware, media, storage, background execution, or performance.

## 6.2 Evidence quality

For each significant claim, record:

- Source title and URL or repository reference.
- Source type and publisher.
- Date checked.
- Relevant version, platform, or environment.
- What the evidence demonstrates.
- What it does not demonstrate.
- Any conflicts with other evidence.

Do not cite a package's marketing page as proof of production suitability. Do not treat popularity as proof of security, maintenance quality, or performance.

## 6.3 Prototypes

Use prototypes when they materially reduce uncertainty, especially for:

- Document rendering and pagination.
- Large-file import and memory use.
- SQLite/FTS and reactive queries.
- Local AI inference, quantization, and Android acceleration.
- RAG retrieval quality and spoiler boundaries.
- Native Android TTS, background playback, and media controls.
- SAF URI persistence and cloud-backed document providers.
- Backup/restore integrity and recovery.
- Performance-sensitive architecture.

A prototype must record its scope, environment, versions, test cases, results, limitations, and whether it is disposable or intended for production reuse.

## 6.4 Uncertainty and conflicting evidence

Separate:

- Verified facts.
- Assumptions.
- Estimates.
- Opinions or interpretations.
- Unknowns.

Record confidence as `High`, `Medium`, or `Low`, with an explanation. For material decisions, document conflicting evidence and the reason one source or result is weighted more heavily.

For high-impact decisions, perform sensitivity analysis: identify which assumptions could change the recommendation and how the outcome would differ if those assumptions are false.

---

# 7. Unresolved decisions and investigation workflow

Every unresolved decision must be actionable.

An unresolved record includes:

- Decision question and context.
- Why the decision matters.
- Alternatives under consideration.
- Provisional recommendation, if one exists.
- Explicit statement that the recommendation is not approved.
- Required evidence and prototype plan.
- Investigation owner.
- Decision priority.
- Target roadmap phase.
- Linked tasks and dependencies.
- Acceptance criteria for closing the investigation.
- Review date or trigger.
- Conditions that would change the recommendation.

Do not leave an unresolved item as a bare question without an owner or next action.

## 7.1 Investigation workflow

1. Confirm the decision scope and authoritative requirement.
2. Identify affected modules and existing accepted decisions.
3. Gather current, relevant evidence.
4. Compare realistic alternatives.
5. Prototype high-impact or uncertain behavior.
6. Record risks, assumptions, confidence, and unknowns.
7. Produce a recommendation.
8. Check required approval authority.
9. Record acceptance, rejection, or deferral.
10. Create or update implementation tasks and affected documents.
11. Validate implementation separately when it is built.

## 7.2 Provisional recommendations

A provisional recommendation must be visibly labelled `Provisional / Not Approved`. It may guide investigation or prototype work, but it must not be used as authority to make irreversible changes or commit the architecture.

---

# 8. Cross-module impact analysis

Every decision has one primary category. Add all affected modules as cross-references.

Major cross-module decisions must assess, where applicable:

- Architecture and module boundaries.
- Data ownership, persistence, and data flow.
- Security and privacy.
- Performance, memory, storage, battery, and thermal behavior.
- Offline and degraded-network behavior.
- Testing and regression coverage.
- Documentation and operational support.
- Migration, rollback, and recovery.
- Roadmap dependencies, critical path, and release impact.

Record affected module owners and implementation tasks. If a decision affects a module not yet implemented, record the future impact rather than assuming it is irrelevant.

---

# 9. Third-party packages, models, and external services

A significant dependency or external service decision must record:

- Package/service/model name and exact version or version range.
- Official website, documentation, repository, and release references.
- License and commercial/redistribution constraints.
- Direct and transitive dependencies.
- Maintenance history and release cadence.
- Compatibility with the selected Flutter/Dart/Android toolchain.
- Supported Android API levels and device capabilities.
- Security posture and known advisories.
- Data collected, transmitted, retained, or processed.
- Privacy and consent implications.
- App size, memory, storage, battery, and performance impact.
- Vendor lock-in and exit strategy.
- Replacement or migration feasibility.
- Update policy and reassessment triggers.

For AI models, also record model license, provenance, source, checksum/signature strategy, supported formats, quantization, runtime compatibility, resource requirements, and whether model distribution is permitted.

For cloud services, record data residency and processing disclosures where known, credential handling, pricing/cost controls, service limits, and behavior during outages.

---

# 10. Implementation and verification linkage

Each implementation-dependent decision links to:

- Relevant `TASKS.md` task IDs.
- Relevant source paths or modules once known.
- Unit, widget, integration, end-to-end, and regression tests as appropriate.
- Static analysis and formatting results.
- Debug/release build results as applicable.
- Real Android device verification where platform behavior matters.
- Performance, accessibility, security, and offline test evidence as relevant.
- Known limitations and remaining risks.

Do not claim validation from tests that were not run. Record the actual command/device/environment, result, date, and evidence reference.

An accepted decision can be implemented later. It is not implementation-validated until its acceptance criteria and verification requirements pass.

---

# 11. Review and reconsideration policy

Review a decision when any of the following occurs:

- A defect, limitation, or incident exposes a weakness.
- Product requirements, platform targets, or architecture change.
- A major project milestone or release gate is reached.
- A security advisory or privacy concern emerges.
- A dependency becomes abandoned, incompatible, vulnerable, or poorly maintained.
- Performance, reliability, accessibility, or resource targets are missed.
- New evidence materially changes the recommendation.
- A prototype or implementation fails its acceptance criteria.
- A vendor changes pricing, license, terms, API, or data handling.
- A decision's assumptions are no longer true.

At major milestones, audit high-impact accepted decisions. Periodically audit the full register for stale evidence, unresolved items without owners, broken links, unreviewed triggers, and conflicts.

When reviewing an accepted decision, choose one of:

- Keep as accepted and record the review.
- Mark `Needs Review` while investigating.
- Supersede with a new decision.
- Deprecate the decision.
- Reject or withdraw a still-unaccepted proposal.
- Defer with a reason and review trigger.

---

# 12. Conflict, duplicate, and precedence rules

## 12.1 Duplicate decisions

When overlapping records are found:

1. Link the records.
2. Identify whether they address the same scope.
3. Select one authoritative record or consolidate them.
4. Preserve historical IDs and context.
5. Mark replaced records `Superseded` or `Deprecated` as appropriate.

Do not create a second active decision for the same scope without explaining the distinction.

## 12.2 Conflicting decisions

Resolve conflicts by considering:

1. Authority and approval level.
2. Scope and applicability.
3. Explicit source-document precedence.
4. Evidence quality, relevance, and recency.
5. Product and privacy constraints.
6. Decision date and subsequent review history.

A newer record does not automatically override an older approved decision. It must have the authority and evidence to supersede it.

## 12.3 Source-document precedence

Use this default precedence:

1. Explicitly approved product decisions and constraints.
2. `prd.md` for approved product behavior and scope.
3. `AGENT.md` for agent autonomy, approval boundaries, and operating rules.
4. Accepted records in `DECISIONS.md` for technical decisions, unless explicitly superseded.
5. `trd.md` for technical requirements and investigation scope.
6. `ROADMAP.md` for planned sequencing and milestones.
7. `TASKS.md` for execution tracking and task-level acceptance criteria.
8. Implementation notes, proposals, comments, and informal discussions.

This is not permission to ignore a conflict. If two authoritative sources disagree, stop the affected work, document the conflict, and resolve it through the correct approval authority.

---

# 13. Emergency decision process

Emergency decisions may be used to protect data, security, users, or project continuity, or to unblock a critical path when ordinary review would cause material harm.

## 13.1 Severity

| Severity | Description |
|---|---|
| E1 - Critical | Active data loss/corruption, exploitable security issue, serious privacy exposure, or release-blocking incident. |
| E2 - High | Major outage, serious functional regression, or critical-path blockage with material impact. |
| E3 - Moderate | Important issue with a safe workaround and limited immediate impact. |
| E4 - Low | Routine inconvenience; normal decision process is sufficient. |

## 13.2 Emergency record

Record:

- Severity and trigger.
- Affected users, data, modules, and environments.
- Immediate containment action.
- Why ordinary approval timing was not suitable.
- Owner and reviewer.
- Risk assessment.
- Temporary decision and expiry/review time.
- Rollback or recovery conditions.
- Notifications made and to whom.
- Follow-up investigation and tasks.
- Post-incident review outcome.

## 13.3 Emergency boundaries

- Prefer reversible containment.
- Preserve evidence and user data.
- Do not use an emergency label to bypass approval for unrelated scope changes.
- Do not perform destructive operations without required approval.
- Do not publish or release externally without release approval.
- Temporary emergency decisions must be reviewed by the stated deadline.
- Conduct a post-incident review and create a permanent ADR if the change remains in place.

---

# 14. Relationship to project documents

`DECISIONS.md` is cross-linked with the project's other governing documents.

| Document | Relationship |
|---|---|
| `prd.md` | Authoritative product behavior, scope, user needs, and product constraints. |
| `AGENT.md` | Agent autonomy, approvals, safety boundaries, implementation workflow, and reporting. |
| `trd.md` | Technical requirements, evaluation scope, constraints, and unresolved technical questions. |
| `ROADMAP.md` | Phases, sequencing, milestones, dependencies, and release gates. |
| `TASKS.md` | Executable tasks, owners, priorities, dependencies, acceptance criteria, and verification. |
| `CHANGELOG.md` | User-visible or project-level implementation changes, when established. |
| Architecture documentation | Detailed architecture, module boundaries, data flows, and implementation design. |

## 14.1 Synchronized update rule

When a decision changes product behavior, architecture, scope, implementation sequencing, or task acceptance criteria:

1. Update the decision record.
2. Identify every affected document.
3. Update the relevant documents in the same change where practical.
4. Update task dependencies, status, or acceptance criteria.
5. Record unresolved follow-up work.
6. Verify that no stale statement remains authoritative.

A decision record should link to exact section headings, task IDs, and source paths when known. Do not invent line numbers or references.

## 14.2 Traceability chain

Maintain this relationship:

`Product requirement → Technical decision → Roadmap phase → Implementation task → Code/module → Verification evidence`

Where one link does not yet exist, record it as pending rather than inventing it.

---

# 15. Decision categories

Use one primary category and any relevant tags.

| Category | Code | Examples |
|---|---|---|
| Product constraints | PRODUCT | Product scope, supported workflows, platform boundary |
| Architecture | ARCH | App structure, module boundaries, layering |
| Flutter framework | FLUTTER | Flutter/Dart baseline, framework integration |
| State management | STATE | State lifecycle, reactive data flow |
| Dependency injection | DI | Service composition and lifecycle |
| Navigation | NAV | Route structure, deep links, navigation state |
| Database | DB | Relational persistence, indexing, FTS |
| Storage and files | STORAGE | App files, SAF, URI grants, caches |
| Import and formats | IMPORT | File parsing, validation, format support |
| Reader and rendering | READER | Layout, pagination, text selection, annotations |
| Search | SEARCH | Keyword, phrase, fuzzy, semantic search |
| Offline and sync | OFFLINE | Offline guarantees, queues, reconciliation |
| Backup and restore | BACKUP | Export, integrity, recovery, restore |
| AI runtime | AI-RUNTIME | Local inference, model execution |
| AI models | AI-MODEL | Model selection, download, licensing, lifecycle |
| AI retrieval | AI-RAG | Retrieval, indexing, evidence, ranking |
| AI safety | AI-SAFETY | Spoiler protection, confidence, data boundaries |
| Cloud AI | CLOUD-AI | Provider adapters, consent, credentials, cost |
| TTS and media | TTS | Speech engines, playback, media controls |
| Android integration | ANDROID | SAF, WorkManager, services, platform APIs |
| Security | SECURITY | Threat model, secrets, input validation |
| Privacy | PRIVACY | Consent, local-first data, telemetry |
| Networking | NETWORK | HTTP, retry, connectivity, provider boundaries |
| Diagnostics | DIAGNOSTICS | Logs, crash reporting, support exports |
| Testing | QA | Unit, widget, integration, E2E, device testing |
| Performance | PERF | Startup, scrolling, memory, battery, thermal |
| Accessibility | A11Y | TalkBack, contrast, focus, motion |
| Localization | I18N | Languages, text direction, formatting |
| CI/CD | CICD | Automated checks, build pipelines |
| Release | RELEASE | Signing, distribution, rollout, rollback |
| Dependencies | DEP | Package and service selection |
| Governance | GOV | Decision process, documentation, agent workflow |

---

# 16. Decision dashboard

This dashboard is the initial baseline. Update counts and records when decisions change.

## 16.1 Initial register summary

| Register type | Initial state |
|---|---|
| Approved product constraints | Seeded from existing project discovery and governing documents; verify exact source sections when the files are assembled. |
| Accepted technical architecture decisions | None preselected by this document. |
| Unresolved technical decisions | Seeded from `trd.md`; investigation required. |
| Provisional recommendations | None are accepted by default. Add only when evidence has been gathered. |
| Implementation-validated decisions | None assumed at document creation. |
| Superseded decisions | None at initial baseline. |
| Emergency decisions | None at initial baseline. |

Do not turn this summary into fabricated counts. Update it from actual records when maintaining the file.

## 16.2 Status summary template

| Lifecycle status | Count |
|---|---:|
| Proposed | 0 |
| Investigating | 0 |
| Recommended | 0 |
| Accepted | 0 |
| Rejected | 0 |
| Deferred | 0 |
| Superseded | 0 |
| Deprecated | 0 |
| Needs Review | 0 |
| Withdrawn | 0 |

| Approval status | Count |
|---|---:|
| Not Required | 0 |
| Awaiting Approval | 0 |
| Approved | 0 |
| Rejected | 0 |
| Withdrawn | 0 |

These values are an empty initial template, not a claim that all seeded decision questions have already been individually reviewed.

---

# 17. Master decision index

Canonical decision IDs use the stable format `ENR-DEC-NNN`. The numeric ID is permanent and must not change when category, phase, priority, or title changes.

A decision may also have an ADR classification such as `ADR-001`, plus category and phase metadata. The canonical `ENR-DEC-NNN` ID remains the authoritative identifier.

## 17.1 Product and governance constraints

These entries record constraints already established during product and technical discovery. Their authoritative source must be checked against the actual project documents before any change is accepted.

| Canonical ID | ADR label | Decision | Category | State | Priority |
|---|---|---|---|---|---|
| ENR-DEC-001 | ADR-001 | Build a fresh Flutter application; do not reuse the deleted React Native frontend or Node.js/Express backend. | PRODUCT / ARCH | Accepted constraint | Critical |
| ENR-DEC-002 | ADR-002 | Initial production platform is Android 12+ (API 31+); other desktop/mobile platforms are out of current scope. | PRODUCT / ANDROID | Accepted constraint | High |
| ENR-DEC-003 | ADR-003 | Core reading functionality must work offline; online capabilities are optional and isolated. | PRODUCT / OFFLINE | Accepted constraint | Critical |
| ENR-DEC-004 | ADR-004 | No mandatory user account or authentication for core product usage. | PRODUCT / PRIVACY | Accepted constraint | High |
| ENR-DEC-005 | ADR-005 | Do not depend on the legacy backend; no automatic migration of legacy app data is promised. | PRODUCT / ARCH | Accepted constraint | High |
| ENR-DEC-006 | ADR-006 | Preserve original imported source files; do not modify them as part of normal reading or indexing. | PRODUCT / STORAGE | Accepted constraint | High |
| ENR-DEC-007 | ADR-007 | No DRM bypass or circumvention. Unsupported or protected formats must be handled within lawful capabilities. | PRODUCT / IMPORT | Accepted constraint | High |
| ENR-DEC-008 | ADR-008 | Cloud AI is optional, disabled by default, consent-gated, and must not be used as a silent fallback for local AI. | PRODUCT / CLOUD-AI / PRIVACY | Accepted constraint | Critical |
| ENR-DEC-009 | ADR-009 | Local AI and cloud AI must have clear capability, privacy, and provider boundaries. | PRODUCT / AI-SAFETY | Accepted constraint | High |
| ENR-DEC-010 | ADR-010 | AI emotion analysis is interpretive guidance, not an objective statement of a reader's or character's emotional state. | PRODUCT / AI-SAFETY | Accepted constraint | High |
| ENR-DEC-011 | ADR-011 | Spoiler protection defaults to the user's current reading position unless explicitly overridden. | PRODUCT / AI-SAFETY | Accepted constraint | Critical |
| ENR-DEC-012 | ADR-012 | Backup/export must explain that unencrypted exported files can be read by anyone who obtains them. | PRODUCT / BACKUP / PRIVACY | Accepted constraint | High |
| ENR-DEC-013 | ADR-013 | Cloud backup is optional and manually initiated; automatic device synchronization is not in scope. | PRODUCT / BACKUP | Accepted constraint | High |
| ENR-DEC-014 | ADR-014 | Do not add app-level locking; rely on Android device security. | PRODUCT / SECURITY | Accepted constraint | Medium |
| ENR-DEC-015 | ADR-015 | Diagnostics are local-first; anonymous crash reporting requires explicit consent. | PRODUCT / DIAGNOSTICS / PRIVACY | Accepted constraint | High |
| ENR-DEC-016 | ADR-016 | No reading reminders, streak reminders, unfinished-book alerts, or motivational notifications. Essential operational notifications may be evaluated separately. | PRODUCT / ANDROID | Accepted constraint | Medium |
| ENR-DEC-017 | ADR-017 | Reading goals are basic time/page/chapter goals; no achievements or challenges. | PRODUCT | Accepted constraint | Medium |
| ENR-DEC-018 | ADR-018 | Statistics focus on time-based daily, weekly, monthly, and yearly summaries. | PRODUCT | Accepted constraint | Medium |
| ENR-DEC-019 | ADR-019 | Rating is limited to a 1–5 star rating; written reviews are not included. | PRODUCT | Accepted constraint | Low |
| ENR-DEC-020 | ADR-020 | User data export, import, and deletion must be supported with clear privacy behavior. | PRODUCT / PRIVACY | Accepted constraint | High |
| ENR-DEC-021 | ADR-021 | Important user data must not be automatically deleted as a storage-cleanup shortcut. | PRODUCT / STORAGE | Accepted constraint | Critical |
| ENR-DEC-022 | ADR-022 | Accessibility includes TalkBack, high contrast, dyslexia-friendly fonts, reduced motion, large controls, and focus mode. | PRODUCT / A11Y | Accepted constraint | High |
| ENR-DEC-023 | ADR-023 | Release engineering includes signed Android artifacts, versioning, release notes, staged rollout, crash monitoring, and rollback planning. | PRODUCT / RELEASE | Accepted constraint | High |
| ENR-DEC-024 | ADR-024 | Material architecture conflicts must be investigated, alternatives and trade-offs documented, and required approval obtained. | GOV | Accepted constraint | High |

### Constraint record notes

- `Accepted constraint` means the product/governance requirement was established in discovery. It is not an implementation-completion status.
- The source document and exact section must be linked when the current `prd.md`, `AGENT.md`, or `trd.md` contents are available in the new project workspace.
- Do not modify these constraints based on a technical package limitation without raising a product decision.
- Some constraints may be refined without changing their intent. Record any material refinement and its approval.

## 17.2 Unresolved technical decision index

The following decisions are intentionally unresolved. They are investigation topics, not package selections.

| Canonical ID | ADR label | Decision question | Category | Initial lifecycle | Priority | Target phase |
|---|---|---|---|---|---|---|
| ENR-DEC-025 | ADR-025 | Which Flutter application architecture and module boundaries best fit ENR? | ARCH | Proposed | High | Phase 2 |
| ENR-DEC-026 | ADR-026 | Which state-management approach should be adopted? | STATE | Proposed | High | Phase 2 |
| ENR-DEC-027 | ADR-027 | Which dependency-injection strategy should be adopted? | DI | Proposed | Medium | Phase 2 |
| ENR-DEC-028 | ADR-028 | Which navigation/routing approach best supports the app's flows and deep links? | NAV | Proposed | Medium | Phase 2 |
| ENR-DEC-029 | ADR-029 | Which local database and persistence technology or combination should be used? | DB | Proposed | Critical | Phase 2 |
| ENR-DEC-030 | ADR-030 | How should imported source files, app-managed files, caches, and SAF references be stored and recovered? | STORAGE | Proposed | High | Phase 2 |
| ENR-DEC-031 | ADR-031 | Which document rendering engines should support the required formats behind a unified reader interface? | READER / IMPORT | Proposed | Critical | Phase 2 |
| ENR-DEC-032 | ADR-032 | Which import pipeline and format-specific parsing strategy should be used? | IMPORT | Proposed | High | Phase 2 |
| ENR-DEC-033 | ADR-033 | Which full-text search/indexing strategy should be used, including FTS and multilingual support? | SEARCH / DB | Proposed | High | Phase 2 |
| ENR-DEC-034 | ADR-034 | Which local AI inference runtime is viable for supported Android devices? | AI-RUNTIME | Proposed | High | Phase 2 |
| ENR-DEC-035 | ADR-035 | What model catalog, import, download, verification, lifecycle, and resource-management strategy should be used? | AI-MODEL | Proposed | High | Phase 2 |
| ENR-DEC-036 | ADR-036 | What common provider interface and adapter boundaries should cloud AI integrations use? | CLOUD-AI | Proposed | Medium | Phase 2 |
| ENR-DEC-037 | ADR-037 | Which local retrieval/RAG architecture best supports evidence-grounded and spoiler-aware answers? | AI-RAG / AI-SAFETY | Proposed | High | Phase 2 |
| ENR-DEC-038 | ADR-038 | How should spoiler boundaries be enforced across indexing, retrieval, context assembly, and generated responses? | AI-SAFETY | Proposed | Critical | Phase 2 |
| ENR-DEC-039 | ADR-039 | Which TTS strategy should combine native Android engines, optional offline engines, and cloud voices? | TTS | Proposed | High | Phase 2 |
| ENR-DEC-040 | ADR-040 | Which Android APIs and maintained Flutter plugins should be used for SAF, media, notifications, and platform features? | ANDROID | Proposed | High | Phase 2 |
| ENR-DEC-041 | ADR-041 | Which background execution strategy fits downloads, indexing, backups, AI tasks, and narration? | ANDROID | Proposed | High | Phase 2 |
| ENR-DEC-042 | ADR-042 | What offline mutation, transaction, reconciliation, and recovery model is required for local data? | OFFLINE / DB | Proposed | Critical | Phase 2 |
| ENR-DEC-043 | ADR-043 | What backup format, integrity scheme, encryption options, and selective restore strategy should be used? | BACKUP / SECURITY | Proposed | High | Phase 2 |
| ENR-DEC-044 | ADR-044 | What versioned database migration and recovery strategy should be used? | DB | Proposed | Critical | Phase 2 |
| ENR-DEC-045 | ADR-045 | What threat model and security architecture should govern imports, local storage, secrets, AI, and external services? | SECURITY | Proposed | Critical | Phase 2 |
| ENR-DEC-046 | ADR-046 | What network client, retry, cancellation, connectivity, and provider isolation strategy should be used? | NETWORK | Proposed | Medium | Phase 2 |
| ENR-DEC-047 | ADR-047 | What local diagnostics and optional consent-based crash reporting design should be adopted? | DIAGNOSTICS / PRIVACY | Proposed | Medium | Phase 2 |
| ENR-DEC-048 | ADR-048 | Which Android-aware unit, widget, integration, E2E, device, and performance testing strategy should be used? | QA | Proposed | High | Phase 2 |
| ENR-DEC-049 | ADR-049 | What measurable performance targets and profiling/optimization strategy should be adopted? | PERF | Proposed | High | Phase 2 |
| ENR-DEC-050 | ADR-050 | What accessibility architecture and verification approach should be used? | A11Y | Proposed | High | Phase 2 |
| ENR-DEC-051 | ADR-051 | What localization and regionalization strategy should be used for the initial and future languages? | I18N | Proposed | Medium | Phase 2 |
| ENR-DEC-052 | ADR-052 | Which CI/CD, signing, artifact, and release automation strategy should be used? | CICD / RELEASE | Proposed | High | Phase 2 |
| ENR-DEC-053 | ADR-053 | Which secure credential-storage approach should be used for optional provider credentials? | SECURITY / PRIVACY | Proposed | High | Phase 2 |
| ENR-DEC-054 | ADR-054 | What dependency selection, update, vulnerability monitoring, and license review policy should be used? | DEP / SECURITY | Proposed | High | Phase 2 |
| ENR-DEC-055 | ADR-055 | What app-level performance, memory, storage, battery, and thermal budgets should be set? | PERF | Proposed | High | Phase 2 |
| ENR-DEC-056 | ADR-056 | What release-channel, staged rollout, crash monitoring, and rollback process should be used? | RELEASE | Proposed | High | Phase 2 |

### Index maintenance rules

- Assign the next unused numeric ID for new decisions. Never reuse an ID.
- Do not change an ID if the title, category, priority, phase, or owner changes.
- Add a new record when a materially different decision is needed.
- Use `Supersedes` and `Superseded by` links instead of editing history away.
- Add exact task IDs from `TASKS.md` as soon as they exist.
- Update lifecycle and approval status independently.
- Add review dates only when a real review date is agreed or completed.

---

# 18. Seed decision records

The following records establish the initial scope of investigation. Each record is intentionally concise at this stage. Expand it into the full ADR template when investigation begins or when a recommendation is ready.

## ENR-DEC-025 / ADR-025: Flutter application architecture

| Field | Value |
|---|---|
| Category | ARCH |
| Lifecycle | Proposed |
| Approval | Not Required for investigation; approval based on risk at acceptance |
| Priority | High |
| Permanence | Long-term |
| Reversibility | Difficult to Reverse |
| Target phase | Phase 2 |
| Owner | Unassigned |
| Related documents | `trd.md`, `ROADMAP.md`, `TASKS.md` |
| Related modules | App foundation, library, reader, AI, storage, backup, settings |

**Question:** Which application architecture and module boundaries provide the best balance of testability, offline-first behavior, maintainability, performance, and complexity?

**Alternatives to investigate:** Feature-first, layer-first, Clean Architecture, modular Clean Architecture, and pragmatic hybrids.

**Required evidence:** Current Flutter guidance, representative project structures, dependency direction, testability, build complexity, and a small architecture prototype if needed.

**Provisional recommendation:** None. Do not select architecture by fashion or copy an unrelated project's structure.

**Closure criteria:** Document module boundaries, dependency rules, data/domain/presentation responsibilities, testing strategy, trade-offs, and migration implications. Obtain required approval before treating the architecture as authoritative.

## ENR-DEC-026 / ADR-026: State management

| Field | Value |
|---|---|
| Category | STATE |
| Lifecycle | Proposed |
| Priority | High |
| Permanence | Long-term |
| Reversibility | Difficult to Reverse |
| Target phase | Phase 2 |
| Owner | Unassigned |

**Question:** Which state-management approach should be used across the app?

**Alternatives to investigate:** Riverpod, BLoC/Cubit, Provider, and other maintained approaches.

**Evaluation:** Async workflows, reactive database streams, dependency injection, lifecycle, testing, error handling, feature isolation, learning/maintenance cost, and ecosystem maturity.

**Closure criteria:** Prototype representative library, reader, import, and background state flows. Document chosen patterns and anti-patterns.

## ENR-DEC-027 / ADR-027: Dependency injection

| Field | Value |
|---|---|
| Category | DI |
| Lifecycle | Proposed |
| Priority | Medium |
| Permanence | Long-term |
| Reversibility | Difficult to Reverse |
| Target phase | Phase 2 |
| Owner | Unassigned |

**Question:** Which dependency-injection strategy best supports feature modules, test overrides, lifecycle scopes, and the selected state-management approach?

**Evaluation:** Manual injection, provider-integrated approaches, code generation, lifecycle, compile-time safety, testability, complexity, and maintenance.

**Closure criteria:** Demonstrate application startup, feature-level services, test replacement, and disposal/lifecycle behavior.

## ENR-DEC-028 / ADR-028: Navigation

**Category:** NAV

**Question:** Which declarative routing strategy should be used for app navigation, reader routes, import flows, settings, and deep links?

**Evaluation:** Nested navigation, restoration, deep links, route guards where needed, testability, state restoration, and compatibility with the selected architecture.

**Closure criteria:** Prototype primary navigation and a nested reader flow. Document route ownership and navigation-state policy.

## ENR-DEC-029 / ADR-029: Local database and persistence

| Field | Value |
|---|---|
| Category | DB |
| Lifecycle | Proposed |
| Priority | Critical |
| Permanence | Long-term |
| Reversibility | Effectively Irreversible for persisted user data |
| Target phase | Phase 2 |
| Owner | Unassigned |

**Question:** Which local persistence technology or minimal combination should store library metadata, books, reading progress, annotations, statistics, AI indexes, settings, and backup metadata?

**Alternatives to investigate:** SQLite with Drift, Isar, ObjectBox, Hive, and other maintained options where justified.

**Evaluation:** Transactions, relational queries, migrations, reactive streams, FTS, durability, concurrency, data export, performance, tooling, maturity, license, and recovery.

**Required prototype:** Representative schema, transactional updates, migration, reactive reader progress, full-text indexing, and backup/export behavior.

**Closure criteria:** Document data ownership, schema boundaries, indexing, transaction model, migration and recovery, backup compatibility, and benchmark results.

## ENR-DEC-030 / ADR-030: File storage and Android SAF

**Category:** STORAGE

**Question:** How should source documents, app-managed copies, extracted text, thumbnails, caches, and user-selected document references be stored?

**Evaluation:** Android Storage Access Framework, persisted URI permissions, inaccessible/moved files, cloud-backed providers, large-file streaming, app-private storage, export, cache eviction, and original-file preservation.

**Closure criteria:** Test persistable URI grants, app restart, revoked permission, moved/deleted document, cloud-backed provider, large file, and user export.

## ENR-DEC-031 / ADR-031: Reader rendering engines

| Field | Value |
|---|---|
| Category | READER / IMPORT |
| Lifecycle | Proposed |
| Priority | Critical |
| Permanence | Long-term |
| Reversibility | Difficult to Reverse |
| Target phase | Phase 2 |
| Owner | Unassigned |

**Question:** Which format-specific rendering engines can provide a consistent reading experience behind one Flutter reader abstraction?

**Formats in scope:** EPUB, PDF, TXT, DOCX, HTML, RTF, Markdown, CBZ, CBR, MOBI/AZW/AZW3, and additional formats where feasible and lawful.

**Evaluation:** Format fidelity, pagination, text selection, typography, annotations, accessibility, large-file performance, maintenance, license, Android support, and ability to preserve reading position across engine types.

**Closure criteria:** Build a format capability matrix and prototype representative files. Define a shared document/reading-position abstraction and document unsupported features honestly.

## ENR-DEC-032 / ADR-032: Import pipeline

**Category:** IMPORT

**Question:** How should format-specific validation, parsing, extraction, indexing, cover generation, and error recovery be organized behind a common import workflow?

**Evaluation:** Streaming, memory limits, malformed files, cancellation, progress, duplicates, original-file preservation, partial failure recovery, and format-specific metadata.

**Closure criteria:** Define import stages, error taxonomy, retry/cancel behavior, and test corpus strategy.

## ENR-DEC-033 / ADR-033: Full-text search

**Category:** SEARCH / DB

**Question:** Which local search/indexing strategy supports keyword, phrase, fuzzy, multilingual, and incremental offline search?

**Alternatives to investigate:** SQLite FTS5, application-level indexing, dedicated local search engines, and semantic retrieval as a separate capability.

**Evaluation:** Index size, query latency, language/tokenization, update cost, storage, memory, schema migration, and support for chapter/book scope.

**Closure criteria:** Benchmark representative book sizes and languages; define indexing lifecycle and consistency behavior.

## ENR-DEC-034 / ADR-034: Local AI inference runtime

| Field | Value |
|---|---|
| Category | AI-RUNTIME |
| Lifecycle | Proposed |
| Priority | High |
| Permanence | Long-term |
| Reversibility | Difficult to Reverse |
| Target phase | Phase 2 |
| Owner | Unassigned |

**Question:** Which local inference runtime can support the intended models on the Android device range?

**Alternatives to investigate:** llama.cpp/GGUF, ONNX Runtime, MediaPipe, LiteRT, native Android inference, and other viable runtimes.

**Evaluation:** Model compatibility, quantization, RAM, Android acceleration, streaming, cancellation, thermal behavior, background restrictions, Flutter integration, license, and maintenance.

**Required prototype:** At least one representative model and realistic device profile. Measure cold start, time to first token, generation throughput, peak memory, storage, thermal behavior, cancellation, and failure recovery.

**Closure criteria:** Publish a device capability matrix and a runtime recommendation with known limitations. Do not promise universal local AI support.

## ENR-DEC-035 / ADR-035: AI model lifecycle

**Category:** AI-MODEL

**Question:** How should users discover, download, import, verify, update, select, and delete local models?

**Evaluation:** Curated catalog, user-imported models, provenance, checksums/signatures, licensing, storage quotas, versioning, compatibility metadata, cancellation, resume, rollback, and safe deletion.

**Closure criteria:** Define model manifest, trust/provenance policy, lifecycle states, storage management, and user-visible capability information.

## ENR-DEC-036 / ADR-036: Cloud AI provider abstraction

**Category:** CLOUD-AI

**Question:** What common interface and provider adapter design supports optional cloud AI without making a gateway mandatory?

**Evaluation:** Provider-specific capabilities, streaming, structured output, cancellation, retries, token/cost reporting, credential handling, data disclosure, and vendor exit strategy.

**Closure criteria:** Define provider capability contract and ensure cloud access remains disabled until explicit user configuration and consent.

## ENR-DEC-037 / ADR-037: RAG and retrieval

**Category:** AI-RAG

**Question:** What hybrid retrieval architecture best supports evidence-grounded answers from imported novels?

**Evaluation:** Keyword, metadata, semantic, and hybrid ranking; chunking; chapter boundaries; character/entity metadata; incremental indexing; citation/evidence references; local resource use; and deletion consistency.

**Closure criteria:** Define retrieval pipeline and evaluate representative queries with a documented quality set.

## ENR-DEC-038 / ADR-038: Spoiler protection

| Field | Value |
|---|---|
| Category | AI-SAFETY |
| Lifecycle | Proposed |
| Priority | Critical |
| Permanence | Long-term |
| Reversibility | Difficult to Reverse |
| Target phase | Phase 2 |
| Owner | Unassigned |

**Question:** How will the app enforce spoiler boundaries across indexing, retrieval, context assembly, generated output, summaries, and conversation memory?

**Required principles:** Current reading position is the default boundary; explicit user override is required to include later content; UI must communicate the active boundary; model instructions alone are not an enforcement mechanism.

**Evaluation:** Chapter/section identity, position mapping across formats, multi-volume ordering, ambiguous pagination, user override, memory contamination, generated answer checks, and tests for indirect spoilers.

**Closure criteria:** Define deterministic application-side enforcement and a regression suite containing direct and indirect spoiler cases.

## ENR-DEC-039 / ADR-039: TTS strategy

**Category:** TTS

**Question:** How should native Android TTS, downloadable/offline engines, and optional cloud voices be combined?

**Evaluation:** Installed engine discovery, offline availability, language/voice support, pronunciation, streaming, word timing, background playback, audio focus, Bluetooth, lockscreen controls, interruption recovery, and cost/privacy.

**Closure criteria:** Prototype narration across app backgrounding, screen lock, audio focus interruption, Bluetooth, engine changes, and offline conditions.

## ENR-DEC-040 / ADR-040: Android platform integration

**Category:** ANDROID

**Question:** Which maintained Flutter plugins and which typed Kotlin platform interfaces should be used for platform-specific behavior?

**Evaluation:** SAF, media session, notifications, permissions, audio focus, background work, platform version compatibility, plugin maintenance, and testability.

**Closure criteria:** Maintain an explicit plugin/native boundary and document why custom native code is necessary where used.

## ENR-DEC-041 / ADR-041: Background execution

**Category:** ANDROID

**Question:** Which execution mechanism fits downloads, indexing, backup, AI inference, and narration?

**Alternatives to investigate:** WorkManager, eligible foreground services, Dart isolates, ordinary asynchronous work, and native scheduling.

**Evaluation:** Android execution limits, user-visible notification requirements, task duration, cancellation, process death, battery, reliability, and API-level changes.

**Closure criteria:** Map each job type to a mechanism and verify process-death/restart behavior on supported Android versions.

## ENR-DEC-042 / ADR-042: Offline data consistency

| Field | Value |
|---|---|
| Category | OFFLINE / DB |
| Lifecycle | Proposed |
| Priority | Critical |
| Permanence | Long-term |
| Reversibility | Difficult to Reverse |
| Target phase | Phase 2 |
| Owner | Unassigned |

**Question:** What transaction, local mutation, reconciliation, and recovery model guarantees reliable offline reading and data management?

**Evaluation:** Local source of truth, transactional updates, idempotency, conflict policy, queue durability, partial failures, app termination, storage pressure, and multi-device transfer assumptions.

**Important boundary:** The app has no automatic device synchronization in the current product scope. Do not introduce multi-device conflict machinery unless a requirement justifies it.

**Closure criteria:** Define local consistency invariants, recovery behavior, and failure-injection tests for critical user data.

## ENR-DEC-043 / ADR-043: Backup and restore

**Category:** BACKUP / SECURITY

**Question:** What backup container, integrity validation, encryption options, selective restore, and recovery workflow should be used?

**Evaluation:** Unencrypted export disclosure, optional encryption, version compatibility, checksums, atomic restore, partial restore, duplicate handling, storage provider failure, and recovery from interrupted operations.

**Closure criteria:** Demonstrate backup/restore across app versions, corrupted archive rejection, interrupted restore recovery, and selective restore without silent deletion.

## ENR-DEC-044 / ADR-044: Database migrations

**Category:** DB

**Question:** What versioned schema migration and recovery strategy will protect user data over app upgrades?

**Evaluation:** Forward migration, backup-before-migration policy, transactional migration, rollback limitations, migration test fixtures, large database behavior, and interrupted upgrades.

**Closure criteria:** Define migration policy, test every migration path, and demonstrate safe failure behavior. Never assume destructive downgrade is safe.

## ENR-DEC-045 / ADR-045: Security architecture

**Category:** SECURITY

**Question:** What threat model and controls are required for imports, local storage, model files, credentials, AI context, external services, and backup?

**Evaluation:** Malformed document attacks, path traversal, oversized files, archive bombs, unsafe parsing, secret exposure, insecure transport, dependency vulnerabilities, exported backup exposure, and local data deletion.

**Closure criteria:** Produce a threat model, control mapping, security test plan, and incident response guidance.

## ENR-DEC-046 / ADR-046: Networking foundation

**Category:** NETWORK

**Question:** Which networking foundation supports optional metadata/catalog downloads, model downloads, cloud AI, and manually initiated remote backups?

**Evaluation:** Cancellation, retries, backoff, timeout, connectivity, download resume, TLS, request logging/redaction, provider isolation, and test doubles.

**Closure criteria:** Define shared transport concerns and isolated service adapters. Offline core features must not depend on network initialization.

## ENR-DEC-047 / ADR-047: Diagnostics

**Category:** DIAGNOSTICS / PRIVACY

**Question:** How should local logs, diagnostic exports, crash reporting, and sensitive-data redaction be implemented?

**Evaluation:** Local retention, log rotation, user-initiated export, opt-in crash reporting, identifier minimization, secret redaction, and deletion.

**Closure criteria:** Define event schema, retention, redaction, consent, and user controls.

## ENR-DEC-048 / ADR-048: QA strategy

**Category:** QA

**Question:** What layered verification strategy provides confidence across Flutter UI, local persistence, Android APIs, AI, TTS, and offline behavior?

**Evaluation:** Unit, widget, integration, E2E, real-device, emulator, accessibility, security, performance, backup/recovery, and regression coverage.

**Closure criteria:** Define test pyramid, device matrix, test data policy, CI gates, and release evidence requirements.

## ENR-DEC-049 / ADR-049: Performance targets

**Category:** PERF

**Question:** What measurable performance budgets should be set for startup, library scrolling, chapter loading, search, import, backup, local AI, and narration?

**Evaluation:** Representative low/mid/high Android devices, cold/warm startup, memory, jank, battery, thermal behavior, file sizes, and model sizes.

**Closure criteria:** Record numeric targets only after baseline measurements and user experience requirements are understood.

## ENR-DEC-050 / ADR-050: Accessibility

**Category:** A11Y

**Question:** What architecture and validation approach ensures the reader and AI experiences are accessible?

**Evaluation:** TalkBack semantics, focus order, text scaling, high contrast, dyslexia-friendly fonts, reduced motion, touch targets, dialogs, media controls, and dynamic content.

**Closure criteria:** Define reusable accessibility patterns and a manual/automated verification matrix.

## ENR-DEC-051 / ADR-051: Localization

**Category:** I18N

**Question:** What localization architecture supports the initial languages and future expansion?

**Evaluation:** Flutter localization support, pluralization, formatting, font fallback, RTL readiness, locale-aware search, translated content boundaries, and test coverage.

**Closure criteria:** Define localization workflow, resource ownership, locale fallback, and formatting policy.

## ENR-DEC-052 / ADR-052: CI/CD

**Category:** CICD / RELEASE

**Question:** Which automation platform and pipeline should run formatting, analysis, tests, builds, and artifact validation?

**Evaluation:** Repository host, secret handling, Android signing, caching, reproducibility, build matrix, artifact retention, and cost.

**Closure criteria:** Define required checks and protected signing workflow. Production signing material must never be committed.

## ENR-DEC-053 / ADR-053: Secure credential storage

**Category:** SECURITY / PRIVACY

**Question:** Which Android-backed secure storage mechanism should hold optional cloud provider credentials?

**Evaluation:** Android Keystore integration, plugin maintenance, backup behavior, encryption boundaries, migration, device lock behavior, and testability.

**Closure criteria:** Document key lifecycle, credential deletion, backup exclusion, and failure behavior.

## ENR-DEC-054 / ADR-054: Dependency governance

**Category:** DEP / SECURITY

**Question:** What policy governs package evaluation, updates, licenses, vulnerability monitoring, and dependency removal?

**Evaluation:** Maintenance, compatibility, direct/transitive dependency exposure, license, provenance, update cadence, lockfile policy, and replacement strategy.

**Closure criteria:** Define review checklist, update cadence, security response, and exception process.

## ENR-DEC-055 / ADR-055: Resource budgets

**Category:** PERF

**Question:** What memory, storage, battery, CPU, and thermal budgets should constrain the reader, indexing, TTS, and AI workloads?

**Evaluation:** Device tiers, background restrictions, concurrent workload limits, model memory, document size, and user-configurable resource settings.

**Closure criteria:** Establish measurable budgets based on prototypes and representative devices.

## ENR-DEC-056 / ADR-056: Release and rollout strategy

**Category:** RELEASE

**Question:** What release channels, signing, staged rollout, crash monitoring, and rollback strategy should be used?

**Evaluation:** Internal/closed beta, production tracks, signing key custody, versioning, release notes, staged percentage rollout, crash thresholds, support, and rollback limits.

**Closure criteria:** Document release gates, accountable approver, artifact provenance, and recovery/rollback procedure.

---

# 19. Full ADR record template

Copy this template for a new material decision. Keep fields that do not apply and mark them `Not Applicable` with a reason rather than silently removing important review dimensions.

```markdown
## ENR-DEC-NNN / ADR-NNN: Decision title

| Field | Value |
|---|---|
| Canonical ID | ENR-DEC-NNN |
| ADR label | ADR-NNN |
| Category | Primary category |
| Tags | Additional categories |
| Lifecycle status | Proposed |
| Approval status | Not Required / Awaiting Approval / Approved / Rejected / Withdrawn |
| Implementation validation | Not Started |
| Decision priority | Critical / High / Medium / Low |
| Permanence | Temporary / Long-term |
| Reversibility | Reversible / Difficult to Reverse / Effectively Irreversible |
| Target phase | Phase N |
| Owner | Name or role |
| Proposer | Name or role |
| Reviewer | Name or role |
| Approver | Name or role / Pending |
| Proposed date | YYYY-MM-DD |
| Decision date | YYYY-MM-DD / Pending |
| Last reviewed | YYYY-MM-DD / Not reviewed |
| Next review trigger/date | Explicit trigger or date |
| Related requirements | PRD/TRD section references |
| Related decisions | ENR-DEC-NNN |
| Related roadmap work | Phase/section |
| Related tasks | ENR task IDs |
| Affected modules | Module list |
| Supersedes | Decision IDs / None |
| Superseded by | Decision IDs / None |

### 1. Context and problem
Describe the problem, current state, and why a decision is required.

### 2. Decision drivers
List product, technical, security, privacy, performance, cost, and operational drivers.

### 3. Constraints
List mandatory constraints and authoritative source documents.

### 4. Alternatives considered
For each realistic option, document benefits, drawbacks, risks, evidence, and reasons for rejection or retention.

### 5. Evidence and investigation
List sources, versions, dates checked, prototypes, benchmarks, device/environment details, and findings.

### 6. Decision
State the selected approach precisely. If not accepted, state that this is a recommendation only.

### 7. Rationale
Explain why the selected option best satisfies the decision drivers.

### 8. Consequences
Record positive, negative, neutral, and unexpected consequences.

### 9. Uncertainty and assumptions
Separate verified facts, assumptions, estimates, interpretations, unknowns, confidence, and conflicting evidence.

### 10. Risk and reversibility
Assess security, privacy, data integrity, architecture, performance, dependencies, vendor lock-in, migration, and rollback.

### 11. Cross-module impact
Assess architecture, data flow, security, performance, tests, documentation, roadmap, and release effects.

### 12. Implementation plan
List tasks, owners, dependencies, code/module boundaries, migration steps, and rollout.

### 13. Verification and acceptance criteria
List measurable criteria, tests, builds, device checks, evidence, and limitations.

### 14. Migration, rollback, and exit strategy
Describe migration and recovery. State explicitly if rollback is not realistically possible.

### 15. Approval history
| Date | Actor | Role | Action | Evidence/reference | Conditions |
|---|---|---|---|---|---|

### 16. Review triggers
List events that require reconsideration.

### 17. References
List official documentation, repositories, advisories, benchmark sources, and internal documents with dates checked.

### 18. Change history
| Date | Change | Reason | Author | Affected documents/tasks |
|---|---|---|---|---|
```

---

# 20. Product constraint record template

Use this for a product-level rule or boundary rather than a technical implementation choice.

```markdown
## ENR-DEC-NNN / PRODUCT-NNN: Constraint title

| Field | Value |
|---|---|
| Canonical ID | ENR-DEC-NNN |
| Category | PRODUCT |
| Lifecycle | Accepted constraint |
| Approval status | Approved / Not Required according to source authority |
| Authoritative source | prd.md section |
| Mandatory or negotiable | Mandatory / Negotiable |
| Change authority | Project owner / defined authority |
| Affected modules | Module list |
| Related decisions | Decision IDs |
| Related tasks | Task IDs |

### Constraint
State the exact user/product behavior or boundary.

### Rationale
Explain the user need and product reasoning.

### Interpretation
Clarify what the constraint requires and what it does not require.

### Change conditions
State what evidence or product approval is required to change it.

### Implementation implications
Link technical decisions and tasks.

### Approval/history
Record source approval and later changes.
```

---

# 21. Technical investigation template

Use this when a question is unresolved and needs structured research before recommendation.

```markdown
## ENR-DEC-NNN: Investigation title

| Field | Value |
|---|---|
| Lifecycle | Investigating |
| Approval | Not Required for investigation |
| Priority | Critical / High / Medium / Low |
| Owner | Assigned role |
| Target phase | Phase N |
| Review trigger/date | Date or event |
| Related tasks | ENR task IDs |
| Dependencies | Decision/task IDs |

### Question
What must be decided?

### Why now
Explain the dependency or risk.

### Scope
Define included and excluded areas.

### Alternatives
List candidates without prematurely selecting one.

### Provisional recommendation
Clearly label as unapproved, or state that no recommendation exists.

### Evidence required
List documentation, prototypes, benchmarks, device tests, license/security checks, and acceptance criteria.

### Investigation steps
Provide actionable tasks with owners.

### Assumptions and unknowns
List each explicitly.

### Closure criteria
Define what evidence is sufficient to recommend and accept a decision.

### Result
Complete after investigation.
```

---

# 22. Rejected alternative record template

Rejected options should remain visible when they were serious candidates or when rejection rationale may prevent repeated investigation.

```markdown
### Rejected alternative: Name

- Related decision: ENR-DEC-NNN
- Date rejected: YYYY-MM-DD
- Rejected by: Role/person
- Evidence: References
- Advantages: List
- Disadvantages: List
- Rejection rationale: Explain
- Reconsider if: Conditions that could make it viable again
```

---

# 23. AI agent operating instructions for this register

Any AI agent working on ENR must:

1. Read this file and the relevant product/technical source documents before making a material technical decision.
2. Search for an existing decision before creating a duplicate.
3. Use the next unused canonical ID.
4. Keep product constraints distinct from technical decisions.
5. Never claim a recommendation is approved without a real approval record.
6. Never claim a test, benchmark, device check, or source review occurred unless it actually occurred.
7. Use current official documentation for technology decisions that may have changed.
8. Record source dates, package versions, platform versions, and prototype environments.
9. Distinguish verified facts from assumptions and estimates.
10. Record uncertainty and conflicting evidence.
11. Perform cross-module impact analysis for major decisions.
12. Evaluate security, privacy, data integrity, and reversibility.
13. Obtain required human review before crossing approval boundaries.
14. Link the decision to `TASKS.md`, `ROADMAP.md`, and affected requirements.
15. Update all affected documents when a decision changes their content.
16. Preserve historical records and supersede instead of silently overwriting.
17. Keep status, approval, and implementation validation separate.
18. Do not select a package merely because it is familiar or popular.
19. Do not use a prototype as production code without review, testing, and explicit disposition.
20. Do not let a temporary emergency decision become permanent without review.
21. Do not invent approval identities, dates, evidence, task IDs, or implementation results.
22. Report blockers and unresolved authority conflicts rather than guessing.

## 23.1 Before accepting a decision

The agent must check:

- Is the decision within approved scope?
- Does it conflict with a product constraint?
- Does it conflict with an accepted decision?
- Is the evidence current and relevant?
- Have alternatives been compared fairly?
- Are security, privacy, data integrity, and license implications understood?
- Is it reversible?
- Does it require human review?
- Are cross-module effects understood?
- Are implementation and verification tasks defined?
- Are linked documents synchronized?

If any required condition is unmet, keep the decision proposed, investigating, or recommended.

---

# 24. Emergency decision record template

```markdown
## ENR-DEC-NNN: Emergency decision title

| Field | Value |
|---|---|
| Severity | E1 / E2 / E3 / E4 |
| Lifecycle | Proposed / Accepted / Needs Review |
| Approval | According to emergency authority |
| Incident/reference | Incident ID or report |
| Owner | Assigned person/role |
| Start time | Timestamp and timezone |
| Review deadline | Timestamp and timezone |

### Trigger and impact
Describe what happened, affected users/data/modules, and urgency.

### Immediate containment
Describe the smallest safe action taken or proposed.

### Temporary decision
State the exact temporary change and scope.

### Risk assessment
Describe possible side effects and data/security/privacy impact.

### Approval and notifications
Record actual actors, decisions, timestamps, and communications.

### Rollback/recovery
Define rollback conditions and exact recovery approach.

### Follow-up
List investigation, tests, permanent fix, and documentation tasks.

### Post-incident review
Record root cause, what worked, what failed, and whether a permanent ADR is required.
```

---

# 25. Decision review checklist

Use this checklist during milestone and periodic audits.

- [ ] Every active decision has a unique canonical ID.
- [ ] Product constraints and technical decisions are distinguished.
- [ ] Lifecycle and approval statuses are separate.
- [ ] Required approvals are explicitly recorded.
- [ ] Recommendations are not presented as accepted decisions.
- [ ] High-impact decisions have adequate evidence.
- [ ] External references are dated and relevant.
- [ ] Assumptions, uncertainty, and conflicting evidence are visible.
- [ ] Difficult-to-reverse choices include migration and rollback planning.
- [ ] Cross-module impact is documented.
- [ ] Third-party dependency risks and licenses are assessed.
- [ ] Linked tasks and roadmap phases exist or are explicitly pending.
- [ ] Implementation validation reflects actual test/build/device evidence.
- [ ] Review triggers are checked.
- [ ] Superseded and deprecated decisions link to their replacements where applicable.
- [ ] Duplicate/conflicting records are reconciled.
- [ ] Related project documents are synchronized.
- [ ] No approval, test, benchmark, or implementation result has been fabricated.
- [ ] Emergency decisions have received post-incident review.
- [ ] The decision dashboard reflects the actual register.

---

# 26. Initial execution guidance

The first work should not be a broad package-selection exercise. Follow the project sequence:

1. Verify the actual repository/workspace path and Git state before modifying it.
2. Verify Flutter, Dart, Android SDK, Java, Gradle, and available Android devices.
3. Create the fresh Flutter project at the explicitly confirmed path.
4. Establish Git safeguards and project quality tooling.
5. Add and cross-link the project governance documents.
6. Begin Phase 2 investigations, prioritizing architecture, persistence, storage, reader engines, offline data consistency, and security.
7. Use isolated prototypes to reduce uncertainty before selecting foundational dependencies.
8. Record and approve foundational decisions before dependent production implementation.
9. Update `ROADMAP.md` and `TASKS.md` as decisions become accepted.
10. Validate implemented decisions with tests and Android device evidence.

Do not treat the seed decision index as authorization to install packages, create production architecture, delete data, or perform external releases.

---

# 27. Change log

| Version | Date | Changes |
|---|---|---|
| 1.0-draft | 2026-11-08 | Created initial decision governance model, authority and approval rules, lifecycle and validation statuses, evidence standards, review and emergency processes, product constraint register, unresolved technical decision index, ADR templates, and AI agent instructions. |

---

# 28. Document maintenance

- **Maintainer:** Project owner or explicitly designated lead.
- **Contributors:** Developers and AI agents working within their approved authority.
- **Update timing:** When decisions are proposed, investigated, accepted, rejected, deferred, changed, validated, or superseded.
- **Milestone review:** At major roadmap milestones and release gates.
- **Periodic audit:** Review stale evidence, unresolved items, approvals, conflicts, and broken references.
- **Release audit:** Verify decision completeness and synchronization before major releases.
- **Change control:** Preserve history; record material edits and affected documents/tasks.

`DECISIONS.md` is complete as an initial governance baseline. Its seeded technical records are investigation prompts, not completed technical research or approved package selections.
