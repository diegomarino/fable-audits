#!/usr/bin/env node
// Checks every command spec still carries the canonical invariants documented
// in dev/conventions.md. Markers are substrings, not exact blocks: specs
// tailor wording per domain, but the invariant must be present.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const SHARED = [
  'Leave uncommitted (maintainer owns git)',
  'suffix -2, -3',
  '.findings.json',
  'Chat reply = short exec summary',
];

const AUDIT = [
  ...SHARED,
  'CONFIRMED',
  'PLAUSIBLE',
  'BLOCKED',
  'NOT REPRODUCED',
  'state the exact command you would have run',
  'Try to disprove',
  'Final check before writing the report',
  'Prefer one strong finding over several weak ones',
];

const RULES = {
  'audit-codebase.md': [...AUDIT, '(C1, C2'],
  'audit-docs.md': [...AUDIT, '(D1, D2'],
  'audit-process.md': [...AUDIT, '(P1, P2'],
  'audit-security.md': [...AUDIT, '(S1, S2'],
  'audit-ux.md': [...AUDIT, '(U1, U2'],
  'audit-change.md': [...AUDIT, '(X1, X2'],
  'audit-full.md': [...SHARED, '(F1, F2', 'PARTIAL', 'fresh subagent'],
  'fix.md': [...SHARED, 'NEEDS-DECISION', 'acceptance check'],
};

let failures = 0;
for (const [file, markers] of Object.entries(RULES)) {
  let text;
  try {
    text = readFileSync(join(root, 'commands', file), 'utf8');
  } catch {
    console.error(`FAIL ${file}: file missing`);
    failures++;
    continue;
  }
  const missing = markers.filter((m) => !text.includes(m));
  if (missing.length) {
    failures++;
    console.error(`FAIL ${file}:`);
    for (const m of missing) console.error(`  missing invariant: ${JSON.stringify(m)}`);
  } else {
    console.log(`ok ${file}`);
  }
}
process.exit(failures ? 1 : 0);
