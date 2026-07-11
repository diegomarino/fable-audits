---
description: Diff-scoped change audit with ship/needs-attention verdict -> docs/audits/change-audit-<date>.md
argument-hint: "--base <ref> | working tree"
disable-model-invocation: true
---

Perform an adversarial audit of a change -- the working tree or a branch diff -- not the whole repository. Judge the change against the code it lands in: what it breaks, what it half-finishes, what it silently alters. Cheap enough to run before every merge; rigorous enough that "ship" means something.

# Target
The invocation names the target: "working tree" (staged + unstaged + untracked) or a base ref ("--base <ref>", compared as merge-base...HEAD). If it names neither -- an empty or literal unexpanded "$ARGUMENTS" counts as unnamed -- ask once, then proceed.
Fail fast before any analysis: the base ref must resolve (git rev-parse) and the diff must be non-empty. A bad ref or empty diff ends the audit here with that statement -- do not review the whole repo as a fallback.
Snapshot discipline (same rules as the full suite): record the commit SHA. A base-ref target over committed work is immutable -- say so, and read audited file contents from the committed snapshot (`git show HEAD:<path>`; `git show <base>:<path>` for the old side), not the live working tree, which may have diverged from what you are auditing. A working-tree target is mutable by definition: treat it as a dirty run -- record a checksum of the diff plus the untracked-file list at start, re-check before writing the report, and mark the run compromised if it moved.

# Role
Act as the reviewer who must approve this change for production: adversarial, skeptical of intent, judging what the diff does -- not what its author meant. Read enough surrounding code to judge the change in context; do not audit the rest of the repo (cross-reference a codebase audit instead). No loyalty to the change.

# Scope
Read the full diff, every file it touches in full, and the direct callers/consumers of what changed. Build:
- What the change claims to do (commit messages, PR description, linked issue/spec when present) vs what it does.
- The contracts the changed code participates in: callers, API/CLI surfaces, persisted formats, config.
- What the change does NOT touch but should have: call sites left stale, docs/tests/examples now wrong, migrations missing.

# Command safety
Prefer read-only inspection and local throwaway state. Run the touched tests when safe. Do not run destructive, publishing, deploy, migration, credential-mutating, network-writing, or external-service-mutating commands. If a useful check is unsafe or needs credentials, mark it BLOCKED and state the exact command you would have run.

# Evidence and severity
Evidence labels:
- CONFIRMED: reproduced, or verified against the exact diff, code, docs, or command output.
- PLAUSIBLE: strong path identified but not fully reproduced.
- BLOCKED: missing dependency, credential, fixture, platform, or unsafe command boundary.
- NOT REPRODUCED: investigated and discarded or contradicted by evidence.

Severity scale:
- Critical: the change introduces data loss, security exposure, corruption, or breaks a core workflow.
- High: wrong public behavior, broken contract with existing callers, spec requirement missing or implemented wrong.
- Medium: incomplete lifecycle in the new code, inconsistent behavior with a workaround, stale collateral that will mislead.
- Low: clarity, naming, local polish in the changed lines.

# Hunt for
1. Contract breaks -- callers/consumers of changed functions, formats, APIs, or configs that now receive different behavior; renamed/removed things still referenced elsewhere.
2. Half-finished changes -- the pattern applied in three places but the fourth missed; new state written but never read or cleaned up; the TODO the diff itself introduces.
3. Idempotency and re-runs -- can the changed operation run twice? Be retried after partial failure? What happens if the step or migration it adds is interrupted midway?
4. Rollback safety -- if this change ships and must be reverted, what breaks? Are schema/format changes readable by the previous version? Are one-way doors flagged as such?
5. Version skew -- old callers/clients/data hitting new code (and the reverse) during rollout; schema drift; compatibility of persisted state across the change.
6. Spec fidelity -- requirements the linked spec/issue asked for that are missing or partial; behavior in the diff nobody asked for (scope creep); requirements implemented but wrong. Quote the spec line per finding.
7. Observability -- does the change fail loudly where it matters? New failure paths with no log/metric/error surface that would hide the failure or slow recovery.
8. Collateral drift -- docs, examples, help text, tests, comments that the diff makes wrong but doesn't update.

# Method
- State how the changed area SHOULD behave (from spec, docs, tests, callers), then read the diff to confirm or refute.
- Run the touched tests when safe; a test the diff breaks or newly skips is a finding.
- Every finding needs a concrete scenario (inputs/state -> wrong result) and must answer: what can go wrong, why this path is vulnerable, the likely impact, and the concrete change that reduces the risk.
- Try to disprove each finding first; discard what doesn't survive.
- Prefer one strong finding over several weak ones; do not dilute serious issues with filler. If the change looks safe, say so directly and return few or no findings.
- Final check before writing the report: every finding is adversarial rather than stylistic, tied to a concrete location in or around the diff, plausible under a real failure scenario, and actionable. Cut what fails.
- If this overlaps a codebase/docs/process/security audit, keep only findings the change itself introduces or worsens; otherwise cross-reference the likely audit area.

# Output
Write full report -> docs/audits/change-audit-<YYYY-MM-DD>.md. Create dir if missing; if the filename already exists, suffix -2, -3... Read prior change-audit reports for the same base/branch first -- glob change-audit-*.md across flat docs/audits/ and <date>-<sha> run directories, matching by snapshot.base_ref (or diff_checksum for working-tree runs) in each candidate's sidecar: mark persisting findings UNRESOLVED citing the prior report and ID. Leave uncommitted (maintainer owns git).
Alongside the report, write <report-path>.findings.json -- machine-readable sidecar: top level {audit: "change", snapshot: {sha, dirty, base_ref or diff_checksum}}, findings[] with one entry per finding {id, severity, evidence, issue, scenario, file, line_start, line_end, recommended_direction, acceptance_check (Critical/High only)}. Same finding set as the report: the sidecar serves validators and fixing agents, the markdown serves humans.
Every finding = stable ID within this report (X1, X2... severity order); a fixing agent cites these. An ID is the prefix plus a plain integer only -- never suffixed or compound (no X-NEW-1, no X1a); new findings just continue the sequence. In the sidecar, severity matches the report's wording (Critical/High/Medium/Low).
Sections, top-heavy:
1. Verdict: ship / needs-attention, one paragraph written as a ship/no-ship assessment, not a neutral recap.
2. Summary table: ID | severity | area | one-line issue | file:line | evidence label.
3. Change map: what the diff touches, the contracts involved, target + snapshot (SHA; base ref, or working-tree checksum).
4. Coverage accounting: files read fully/skimmed, callers traced, tests run, blind spots.
5. Findings by hunt category, severity order. Each: ID, file:line, one-line issue, concrete scenario, evidence label, recommended direction. For Critical/High add an acceptance check -- the exact command, test, or observation that fails now and passes once fixed.
6. Collateral checklist: docs/tests/examples the diff must update before merge.
7. What held up: contracts and paths the change respects.
8. Open questions: maintainer-only.
Chat reply = short exec summary only: verdict + counts by severity/evidence + top findings + report path.

Thorough over brief; a small diff deserves a fast, sharp audit, not a padded one.

Target: $ARGUMENTS
