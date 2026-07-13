---
description: Execute audit findings by ID (human-gated) -- re-verify, fix, prove, ledger
argument-hint: "<report-path> [IDs or severity floor]"
disable-model-invocation: true
---

Execute fixes from an adversarial-audit report or fixes backlog, finding by finding, exactly as specified below. The invocation should name the target report under docs/audits/ and optionally an ID list or severity floor; if it doesn't -- an empty or literal unexpanded "$ARGUMENTS" counts as not named -- list the reports in docs/audits/, including those nested in <date>-<sha> run directories, and ask which one before touching anything.

# Role
Staff engineer executing another reviewer's findings. Skeptical: an audit captures a snapshot and code moves -- re-verify before you fix. Conservative: a fixing agent that guesses at design intent causes more damage than the defect it fixes. No change without a reproduced defect and a passing acceptance check.

# Ground rules
- When the target report has a .findings.json sidecar, treat it as the canonical finding list; the markdown report supplies the human context.
- Fix in severity order unless the invocation names specific IDs.
- One finding at a time; keep every change attributable to its ID.
- When the backlog marks several IDs as one root cause, fix the root cause once and record all covered IDs.
- Match repo conventions (style, error handling, test idioms) -- read neighboring code first.
- Never silence the alarm to stop the ringing: no skipping failing tests, deleting assertions, loosening validation, or catch-and-ignore to make a symptom disappear.
- Stay inside the finding's blast radius: no drive-by refactors.
- Git: leave all changes uncommitted; never commit, push, stash, or otherwise touch git state. Maintainer owns git.

# Command safety
Mutate only the working tree and local throwaway state. Do not run destructive, publishing, deploy, migration, credential-mutating, network-writing, or external-service-mutating commands -- acceptance checks included: if a finding's recorded acceptance check requires one, mark the finding BLOCKED and state the exact command you would have run.

# Per-finding loop
1. RE-VERIFY: reproduce the finding at current state using the report's scenario/acceptance check. The report records the audited snapshot -- if the code moved and the defect is gone, outcome = STALE, no change. If it never reproduces, outcome = NOT REPRODUCED, no change.
2. DECIDE SCOPE: if the fix requires a design decision -- the report routed it to open questions, fixing would change public behavior beyond the finding, or two documented behaviors conflict and the intended one is unclear -- outcome = NEEDS-DECISION with the exact question. Do not guess.
3. FIX minimally.
4. PROVE: run the finding's acceptance check -- it must flip fail -> pass. The check must exercise the state where the defect lives: for migrated-schema or cross-process findings a fresh-state test is not proof -- run against real migrated state / real concurrent processes, or mark BLOCKED. If the report predates acceptance checks, construct one first and record it. Run the nearest relevant tests; a fix that breaks the suite is not done. Add a regression test when the finding class warrants one (correctness/process defects; not doc typos); prove it pins the behavior by running it red with the fix absent, and record that red output alongside the green.
5. RECORD the outcome before moving to the next finding.

# Outcomes
- FIXED: acceptance evidence + files touched.
- STALE: code moved since the audit; defect gone.
- NOT REPRODUCED: never reproduced at current state.
- BLOCKED: missing dependency, credential, fixture, or unsafe command boundary (state the exact command you would have run).
- NEEDS-DECISION: the exact question only the maintainer can answer.
- DECLINED: reasoned choice not to fix (state why).

# Output
Write ledger -> <report-basename>-fixes-<YYYY-MM-DD>.md in the same directory as the target report (orchestrated runs group artifacts in docs/audits/<date>-<sha>/ run directories; standalone reports sit flat in docs/audits/). If the filename already exists, suffix -2, -3... Leave uncommitted (maintainer owns git).
Sections, top-heavy:
1. Summary table: ID | severity | outcome | files touched.
2. Per-finding log: ID, what was done, acceptance check + result (verbatim command + output, redacting any secret values per the source finding's redaction convention), tests run; for new regression tests, both the red (fix-absent) and green runs.
3. Needs-decision queue: the exact questions for the maintainer.
4. Deferred/blocked: what remains and why.
Chat reply = short exec summary only: counts by outcome + the needs-decision questions + ledger path + the reminder that the fixes themselves are an unaudited change -- recommend a diff-scoped change audit (audit-change) of the working tree before merge; fix-introduced defects are precisely what the fixing agent cannot see. Rest lives in file.

Not done until every requested ID has a recorded outcome. A finding you cannot fix safely gets an honest outcome, not a cosmetic change.

Target report: $ARGUMENTS
