import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

export type Proficiency = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface UserSkillProficiency {
  skillName: string;
  proficiency: string;
  yearsOfExperience: number | null;
  updatedAt: Date;
}

@Injectable()
export class SkillProficiencyService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<UserSkillProficiency[]> {
    return this.prisma.userSkillProficiency.findMany({
      where: { userId },
      orderBy: { skillName: 'asc' },
      select: {
        skillName: true,
        proficiency: true,
        yearsOfExperience: true,
        updatedAt: true,
      },
    });
  }

  async setForUser(
    userId: string,
    skillName: string,
    proficiency: Proficiency,
    yearsOfExperience: number | null,
  ): Promise<{ skillName: string; proficiency: string }> {
    return this.prisma.userSkillProficiency.upsert({
      where: { userId_skillName: { userId, skillName } },
      create: { userId, skillName, proficiency, yearsOfExperience },
      update: { proficiency, yearsOfExperience },
      select: { skillName: true, proficiency: true },
    });
  }

  async clearForUser(userId: string, skillName: string): Promise<void> {
    await this.prisma.userSkillProficiency.deleteMany({
      where: { userId, skillName },
    });
  }
}
