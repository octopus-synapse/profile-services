/**
 * Backfill heuristic for the new Job structured fields introduced in P0.
 *
 * Reads all existing rows (including inactive — recruiters may reactivate them)
 * and infers `paymentCurrency` / `remotePolicy` from the free-form `salaryRange`
 * / `location` / `description`. Skips rows that already have a value so it's
 * safe to re-run.
 *
 * Run once after applying the migration:
 *
 *   bun run prisma/scripts/backfill-job-currency.ts
 *
 * The heuristic mirrors `apps/web/src/lib/jobs/is-usd-eur.ts` in the UI —
 * once this backfill lands the UI helper can be demoted to a display-only
 * concern.
 */

import type { PaymentCurrency, RemotePolicy } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { createPrismaClientOptions } from '../../src/bounded-contexts/platform/prisma/prisma-client-options';

const prisma = new PrismaClient(createPrismaClientOptions());

function inferCurrency(salaryRange: string | null): PaymentCurrency | null {
  if (!salaryRange) return null;
  const raw = salaryRange.trim();
  if (!raw) return null;

  // Strip any "R$" mentions first so a trailing bare "$" can only mean USD.
  const stripped = raw.replace(/R\$/gi, '');
  if (/EUR|€/i.test(stripped)) return 'EUR';
  if (/GBP|£/i.test(stripped)) return 'GBP';
  if (/USD|US\$/i.test(stripped)) return 'USD';
  if (/\$/.test(stripped) && !/R\$/i.test(raw)) return 'USD';
  if (/R\$|BRL|reais?/i.test(raw)) return 'BRL';
  return null;
}

function inferRemotePolicy(description: string, location: string | null): RemotePolicy | null {
  const haystack = `${location ?? ''} \n ${description}`.toLowerCase();
  if (/(^|\s)(hybrid|h[íi]brido|semi[- ]?presencial)/.test(haystack)) return 'HYBRID';
  if (/\b(remote|remoto|anywhere|worldwide)\b/.test(haystack)) return 'REMOTE';
  if (/\b(on[- ]?site|presencial|office[- ]?based)\b/.test(haystack)) return 'ONSITE';
  return null;
}

async function main() {
  console.log('🔍 Backfilling Job.paymentCurrency / remotePolicy …');

  const jobs = await prisma.job.findMany({
    where: {
      OR: [{ paymentCurrency: null }, { remotePolicy: null }],
    },
    select: {
      id: true,
      salaryRange: true,
      description: true,
      location: true,
      paymentCurrency: true,
      remotePolicy: true,
    },
  });

  let updated = 0;
  for (const job of jobs) {
    const data: { paymentCurrency?: PaymentCurrency; remotePolicy?: RemotePolicy } = {};

    if (!job.paymentCurrency) {
      const currency = inferCurrency(job.salaryRange);
      if (currency) data.paymentCurrency = currency;
    }

    if (!job.remotePolicy) {
      const policy = inferRemotePolicy(job.description, job.location);
      if (policy) data.remotePolicy = policy;
    }

    if (Object.keys(data).length > 0) {
      await prisma.job.update({ where: { id: job.id }, data });
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} / ${jobs.length} jobs`);
}

main()
  .catch((err) => {
    console.error('❌ Backfill failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
