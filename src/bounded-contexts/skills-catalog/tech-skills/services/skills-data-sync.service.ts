/**
 * Skills Data Sync Service
 * Single Responsibility: Sync tech skills to database
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ParsedSkill } from '../interfaces';

@Injectable()
export class SkillsDataSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async syncSkills(skills: ParsedSkill[]): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const skill of skills) {
      const nicheId = await this.findNicheId(skill.nicheSlug ?? undefined);
      const existing = await this.prisma.techSkill.findUnique({
        where: { slug: skill.slug },
      });

      const data = {
        nameEn: skill.nameEn,
        namePtBr: skill.namePtBr,
        type: skill.type,
        nicheId,
        color: skill.color,
        icon: skill.icon,
        website: skill.website,
        aliases: skill.aliases,
        keywords: skill.keywords,
        popularity: skill.popularity,
      };

      if (existing) {
        await this.prisma.techSkill.update({
          where: { slug: skill.slug },
          data,
        });
        updated++;
      } else {
        await this.prisma.techSkill.create({
          data: { slug: skill.slug, ...data },
        });
        inserted++;
      }
    }

    return { inserted, updated };
  }

  private async findNicheId(nicheSlug?: string): Promise<string | undefined> {
    if (!nicheSlug) return undefined;

    const niche = await this.prisma.techNiche.findUnique({
      where: { slug: nicheSlug },
    });

    return niche?.id ?? undefined;
  }
}
