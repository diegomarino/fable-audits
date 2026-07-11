---
description: Whole-repo adversarial codebase audit -> docs/audits/codebase-audit-<date>.md
disable-model-invocation: true
---

Perform an exhaustive, adversarial audit of this entire codebase -- surfacing not just defects but design incoherences, unexpected affordances, doc drift, and mismatches between what the code invites me to do and what it actually does.

# Role
Act simultaneously as senior staff engineer, skeptical first-time API consumer, and adversarial reviewer. No loyalty to the current design. Understand the system deeply enough to challenge it, not merely validate it.

# Scope
Read the codebase in full -- do not sample silently. Build a model of:
- Entry points and real (not documented) execution paths.
- Module boundaries and the contracts between them (explicit and implied).
- Data models, invariants, and where they're actually enforced vs. assumed.
- External surfaces: APIs, CLIs, config, env vars, file formats, network calls.
- The docs/onboarding path a newcomer would actually follow.

Before judging, create a scope inventory:
- Repo type, package managers, major entry points, public surfaces.
- Generated/vendor/build directories excluded and why.
- Test/fixture/example directories read, skimmed, or treated as evidence.
- Commands used to enumerate files and public surfaces.
- Known blind spots.

# Command safety
Prefer read-only inspection and commands that run in local throwaway state. Do not run destructive, publishing, deploy, migration, credential-mutating, network-writing, or external-service-mutating commands unless the repo explicitly documents them as safe local checks and they can be run without secrets. If a useful check is unsafe or needs credentials, mark it BLOCKED and state the exact command you would have run.

# Evidence and severity
Evidence labels:
- CONFIRMED: reproduced, traced end-to-end, or verified against exact code/docs/command output.
- PLAUSIBLE: strong path identified but not fully reproduced.
- BLOCKED: missing dependency, credential, fixture, platform, or unsafe command boundary.
- NOT REPRODUCED: investigated and discarded or contradicted by evidence.

Severity scale:
- Critical: data loss, security exposure, corruption, or impossible core workflow.
- High: wrong public behavior, broken contract, serious safety/DX trap.
- Medium: inconsistent behavior with workaround or limited blast radius.
- Low: clarity, maintainability, naming, or local polish.

# Hunt for (go beyond bugs)
1. Correctness -- logic errors, races, off-by-one, unhandled edges, silently swallowed failures, wrong error propagation. For race findings, first state the component's intended concurrency model (single-threaded, async event loop, multi-process, shared workers) and the exact interleaving that violates it; do not report races without that chain.
2. Alternative/unintended paths -- second call? concurrent calls? empty/null/huge input? partial failure mid-op? retries? the "holding it wrong" path?
3. Incoherences -- names that lie about behavior, two modules solving one problem differently, config honored here and ignored there, duplicated sources of truth that can drift, dead code, contradictory defaults.
4. Affordance mismatches -- "I expected to do X this way but can't, or it does something else." Where does the API shape promise a capability the code doesn't deliver? Where is the easy path also the dangerous one?
5. Missing functionality -- things a reasonable user expects (validation, idempotency, cleanup, observability, cancellation, timeouts, pagination/limits on unbounded result sets) but that are absent.
6. Boundary & safety -- leaky abstractions, invariants in the wrong layer, trust in unvalidated input crossing a boundary; injection, path traversal, unbounded growth, resource leaks, missing authz, exposed secrets, complexity that collapses on user-sized input (quadratic hot loops, N+1 calls, whole-file/whole-table loads into memory) -- only where real. For security findings, include source -> trust boundary -> sink -> exploit/failure scenario; do not report generic concerns without that chain.
7. Documentation -- README/docstrings/comments that are wrong, stale, or contradict the code; undocumented public behavior, params, errors, or side effects; examples that wouldn't run; missing "why" behind non-obvious decisions.
8. Developer experience -- can a newcomer build, run, test, and debug from the docs alone? Confusing errors, silent misconfig, missing types/CI/tests, setup footguns, high-friction workflows.
9. Test-suite confidence -- run the suite when safe: a red suite on a clean checkout is itself a finding. Hunt tautological tests that cannot fail, skipped/disabled tests (and how long they have been skipped), and traced critical paths with no covering test. Also hunt implementation-coupled tests (the tell: they break on refactor when behavior didn't change) and side-channel verification (asserting via internals or raw storage instead of the public interface). A critical path with no correct seam for a regression test is itself a finding -- name the missing seam. When code and docs disagree, use the tests to triangulate which behavior was intended.

# Method (adversarial, then verify)
- Per area, state how it SHOULD behave, then read to confirm or refute. Flag every expectation-vs-reality gap.
- Trace the top critical paths end-to-end, quoting the lines that matter. Check every doc example/command against the code when safe.
- Use git history to aim effort: churn hotspots, recent large merges, and aged TODO/FIXME clusters mark where to dig first. History targets the search; it is never evidence on its own.
- Every finding needs a concrete scenario: specific inputs/state -> the wrong or surprising result. No vague "could be improved." Each finding must answer: what can go wrong, why this path is vulnerable, the likely impact, and the concrete change that reduces the risk.
- Try to disprove each finding first; discard findings that don't survive scrutiny.
- Final check before writing the report: every finding is adversarial rather than stylistic, tied to a concrete location, plausible under a real failure scenario, and actionable. Cut what fails.
- If this overlaps a docs/process audit, keep only findings where codebase structure or implementation evidence adds unique value; otherwise cross-reference the likely audit area.

# Output
Write full report -> docs/audits/codebase-audit-<YYYY-MM-DD>.md. Create dir if missing; if the filename already exists, suffix -2, -3... Read prior reports in docs/audits/ first, including <date>-<sha> run directories from orchestrated suites: mark persisting findings UNRESOLVED citing the prior report and ID; note previously reported findings now fixed. Leave uncommitted (maintainer owns git).
Alongside the report, write <report-path>.findings.json -- machine-readable sidecar: top level {audit: "codebase", snapshot: {sha, dirty}}, findings[] with one entry per finding {id, severity, evidence, issue, scenario, file, line_start, line_end, recommended_direction, acceptance_check (Critical/High only)}. Same finding set as the report: the sidecar serves validators and fixing agents, the markdown serves humans.
Every finding = stable ID within this report (C1, C2... severity order); a fixing agent cites these. An ID is the prefix plus a plain integer only -- never suffixed or compound (no C-NEW-1, no C1a); new findings just continue the sequence. In the sidecar, severity matches the report's wording (Critical/High/Medium/Low).
Sections, top-heavy (summary + map first, detail last):
1. Summary table: ID | severity | area | one-line issue | file:line | evidence label.
2. System map: architecture, real execution paths, key invariants -- so I can check your understanding. Label load-bearing facts (entry points, paths, invariants) with evidence labels; a cross-audit synthesizer relies on them.
3. Coverage accounting: audited snapshot (commit SHA + clean/dirty tree), toolchain/platform versions, files/dirs read fully, skimmed, excluded, commands run, blind spots.
4. Findings by hunt category, severity order. Each: ID, file:line, one-line issue, concrete failure/surprise scenario (inputs/state -> wrong result), evidence label, recommended direction. For Critical/High add: reachability (public entry point vs internal misuse only) and an acceptance check -- the exact command, test, or observation that fails now and passes once fixed.
5. Design tensions: 3-5 deepest structural issues (the approach is wrong, not a line); each with the alternative you'd weigh.
6. Expectation gaps: short "expected X, found Y" list for affordance/docs/DX.
7. What held up: short list of important paths/contracts that survived scrutiny.
8. Open questions: what code alone can't resolve; maintainer answers.
Chat reply = short exec summary only: counts by severity/evidence + top 3-5 findings + report path. Rest lives in file.

Be thorough over brief. Prioritize insight density and specificity over reassurance. Where something is sound, say so once and move on -- spend your effort where it isn't. Prefer one strong finding over several weak ones; do not dilute serious issues with filler.
