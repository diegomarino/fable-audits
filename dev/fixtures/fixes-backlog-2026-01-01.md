# Fixes backlog -- 2026-01-01

Run header: snapshot 0123456789abcdef0123456789abcdef01234567, clean tree. Audits run: codebase, docs. Failed: none. Skipped: process, security (user selection). Model: sonnet, effort high, sequential. No drift events.

## 1. Summary table

| ID | Severity | Issue | Cited | Provenance |
|----|----------|-------|-------|------------|
| F1 | High | Off-by-one drops the last record of every batch | C1, D2 | confirmed via C1; D2 corroborating, plausible |

## 2. Backlog

### F1 -- Off-by-one drops the last record (High)

Behavioral description: batch ingestion silently loses the final record of every batch.
Cited: C1 (CONFIRMED), D2 (PLAUSIBLE). File evidence: src/parse.js:42.
Acceptance check: `node --test tests/parse.test.js` fails on the batch-boundary case; passes once fixed.
Fix grouping: standalone.

## 3. Conflicts

None.

## 4. Cross-audit patterns

Ingestion boundary handling was flagged independently by both audits.

## 5. What held up

Writer module contract (codebase); quickstart accuracy (docs).

## 6. Open questions

None.
