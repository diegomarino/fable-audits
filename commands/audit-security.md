---
description: Security + supply-chain audit (defensive, own repo) -> docs/audits/security-audit-<date>.md
disable-model-invocation: true
---

Perform a system-level security and supply-chain audit of this project -- threat model first, then hunt. This audit owns cross-cutting exposure: secrets, authn/authz coverage, input-trust coverage, dependencies, CI/CD, and data handling. It does NOT re-litigate single code-level flaws: if a finding reduces to one source -> trust boundary -> sink chain in one spot, that belongs to a codebase audit -- cross-reference it and move on.

# Role
Act simultaneously as: an adversary mapping what this system exposes and to whom; a defensive security engineer who must justify every trust decision; and a supply-chain skeptic who treats every dependency, install script, and CI workflow as a liability until shown otherwise. This is a defensive audit of the maintainer's own project. No loyalty to current trust assumptions.

# Scope
Build the threat model before hunting:
- Assets: what is worth protecting -- data, credentials, tokens, signing keys, user content, the ability to publish/deploy.
- Surfaces: every way input or influence enters -- network, CLI args, env, parsed files, webhooks, IPC, install hooks, CI triggers.
- Actors: who reaches each surface -- anonymous, authenticated user, collaborator, maintainer, CI, third-party service.
- Trust boundaries: where data crosses from less-trusted to more-trusted context.
Then the supply chain: direct and notable transitive dependencies, lockfiles, vendored code, install/postinstall scripts, CI/CD workflow definitions, release/publish mechanics.

Scope inventory before judging: surfaces enumerated, dependency manifests read, scanners run or BLOCKED, dirs excluded and why, known blind spots.

# Command safety
Prefer read-only inspection and local throwaway state. Do not run destructive, publishing, deploy, migration, credential-mutating, network-writing, or external-service-mutating commands. Never test exploits against real external systems. Inspect install/postinstall/build and other lifecycle scripts by reading them, never by executing them: do not run package installs or builds to observe script behavior, even in a throwaway directory. Read-only advisory lookups (npm audit, pip-audit, cargo audit, osv-scanner and equivalents) are allowed when available without credentials; otherwise mark BLOCKED and state the exact command you would have run.
Secrets discipline: report location + redacted fingerprint (format + first/last characters), NEVER the full value; do not copy secrets into the report, logs, or anywhere else.

# Evidence and severity
Evidence labels:
- CONFIRMED: verified against exact code, config, dependency manifest, command output, or advisory data.
- PLAUSIBLE: strong exposure path identified but not fully verified.
- BLOCKED: missing dependency, credential, scanner, platform, or unsafe command boundary.
- NOT REPRODUCED: investigated and discarded or contradicted by evidence.

Severity scale:
- Critical: exposed live secret, missing authz on a mutating/privileged operation, remote-input path to code execution, or supply-chain compromise vector requiring no user error.
- High: sensitive-data exposure, authz enforced only client-side, dependency pinned to a known-exploited vulnerability on a used path, CI workflow injectable by untrusted input.
- Medium: weak-but-unexploited-in-context crypto, vulnerable dependency version on an unused path, secrets in local state files with loose permissions, license conflict.
- Low: hygiene -- missing pinning, hardening gaps, noisy sensitive logging with no clear exposure.

# Hunt for
1. Secrets -- committed keys/tokens/passwords in code, config, examples, fixtures, state files, and git history (scan history for high-entropy strings and known key formats); secrets leaking into logs, error messages, crash dumps, or telemetry. Report redacted.
2. AuthN/AuthZ coverage -- build the matrix: operation x actor -> enforcement point (file:line). Hunt operations with no row, checks living only in UI/client, identity confusions (confused deputy), privilege granted by default.
3. Input-trust coverage -- for each surface in the threat model, where does validation actually happen vs. where is it assumed? Single flawed chains (deserialization, shell interpolation, path joins) belong to the codebase audit; what THIS audit owns is coverage: surfaces with no validation story at all.
4. Supply chain -- dependencies abandoned upstream; versions with known advisories (cite the advisory ID); missing/uncommitted lockfiles; install/postinstall scripts that execute code; unpinned third-party CI actions; CI workflows interpolating untrusted PR/issue content into run blocks; secrets exposed to jobs that don't need them; vendored code drifted from upstream with no provenance note.
5. Crypto misuse -- home-rolled primitives, broken hashes guarding something real (MD5/SHA-1 for integrity or passwords), hardcoded keys/IVs/salts, non-constant-time comparison of secrets, randomness from non-CSPRNG where it matters.
6. Data handling -- sensitive data written world-readable, kept forever with no cleanup story, shipped to telemetry/analytics, or crossing to third-party services undocumented.
7. License conflicts -- dependency licenses incompatible with the project's own license or distribution model.

# Method (threat model, then verify)
- Model first, hunt second: every finding names the asset at risk, the actor who reaches it, and the path between them. No asset/actor/path, no finding. State the blast radius and the concrete change that reduces the exposure.
- Quote the evidence: the manifest line, the workflow line, the advisory ID, the scanner output.
- Try to disprove each finding first; discard what doesn't survive. "Vulnerable version present" is not "vulnerable": check whether the code path is actually used before rating above Medium.
- Final check before writing the report: every finding is real exposure in this system's context rather than generic concern, tied to a concrete location, and actionable. Cut what fails.
- If this overlaps a codebase/docs/process audit, keep only findings where system-level or supply-chain evidence adds unique value; otherwise cross-reference the likely audit area.

# Output
Write full report -> docs/audits/security-audit-<YYYY-MM-DD>.md. Create dir if missing; if the filename already exists, suffix -2, -3... Read prior reports in docs/audits/ first, including <date>-<sha> run directories from orchestrated suites: mark persisting findings UNRESOLVED citing the prior report and ID; note previously reported findings now fixed. Leave uncommitted (maintainer owns git).
Alongside the report, write <report-path>.findings.json -- machine-readable sidecar: top level {audit: "security", snapshot: {sha, dirty}}, findings[] with one entry per finding {id, severity, evidence, issue, scenario, file, line_start, line_end, recommended_direction, acceptance_check (Critical/High only)}. Redaction rules apply to the sidecar exactly as to the report. Same finding set as the report: the sidecar serves validators and fixing agents, the markdown serves humans.
Every finding = stable ID within this report (S1, S2... severity order); a fixing agent cites these. An ID is the prefix plus a plain integer only -- never suffixed or compound (no S-NEW-1, no S1a); new findings just continue the sequence. In the sidecar, severity matches the report's wording (Critical/High/Medium/Low).
Sections, top-heavy (summary + model first, detail last):
1. Summary table: ID | severity | category | one-line issue | evidence label.
2. Threat model: assets, surfaces, actors, trust boundaries. Label load-bearing facts with evidence labels; a cross-audit synthesizer relies on them.
3. AuthN/AuthZ matrix: operation x actor -> enforcement point or MISSING.
4. Coverage accounting: audited snapshot (commit SHA + clean/dirty tree), toolchain/platform versions, scanners/advisory lookups run or BLOCKED, blind spots.
5. Findings by hunt category, severity order. Each: ID, file:line or manifest/workflow line, asset -> actor -> path, evidence label, recommended direction. For Critical/High add an acceptance check -- the exact command, scan, or observation that fails now and passes once fixed.
6. Supply-chain inventory: flagged dependencies/actions/scripts with why; clean ones in one line.
7. What held up: trust decisions that survived scrutiny.
8. Open questions: maintainer-only.
Chat reply = short exec summary only: counts by severity/evidence + top 3-5 findings + report path. Rest lives in file.

Thorough over brief. Spend effort where trust is assumed; one line where it is enforced. Prefer one strong finding over several weak ones; do not dilute serious issues with filler.
