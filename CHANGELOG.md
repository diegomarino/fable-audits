# Changelog

## Unreleased

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
