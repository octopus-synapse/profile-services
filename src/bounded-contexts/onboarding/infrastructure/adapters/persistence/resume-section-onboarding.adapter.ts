/**
 * Resume Section Onboarding Adapter
 *
 * Prisma persistence logic for replacing section items during onboarding.
 * Moved from application/services/resume-section-onboarding.service.ts.
 */

import { InternalServerErrorException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { normalizeSectionTypeKey } from '@/shared-kernel/utils/section-type-key.util';

interface ReplaceSectionItemsInput {
  resumeId: string;
  sectionTypeKey: string;
  items: Prisma.InputJsonValue[];
}

export class ResumeSectionOnboardingAdapter {
  async replaceSectionItems(
    tx: Prisma.TransactionClient,
    input: ReplaceSectionItemsInput,
  ): Promise<void> {
    const sectionTypeKey = normalizeSectionTypeKey(input.sectionTypeKey);
    const sectionType = await tx.sectionType.findUnique({
      where: { key: sectionTypeKey },
      select: { id: true },
    });

    if (!sectionType) {
      throw new InternalServerErrorException(
        `Missing section type seed for key: ${sectionTypeKey}`,
      );
    }

    const resumeSection = await tx.resumeSection.upsert({
      where: {
        resumeId_sectionTypeId: {
          resumeId: input.resumeId,
          sectionTypeId: sectionType.id,
        },
      },
      update: {},
      create: {
        resumeId: input.resumeId,
        sectionTypeId: sectionType.id,
      },
      select: { id: true },
    });

    await tx.sectionItem.deleteMany({
      where: { resumeSectionId: resumeSection.id },
    });

    if (input.items.length === 0) {
      return;
    }

    await tx.sectionItem.createMany({
      data: input.items.map((content, order) => ({
        resumeSectionId: resumeSection.id,
        content,
        order,
      })),
    });
  }
}
