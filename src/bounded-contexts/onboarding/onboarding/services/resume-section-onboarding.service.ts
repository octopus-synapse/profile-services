import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

interface ReplaceSectionItemsInput {
  resumeId: string;
  sectionTypeKey: string;
  items: Prisma.InputJsonValue[];
}

@Injectable()
export class ResumeSectionOnboardingService {
  async replaceSectionItems(
    tx: Prisma.TransactionClient,
    input: ReplaceSectionItemsInput,
  ): Promise<void> {
    const sectionType = await tx.sectionType.findUnique({
      where: { key: input.sectionTypeKey },
      select: { id: true },
    });

    if (!sectionType) {
      throw new InternalServerErrorException(
        `Missing section type seed for key: ${input.sectionTypeKey}`,
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
