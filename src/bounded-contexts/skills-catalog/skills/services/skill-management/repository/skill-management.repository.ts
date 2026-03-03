import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { SectionItem } from '../ports/skill-management.port';
import { SkillManagementRepositoryPort } from '../ports/skill-management.port';

const SKILL_SECTION_TYPE_KEY = 'skill_set_v1';

export class SkillManagementRepository extends SkillManagementRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async resumeExists(resumeId: string): Promise<boolean> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { id: true },
    });
    return resume !== null;
  }

  async findSkillSectionWithItems(resumeId: string): Promise<{
    items: { id: string; order: number; content: unknown }[];
  } | null> {
    return this.prisma.resumeSection.findFirst({
      where: {
        resumeId,
        sectionType: { key: SKILL_SECTION_TYPE_KEY },
      },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async ensureSkillSection(resumeId: string): Promise<{ id: string }> {
    const sectionType = await this.prisma.sectionType.findUnique({
      where: { key: SKILL_SECTION_TYPE_KEY },
      select: { id: true },
    });

    if (!sectionType) {
      throw new Error('Skill section type not found');
    }

    return this.prisma.resumeSection.upsert({
      where: {
        resumeId_sectionTypeId: {
          resumeId,
          sectionTypeId: sectionType.id,
        },
      },
      update: {},
      create: {
        resumeId,
        sectionTypeId: sectionType.id,
      },
      select: { id: true },
    });
  }

  async getNextOrderValue(resumeSectionId: string): Promise<number> {
    const lastSkill = await this.prisma.sectionItem.findFirst({
      where: { resumeSectionId },
      orderBy: { order: 'desc' },
    });
    return (lastSkill?.order ?? -1) + 1;
  }

  async createSkillItem(
    resumeSectionId: string,
    content: Record<string, unknown>,
    order: number,
  ): Promise<{ id: string; order: number; content: unknown }> {
    return this.prisma.sectionItem.create({
      data: {
        resumeSectionId,
        content: content as Prisma.InputJsonValue,
        order,
      },
      select: {
        id: true,
        order: true,
        content: true,
      },
    });
  }

  async findSkillById(skillId: string): Promise<SectionItem | null> {
    return this.prisma.sectionItem.findFirst({
      where: { id: skillId },
      include: {
        resumeSection: {
          select: {
            resumeId: true,
            sectionType: {
              select: { key: true },
            },
          },
        },
      },
    });
  }

  async updateSkillContent(
    skillId: string,
    content: Record<string, unknown>,
  ): Promise<{ id: string; order: number; content: unknown }> {
    return this.prisma.sectionItem.update({
      where: { id: skillId },
      data: { content: content as Prisma.InputJsonValue },
      select: {
        id: true,
        order: true,
        content: true,
      },
    });
  }

  async deleteSkill(skillId: string): Promise<void> {
    await this.prisma.sectionItem.delete({ where: { id: skillId } });
  }
}
