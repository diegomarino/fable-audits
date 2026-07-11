---
description: Documentation audit (drift, structure, coverage) -> docs/audits/docs-audit-<date>.md
disable-model-invocation: true
---

Audit this project's documentation as a first-class artifact, exactly as specified below -- checking that it tells the truth about the code, that each reader-facing guide leads with what matters and defers detail, that oversized documents are split so detail has room to breathe, and that architecture is shown as drawn processes rather than prose. Treat the docs as the product a reader actually consumes.

# Role
Act simultaneously as: a docs lead who owns information architecture; a skeptical newcomer with only the docs and a terminal; a returning maintainer six months later hunting for one specific fact; and an autonomous agent that must act using the docs as its only spec. No loyalty to the current structure, file layout, or headings.

# Scope
Read every reader-facing surface in full -- do not sample silently:
- README, docs/**, specs/**/quickstart.md, ADRs/decision records, CONTRIBUTING/onboarding.
- Doc-bearing code: public docstrings, module headers, CLI `--help`, config-file comments, example scripts.
- Agent-facing instruction surfaces: CLAUDE.md, AGENTS.md, .cursorrules, llms.txt, skill/command files -- and verify they do not contradict the human-facing docs; the two drift on separate maintenance reflexes.
- Every diagram already present. Inspect source and rendered output when the local toolchain makes rendering safe and available; otherwise mark render verification BLOCKED.
Build the current documentation map: which document exists, what it claims to cover, who it's for, and how a reader is expected to find it.

Before judging, classify each document by mode:
- tutorial
- how-to
- reference
- explanation
- ADR/decision record
- runbook/troubleshooting
- generated/reference surface

Apply inverted-pyramid expectations primarily to guides, how-tos, runbooks, and onboarding docs. Judge ADRs by context/decision/consequences, and reference docs by completeness, scanability, and single-source-of-truth discipline.

# Command safety
For accuracy checks, prefer read-only commands and local throwaway examples. Do not run destructive, publishing, deploy, migration, credential-mutating, network-writing, or external-service-mutating commands unless the repo explicitly documents them as safe local checks and they can be run without secrets. If a useful check is unsafe or needs credentials, mark it BLOCKED and state the exact command you would have run.

# Evidence and severity
Evidence labels:
- CONFIRMED: verified against exact code, docs, command output, or rendered artifact.
- PLAUSIBLE: strong documentation/code mismatch identified but not fully reproduced.
- BLOCKED: missing dependency, credential, fixture, renderer, platform, or unsafe command boundary.
- NOT REPRODUCED: investigated and discarded or contradicted by evidence.

Severity scale:
- Critical: docs lead users/agents into data loss, security exposure, broken publication/deploy, or impossible core workflow.
- High: wrong public command/API/config behavior, broken onboarding, or missing contract for a primary surface.
- Medium: misleading structure, stale secondary example, scattered source of truth, or missing troubleshooting with workaround.
- Low: local clarity, naming, navigation, formatting, or polish.

# Hunt for
1. Drift / inaccuracy (primary) -- any claim the code no longer honors: renamed/removed commands, flags, env vars, paths, file formats, defaults; examples that don't run; output samples that no longer match; docs describing behavior the code has since changed. And the inverse: real public behavior, params, errors, side effects, and exit codes that no document mentions. Include version/compat claims ("requires Node >= 18") checked against lockfiles and CI configs; CHANGELOG entries claiming features that don't exist; screenshots/GIFs/recorded output that no longer match.
2. Inverted-pyramid violations -- documents that bury the point. Guides/how-tos/runbooks should open with a one-paragraph "what this is / when you'd reach for it" plus the 20% that answers 80% of questions; reference tables, edge cases, and rationale belong later. Flag docs that front-load setup minutiae or history before the reader learns what the thing even is.
3. Sizing / decomposition -- documents grown large enough that concerns collide and detail can't breathe: recommend the split (which sections become their own documents, what each is named, how they link back). Also the reverse: scattered fragments that should merge, and detail suppressed only because there was no room for it.
4. Architecture shown as drawn process -- places where flow, lifecycle, or component interaction is explained in prose that a diagram would carry far better. Identify the key processes with no diagram, and diagrams that are now stale. Prefer Mermaid (flowchart for control flow, sequence for cross-component calls, stateDiagram for lifecycles, C4/component for structure).
5. Usefulness / audience fit -- does each document serve a real reader task, or does it exist because someone felt obliged? Are the four modes (tutorial / how-to / reference / explanation) mixed into one document to nobody's benefit? Does it answer "why," not just "what"? Can a newcomer get from zero to first success on the docs alone?
6. Coverage -- public surfaces (CLI, API, config, env, formats, exit codes, error taxonomy) with no documentation; missing troubleshooting/runbook; non-obvious design decisions with no ADR.
7. Single source of truth -- the same fact stated in N places that will inevitably drift; pick the canonical home and make the rest link to it. Terminology and naming that shift document to document for the same concept.
8. Findability / navigation -- given a real question, can the reader route to the right document without already knowing where it lives? Missing index/map, orphan documents, dead cross-links, anchor links pointing at renamed headings; external link rot (mark BLOCKED when network checks are out of bounds).

# Method (verify, don't assert)
- For every accuracy claim, check it against reality when safe: run the example, confirm the flag/command/path exists, diff the sample output. Mark evidence honestly.
- Inventory every fenced code block and classify it: runnable, fragment, or illustrative. Execute the runnable ones in a throwaway dir and report a pass/fail table in the drift-verification section. Do not force fragments or pseudo-code to run; classify honestly instead.
- Use git history to aim the drift hunt: a doc untouched while the code it describes churned is a prime suspect (compare doc last-modified vs. code-area activity). History targets the search; it is never evidence on its own.
- For each drift finding, include: document claim -> source of truth checked -> observed reality -> reader impact.
- Every finding must answer: what the reader or agent gets wrong, why the document leads them there, what it costs them, and the concrete change that fixes it.
- For structure findings, state the concrete reader task that the current shape defeats, then the shape that serves it -- no taste-only "would read cleaner."
- Try to disprove each finding first; discard what doesn't survive.
- Final check before writing the report: every finding breaks a real reader task, is tied to a concrete document location, and is actionable. Cut what fails.
- If this overlaps a codebase/process audit, keep only findings where documentation evidence adds unique value; otherwise cross-reference the likely audit area.

# Output
Write full report -> docs/audits/docs-audit-<YYYY-MM-DD>.md. Create dir if missing; if the filename already exists, suffix -2, -3... Read prior reports in docs/audits/ first, including <date>-<sha> run directories from orchestrated suites: mark persisting findings UNRESOLVED citing the prior report and ID; note previously reported findings now fixed. Leave uncommitted (maintainer owns git).
Alongside the report, write <report-path>.findings.json -- machine-readable sidecar: top level {audit: "docs", snapshot: {sha, dirty}}, findings[] with one entry per finding {id, severity, evidence, issue, scenario, file, line_start, line_end, recommended_direction, acceptance_check (Critical/High only)}. Same finding set as the report: the sidecar serves validators and fixing agents, the markdown serves humans.
Every finding = stable ID within this report (D1, D2... severity order); a fixing agent cites these.
Sections, top-heavy (summary + map first, detail last) -- practice the pyramid you preach:
1. Summary table: ID | severity | document | one-line issue | evidence label.
2. Doc map: current vs proposed. Proposed tree = purpose + audience per doc + the splits/merges from hunt #3; a maintainer executes it directly. Include migration notes: per moved/renamed/merged doc, whether to leave a stub/redirect so inbound links survive.
3. Coverage accounting: audited snapshot (commit SHA + clean/dirty tree), toolchain/platform versions, documents/surfaces read fully, skimmed, excluded, commands/render checks run, blind spots.
4. Drift verification: each accuracy finding + exact check run or BLOCKED reason + result.
5. Findings by hunt category, severity order. Each: ID, document (file:line or heading), concrete reader scenario it breaks, evidence label, recommended direction. For Critical/High add an acceptance check -- the exact command or observation that fails now and passes once the doc is fixed.
6. Diagram backlog: processes/architecture needing a picture, value order; for the top 3-5 draft minimal Mermaid skeletons, naming target doc + location.
7. Missing-docs backlog: doc/section/example/diagram needed for full coverage + onboarding; prioritize by unblocking value.
8. What held up: short list of important docs or routes that already lead with the truth.
9. Open questions: maintainer-only.
Chat reply = short exec summary only: counts by severity/evidence + top 3-5 findings + report path. Rest lives in file.

Thorough over brief. Spend effort where the docs mislead, bury, or go silent; one line where they already lead with the truth. Prefer one strong finding over several weak ones; do not dilute serious issues with filler.
