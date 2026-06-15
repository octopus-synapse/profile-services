/**
 * Backfill section-content enum values from their old English display strings
 * to the canonical SCREAMING_CASE values (now validated by the seed enums and
 * localized via ENUM_DICTIONARY). Maps per section semanticKind + field key.
 *
 * Idempotent: a value already canonical (or unknown) is left untouched, so a
 * second run reports 0 changes. External listings are not section content, so
 * they're out of scope.
 *
 *   bun run prisma/scripts/backfill-section-enum-values.ts
 */

import { PrismaClient } from '@prisma/client';
import { createPrismaClientOptions } from '../../src/bounded-contexts/platform/prisma/prisma-client-options';

const prisma = new PrismaClient(createPrismaClientOptions());

/** semanticKind → fieldKey → { oldDisplayValue: CANONICAL }. */
const MIGRATIONS: Record<string, Record<string, Record<string, string>>> = {
  WORK_EXPERIENCE: {
    employmentType: {
      'Full-time': 'FULL_TIME',
      'Part-time': 'PART_TIME',
      Contract: 'CONTRACT',
      Internship: 'INTERNSHIP',
      Freelance: 'FREELANCE',
      Volunteer: 'VOLUNTEER',
    },
  },
  EDUCATION: {
    degreeType: {
      'High School': 'HIGH_SCHOOL',
      Technical: 'TECHNICAL',
      Bachelor: 'BACHELOR',
      Master: 'MASTER',
      Doctorate: 'DOCTORATE',
      Bootcamp: 'BOOTCAMP',
      'Self-taught': 'SELF_TAUGHT',
    },
    status: {
      'In Progress': 'IN_PROGRESS',
      Completed: 'COMPLETED',
      Paused: 'PAUSED',
      Dropped: 'DROPPED',
    },
  },
  OPEN_SOURCE: {
    role: { Maintainer: 'MAINTAINER', Contributor: 'CONTRIBUTOR', Creator: 'CREATOR' },
  },
  BUG_BOUNTY: {
    severity: { Low: 'LOW', Medium: 'MEDIUM', High: 'HIGH', Critical: 'CRITICAL' },
  },
  // LANGUAGE.level (A1…NATIVE) was already canonical — no mapping needed.
};

async function backfillKind(semanticKind: string, fieldMaps: Record<string, Record<string, string>>) {
  const items = await prisma.sectionItem.findMany({
    where: { resumeSection: { sectionType: { semanticKind } } },
    select: { id: true, content: true },
  });

  let updated = 0;
  for (const item of items) {
    if (!item.content || typeof item.content !== 'object' || Array.isArray(item.content)) continue;
    const content = item.content as Record<string, unknown>;
    const next = { ...content };
    let changed = false;
    for (const [fieldKey, map] of Object.entries(fieldMaps)) {
      const current = content[fieldKey];
      if (typeof current === 'string' && map[current]) {
        next[fieldKey] = map[current];
        changed = true;
        console.log(`  · ${semanticKind} ${item.id}: ${fieldKey} ${current} → ${map[current]}`);
      }
    }
    if (changed) {
      await prisma.sectionItem.update({ where: { id: item.id }, data: { content: next } });
      updated++;
    }
  }
  console.log(`✅ ${semanticKind}: ${updated} / ${items.length} items migrated`);
}

async function main() {
  console.log('🔧 Backfilling section enum values → SCREAMING_CASE …');
  for (const [semanticKind, fieldMaps] of Object.entries(MIGRATIONS)) {
    await backfillKind(semanticKind, fieldMaps);
  }
  console.log('🏁 Section enum backfill complete.');
}

main()
  .catch((err) => {
    console.error('❌ Backfill failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
