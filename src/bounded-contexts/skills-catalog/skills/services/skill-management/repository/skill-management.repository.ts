import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { SectionItem, SkillItemRecord, SkillSection } from '../ports/skill-management.port';
import { SkillManagementPort } from '../ports/skill-management.port';
import type { ISkillManagementRepositoryPort } from '../ports/skill-management-repository.port';

const SKILL_SECTION_TYPE_KEY = 'skill_set_v1';

@Injectable()
export class SkillManagementRepository
  extends SkillManagementPort
  implements ISkillManagementRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  listSkills(): string[] {
    return [];
  }

  async resumeExists(resumeId: string): Promise<boolean> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { id: true },
    });
    return resume !== null;
  }

  async ensureSkillSection(resumeId: string): Promise<{ id: string }> {
    const sectionType = await this.prisma.sectionType.findUnique({
      where: { key: SKILL_SECTION_TYPE_KEY },
      select: { id: true },
    });

    if (!sectionType) {
      throw new Error(`SectionType '${SKILL_SECTION_TYPE_KEY}' not found`);
    }

    const existing = await this.prisma.resumeSection.findUnique({
      where: {
        resumeId_sectionTypeId: {
          resumeId,
          sectionTypeId: sectionType.id,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return existing;
    }

    const maxOrder = await this.prisma.resumeSection.aggregate({
      where: { resumeId },
      _max: { order: true },
    });

    const section = await this.prisma.resumeSection.create({
      data: {
        resumeId,
        sectionTypeId: sectionType.id,
        order: (maxOrder._max.order ?? -1) + 1,
      },
      select: { id: true },
    });

    return section;
  }

  async getNextOrderValue(sectionId: string): Promise<number> {
    const maxOrder = await this.prisma.sectionItem.aggregate({
      where: { resumeSectionId: sectionId },
      _max: { order: true },
    });
    return (maxOrder._max.order ?? -1) + 1;
  }

  async createSkillItem(
    sectionId: string,
    content: Record<string, unknown>,
    order: number,
  ): Promise<SkillItemRecord> {
    const item = await this.prisma.sectionItem.create({
      data: {
        resumeSectionId: sectionId,
        content: content as object,
        order,
      },
      select: { id: true, order: true, content: true },
    });
    return item;
  }

  async findSkillSectionWithItems(resumeId: string): Promise<SkillSection | null> {
    const sectionType = await this.prisma.sectionType.findUnique({
      where: { key: SKILL_SECTION_TYPE_KEY },
      select: { id: true },
    });

    if (!sectionType) {
      return null;
    }

    const section = await this.prisma.resumeSection.findUnique({
      where: {
        resumeId_sectionTypeId: {
          resumeId,
          sectionTypeId: sectionType.id,
        },
      },
      include: {
        items: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            order: true,
            content: true,
            resumeSection: {
              select: {
                resumeId: true,
                sectionType: { select: { key: true } },
              },
            },
          },
        },
      },
    });

    if (!section) {
      return null;
    }

    return {
      id: section.id,
      items: section.items,
    };
  }

  async findSkillById(skillId: string): Promise<SectionItem | null> {
    const item = await this.prisma.sectionItem.findUnique({
      where: { id: skillId },
      select: {
        id: true,
        order: true,
        content: true,
        resumeSection: {
          select: {
            resumeId: true,
            sectionType: { select: { key: true } },
          },
        },
      },
    });
    return item;
  }

  async updateSkillContent(
    skillId: string,
    content: Record<string, unknown>,
  ): Promise<SkillItemRecord> {
    const item = await this.prisma.sectionItem.update({
      where: { id: skillId },
      data: { content: content as object },
      select: { id: true, order: true, content: true },
    });
    return item;
  }

  async deleteSkill(skillId: string): Promise<void> {
    await this.prisma.sectionItem.delete({
      where: { id: skillId },
    });
  }
}
