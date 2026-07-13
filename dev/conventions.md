# Audit conventions -- the canon

Every spec in `commands/` is self-contained: frontmatter for the Claude Code
plugin, then the full prompt body. The same file is the plugin command and the
flat-fetch artifact for any other harness — nothing in `dev/` ever travels to
a target project (the plugin lives in Claude Code's own storage; the flat
fetch copies only `commands/*.md`). This document is the **canonical statement
of the invariants all specs share**, and `dev/scripts/lint-prompts.mjs`
enforces that each spec still carries them. Change policy: edit this file
first, propagate to the specs, run the lint.

## Evidence labels

Every finding and every load-bearing map/model fact carries exactly one label:

- **CONFIRMED** -- verified against exact code, docs, command output, or artifact.
- **PLAUSIBLE** -- strong path identified but not fully reproduced.
- **BLOCKED** -- missing dependency, credential, fixture, platform, or unsafe
  command boundary; always paired with the exact command that would have run.
- **NOT REPRODUCED** -- investigated and discarded or contradicted by evidence.

Labels encode *why you believe something and what was tried*. They are never
collapsed during synthesis; provenance survives every merge. We deliberately do
not use numeric confidence floats.

## Severity

Four tiers -- Critical / High / Medium / Low -- defined per audit domain in each
spec, but always meaning: Critical = data loss, exposure, corruption, or an
impossible core workflow; High = wrong public behavior or a stranded primary
journey; Medium = incomplete or inconsistent with a workaround; Low = polish.
Severity is orthogonal to evidence: a PLAUSIBLE Critical is legitimate.

## Command safety

Read-only inspection and local throwaway state by default. Never run
destructive, publishing, deploy, migration, credential-mutating,
network-writing, or external-service-mutating commands. Unsafe-but-useful
checks become BLOCKED findings with the exact command stated. Secrets are
reported as location + redacted fingerprint, never the value. Lifecycle
scripts (install/postinstall/build) are read, never executed to observe them.

## Snapshot discipline

Every report records the commit SHA and clean/dirty state. The full suite
requires a clean tree by default; dirty runs are explicit opt-ins carrying a
diff + untracked checksum, re-checked before writing. Mid-suite drift aborts
by default. Diff-scoped audits over a base ref read from committed objects,
not the live tree.

## Finding quality bar

- Disprove first: try to kill each finding before reporting it.
- Every finding answers: what can go wrong, why this path is vulnerable, the
  likely impact, and the concrete change that reduces the risk.
- Critical/High findings carry an **acceptance check**: the exact command,
  test, or observation that fails now and passes once fixed.
- Acceptance checks exercise the state where the defect lives: for
  migrated/persisted-schema or cross-process defects, a fresh-state test is
  not evidence -- at audit time or fix time. A green suite is necessary,
  never sufficient, for those classes.
- Final check before writing: adversarial not stylistic, concrete location,
  real failure scenario, actionable. Cut what fails.
- Prefer one strong finding over several weak ones; do not dilute serious
  issues with filler.

## Output canon

- Reports go to `docs/audits/<type>-audit-<YYYY-MM-DD>.md` (backlog:
  `fixes-backlog-<date>.md`; fix ledger: `<report>-fixes-<date>.md`, written
  next to its target report). Name collision: suffix `-2`, `-3`...
- Orchestrated suite runs group every artifact in a run directory
  `docs/audits/<YYYY-MM-DD>-<short SHA>/` (suffix `-2`, `-3`... when the same
  day + SHA repeats). Standalone audits write flat to `docs/audits/`.
  Filenames keep their type-bearing form either way, so a report stays
  self-identifying when copied out of its run directory.
- Always left uncommitted -- the maintainer owns git. No audit or fix spec
  ever commits, pushes, or stashes.
- Top-heavy structure: summary table + map first, detail after.
- Prior reports are read first; persisting findings are marked UNRESOLVED
  citing the prior report and ID.
- Chat reply is a short exec summary only; everything else lives in the file.
- Fix execution is a separate, human-gated invocation (`fix.md`) -- audits
  never auto-chain into mutation.

## Finding ID prefixes

| Prefix | Spec | Scope |
|--------|------|-------|
| C | commands/audit-codebase.md | whole repo, implementation |
| D | commands/audit-docs.md | whole repo, documentation |
| P | commands/audit-process.md | whole repo, end-to-end workflows |
| S | commands/audit-security.md | whole repo, security + supply chain |
| U | commands/audit-ux.md | whole repo, end-user experience of shipped surfaces |
| X | commands/audit-change.md | diff-scoped |
| F | fixes-backlog (audit-full synthesis) | cross-audit |

## Machine-readable sidecar

Every report is accompanied by `<report-path>.findings.json` conforming to
`dev/findings.schema.json`: top level `{audit, snapshot {sha, dirty, ...}}`
plus one entry per finding `{id, severity, evidence, issue, scenario, file,
line_start, line_end, recommended_direction, acceptance_check}`. The sidecar
and the report's summary table must contain the same ID set --
`dev/scripts/validate-report.mjs` checks this. The markdown is for humans; the
sidecar is for validators, the orchestrator, and fixing agents.

Casing and IDs (learned from the first live run): `severity` is written
`Critical/High/Medium/Low` to match the prose scale, `evidence` UPPERCASE; the
validator compares both case-insensitively so neither casing is load-bearing.
A finding ID is a prefix plus a plain integer (`C1`, `P12`) -- never suffixed
or compound (`P-NEW-1`, `C1a`), and the prefix is fixed per audit type, never
a severity letter (learned from the second live run: `H1`/`M1`/`L1` fail
validation -- IDs are ordered by severity, never named by it). The validator
finds the summary table as the
first contiguous run of ID-prefixed rows, so the section heading text
(`## 1. Summary table` vs `## 1 · Summary`) is not load-bearing either.

Two audit-specific variants: backlog entries replace the single `evidence`
with `evidence_provenance` (`[{cited_id, evidence}]`, one per merged source --
evidence labels are never collapsed) plus `cited_ids` and
`behavioral_description` -- and when cited severities diverge, the entry ranks
at the highest cited severity and carries `severity_provenance`
(`[{cited_id, severity}]`, same shape); change-audit snapshots must carry `base_ref` (base-ref
run) or `diff_checksum` (working-tree run) so the audited target stays
identifiable.
