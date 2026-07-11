# fable-audits

Adversarial audit prompts for coding agents. Point an agent at a repo and get a
severity-ordered, evidence-labeled findings report a fixing agent can execute —
not a vibe check.

Five audits, one orchestrator, one fixer:

| Spec | Scope | IDs | Report |
|---|---|---|---|
| `commands/audit-codebase.md` | whole repo — correctness, design, affordances, tests, DX | C | `docs/audits/codebase-audit-<date>.md` |
| `commands/audit-docs.md` | whole repo — drift, structure, coverage, findability | D | `docs/audits/docs-audit-<date>.md` |
| `commands/audit-process.md` | whole repo — end-to-end workflows, re-runs, recovery, agent/CI ergonomics | P | `docs/audits/process-audit-<date>.md` |
| `commands/audit-security.md` | whole repo — threat model, authn/authz, secrets, supply chain (defensive, own repo) | S | `docs/audits/security-audit-<date>.md` |
| `commands/audit-change.md` | one diff — working tree or `--base <ref>`; ship / needs-attention verdict | X | `docs/audits/change-audit-<date>.md` |
| `commands/audit-full.md` | orchestrator — one fresh subagent per audit, then one synthesized backlog | F | `docs/audits/fixes-backlog-<date>.md` |
| `commands/fix.md` | executes findings by ID — re-verify, fix, prove, ledger | — | `<report>-fixes-<date>.md`, next to its report |

Each spec is **self-contained**: plugin frontmatter plus the complete prompt
body in one file. Everything under `dev/` is repo machinery (schema, scripts,
fixtures, conventions) and never travels to a target project.

Orchestrated runs (`audit-full`) group all their artifacts in a run directory —
`docs/audits/<date>-<short-sha>/` — so several passes over the same project on
the same day stay separate and internally unambiguous. Standalone audits write
flat to `docs/audits/` with `-2`, `-3` collision suffixes.

## Install

**As a Claude Code plugin:**

```
/plugin marketplace add diegomarino/fable-audits
/plugin install fable-audits@fable-audits
```

Then `/fable-audits:audit-codebase`, `:audit-docs`, `:audit-process`,
`:audit-security`, `:audit-change --base origin/main`, `:audit-full`,
`:fix docs/audits/<report>.md`.

> If `marketplace add` fails with an SSH clone error, it's a known upstream
> Claude Code issue (defaults to SSH for public repos); clone over HTTPS and
> add the local path instead.

**As flat files (any harness):**

```bash
git clone --depth 1 https://github.com/diegomarino/fable-audits /tmp/_p \
  && mkdir -p .prompts && cp /tmp/_p/commands/*.md .prompts/ && rm -rf /tmp/_p
```

Then launch with the `/goal` pattern in [`_fable-audits.txt`](_fable-audits.txt) —
the launcher only names the file; the agent reads the spec body from disk
(frontmatter is ignorable outside Claude Code).

## How it works

- **Evidence labels, not confidence scores.** Every finding is CONFIRMED,
  PLAUSIBLE, BLOCKED (with the exact command that would have run), or NOT
  REPRODUCED. Labels survive synthesis; they are never averaged away.
- **Acceptance checks.** Critical/High findings carry the exact command or test
  that fails now and passes once fixed — findings are closable contracts.
- **Snapshot discipline.** Reports record the commit SHA and clean/dirty state;
  the full suite requires a clean tree by default and aborts on mid-suite drift.
- **Disprove first.** Auditors must try to kill each finding before reporting
  it, and prefer one strong finding over several weak ones.
- **Human-gated fixes.** Audits never mutate and never touch git. The backlog is
  a plan; `fix.md` is a separate invocation with its own outcomes ledger
  (FIXED / STALE / NOT REPRODUCED / BLOCKED / NEEDS-DECISION / DECLINED).
- **Machine-readable sidecars.** Every report ships a `*.findings.json`
  (see `dev/findings.schema.json`) so validation and fixing are scriptable.

The canonical statement of these invariants lives in
[`dev/conventions.md`](dev/conventions.md);
`dev/scripts/lint-prompts.mjs` enforces that every spec still carries them.

## Development

```bash
node dev/scripts/lint-prompts.mjs                                    # specs carry the canon
node dev/scripts/validate-report.mjs dev/fixtures/codebase-audit-2026-01-01.md   # validator self-test
```

Both run in CI. Change policy: edit the conventions file first, propagate to
the prompts, keep the lint green.

## Roadmap

- Fix-confidence badge on recommendations (pending a reconciliation rule with
  `fable-fix`'s NEEDS-DECISION outcome).
- Falsifiable-prediction format for PLAUSIBLE findings.
- Accepted-risks registry — only with prompt-injection hardening (structured
  data read as data, never as instruction).
- Router and per-repo setup skills; ALLOW/BLOCK gate variant for Stop hooks/CI.
- Migrate `commands/` to the newer `skills/` plugin layout when it stabilizes
  (commands remain fully supported today).

## Acknowledgments

The methodology here was sharpened against two excellent public repos:
[openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc)
(Apache-2.0 — the cost-of-failure attack surface, finding calibration, and the
"one strong finding" discipline echo its adversarial-review prompt) and
[mattpocock/skills](https://github.com/mattpocock/skills) (MIT — completion
criteria, test anti-pattern "tells", and skill-authoring theory). A few
one-line formulations are adapted nearly verbatim under those licenses; the
rest is convergent inspiration, deliberately not imported.

## License

MIT — see [LICENSE](LICENSE).
