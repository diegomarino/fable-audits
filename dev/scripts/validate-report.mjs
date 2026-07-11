#!/usr/bin/env node
// Validates an audit report and its .findings.json sidecar against the suite's
// output contract -- the scripted version of audit-full's Phase 2 semantic
// checks. Enum/pattern constraints are read from dev/findings.schema.json so
// the two cannot drift apart; the conditional rules (backlog provenance,
// change-audit snapshot identity) are mirrored in code and guarded by the
// negative fixtures in CI.
// Usage: validate-report.mjs <report.md> [sidecar.json]
import { readFileSync, existsSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const reportPath = process.argv[2];
if (!reportPath) {
  console.error('usage: validate-report.mjs <report.md> [sidecar.json]');
  process.exit(2);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const schema = JSON.parse(readFileSync(join(root, 'dev', 'findings.schema.json'), 'utf8'));
const EVIDENCE = schema.$defs.evidenceLabel.enum;
const SEVERITY = schema.$defs.severity.enum;
const AUDITS = schema.properties.audit.enum;
const ID_RE = new RegExp(schema.properties.findings.items.properties.id.pattern);
const LINE_MIN = schema.properties.findings.items.properties.line_start.minimum;

// Severity/evidence are compared case-insensitively: agents emit "High" (matching
// the prose scale) and evidence UPPERCASE, but neither casing should be load-bearing.
const SEV_SET = new Set(SEVERITY.map((s) => s.toLowerCase()));
const okSeverity = (v) => typeof v === 'string' && SEV_SET.has(v.toLowerCase());
const okEvidence = (v) => typeof v === 'string' && EVIDENCE.includes(v.toUpperCase());
const isHighSev = (v) => typeof v === 'string' && ['critical', 'high'].includes(v.toLowerCase());

const KIND = {
  'codebase-audit': { prefix: 'C', audit: 'codebase' },
  'docs-audit': { prefix: 'D', audit: 'docs' },
  'process-audit': { prefix: 'P', audit: 'process' },
  'security-audit': { prefix: 'S', audit: 'security' },
  'change-audit': { prefix: 'X', audit: 'change' },
  'fixes-backlog': { prefix: 'F', audit: 'backlog' },
};

const errors = [];
const md = readFileSync(reportPath, 'utf8');
const name = basename(reportPath);
const kindKey = Object.keys(KIND).find((k) => name.startsWith(k));
if (!kindKey) errors.push(`filename "${name}" matches no known report type (${Object.keys(KIND).join(', ')})`);
const kind = kindKey ? KIND[kindKey] : null;

// The summary table is the report's first section, so its rows are the first
// contiguous run of ID-prefixed table rows (| C1 | ... |). Scanning for that
// pattern rather than a literal "Summary table" heading tolerates heading
// variants (## 1. Summary table, ## 1 · Summary) while still skipping later
// tables (authz matrices, exit-code tables) whose row keys aren't ID-prefixed.
const lines = md.split('\n');
const ROW_RE = /^\|\s*([A-Z]+\d+)\s*\|/;
const rows = [];
let startedTable = false;
for (const l of lines) {
  if (ROW_RE.test(l)) { rows.push(l); startedTable = true; }
  else if (startedTable && !l.trimStart().startsWith('|')) break;
}
if (!rows.length) errors.push('no summary-table rows (| ID | ... |) found');
const ids = rows.map((l) => l.match(ROW_RE)[1]);

const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
if (dupes.length) errors.push(`duplicate finding IDs: ${dupes.join(', ')}`);

if (kind) {
  for (const id of ids) {
    if (!(id.startsWith(kind.prefix) && /^[1-9][0-9]*$/.test(id.slice(kind.prefix.length)))) {
      errors.push(`ID ${id} does not match expected prefix ${kind.prefix} for ${kindKey}`);
    }
  }
  // Backlog rows carry provenance prose; per-row evidence labels are required
  // only for the five audit report types.
  if (kind.audit !== 'backlog') {
    for (const l of rows) {
      if (!EVIDENCE.some((e) => l.toUpperCase().includes(e))) {
        errors.push(`summary row lacks an evidence label: ${l.slice(0, 70)}`);
      }
    }
  }
}

if (!/[0-9a-f]{7,40}/.test(md)) errors.push('no commit SHA found anywhere in the report');

const sidecarPath = process.argv[3] ?? `${reportPath}.findings.json`;
if (!existsSync(sidecarPath)) {
  errors.push(`sidecar missing: ${sidecarPath}`);
} else {
  let sc = null;
  try {
    sc = JSON.parse(readFileSync(sidecarPath, 'utf8'));
  } catch (e) {
    errors.push(`sidecar is not valid JSON: ${e.message}`);
  }
  if (sc) {
    if (!AUDITS.includes(sc.audit)) errors.push(`sidecar: audit "${sc.audit}" not in ${AUDITS.join('/')}`);
    if (kind && sc.audit !== kind.audit) errors.push(`sidecar audit "${sc.audit}" does not match report type "${kind.audit}"`);
    if (!sc.snapshot?.sha) errors.push('sidecar: missing snapshot.sha');
    if (kind?.audit === 'change' && !(sc.snapshot?.base_ref || sc.snapshot?.diff_checksum)) {
      errors.push('sidecar: change audit must record snapshot.base_ref or snapshot.diff_checksum');
    }
    if (!Array.isArray(sc.findings)) {
      errors.push('sidecar: "findings" must be an array');
    } else {
      const isBacklog = sc.audit === 'backlog';
      for (const f of sc.findings) {
        const where = f.id ?? '<no id>';
        if (!f.id || !ID_RE.test(f.id)) errors.push(`${where}: missing or malformed id`);
        if (!okSeverity(f.severity)) errors.push(`${where}: bad severity "${f.severity}"`);
        if (!f.issue) errors.push(`${where}: missing "issue"`);
        for (const k of ['line_start', 'line_end']) {
          if (f[k] !== undefined && !(Number.isInteger(f[k]) && f[k] >= LINE_MIN)) errors.push(`${where}: ${k} must be an integer >= ${LINE_MIN}`);
        }
        if (isBacklog) {
          if (!Array.isArray(f.evidence_provenance) || f.evidence_provenance.length === 0) {
            errors.push(`${where}: backlog entry needs evidence_provenance [{cited_id, evidence}] -- never one collapsed label`);
          } else {
            for (const p of f.evidence_provenance) {
              if (!p.cited_id || !okEvidence(p.evidence)) errors.push(`${where}: bad provenance entry ${JSON.stringify(p)}`);
            }
          }
          if (!Array.isArray(f.cited_ids) || !f.cited_ids.length) errors.push(`${where}: backlog entry needs cited_ids`);
          if (!f.behavioral_description) errors.push(`${where}: backlog entry needs behavioral_description`);
        } else if (!okEvidence(f.evidence)) {
          errors.push(`${where}: bad evidence "${f.evidence}"`);
        }
        if (isHighSev(f.severity) && !f.acceptance_check) {
          errors.push(`${where}: Critical/High finding without acceptance_check`);
        }
      }
      const scIds = sc.findings.map((f) => f.id).sort();
      const mdIds = [...ids].sort();
      if (JSON.stringify(scIds) !== JSON.stringify(mdIds)) {
        errors.push(`sidecar IDs [${scIds.join(', ')}] do not match report table IDs [${mdIds.join(', ')}]`);
      }
    }
  }
}

if (errors.length) {
  console.error(`FAIL ${reportPath}`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`ok ${reportPath} (${ids.length} findings)`);
