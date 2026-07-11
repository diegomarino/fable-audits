# Codebase audit -- 2026-01-01

## 1. Summary table

| ID | Severity | Area | Issue | Location | Evidence |
|----|----------|------|-------|----------|----------|
| C1 | High | parser | Off-by-one drops the last record of every batch | src/parse.js:42 | CONFIRMED |
| C2 | Medium | config | Default retry count contradicts documented value | src/config.js:7 | PLAUSIBLE |

## 2. System map

Single entry point `src/cli.js` [CONFIRMED] dispatching to the parser and writer modules. Invariant: every ingested record is written exactly once [CONFIRMED via C1 counterexample -- currently violated].

## 3. Coverage accounting

Audited snapshot: commit 0123456789abcdef0123456789abcdef01234567, clean tree. Node 22.1.0 on linux. Read fully: src/ (14 files), tests/ (6 files). Skimmed: none. Excluded: node_modules (vendored). Commands run: npm test. Blind spots: none.

## 4. Findings

### C1 -- Off-by-one drops the last record (High, CONFIRMED)

Scenario: a 100-record batch writes 99 records; the loop at src/parse.js:42 uses `i < n - 1`.
Reachability: public entry point (CLI ingest path).
Acceptance check: `node --test tests/parse.test.js` fails today on the batch-size case; passes once the bound is fixed.
Recommended direction: fix the loop bound; add the batch-boundary regression test.

### C2 -- Default retry contradicts docs (Medium, PLAUSIBLE)

Scenario: README promises 3 retries on transient failure; src/config.js:7 sets 1. Not reproduced end-to-end (no fault-injection fixture available).
Recommended direction: align the default with the docs, or fix the docs if 1 is intentional (route to a docs audit).

## 5. What held up

The writer module's exactly-once contract survived scrutiny on the non-boundary path.

## 6. Open questions

Is retry=1 an intentional post-incident change?
