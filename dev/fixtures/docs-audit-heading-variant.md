# Documentation audit — regression fixture — 2026-01-01

Reproduces the real-world report shape that the first live run emitted and the
original validator wrongly rejected: a `## N · Summary` heading (no literal
"table") and capitalized severity values. Must validate green.

Audited snapshot: `0123456789abcdef0123456789abcdef01234567` (main, clean tree).

## 1 · Summary

| ID | Severity | Document | Issue | Evidence |
| --- | --- | --- | --- | --- |
| D1 | High | `README.md:150` | Documented flag `--wait-timeout` renamed in code | CONFIRMED |
| D2 | Medium | `docs/release-checklist.md:26` | CI Node matrix drift | CONFIRMED |

## 2 · Coverage accounting

Audited snapshot commit `0123456789abcdef0123456789abcdef01234567`, clean tree. Node 22 on linux.
