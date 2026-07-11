# Codebase audit -- negative fixture: High finding without an acceptance check

## 1. Summary table

| ID | Severity | Area | Issue | Location | Evidence |
|----|----------|------|-------|----------|----------|
| C1 | High | parser | Off-by-one drops the last record | src/parse.js:42 | CONFIRMED |

## 2. Coverage accounting

Audited snapshot: commit 0123456789abcdef0123456789abcdef01234567, clean tree.
