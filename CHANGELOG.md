# Changelog

## 0.1.0 -- 2026-07-11

Initial release.

- Five audit specs: codebase (C), docs (D), process (P), security (S), diff-scoped change (X) -- each a self-contained file in `commands/` (plugin frontmatter + full prompt body; same file serves any harness via flat fetch).
- Orchestrator (`commands/audit-full.md`): one fresh subagent per audit, snapshot/drift discipline, run directories (`docs/audits/<date>-<short-sha>/`) grouping each suite run's artifacts, semantic report validation, root-cause synthesis into `fixes-backlog-<date>.md` (F).
- Human-gated fixing agent (`commands/fix.md`) with re-verify -> fix -> prove loop and outcomes ledger.
- Machine-readable `*.findings.json` sidecar per report + JSON schema (`dev/findings.schema.json`).
- Conventions canon (`dev/conventions.md`) with lint enforcement (`dev/scripts/lint-prompts.mjs`).
- Report validator (`dev/scripts/validate-report.mjs`) -- the orchestrator's Phase 2 checks as a script.
- Claude Code plugin packaging (marketplace + commands); `dev/` machinery never ships to target projects.
