#!/usr/bin/env bun
/**
 * Ops CLI: relatório de eventos `AuditLogLost` (audit rows que não
 * persistiram em `AuditLog` por FK race contra delete do User).
 *
 * Saída agregada por (action, reason) na janela de tempo configurável
 * via `--since=<ISO|24h|7d>`. Default: 24h.
 *
 * Uso:
 *   bun scripts/ops/audit-log-lost-summary.ts                # últimas 24h
 *   bun scripts/ops/audit-log-lost-summary.ts --since=7d     # últimos 7 dias
 *   bun scripts/ops/audit-log-lost-summary.ts --since=2026-05-01T00:00:00Z
 *   bun scripts/ops/audit-log-lost-summary.ts --json         # output programático
 *
 * Intent: review humano diário. Em conjunto com `AuditLogPort.persistLostAudit`
 * dá ao operador visibilidade do que escapou do strict path. Cada linha
 * lista quantos eventos perdidos por (action × reason); use o
 * `eventPayload` em queries SQL diretas para reconstruir o evento.
 */

import { PrismaClient } from '@prisma/client';
import { createPrismaClientOptions } from '@/bounded-contexts/platform/prisma/prisma-client-options';

interface CliArgs {
  since: Date;
  json: boolean;
}

function parseSince(raw: string | undefined): Date {
  if (!raw) {
    const d = new Date();
    d.setHours(d.getHours() - 24);
    return d;
  }
  const shortMatch = raw.match(/^(\d+)([hd])$/);
  if (shortMatch) {
    const n = parseInt(shortMatch[1], 10);
    const unit = shortMatch[2];
    const d = new Date();
    if (unit === 'h') d.setHours(d.getHours() - n);
    else d.setDate(d.getDate() - n);
    return d;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid --since value: ${raw}. Use ISO date, '24h' or '7d'.`);
  }
  return parsed;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const since = parseSince(args.find((a) => a.startsWith('--since='))?.slice('--since='.length));
  const json = args.includes('--json');
  return { since, json };
}

interface BucketRow {
  action: string;
  reason: string;
  count: number;
  oldest: Date;
  newest: Date;
}

async function buildSummary(prisma: PrismaClient, since: Date): Promise<BucketRow[]> {
  const rows = await prisma.auditLogLost.findMany({
    where: { attemptedAt: { gte: since } },
    select: { action: true, reason: true, attemptedAt: true },
  });
  const buckets = new Map<string, BucketRow>();
  for (const r of rows) {
    const key = `${r.action}::${r.reason}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      if (r.attemptedAt < existing.oldest) existing.oldest = r.attemptedAt;
      if (r.attemptedAt > existing.newest) existing.newest = r.attemptedAt;
    } else {
      buckets.set(key, {
        action: r.action,
        reason: r.reason,
        count: 1,
        oldest: r.attemptedAt,
        newest: r.attemptedAt,
      });
    }
  }
  return [...buckets.values()].sort((a, b) => b.count - a.count);
}

function formatTable(rows: BucketRow[], since: Date): string {
  if (rows.length === 0) {
    return `[audit-log-lost-summary] zero eventos em janela since ${since.toISOString()}`;
  }
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const lines: string[] = [];
  lines.push(`audit-log-lost-summary — janela: since ${since.toISOString()}`);
  lines.push(`total de eventos perdidos: ${total}`);
  lines.push('');
  lines.push(
    `${'count'.padStart(6)}  ${'action'.padEnd(28)}  ${'reason'.padEnd(40)}  oldest → newest`,
  );
  lines.push('-'.repeat(110));
  for (const r of rows) {
    lines.push(
      `${String(r.count).padStart(6)}  ${r.action.padEnd(28)}  ${r.reason.padEnd(40)}  ${r.oldest.toISOString()} → ${r.newest.toISOString()}`,
    );
  }
  lines.push('');
  lines.push(
    'Para inspecionar payload de um evento:\n' +
      '  bun run prisma db execute --stdin <<<"SELECT * FROM AuditLogLost WHERE action = $1 ORDER BY attemptedAt DESC LIMIT 5;"',
  );
  return lines.join('\n');
}

async function main(): Promise<void> {
  const { since, json } = parseArgs();
  const prisma = new PrismaClient(createPrismaClientOptions());
  try {
    const rows = await buildSummary(prisma, since);
    if (json) {
      console.log(JSON.stringify({ since: since.toISOString(), buckets: rows }, null, 2));
    } else {
      console.log(formatTable(rows, since));
    }
  } finally {
    await prisma.$disconnect();
  }
}

await main();
