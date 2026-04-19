/**
 * Skill Endorsement Service
 *
 * One user endorses another user's skill (string match — skills are derived
 * from the endorsed user's resumes, no separate "user skill" entity exists).
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

export interface UserSkillSummary {
  skill: string;
  endorsementCount: number;
  endorsedByMe: boolean;
}

export interface EndorserInfo {
  id: string;
  name: string | null;
  username: string | null;
  photoURL: string | null;
  endorsedAt: Date;
}

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  photoURL: true,
} as const;

@Injectable()
export class SkillEndorsementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all skills the user has across resumes, with endorsement counts.
   * `endorsedByMe` is set when `viewerId` is provided (and is not the same user).
   */
  async getUserSkills(userId: string, viewerId?: string): Promise<UserSkillSummary[]> {
    const skills = await this.collectUserSkills(userId);
    if (skills.length === 0) return [];

    const { skillEndorsement } = this.prisma;

    const counts = await skillEndorsement.groupBy({
      by: ['skillName'],
      where: { endorsedUserId: userId, skillName: { in: skills } },
      _count: { _all: true },
    });
    const countMap = new Map(counts.map((c) => [c.skillName, c._count._all]));

    let viewerEndorsed = new Set<string>();
    if (viewerId && viewerId !== userId) {
      const mine = await skillEndorsement.findMany({
        where: {
          endorsedUserId: userId,
          endorserUserId: viewerId,
          skillName: { in: skills },
        },
        select: { skillName: true },
      });
      viewerEndorsed = new Set(mine.map((m) => m.skillName));
    }

    return skills.map((skill) => ({
      skill,
      endorsementCount: countMap.get(skill) ?? 0,
      endorsedByMe: viewerEndorsed.has(skill),
    }));
  }

  async endorse(
    endorsedUserId: string,
    skill: string,
    endorserUserId: string,
  ): Promise<{ skill: string; endorsementCount: number; endorsedByMe: boolean }> {
    if (endorsedUserId === endorserUserId) {
      // Self-endorsement is a no-op rather than an error — UI shouldn't even
      // call this, but better to fail soft than crash.
      const count = await this.countFor(endorsedUserId, skill);
      return { skill, endorsementCount: count, endorsedByMe: false };
    }

    const skillName = skill.trim();
    if (!skillName) {
      const count = await this.countFor(endorsedUserId, skill);
      return { skill, endorsementCount: count, endorsedByMe: false };
    }

    const { skillEndorsement } = this.prisma;
    await skillEndorsement.upsert({
      where: {
        endorsedUserId_skillName_endorserUserId: {
          endorsedUserId,
          skillName,
          endorserUserId,
        },
      },
      create: { endorsedUserId, skillName, endorserUserId },
      update: {},
    });

    const count = await this.countFor(endorsedUserId, skillName);
    return { skill: skillName, endorsementCount: count, endorsedByMe: true };
  }

  async withdraw(
    endorsedUserId: string,
    skill: string,
    endorserUserId: string,
  ): Promise<{ skill: string; endorsementCount: number; endorsedByMe: boolean }> {
    const skillName = skill.trim();
    const { skillEndorsement } = this.prisma;
    await skillEndorsement.deleteMany({
      where: { endorsedUserId, skillName, endorserUserId },
    });
    const count = await this.countFor(endorsedUserId, skillName);
    return { skill: skillName, endorsementCount: count, endorsedByMe: false };
  }

  async getEndorsers(
    endorsedUserId: string,
    skill: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: EndorserInfo[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skillName = skill.trim();
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;

    const { skillEndorsement } = this.prisma;
    const [endorsements, total] = await Promise.all([
      skillEndorsement.findMany({
        where: { endorsedUserId, skillName },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      skillEndorsement.count({
        where: { endorsedUserId, skillName },
      }),
    ]);

    if (endorsements.length === 0) {
      return {
        data: [],
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      };
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: endorsements.map((e) => e.endorserUserId) } },
      select: USER_SELECT,
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data: EndorserInfo[] = endorsements
      .map((e) => {
        const user = userMap.get(e.endorserUserId);
        if (!user) return null;
        return { ...user, endorsedAt: e.createdAt };
      })
      .filter((x): x is EndorserInfo => x !== null);

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  private async countFor(endorsedUserId: string, skill: string): Promise<number> {
    const { skillEndorsement } = this.prisma;
    return skillEndorsement.count({
      where: { endorsedUserId, skillName: skill.trim() },
    });
  }

  /**
   * Collect skill names from a user's resumes — primaryStack + items inside
   * SKILL-like sections. Mirrors the implementation in JobService.
   */
  private async collectUserSkills(userId: string): Promise<string[]> {
    const resumes = await this.prisma.resume.findMany({
      where: { userId },
      select: {
        primaryStack: true,
        resumeSections: {
          where: {
            sectionType: {
              semanticKind: { contains: 'SKILL', mode: 'insensitive' },
            },
          },
          select: {
            items: { select: { content: true } },
          },
        },
      },
    });

    const skills = new Set<string>();
    for (const resume of resumes) {
      for (const skill of resume.primaryStack ?? []) {
        if (typeof skill === 'string' && skill.trim()) skills.add(skill.trim());
      }
      for (const section of resume.resumeSections ?? []) {
        for (const item of section.items ?? []) {
          const content = item.content as Record<string, unknown> | null;
          const name = content?.name;
          if (typeof name === 'string' && name.trim()) skills.add(name.trim());
        }
      }
    }
    return [...skills];
  }
}
