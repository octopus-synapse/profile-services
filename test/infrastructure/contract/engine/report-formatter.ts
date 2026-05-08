import type { ReportDrift, RouteDriftReport } from './response-validator';
import { bcOf } from './route-classifier';

export function formatReport(reports: readonly RouteDriftReport[]): string {
  const totalDrifts = reports.reduce((sum, r) => sum + r.drifts.length, 0);
  const byBC = new Map<string, RouteDriftReport[]>();
  for (const r of reports) {
    const path = r.route.replace(/^[A-Z]+ /, '');
    const bc = bcOf(path);
    const arr = byBC.get(bc) ?? [];
    arr.push(r);
    byBC.set(bc, arr);
  }

  const lines: string[] = [];
  lines.push('# Response Drift Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Probed: ${reports.length} endpoints`);
  lines.push(`Total drifts: ${totalDrifts}`);
  lines.push('');

  for (const [bc, items] of [...byBC.entries()].sort()) {
    const bcDrifts = items.reduce((sum, r) => sum + r.drifts.length, 0);
    const bcErrors = items.reduce((sum, r) => sum + (r.error ? 1 : 0), 0);
    if (bcDrifts === 0 && bcErrors === 0) continue;
    lines.push(`## ${bc} (${bcDrifts} drifts)`);
    lines.push('');
    for (const r of items) {
      if (r.drifts.length === 0 && !r.error) continue;
      lines.push(`### ${r.route} → ${r.status} (persona=${r.persona})`);
      if (r.error) lines.push(`- error: ${r.error}`);
      for (const d of r.drifts) lines.push(formatDrift(d));
      lines.push('');
    }
  }

  if (totalDrifts === 0) {
    lines.push('All probed endpoints match their declared response schemas.');
  }
  return lines.join('\n');
}

function formatDrift(d: ReportDrift): string {
  const path = d.path.length > 0 ? d.path.join('.') : '<root>';
  switch (d.kind) {
    case 'extra-field':
      return `- extra field: \`${path}\` (runtime returned a key not declared in schema)`;
    case 'missing-field':
      return `- missing field: \`${path}\` (schema requires ${d.expected}, runtime omitted)`;
    case 'should-be-nullable':
      return `- should be nullable: \`${path}\` (runtime returned null, schema requires non-null)`;
    case 'should-be-optional':
      return `- should be optional: \`${path}\``;
    case 'type-mismatch':
      return `- type mismatch: \`${path}\` (schema=${d.expected}, runtime=${d.actual})`;
    case 'auth-mismatch':
      return `- auth mismatch: persona=\`${d.persona}\` got HTTP ${d.status} (swagger x-auth/x-permission disagrees with runtime guards)`;
  }
}
