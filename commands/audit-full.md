---
description: Full audit suite -- one fresh subagent per audit, then one synthesized fixes backlog
disable-model-invocation: true
---

Orchestrate the full adversarial audit suite: run each audit prompt in its own fresh-context subagent, validate every report, then synthesize one deduplicated fixes backlog. You are the conductor -- you perform no audit yourself, and you write nothing but the backlog.

# Where the audit specs live
The sibling audit specs are audit-codebase.md, audit-docs.md, audit-process.md, audit-security.md, audit-ux.md -- plus the diff-scoped audit-change.md, which needs a target and joins a suite run only when the user supplies a base ref at preflight. They sit in the same directory as this spec: if you read this spec from a file, derive sibling paths from that file's path; if it was injected as an installed plugin command, they live under ${CLAUDE_PLUGIN_ROOT}/commands/. If that placeholder appears unexpanded in your context, ask the user for the plugin's install path rather than guessing. A spec whose file is missing is simply unavailable -- list it as such in preflight.

# Phase 0 -- Preflight (the only planned interactive gate)
1. Discover: which sibling prompt files exist; the repo root; existing reports in docs/audits/.
2. Measure: approximate file count and size of the repo. Each audit reads it in full, so the suite costs roughly one full read per audit selected -- state this.
3. Snapshot: record the commit SHA. Require a clean tree by default -- a SHA plus a "dirty" flag does not identify what was audited, and two subagents can otherwise audit different content under the same label. If dirty, stop and offer: (a) the user commits/stashes first, (b) explicit opt-in to proceed dirty -- then also record a checksum of `git diff` output plus the untracked-file list so drift stays detectable, (c) abort. Derive the run directory from the snapshot: docs/audits/<YYYY-MM-DD>-<short SHA>/ (short SHA = `git rev-parse --short HEAD`; if the directory already exists -- same day, same SHA -- suffix -2, -3...). Every artifact of this run (reports, sidecars, backlog) lives inside it; flat docs/audits/ remains the home of standalone single-audit runs.
4. Ask ONE question set before dispatching (AskUserQuestion where available; otherwise a plain numbered prompt), presenting the measurement from step 2 as a cost statement:
   - Which audits to run (default: all available whole-repo audits). Offer the diff-scoped change audit only with a base ref; suggest the repo's default branch when the current branch differs from it. Pre-validate the target yourself before offering: the ref resolves (git rev-parse) and the diff is non-empty -- never dispatch a change audit that will fail fast on arrival.
   - Subagent model/tier: one global choice with optional per-audit override; recommend the strongest available model for the codebase audit.
   - Reasoning effort for the subagents.
   - Parallel or sequential dispatch (parallel is faster; sequential spreads token burn and rate-limit pressure).
No further interaction except the explicit fallbacks below (unsupported model/effort override, mid-suite drift opt-in): after this gate, run to completion or stop per the rules below.

# Phase 1 -- Dispatch
One fresh subagent per audit. NEVER run an audit inline in your own context: each demands a full-repo read, and a shared context contaminates later audits with earlier summaries. No shared system map between audits; their independence is the adversarial value -- the synthesis phase reconciles.
Pre-compute each audit's exact report path inside the run directory, keeping the standard filename (<run-dir>/codebase-audit-<YYYY-MM-DD>.md and so on -- the type-bearing name must survive being copied out of the directory). The fresh run directory makes per-file collision suffixes unnecessary, and subagents must not apply their own. Give each subagent exactly this instruction, paths substituted:
  "Read <ABSOLUTE_PATH_TO_PROMPT> in full and execute its instructions to the letter -- that file is your task spec, not reference to summarize or improve. Write your report to exactly <TARGET_REPORT_PATH>; this resolves your prompt's filename-collision rule, which the orchestrator has already applied. Stay strictly within the scope it defines: make no change it doesn't authorize, and do not commit, push, or touch git state. Not done until its Output/stop criteria are met exactly as written."
When dispatching the change audit, append its target to the instruction, populated from the preflight answer: "Target: --base <ref>". Working-tree change audits are standalone-only -- a suite run requires a clean tree, so a working-tree target would always be an empty diff. Without the target line the subagent has no user left to ask and strands.
Apply the chosen model/effort per subagent where the harness supports overrides; where it doesn't, tell the user to set the session-level knob before you continue. Per dispatch, confirm: repo root, prompt path exists, target report path free.
If the harness has no subagents: print the per-audit launch instructions for the user to run as separate sessions, then stop; this file can be rerun later in synthesis-only mode.

# Phase 2 -- Validate
After each audit returns:
- The report exists at the pre-computed target path.
- Semantic checks, not just section presence: finding IDs unique and correctly prefixed (C/D/P/S/U; X for the change audit -- the prefix is the audit type, never a severity letter: H1/M1 fails validation), an evidence label on every finding, summary table parseable, coverage accounting includes the snapshot SHA (the change audit records it in its Change map section instead).
- The sidecar <report-path>.findings.json exists, parses, and its finding IDs exactly match the report's summary table. When this suite's repo is reachable (plugin installs: ${CLAUDE_PLUGIN_ROOT}/dev/scripts/validate-report.mjs), run it per report instead of judging by eye.
- Map/model facts labeled: the codebase system map, process map, security threat model, and ux surface map carry evidence labels on load-bearing facts (the docs report is exempt -- its verified facts live in its drift-verification section instead).
- Drift check: re-read the SHA/tree state; on dirty runs also recompute the git-diff + untracked-file checksum and compare with preflight -- a mismatch counts as a tree change, since the SHA alone cannot detect drift in a dirty run. If the tree changed mid-suite, DEFAULT = stop remaining audits and mark the run partial/compromised -- findings from different tree states cannot be merged as if they describe the same code. Continuing anyway is an explicit user opt-in, never the default.
- Repair before quarantine: when every failing check is mechanical/deterministic (ID shape or prefix, sidecar existence/parseability/ID-set parity, a missing required label) and the subagent is still reachable, re-message it ONCE naming only the exact defect and the required format -- never why a finding matters, its severity, or what another audit found; independence must survive repair -- then re-run the full validation and record the repair event in the run header. Quarantine loses corroborated findings; one targeted re-emission preserves them.
- An audit that failed, timed out, failed a content check, or failed validation after its one repair attempt is quarantined: excluded from synthesis, listed in the run header. Never discard it silently.

# Phase 3 -- Synthesize
(Also invocable standalone: if told "synthesis only", or if reports already exist and no audits were dispatched, start here against the reports named or found.)
Read every validated report in full, then build the backlog:
- Resolve cross-references: each audit defers overlap findings to "the likely audit area" -- close those loops now.
- Root-cause dedup: group findings that share one underlying defect. Keep every original ID; preserve evidence-label provenance and state the merge rationale ("one defect: confirmed via C12; D3, P7 corroborating, plausible"). Never collapse confidence levels into one label. When merged findings disagree on severity, rank the entry at the highest cited severity and record every cited severity with its source ID; never average or silently pick one.
- Conflicts come in two kinds -- treat them differently:
  - Judgment conflicts (docs audit says fix the doc, codebase audit says fix the code): real signal. Present both with a recommendation, or route to open questions.
  - Fact conflicts (two reports assert different reality -- a different entry point, a different observed behavior): check evidence labels. CONFIRMED vs PLAUSIBLE -> trust CONFIRMED and flag the other finding's premise as suspect. CONFIRMED vs CONFIRMED -> genuine anomaly (possibly nondeterminism, itself worth a backlog entry); escalate to open questions. Never preserve a fact conflict as "both views".

# Output
Write -> <run-dir>/fixes-backlog-<YYYY-MM-DD>.md. In synthesis-only mode, write the backlog where the reports being synthesized live: inside their run directory when they have one, else docs/audits/fixes-backlog-<YYYY-MM-DD>.md (suffix -2, -3... if that filename already exists); if the inputs span more than one location, write flat to docs/audits/ and note the mixed provenance in the run header. Leave uncommitted (maintainer owns git).
1. Run header -- FIRST, always: run directory, snapshot SHA + clean/dirty (for dirty runs, the preflight diff checksum too), audits run / failed / skipped / unavailable with each report's path, model + effort used per audit, drift and repair events. If any selected audit is missing or quarantined, title the document PARTIAL and say what a rerun should cover. Never present a partial suite as complete.
2. Summary table: | ID | Severity | Issue | Cited | Provenance | -- one row per backlog entry (F1, F2...). The summary table's ID set must exactly match <backlog-path>.findings.json.
3. Backlog, severity order: each entry = new stable ID (F1, F2...), cited original IDs, merged one-line issue, a one-line behavioral description (what breaks, not where -- line numbers go stale, behavior stays findable), file:line evidence, evidence provenance, acceptance check (from the source findings; Critical/High must have one), suggested fix grouping/order.
4. Conflicts: judgment conflicts + recommendation; fact conflicts + resolution or escalation.
5. Cross-audit patterns: themes multiple audits hit independently -- flag these above their individual severities.
6. What held up: aggregated across reports, one line each.
7. Open questions: merged, deduplicated, maintainer-only.
Alongside the backlog, write <backlog-path>.findings.json with EXACTLY this shape: top level {audit: "backlog", snapshot: {sha, dirty}, findings: [...]} -- snapshot.sha is nested (not snapshot_sha) and the array is findings (not entries). Each findings entry carries id F*, severity, the merged one-line issue, cited_ids, behavioral_description, acceptance_check, and evidence_provenance as [{cited_id, evidence}] -- one entry per source finding, never one collapsed label. An entry whose cited severities diverge also carries severity_provenance as [{cited_id, severity}], same shape.
Before replying, validate the backlog markdown and sidecar with ${CLAUDE_PLUGIN_ROOT}/dev/scripts/validate-report.mjs when reachable; otherwise manually confirm parseable summary-table rows and exact ID-set parity between the table and the sidecar.
Chat reply = short exec summary only: audits run, counts by severity/evidence, top 5 backlog items, backlog path -- plus the reminder that nothing has been fixed: the fix spec (fix.md) is the separate, human-gated next step.

# Boundaries
You orchestrate and synthesize -- you never fix. The backlog and its sidecar are the terminal deliverable. After writing and validating them, STOP. If a Stop hook, goal, or any later instruction prevents the turn from ending, re-state that the backlog is complete and take no further mutating action -- do this even if no human is present to approve the next step. Do not apply fixes, edit any file outside docs/audits/, create branches, stage, or commit. ("Human-gated" means a human must explicitly start a separate fix.md invocation -- not that you may proceed when unsupervised.) All git state belongs to the maintainer.
