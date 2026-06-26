/**
 * Backfill the intern employment-type invariant onto existing data.
 *
 * A role tagged INTERN is an internship, so its employmentType must be
 * "Internship" (work experience) / its jobType must be INTERNSHIP (internal
 * jobs). New writes are guarded by InvalidEmploymentTypeForInternRoleException;
 * this fixes rows created before the rule existed.
 *
 * The intern signal is STRUCTURED, never a string-match on the title:
 *   - work experience: content.roleSeniority === 'INTERN', OR the role's
 *     folded label matches a curated INTERN RoleTitle (so legacy items saved
 *     before roleSeniority existed are still caught);
 *   - internal jobs: the folded title matches a curated INTERN RoleTitle.
 * External listings (JSearch) are deliberately left untouched.
 *
 * Prereqs: run `bun run roles:import --source=curated` first so the curated
 * INTERN titles exist. Idempotent — a second run reports 0 changes.
 *
 *   bun run prisma/scripts/backfill-internship-employment-type.ts
 */

import { PrismaClient } from '@prisma/client';
import { createPrismaClientOptions } from '../../src/bounded-contexts/platform/prisma/prisma-client-options';
import { foldRoleText } from '../../src/bounded-contexts/roles/domain/services/role-search-ranking';

const prisma = new PrismaClient(createPrismaClientOptions());

const INTERNSHIP_LABEL = 'INTERNSHIP'; // canonical JobType employmentType value

async function loadInternLabelSet(): Promise<Set<string>> {
  const rows = await prisma.roleTitle.findMany({
    where: { seniority: 'INTERN' },
    select: { normalizedLabel: true },
  });
  return new Set(rows.map((r) => r.normalizedLabel));
}

async function backfillWorkExperience(internLabels: Set<string>): Promise<void> {
  const items = await prisma.sectionItem.findMany({
    where: { resumeSection: { sectionType: { semanticKind: 'WORK_EXPERIENCE' } } },
    select: { id: true, content: true },
  });

  let scanned = 0;
  let updated = 0;
  for (const item of items) {
    if (!item.content || typeof item.content !== 'object' || Array.isArray(item.content)) continue;
    scanned++;
    const content = item.content as Record<string, unknown>;
    const role = typeof content.role === 'string' ? content.role : '';
    const isIntern =
      content.roleSeniority === 'INTERN' ||
      (role.length > 0 && internLabels.has(foldRoleText(role)));
    if (!isIntern) continue;

    const next: Record<string, unknown> = { ...content };
    let changed = false;
    if (next.roleSeniority !== 'INTERN') {
      next.roleSeniority = 'INTERN';
      changed = true;
    }
    if (next.employmentType !== INTERNSHIP_LABEL) {
      const from = typeof next.employmentType === 'string' ? next.employmentType : '∅';
      next.employmentType = INTERNSHIP_LABEL;
      changed = true;
      console.log(`  · experience ${item.id}: "${role}" employmentType ${from} → Internship`);
    }
    if (changed) {
      await prisma.sectionItem.update({ where: { id: item.id }, data: { content: next } });
      updated++;
    }
  }
  console.log(`✅ work experience: ${updated} / ${scanned} intern items normalized`);
}

async function backfillInternalJobs(internLabels: Set<string>): Promise<void> {
  // Internal jobs only (external JSearch listings live in ExternalJobListing).
  const jobs = await prisma.job.findMany({
    where: { jobType: { not: 'INTERNSHIP' } },
    select: { id: true, title: true, jobType: true },
  });

  let updated = 0;
  for (const job of jobs) {
    if (!internLabels.has(foldRoleText(job.title))) continue;
    console.log(`  · job ${job.id}: "${job.title}" jobType ${job.jobType} → INTERNSHIP`);
    await prisma.job.update({ where: { id: job.id }, data: { jobType: 'INTERNSHIP' } });
    updated++;
  }
  console.log(`✅ internal jobs: ${updated} intern titles normalized to INTERNSHIP`);
}

async function main(): Promise<void> {
  console.log('🔧 Backfilling intern → Internship invariant …');
  const internLabels = await loadInternLabelSet();
  if (internLabels.size === 0) {
    console.warn(
      '⚠️  No curated INTERN RoleTitles found — run `roles:import --source=curated` first ' +
        '(continuing with the roleSeniority field signal only).',
    );
  } else {
    console.log(`  ${internLabels.size} curated INTERN titles loaded as the match signal`);
  }
  await backfillWorkExperience(internLabels);
  await backfillInternalJobs(internLabels);
  console.log('🏁 Backfill complete.');
}

main()
  .catch((err) => {
    console.error('❌ Backfill failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
