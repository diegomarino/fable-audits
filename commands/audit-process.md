---
description: End-to-end workflow/process audit -> docs/audits/process-audit-<date>.md
disable-model-invocation: true
---

Perform a process-level audit of this codebase's end-to-end workflows -- not a line-by-line code review, but an examination of whether the processes the product promises actually compose into complete, walkable journeys. Find holes, dead ends, missing transitions, and steps where a user or agent gets stranded.

# Role
Act as a product-minded staff engineer walking every documented journey three times: once as a first-time human user following only the docs, once as an autonomous agent chaining commands via exit codes, structured output, or documented machine-readable surfaces, and once as a non-interactive CI runner with no TTY and stdin closed. No loyalty to the current flows.

# Scope
Discover and walk the project's real user/developer/agent workflows. Start from the reader-facing docs and public entry points, then verify against code and command behavior. Include, when present:
- Onboarding: clean checkout/install -> health/preflight -> first successful local run -> required configuration -> green ready state.
- Primary lifecycle: create/import/ingest/initialize -> inspect/list/status -> modify/answer/approve/reject/apply -> terminal or durable state.
- Re-run lifecycle: run the same mutating command twice; re-run after input changes; run out of order; run after partial prior state.
- Output lifecycle: preview/dry-run -> apply/commit/write -> re-apply/idempotency -> cleanup/archive/delete, where supported.
- Publication/export/deploy/release lifecycle, only when safe to exercise locally without external mutation.
- Side processes: discovery/cache/index/state files, generated artifacts, validation, health/doctor/preflight, troubleshooting and recovery.
- Cross-process coherence: enumerate every persistent state a record/artifact/workflow item can occupy and check there is a documented command or API that moves each state forward. Check state-format versioning too: do persisted files carry a version stamp, and does anything migrate state written by an older version? No versioning at all is itself a finding.

Before judging, create a process coverage inventory:
- Docs, help text, scripts, package commands, CLIs, APIs, and config surfaces used to discover workflows.
- Throwaway workspaces/fixtures created and their initial state.
- Processes fully walked, partially walked, blocked, or intentionally skipped.
- Commands not run because they were unsafe, missing dependencies, or required external services.

# Command safety
Run mutating commands only inside throwaway workspaces, temp directories, or clearly isolated local fixtures. Do not run destructive, publishing, deploy, migration, credential-mutating, network-writing, or external-service-mutating commands against maintainer data or real external systems. If a useful check is unsafe or needs credentials, mark it BLOCKED and state the exact command you would have run.

Sending SIGINT/SIGTERM/SIGKILL to processes you spawned inside throwaway workspaces is safe and expected -- use it for interruption and recovery tests.

For concurrency checks, snapshot the relevant workspace files before and after, use throwaway workspaces only, and report whether corruption/state drift was observed. Do not run concurrency tests against maintainer data.

# Evidence and severity
Evidence labels:
- CONFIRMED: reproduced through an exact command sequence or verified from persisted state/output.
- PLAUSIBLE: traced in code/docs but not fully reproduced.
- BLOCKED: missing dependency, credential, fixture, platform, external service, or unsafe command boundary.
- NOT REPRODUCED: investigated and discarded or contradicted by evidence.

Severity scale:
- Critical: data loss, state corruption, unsafe publication/export/deploy, or impossible core workflow.
- High: user/agent stranded in a primary process, broken documented journey, wrong exit/structured-output contract for automation.
- Medium: incomplete lifecycle, inconsistent retry/second-call behavior, missing recovery path with workaround.
- Low: confusing docs/help, local ergonomics, naming, or minor process polish.

# Hunt for
- Dead ends: states with no exit command/API, fixable today only by hand-editing state files or private internals.
- Missing processes: steps that README, docs, specs, quickstarts, examples, or help text promise but no command/API implements.
- Re-run/second-call semantics: every mutating command run twice, out of order, and against a half-completed prior run.
- Agent ergonomics: exit-code semantics per flow; can an agent distinguish "my operation failed" from "unrelated warning elsewhere"? Are JSON/structured-output contracts stable? Do help text and actual flags match? Is error output parseable? Run key commands with stdin closed and no TTY: anything that blocks on a prompt, spawns a pager, or opens $EDITOR strands every CI pipeline and agent.
- Docs/process drift: walk the documented flows command-by-command against reality.
- Concurrency: two safe local invocations against the same throwaway workspace for workflows that claim or imply shared-state safety.
- Recovery: partial failure, interrupted command, invalid input, missing dependency, corrupt local state, or deleted generated file. Is there a documented recovery path?
- Missing-config behavior: for each required env var/config key, run once with it absent and grade the failure -- does the error name the missing key and how to set it, or fail obscurely three steps later?

# Method
- Build real throwaway workspaces or fixtures. Keep all generated state local and disposable.
- For each process, record: initial state -> command(s)/API calls -> expected transition -> observed transition -> persisted files or external surfaces changed -> exit code/stdout/stderr/structured-output contract.
- Every finding needs the exact command sequence to reproduce and the resulting state/output.
- Every finding must answer: what strands the user or agent, why the flow breaks there, what it costs, and the concrete change that unblocks it.
- Try to disprove each finding before reporting; discard what does not survive.
- Final check before writing the report: every finding strands someone concretely, cites a reproducible command sequence, and is actionable. Cut what fails.
- If this overlaps a codebase/docs audit, keep only findings where end-to-end workflow evidence adds unique value; otherwise cross-reference the likely audit area.

# Output
Write full report -> docs/audits/process-audit-<YYYY-MM-DD>.md. Create dir if missing; if the filename already exists, suffix -2, -3... Read prior reports in docs/audits/ first, including <date>-<sha> run directories from orchestrated suites: mark persisting findings UNRESOLVED citing the prior report and ID; note previously reported findings now fixed. Leave uncommitted (maintainer owns git).
Alongside the report, write <report-path>.findings.json -- machine-readable sidecar: top level {audit: "process", snapshot: {sha, dirty}}, findings[] with one entry per finding {id, severity, evidence, issue, scenario, file (or omit when the location is a command sequence), line_start, line_end, recommended_direction, acceptance_check (Critical/High only)}. Same finding set as the report: the sidecar serves validators and fixing agents, the markdown serves humans.
Every finding = stable ID within this report (P1, P2... severity order); a fixing agent cites these. An ID is the prefix plus a plain integer only -- never suffixed or compound (no P-NEW-1, no P1a); new findings just continue the sequence. In the sidecar, severity matches the report's wording (Critical/High/Medium/Low).
Sections, top-heavy (summary + map first, detail last):
1. Summary table: ID | severity | process | one-line issue | evidence label.
2. Process map: real workflow/state machine (states, transitions, owning command/API); mark dead ends + unreachable states. Render as a Mermaid stateDiagram by default; fall back to prose plus a simpler diagram only when the flow is too branched or artifact-heavy for clean stateDiagram syntax, and say so. Label load-bearing facts (entry points, states, transitions) with evidence labels; a cross-audit synthesizer relies on them.
3. Process coverage accounting: audited snapshot (commit SHA + clean/dirty tree), toolchain/platform versions, workflows walked, fixtures used, commands run, commands blocked, blind spots.
4. Exit-code table: command x scenario -> observed exit code, consolidated from the walks.
5. Gaps/errors by process, severity order. Each: ID, file:line or command sequence, concrete stranded-user scenario, evidence label, recommended direction. For Critical/High add an acceptance check -- the exact command sequence that fails now and passes once fixed.
6. Missing-process backlog: command/API/flag/doc needed per documented journey to complete end-to-end; prioritize by unblocking value.
7. What held up: short list of flows or transitions that survived second-call/regression checks.
8. Open questions: maintainer-only.
Chat reply = short exec summary only: counts by severity/evidence + top 3-5 findings + report path. Rest lives in file.

Thorough over brief. Spend effort where flows break; one line where they hold. Prefer one strong finding over several weak ones; do not dilute serious issues with filler.
