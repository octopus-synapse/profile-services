import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import {
  type CreatePrimaryResumeInput,
  type ResumeMergeView,
  UserResumeShadowApplyPort,
} from '../../../application/ports/user-resume-shadow-apply.port';

export class PrismaUserResumeShadowApplyAdapter extends UserResumeShadowApplyPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger?: LoggerPort,
  ) {
    super();
  }

  async findUserPrimaryResumeId(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { primaryResumeId: true },
    });
    return user?.primaryResumeId ?? null;
  }

  async findResumeForMerge(resumeId: string): Promise<ResumeMergeView | null> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { primaryStack: true, jobTitle: true },
    });
    return resume ? { primaryStack: resume.primaryStack, jobTitle: resume.jobTitle } : null;
  }

  async patchResume(
    resumeId: string,
    patch: { primaryStack: string[]; jobTitle: string | null },
  ): Promise<void> {
    await this.prisma.resume.update({
      where: { id: resumeId },
      data: { primaryStack: patch.primaryStack, jobTitle: patch.jobTitle },
    });
  }

  async createPrimaryResume(userId: string, input: CreatePrimaryResumeInput): Promise<string> {
    try {
      const resume = await this.prisma.resume.create({
        data: {
          userId,
          title: input.title,
          primaryStack: input.primaryStack,
          jobTitle: input.jobTitle,
          contentPtBr: { sections: [] },
        },
        select: { id: true },
      });
      return resume.id;
    } catch (err) {
      this.logger?.error(`Failed to create primary resume for ${userId} from shadow payload`, {
        context: 'PrismaUserResumeShadowApplyAdapter',
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  }

  async setUserPrimaryResume(userId: string, resumeId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { primaryResumeId: resumeId },
    });
  }
}
