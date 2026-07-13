# Changelog

## Unreleased

- New audit: audit-ux.md (U) -- the shipped artifact's dialogue with its end
  user. Six hunt classes: input burden (data asked that the artifact could
  infer), message quality, terminology coherence across live surfaces, flow
  structure (late validation, dribbled questions, missing/superfluous
  confirmation), recovery dialogue, feedback. Fail-fast applicability guard for
  repos with no user-facing surface; boundary redirects to codebase
  (DX/affordances), process (re-run mechanics), and docs (prose drift);
  severity anchored in behavioral cost so taste findings die at the
  anti-stylistic bar. Peer-reviewed (blind-debate); integrated across
  conventions, lint, schema (U in the ID pattern, "ux" audit type), validator
  KIND map, orchestrator, launcher, and README.

- Structural test-blindness rule (from the fable-e2e run, where a green suite
  missed three defects): acceptance checks must exercise the state where the
  defect lives -- migrated/persisted schema or cross-process coordination --
  at audit time and fix time; a fresh-state test is not evidence. Canonized in
  conventions, enforced in audit-change's method, fix.md's PROVE, and
  audit-codebase's test-confidence hunt (which also gains a non-pinning-tests
  class: green even when the behavior they claim to pin is broken).
- fix.md: new regression tests are proven by running them red with the fix
  absent, and the ledger records both the red and green runs; the exec summary
  now recommends a diff-scoped change audit of the working tree before merge
  (fix-introduced defects are what the fixing agent cannot see).
- Anti-severity-letter ID clause in all five audit specs, conventions, and
  audit-full validation (from the second live run, where a subagent emitted
  H1/M1/L1): the prefix is the audit type -- IDs are ordered by severity,
  never named by it.
- Repair-before-quarantine in audit-full Phase 2: mechanical/deterministic
  validation failures get ONE re-message naming only the defect and required
  format (never why a finding matters or what other audits found), then full
  re-validation; content failures and second failures quarantine as before.
- Severity divergence on merged backlog entries: rank at the highest cited
  severity and record every cited severity with its source via
  severity_provenance ([{cited_id, severity}]) -- schema and validator updated
  (red/green tested).
- Launcher: run option B is now a single /goal that clones via gh to /tmp
  (outside the target repo -- copying specs into the project dirtied the tree
  and tripped the clean-tree preflight) and executes the named spec.

- Backlog output contract hardened (from a live run where the orchestrator wrote
  a non-conforming backlog): audit-full now mandates a summary table with
  ID-prefixed rows and the exact sidecar shape (`snapshot.sha` nested, `findings`
  array), and self-validates the backlog before replying.
- Terminal-stop boundary: audit-full and all five audit specs now state the
  report/backlog is the terminal deliverable and must not chain into fixes,
  branches, or commits -- even under Stop-hook pressure or with no human present.
  Fixes require a separate, explicit fix.md invocation. (Both autonomous live
  runs continued past the backlog into applying fixes; the prompt body never
  instructed it, but the boundary needed to survive an aggressive harness.)

- Validator hardening from the first live run (full suite on a real repo): the
  report validator now finds the summary table by its ID-prefixed rows rather
  than a literal "Summary table" heading, and compares severity/evidence
  case-insensitively -- real agents emit `## 1 · Summary` headings and
  capitalized `High` severity, which the initial contract wrongly rejected.
- Finding-ID rule spelled out in every audit spec: prefix + plain integer only,
  no compound IDs like `P-NEW-1`.
- Regression fixture (`docs-audit-heading-variant`) locking the above into CI.

## 0.1.0 -- 2026-07-11

Initial release.

- Five audit specs: codebase (C), docs (D), process (P), security (S), diff-scoped change (X) -- each a self-contained file in `commands/` (plugin frontmatter + full prompt body; same file serves any harness via flat fetch).
- Orchestrator (`commands/audit-full.md`): one fresh subagent per audit, snapshot/drift discipline, run directories (`docs/audits/<date>-<short-sha>/`) grouping each suite run's artifacts, semantic report validation, root-cause synthesis into `fixes-backlog-<date>.md` (F).
- Human-gated fixing agent (`commands/fix.md`) with re-verify -> fix -> prove loop and outcomes ledger.
- Machine-readable `*.findings.json` sidecar per report + JSON schema (`dev/findings.schema.json`).
- Conventions canon (`dev/conventions.md`) with lint enforcement (`dev/scripts/lint-prompts.mjs`).
- Report validator (`dev/scripts/validate-report.mjs`) -- the orchestrator's Phase 2 checks as a script.
- Claude Code plugin packaging (marketplace + commands); `dev/` machinery never ships to target projects.
