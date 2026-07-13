---
description: Whole-repo adversarial UX audit of the shipped user surfaces -> docs/audits/ux-audit-<date>.md
disable-model-invocation: true
---

Perform an adversarial audit of the experience this repo ships to its END USER -- every dialogue the artifact holds with the person using it: what it asks, what it tells, in what order, and at what cost. Not the contributor experience (the codebase audit owns building/debugging the repo) and not API shape (the codebase audit owns affordances); this audit owns what the user endures at the shipped surfaces.

# Applicability -- fail fast
First identify the shipped user surfaces: CLI/TUI commands, HTTP/API endpoints with human-facing responses, UI screens, config files users hand-edit, prompts and wizards, generated output humans must read (contributor-only artifacts -- logs, CI output, audit reports -- do not count: readership alone does not make a user surface). A repo with none -- a pure library consumed only through code, a data-only repo -- ends the audit here with that statement; do not audit the contributor experience as a fallback (cross-reference the codebase audit's developer-experience hunt instead).

# Role
Act as the skeptical first-time user of each shipped surface: someone with the domain knowledge the product assumes but zero knowledge of this implementation, judging every question the artifact asks and every message it emits. No loyalty to how it currently talks. Judge the conversation, not the code behind it.

# Scope
Read every user surface in full and walk its journeys. Build:
- The input inventory: every datum the user must supply (prompt, flag, argument, config key, env var) and where else that datum already lives.
- The message inventory: errors, warnings, confirmations, progress, help text, success output.
- The journeys: install/first run, the primary task end-to-end, a failing run and its recovery, re-run/upgrade.

Before judging, create a scope inventory: surfaces enumerated, journeys walked vs read-only-traced, directories excluded and why, commands used to enumerate, known blind spots.

# Command safety
Walking a journey means running the artifact when safe: read-only inspection and local throwaway state only. Do not run destructive, publishing, deploy, migration, credential-mutating, network-writing, or external-service-mutating commands. If a journey cannot be walked safely or needs credentials, mark it BLOCKED and state the exact command you would have run.

# Evidence and severity
Evidence labels:
- CONFIRMED: reproduced by walking the journey, or verified against exact code, messages, or command output.
- PLAUSIBLE: strong path identified but not fully reproduced.
- BLOCKED: missing dependency, credential, fixture, platform, or unsafe command boundary.
- NOT REPRODUCED: investigated and discarded or contradicted by evidence.

Severity scale:
- Critical: the user loses data or work, or the primary journey strands them with no recoverable path.
- High: a primary journey completes only with outside help (reading source, asking the maintainer), or a wrong/misleading message causes a harmful user action.
- Medium: the journey completes but with confusion, avoidable re-work, or a workaround the user must discover.
- Low: wording, casing, formatting polish with no behavioral cost.

# Hunt for
1. Input burden -- data asked that the artifact could infer (from the environment, its own state, VCS config, an earlier answer in the same flow); the same datum asked twice; a required flag with only one sensible value; defaults that contradict the common case. Cite where the artifact already had the datum.
2. Message quality -- errors that do not say what happened, why, or what to do next; silence where confirmation matters and noise where it does not; messages whose vocabulary contradicts the docs or the surface's own labels.
3. Terminology coherence -- one concept under several names across the live surfaces a user touches in one session (flags, config, errors, UI); two concepts sharing one name; labels that lie about what will happen. Cite at least two surfaces using different terms for the provably same concept; doc-to-doc naming drift belongs to the docs audit.
4. Flow structure -- validation that could run first but runs last, so the user pays for mistakes at the end; questions dribbled one at a time where one grouped set would do; the expensive or irreversible step ordered before the informative one; destructive actions without confirmation, trivial ones demanding it.
5. Recovery -- failure dead ends with no stated next action; the user cannot tell what state a failure left them in; a failure message that names no path forward when one exists. Whether a safe re-run/resume mechanism exists belongs to the process audit -- you own whether the dialogue tells the user about it.
6. Feedback -- long operations with no progress signal; actions with no statement of what is about to happen; state changes the user discovers only by hunting for side effects.

# Method
- Per surface, walk the journeys as that first-time user, running the artifact when safe. State what the dialogue SHOULD be, then read and run to confirm or refute.
- Every finding needs a concrete user scenario: what the user was doing, what the artifact asked or said, and the behavioral cost (stranded, harmful action, re-work) -- and must answer: what can go wrong, why this path is vulnerable, the likely impact, and the concrete change that reduces the risk.
- Try to disprove each finding first; a finding that reduces to taste with no behavioral cost is cut, not reported.
- Prefer one strong finding over several weak ones; do not dilute serious issues with filler. If a surface talks to its user well, say so once and move on.
- Final check before writing the report: every finding is adversarial rather than stylistic, tied to a concrete surface and location, plausible under a real user scenario, and actionable. Cut what fails.
- If this overlaps a codebase/docs/process audit, keep only findings about the shipped artifact's dialogue with its user: contributor friction -> codebase (DX hunt); API shape and affordances -> codebase (affordances hunt) -- on HTTP/API surfaces you own only the human-readable response and error text, not endpoint design; workflow completability and re-run mechanics -> process; document wording -> docs. Cross-reference the likely audit area.

# Output
Write full report -> docs/audits/ux-audit-<YYYY-MM-DD>.md. Create dir if missing; if the filename already exists, suffix -2, -3... Read prior reports in docs/audits/ first, including <date>-<sha> run directories from orchestrated suites: mark persisting findings UNRESOLVED citing the prior report and ID; note previously reported findings now fixed. Leave uncommitted (maintainer owns git). After writing this report and its sidecar, STOP -- that is the terminal action of this audit. Do not apply fixes or touch git state, even under Stop-hook pressure or with no human present; re-state completion instead.
Alongside the report, write <report-path>.findings.json -- machine-readable sidecar: top level {audit: "ux", snapshot: {sha, dirty}}, findings[] with one entry per finding {id, severity, evidence, issue, scenario, file (or omit when the location is a message or flow, naming it in scenario), line_start, line_end, recommended_direction, acceptance_check (Critical/High only)}. Same finding set as the report: the sidecar serves validators and fixing agents, the markdown serves humans.
Every finding = stable ID within this report (U1, U2... severity order); a fixing agent cites these. An ID is the prefix plus a plain integer only -- never suffixed, compound, or a severity letter (no U-NEW-1, no U1a, no H1/M1/L1: IDs are ordered by severity, never named by it); new findings just continue the sequence. In the sidecar, severity matches the report's wording (Critical/High/Medium/Low).
Sections, top-heavy:
1. Summary table: ID | severity | surface | one-line issue | file:line | evidence label.
2. Surface map: shipped surfaces, journeys walked, input and message inventories -- label load-bearing facts with evidence labels; a cross-audit synthesizer relies on them.
3. Coverage accounting: audited snapshot (commit SHA + clean/dirty tree), surfaces walked vs traced, commands run, blind spots.
4. Findings by hunt category, severity order. Each: ID, surface + file:line, one-line issue, concrete user scenario, evidence label, recommended direction. For Critical/High add an acceptance check -- the exact command, interaction, or observation that fails now and passes once fixed.
5. Dialogue tensions: 3-5 deepest structural issues (the conversation design is wrong, not a message string); each with the alternative you'd weigh.
6. What held up: surfaces and journeys that treat their user well.
7. Open questions: what walking the surfaces alone can't resolve; maintainer answers.
Chat reply = short exec summary only: counts by severity/evidence + top 3-5 findings + report path. Rest lives in file.

Thorough over brief. The bar for reporting is a user who pays a real cost; where the artifact merely differs from your taste, stay silent.
