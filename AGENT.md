# AGENT.md

# EmotionalNovelReader --- Flutter Engineering Governance

**Document purpose:** Define how AI coding agents investigate, plan,
implement, test, review, document, and deliver work in the
EmotionalNovelReader (ENR) Flutter application.

**Scope:** This file governs the new ENR Flutter project only. It does
not grant authority over the legacy React Native application, the legacy
Node.js/Express backend, their databases, or their data.

**Primary principle:** Agents are autonomous within the approved ENR
Flutter scope, but must preserve user work, protect user data, verify
their claims, and stop before irreversible or out-of-scope actions.

------------------------------------------------------------------------

## 1. Authority and source of truth

Use the following authority order when instructions or documents
conflict:

1.  **The user's latest explicit instruction** for the current task.
2.  **This `AGENT.md`** for engineering workflow, permissions, safety,
    quality, and reporting.
3.  **The approved ENR PRD** for product intent, scope, requirements,
    and acceptance expectations.
4.  **Accepted architecture and technical decision records** for
    established implementation decisions.
5.  **The current implementation and tests** as evidence of what the
    software actually does, not automatic proof that the behavior is
    intended.
6.  **Historical reports, comments, plans, and agent summaries** as
    leads to verify, not unquestionable facts.

The PRD and this file have different jobs: - The PRD defines what ENR
should do. - This file defines how agents are expected to work. -
Architecture records explain accepted technical choices. - Source code
and tests establish the current implementation state.

Do not silently reinterpret a product requirement to match an
implementation. Investigate the discrepancy, explain its impact, and
recommend a resolution.

If a conflict affects ordinary implementation details, resolve it using
evidence and document the decision when meaningful. If it changes
product behavior, product scope, privacy expectations, or a material
architectural commitment, explain the alternatives and obtain the user's
approval before proceeding with that change.

Never invent missing requirements, test results, repository facts, or
user approvals.

------------------------------------------------------------------------

## 2. Project boundary and protected legacy systems

### 2.1 In-scope work

This instruction file applies to: - The new EmotionalNovelReader Flutter
application. - Flutter and Dart source code and tests belonging to that
application. - Its Android integration, platform configuration, local
storage, offline behavior, reader experience, AI capabilities, and
supporting documentation. - Build, test, quality, and release-readiness
work for the Flutter application.

### 2.2 Out-of-scope systems

Unless the user explicitly authorizes a separate task, agents must not
modify: - The legacy React Native / Expo frontend. - The legacy Node.js
/ Express backend. - Legacy databases, collections, schemas, or stored
user data. - Legacy deployment environments, services, credentials, or
infrastructure. - Other unrelated repositories or projects.

Do not make a Flutter task depend on changing the legacy backend or
React Native app. If a requirement appears to need such a change,
describe the dependency and propose an alternative or request explicit
scope authorization.

### 2.3 No assumed migration

The Flutter application is a fresh-start application according to the
current product direction. Do not implement automatic migration, import,
synchronization, or reuse of legacy user data unless the user explicitly
approves a new requirement.

Preserve legacy source and data. Do not delete, rename, move, or
repurpose legacy project directories as part of Flutter work.

### 2.4 Repository placement

Place this file at the root of the new Flutter project so its scope is
unambiguous. If the workspace contains multiple projects, do not place
Flutter-only rules at a shared workspace root in a way that
unintentionally governs the legacy projects.

Before acting, inspect the actual repository layout. Do not assume a
directory name or project path from an old report.

------------------------------------------------------------------------

## 3. Agent autonomy and approval boundaries

Agents are authorized to work autonomously within the user's approved
task and the Flutter project boundary.

### 3.1 Actions agents may perform autonomously

When relevant to the task, agents may: - Inspect repositories, files,
dependencies, architecture, logs, and tests. - Investigate bugs and
trace execution/data flows. - Form implementation plans and execute
them. - Create, modify, reorganize, and remove in-scope source and test
files. - Refactor code within the approved Flutter scope. - Add, update,
remove, or replace dependencies when technically justified. - Run
formatting, static analysis, tests, builds, and local diagnostics. - Use
an already-running Android emulator or connected test device for
non-destructive validation. - Create branches, commits, tags, and local
checkpoints under the Git rules in this document. - Delegate independent
work to subagents when useful and supported. - Update relevant
documentation and project tracking records. - Fix defects discovered
during implementation when they are directly related and remain within
scope.

Do not ask for routine approval for every file edit, test, refactor,
package addition, or ordinary debugging step.

### 3.2 Explicit approval is required before

Stop and obtain the user's explicit approval before: - Performing an
irreversible operation that could destroy user data or important project
state. - Deleting or wiping user data, imported books, reading progress,
annotations, local databases, backups, or device/emulator state. -
Running a destructive database operation or an irreversible migration
against valuable data. - Publishing, distributing, deploying, or
releasing the application externally. - Uploading source code, private
content, credentials, diagnostics containing personal data, or other
sensitive material to an external service when that transmission is not
already explicitly authorized by the product settings and user
consent. - Expanding work into the legacy React Native app, backend,
databases, infrastructure, or another repository. - Changing an approved
product requirement or materially expanding product scope.

A normal local build, test, or non-destructive simulator interaction
does not require separate approval.

### 3.3 Approval must be specific

Do not treat general permission to work autonomously as permission for
every destructive or external action. Approval for one operation does
not automatically authorize a different operation, environment, dataset,
release, or scope expansion.

When approval is needed, state: 1. The exact action proposed. 2. The
target files, data, device, environment, or destination. 3. Why the
action is needed. 4. Whether it is reversible. 5. The expected impact
and recovery option.

Until approval is received, continue with safe read-only investigation
or non-destructive work where possible.

------------------------------------------------------------------------

## 4. Universal coding-agent compatibility

These instructions are tool-independent and apply to Codex, Antigravity,
Freebuff, VS Code agents, local Ollama models, and other coding agents.

Agents must: - Adapt to the tools and capabilities actually available in
their environment. - Use subagents only when delegation is supported and
useful. - Use a direct, sequential workflow when delegation is
unavailable. - Never claim to have inspected a file, run a command,
executed a test, built an app, used a simulator, or changed a system
unless that action actually occurred. - Distinguish tool output from
assumptions and recommendations. - Report unavailable tools and
environmental limitations honestly. - Provide an alternative
verification method when the preferred tool is unavailable. - Never
fabricate command output, screenshots, logs, test counts, or successful
outcomes.

Do not write instructions that depend on one vendor's proprietary agent
features when a portable workflow can express the same requirement.

------------------------------------------------------------------------

## 5. Repository investigation and preflight

Investigation depth must scale with the task's complexity and risk. A
small isolated change does not require a complete repository audit, but
every change requires enough investigation to understand its effects.

Before implementation, as applicable:

1.  Identify the actual Flutter project root and inspect applicable
    `AGENT.md`, `AGENTS.md`, and other repository instructions.
2.  Inspect Git status, current branch, staged changes, and untracked
    files.
3.  Identify the affected screens, widgets, providers/state, services,
    repositories, models, database tables, platform code, and navigation
    paths.
4.  Trace relevant data flow and lifecycle behavior end to end.
5.  Inspect existing patterns and reusable components before creating
    new ones.
6.  Review relevant dependencies, configuration, generated files, and
    platform constraints.
7.  Locate and inspect related tests, fixtures, and documentation.
8.  Identify offline, online, background, lifecycle, accessibility,
    performance, and privacy implications where relevant.
9.  Check whether the issue is already fixed, partially implemented, or
    covered by an existing abstraction.
10. Establish a baseline for relevant tests and analysis when practical.

Do not rely solely on a previous agent's summary or an old investigation
report. Verify important claims against the current repository.

Do not overwrite unrelated user changes. If the working tree contains
changes, determine which files belong to the task and preserve
everything else.

For complex or high-impact work, record the investigation findings and
implementation approach in the task report or an appropriate project
document. Agents do not need to pause for approval before routine
implementation that remains within the approved scope.

------------------------------------------------------------------------

## 6. Engineering principles and Flutter architecture

Use a hybrid engineering approach: - Preserve established conventions
when they are sound. - Prefer the simplest design that satisfies the
requirements. - Maintain clear separation of concerns and testable
boundaries. - Avoid unnecessary abstraction, duplicated logic, hidden
coupling, and premature optimization. - Improve weak patterns when
evidence shows a concrete benefit. - Optimize for correctness,
maintainability, offline reliability, accessibility, performance, and
long-term evolution.

### 6.1 Architecture decisions

Do not assume that a proposed architecture, package, folder structure,
or earlier agent report is already implemented or approved. Inspect the
current project and its documentation.

Agents may make ordinary implementation-level architecture decisions
independently. For a significant technical decision: - Investigate the
current design and constraints. - Compare realistic alternatives. -
Explain trade-offs, migration cost, performance, testability, and
maintenance impact. - Record the chosen approach in `DECISIONS.md` or
the relevant architecture document.

A significant technical decision that does not alter product scope may
be made autonomously when justified, but it must be documented. A
decision that changes product behavior or scope requires approval.

### 6.2 Code quality

-   Use idiomatic, null-safe Dart and current stable Flutter APIs
    supported by the project.
-   Follow the repository's formatter, linter, naming, and file
    organization conventions.
-   Keep widgets focused and avoid embedding complex business logic in
    presentation code.
-   Keep business rules testable and independent of UI where practical.
-   Make asynchronous work lifecycle-safe; handle cancellation,
    disposal, errors, and duplicate operations.
-   Avoid blocking the UI thread with parsing, indexing, AI inference,
    or large file operations.
-   Use typed models and explicit error states rather than loosely typed
    or ambiguous values.
-   Avoid silent exception swallowing and misleading success states.
-   Avoid unnecessary rebuilds, repeated expensive work, and unbounded
    memory growth.
-   Add comments for non-obvious reasoning and constraints, not to
    narrate obvious code.

### 6.3 Dependencies

Agents may add, update, remove, or replace packages without routine
approval when the change is within scope and technically justified.

Before adopting a dependency, evaluate: - Flutter/Dart SDK and platform
compatibility. - Maintenance activity, release history, issue health,
and ecosystem adoption. - License compatibility. - Known vulnerabilities
and security posture. - Binary size, runtime performance, and transitive
dependency cost. - Offline behavior and whether the package makes
unexpected network requests. - Native platform permissions and
configuration. - Whether Flutter SDK or Android platform APIs already
provide a suitable capability.

Use the narrowest dependency that responsibly solves the problem. Pin or
constrain versions consistently with the repository's package-management
policy. Update lockfiles when appropriate. Document material dependency
changes and verify the app still builds.

------------------------------------------------------------------------

## 7. Product requirements that must remain visible during implementation

The approved PRD is the detailed product authority. The following
principles are especially important and must not be accidentally
weakened by implementation choices.

### 7.1 Product and platform direction

-   ENR is a personal reading ecosystem, not merely a file viewer.
-   The new Flutter application is the active frontend implementation
    target.
-   Android 12 / API 31 and newer is the initial production platform.
-   Flutter Web may be used for development or limited testing, but it
    is not a substitute for Android-native validation.
-   iOS, Windows, macOS, and Linux are outside the current production
    scope unless the user changes that scope.
-   The app is designed as an independent application and must not
    depend on the legacy Node.js/Express backend.
-   No user account or authentication system is required by the current
    product direction.

### 7.2 Offline-first behavior

Core reading and library functionality must work offline. Design local
persistence and feature behavior so that network access is optional
rather than a hidden prerequisite.

For features that can work locally: - Prefer local data and local
processing. - Make loading, error, empty, and offline states explicit. -
Do not block core reading because an optional online service is
unavailable. - Do not silently switch to a cloud service when local
processing fails. - Preserve user work through app restarts, process
termination, and recoverable failures.

Clearly distinguish features that are fully offline, partially offline,
or online-dependent in relevant documentation and UI.

### 7.3 Reading content and user data

Treat imported books, reading position, bookmarks, highlights, notes,
annotations, reading history, preferences, and AI-generated reading
insights as user-owned data.

-   Preserve original imported files.
-   Do not silently modify, replace, or discard source books.
-   Do not silently delete important user data as a cleanup strategy.
-   Validate imported files and handle malformed, oversized, or
    unsupported content safely.
-   Do not bypass DRM or implement DRM circumvention.
-   Keep user data local by default.
-   Do not transmit novels, excerpts, annotations, reading history, or
    other personal reading data to an external AI/provider unless the
    user has explicitly enabled the relevant feature and consented to
    the data being sent.
-   Make cloud transmission and provider use transparent at the feature
    level.
-   Never use silent cloud fallback.

The PRD specifies that exported backup files are unencrypted by default.
Do not silently change that product behavior. Clearly warn users that
anyone who obtains an exported unencrypted backup may be able to read
its contents. Protect internal app data using appropriate platform and
application security practices.

### 7.4 AI and model ecosystem

-   Prefer local AI processing where supported by the selected feature
    and device capability.
-   Model selection must account for device capability, resource use,
    model compatibility, and user preference.
-   Make model provenance, licensing, version, and lifecycle
    understandable.
-   Cloud AI is optional and disabled by default.
-   Require explicit consent and disclose what data will be transmitted
    before cloud processing.
-   Never silently fall back from local AI to cloud AI.
-   Do not present emotional interpretation as objective fact.
-   Communicate uncertainty and confidence; distinguish textual evidence
    from interpretation.
-   Allow users to correct AI interpretations.
-   Apply spoiler protection consistently across AI features. Respect
    the user's reading position unless they explicitly override it.
-   Do not claim a model can perform a capability unless the actual
    model and integration have been verified.

### 7.5 Reader, narration, and accessibility

-   Keep the reading experience customizable and readable.
-   Preserve reading progress and navigation correctness across
    supported formats.
-   Treat TTS, background narration, media controls, audio focus, and
    interruptions as lifecycle-sensitive Android features.
-   Do not claim word-level narration synchronization unless the
    selected engine provides reliable timing data.
-   Ambient audio and narration are separate capabilities.
-   Accessibility is a core quality requirement, including TalkBack,
    scalable text, adequate contrast, focus behavior, reduced motion,
    and usable touch targets.
-   Verify important reader flows on Android, not only in a browser
    preview.

### 7.6 Backups, storage, and notifications

-   Backups and restore must be designed to protect user data and
    validate integrity.
-   Restore operations that overwrite or delete existing user data
    require explicit approval when performed by an agent during
    development/testing.
-   Never automatically delete important content to reclaim storage.
-   Storage cleanup must clearly distinguish safe cache cleanup from
    user-owned content.
-   Do not add reading reminders, streak prompts, unfinished-book
    alerts, or motivational notifications contrary to the PRD.
-   Essential operational notifications, such as download completion or
    errors, may be implemented when they meet the product requirements.

------------------------------------------------------------------------

## 8. Security and privacy baseline

Follow standard Flutter, Dart, Android, and dependency security
practices. Security is part of ordinary engineering quality, not a
separate optional phase.

At minimum: - Never hardcode API keys, passwords, signing secrets,
private tokens, or credentials in source code or documentation. - Do not
commit secrets or private user data. - Avoid logging book content,
annotations, credentials, tokens, or other sensitive user data. -
Validate and safely parse imported files, archive entries, URLs, model
files, and external inputs. - Use least-privilege Android permissions
and explain why each permission is needed. - Handle files and temporary
data safely; avoid path traversal and unsafe archive extraction. - Use
secure transport for network communication. - Handle local database
errors and corruption without silently destroying user data. - Review
third-party packages and model files before integrating them. - Do not
weaken platform security controls to make a test pass. - Do not collect
analytics or diagnostics beyond the approved product requirements.

The PRD's explicit-consent requirements for optional cloud AI, online
services, and anonymous crash reporting remain mandatory even though
this document adopts a standard-security baseline.

------------------------------------------------------------------------

## 9. Testing and quality gates

A task is not complete merely because code was written or the
application launches once.

### 9.1 Required verification

Choose verification proportional to the change, but maintain strict
quality gates. Run applicable checks such as:

-   Dart formatting (`dart format` or the repository's equivalent).
-   Flutter static analysis (`flutter analyze`).
-   Relevant unit tests.
-   Widget tests.
-   Integration tests.
-   Regression tests for affected behavior.
-   Android debug/profile/release build checks as appropriate.
-   Real Android device or emulator verification for platform-sensitive
    behavior.
-   Offline and online tests for features whose behavior changes with
    connectivity.
-   Accessibility, performance, security, lifecycle, and recovery checks
    where relevant.

Run the narrowest useful tests during development, then run the broader
relevant suite before completion. Do not skip a relevant test merely
because it is slow or inconvenient.

### 9.2 Android is the production validation target

-   Verify Android-specific behavior on Android.
-   Flutter Web success does not prove Android correctness.
-   Use an available emulator or connected device when appropriate.
-   Verify permissions, file access, background execution, audio,
    notifications, storage, lifecycle, and native integrations on
    Android where affected.
-   Do not wipe, reset, or delete emulator/device user data without
    explicit approval.
-   Do not claim real-device verification if only a browser or static
    analysis was used.

### 9.3 Failures and environmental blockers

If a test, build, or device check fails: 1. Capture the actual failure
output. 2. Determine whether it is caused by the change, a pre-existing
issue, or the environment. 3. Fix failures caused by the task. 4. Do not
hide failures, weaken assertions, delete tests, or alter configuration
solely to produce a green result. 5. If a check cannot be completed,
state exactly what was not run, why, and what remains necessary.

A task may be reported as partially complete when a genuine external
blocker prevents full verification, but it must never be labelled fully
verified.

### 9.4 Definition of done

A task is complete only when: - The requested behavior is implemented
within scope. - Relevant tests pass. - Formatting and static analysis
are clean for the affected code, or remaining issues are explicitly
justified. - Relevant Android build/device checks are completed where
applicable. - Regressions have been investigated. - Documentation and
tracking records are updated. - Git state is understood and
recoverable. - The completion report accurately describes the evidence
and remaining limitations.

------------------------------------------------------------------------

## 10. Multi-agent delegation and coordination

Delegation is adaptive. Use subagents when it improves quality or speed
and the environment supports them.

Good independent workstreams include: - Repository and architecture
investigation. - Feature implementation in isolated areas. - Test design
and execution. - Security or accessibility review. - Independent code
review. - Documentation updates.

The coordinating agent remains responsible for the final result.

Coordination rules: - Define each subtask, expected output, and file
ownership before parallel work. - Avoid assigning overlapping edits to
multiple agents. - Prefer parallel read-only investigation when
implementation areas overlap. - Agree on interfaces before parallel
implementation of dependent components. - Review every delegated change
before integrating it. - Re-run relevant tests after integration. -
Resolve conflicts deliberately; do not blindly accept one agent's
version. - Record which work was delegated and how it was verified when
relevant. - If delegation is unavailable, continue with a direct
workflow.

Never treat a subagent's completion message as proof. Inspect its
changes and verification evidence.

------------------------------------------------------------------------

## 11. Git and change management

Agents have full Git autonomy within the Flutter project, subject to the
safeguards below.

### 11.1 Allowed Git operations

Agents may: - Inspect status, history, diffs, and branches. - Create and
switch branches. - Stage and commit relevant changes. - Create local
backup/checkpoint branches. - Merge branches and resolve conflicts. -
Create version tags when appropriate for an authorized release
workflow. - Revert or roll back their own changes when safe and
appropriate.

Use meaningful branch names and atomic commits. Commit messages should
explain the intent of the change.

### 11.2 Mandatory safeguards

-   Inspect `git status` before modifying files and before staging or
    committing.
-   Preserve all pre-existing user changes, including staged, unstaged,
    and untracked files.
-   Stage only files relevant to the task; do not use broad staging
    commands without inspecting their effect.
-   Review the staged diff before committing.
-   Never commit credentials, secrets, private content, local databases,
    generated clutter, or unrelated files.
-   Never use force-push or rewrite shared Git history.
-   Never reset, clean, checkout over, or otherwise discard user
    changes.
-   Do not delete branches or checkpoints that may contain unmerged user
    work.
-   Verify merge results and run relevant tests after conflict
    resolution.
-   Do not push, publish, or release externally without explicit
    approval.
-   Do not claim a commit, merge, or tag exists unless Git confirms it.

If a destructive Git operation appears necessary, stop and request
approval. Prefer a reversible alternative.

### 11.3 Final Git verification

Before reporting completion, inspect: - Current branch. - Working-tree
status. - Staged and unstaged diff. - Untracked files. - Commits
created, if any. - Merge status, if applicable.

State clearly whether changes were committed and whether the working
tree contains remaining changes.

------------------------------------------------------------------------

## 12. Documentation and project tracking

Maintain comprehensive, accurate, living documentation. Update relevant
records as part of implementation rather than leaving documentation
until an unspecified future cleanup.

Maintain these project records at the Flutter project root unless the
repository already has an equivalent canonical location:

  ---------------------------------------------------------------------
  File                               Purpose
  ---------------------------------- ----------------------------------
  `prd.md`                           Product requirements and approved
                                     product direction.

  `ROADMAP.md`                       Phases, milestones, dependencies,
                                     and delivery direction.

  `TASKS.md`                         Pending, active, blocked, and
                                     completed work.

  `CHANGELOG.md`                     Meaningful user-facing and
                                     technical changes by version.

  `DECISIONS.md`                     Important technical decisions,
                                     alternatives, and rationale.

  `AGENT.md`                         This engineering governance
                                     document.
  ---------------------------------------------------------------------

Before creating any of these files, inspect the repository for an
existing equivalent. Do not create duplicate sources of truth. If a
canonical file already exists under another name or directory, maintain
that file and record the location.

### 12.1 Documentation rules

Update relevant documentation when changing: - Architecture, module
boundaries, or data flow. - Database schema, indexes, migrations, or
persistence behavior. - Import/export formats and parsing behavior. - AI
model integrations, provider behavior, or data transmission. - Android
permissions, background behavior, audio, or native integrations. -
Build, test, signing, or release procedures. - User-facing feature
behavior or limitations.

Document important decisions with: - Context and problem. - Options
considered. - Chosen option. - Rationale and trade-offs. - Consequences
and follow-up work.

Keep `TASKS.md` current enough to show ownership where applicable,
status, dependencies, blockers, and verification state. Do not mark work
complete before it meets the definition of done.

Keep `CHANGELOG.md` focused on meaningful changes. Do not add noisy
entries for every formatting or trivial internal edit.

Never claim documentation was updated unless the relevant file was
actually changed and reviewed.

------------------------------------------------------------------------

## 13. Dependency, risk, and priority management

Prioritize work using: - Product value and user impact. - Dependencies
and critical path. - Correctness and data integrity. - Offline
reliability. - Security and privacy. - Accessibility. - Performance and
resource use. - Implementation complexity and maintenance cost. -
Release readiness.

Do not optimize for the number of completed tickets. A small number of
reliable, coherent features is better than a large set of fragile
placeholders.

For significant work, identify: - Technical dependencies. - User-data
risks. - Platform-specific constraints. - Regression surface. -
Performance implications. - Testing requirements. - Rollback or recovery
approach.

Do not invent worst-case scenarios as a substitute for evidence.
Describe realistic, relevant risks and practical mitigations.

------------------------------------------------------------------------

## 14. Error handling, reliability, and data integrity

-   Make failures visible and actionable without exposing sensitive
    information.
-   Avoid silent data loss and silent fallback behavior.
-   Use transactions or atomic persistence patterns where appropriate.
-   Design migrations to be versioned, testable, and recoverable.
-   Preserve existing user data during schema changes.
-   Validate migration behavior against representative test data.
-   Handle app termination, interruptions, partial writes, low storage,
    and corrupted inputs where relevant.
-   Make retry behavior safe and idempotent when operations may be
    repeated.
-   Do not report success until the underlying operation has actually
    succeeded.
-   Do not automatically delete user content to recover from an error.

Any operation that could irreversibly destroy valuable user data
requires explicit approval, even if an implementation or test script
makes that operation appear routine.

------------------------------------------------------------------------

## 15. Completion report format

Every completed task must end with a comprehensive, evidence-based
report. Use this structure, omitting only sections that genuinely do not
apply.

### 1. Outcome

-   What was requested.
-   What was implemented.
-   Whether the task is complete, partially complete, or blocked.

### 2. Investigation and root cause

-   Relevant findings.
-   Root cause for bug fixes.
-   Important assumptions verified or disproved.

### 3. Implementation

-   Main changes and behavior.
-   Important design or dependency decisions.
-   Any behavior intentionally left unchanged.

### 4. Files changed

List files created, modified, and deleted, with a short explanation for
each.

### 5. Verification evidence

For each command or test, report: - The actual command or action. -
Whether it was run. - Pass/fail result. - Relevant output or test
count. - Any check not performed and why.

Include Android device/emulator details when platform verification was
performed. Distinguish Android verification from Flutter Web
verification.

### 6. Documentation and tracking

List the documentation and project tracking records updated.

### 7. Git state

Report branch, commits, merge/tag details if applicable, and final
working-tree status.

### 8. Remaining work and limitations

List unresolved defects, blockers, skipped checks, technical debt, and
follow-up tasks. If none were found, say so without inventing issues.

### 9. Evidence-based conclusion

State exactly what is verified and what is not. Never use "production
ready," "fully tested," or equivalent claims unless the required
evidence supports them.

------------------------------------------------------------------------

## 16. Prohibited agent behaviors

Agents must never: - Modify the legacy React Native app, backend,
databases, or infrastructure under a Flutter-only task. - Assume old
reports accurately describe the current repository. - Invent files,
paths, package versions, APIs, test results, or approvals. - Claim a
test, build, device run, review, or deployment happened when it did
not. - Hide failing tests or weaken quality gates to make a task appear
complete. - Delete or overwrite user work to simplify implementation. -
Perform irreversible data destruction without explicit approval. -
Publish, deploy, or release without explicit approval. - Send personal
reading data to an external service without the required explicit
consent. - Silently switch from local processing to cloud processing. -
Add product features that contradict the approved PRD. - Introduce
abstractions or dependencies without a concrete reason. - Leave known
task-related regressions undocumented. - Mark incomplete or unverified
work as complete.

------------------------------------------------------------------------

## 17. First-run instructions for a new agent

When entering the project for the first time:

1.  Confirm the actual Flutter project root.
2.  Read this `AGENT.md` and the current `prd.md`.
3.  Inspect the repository structure, Git state, and existing
    documentation.
4.  Identify the actual Flutter/Dart versions, dependencies,
    architecture, persistence approach, navigation, state management,
    and Android configuration from the repository rather than
    assumptions.
5.  Inspect current tests, analysis configuration, build configuration,
    and generated-code workflow.
6.  Compare the implementation against the PRD and record material gaps
    without assuming earlier reports are correct.
7.  Establish or locate `ROADMAP.md`, `TASKS.md`, `CHANGELOG.md`, and
    `DECISIONS.md`, avoiding duplicates.
8.  Record a concise verified baseline and identify the highest-value
    next tasks.
9.  Do not perform destructive cleanup, data migration, external
    publication, or release actions without the required approval.

For subsequent tasks, do not repeat the entire first-run audit.
Re-inspect the areas relevant to the task and any changed assumptions.

------------------------------------------------------------------------

## 18. Guiding principle

**Be autonomous in execution, conservative with user data, disciplined
with Git, honest about evidence, and uncompromising about product
correctness.**

The objective is not merely to produce code quickly. It is to build a
dependable, maintainable, offline-first reading application that
respects the reader's content, choices, privacy, and time.
