import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class AdminOnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async listSteps() {
    return this.prisma.onboardingStep.findMany({ orderBy: { order: 'asc' } });
  }

  async getStep(key: string) {
    return this.prisma.onboardingStep.findUnique({ where: { key } });
  }

  async createStep(body: Record<string, unknown>) {
    return this.prisma.onboardingStep.create({
      data: {
        key: body.key as string,
        order: body.order as number,
        component: body.component as string,
        icon: (body.icon as string) ?? '📄',
        required: (body.required as boolean) ?? false,
        sectionTypeKey: (body.sectionTypeKey as string) ?? null,
        fields: body.fields ?? [],
        translations: body.translations ?? {},
        validation: body.validation ?? {},
        strengthWeight: (body.strengthWeight as number) ?? 0,
        isActive: (body.isActive as boolean) ?? true,
      },
    });
  }

  async updateStep(key: string, body: Record<string, unknown>) {
    const data: Record<string, unknown> = {};
    if (body.order !== undefined) data.order = body.order;
    if (body.component !== undefined) data.component = body.component;
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.required !== undefined) data.required = body.required;
    if (body.sectionTypeKey !== undefined) data.sectionTypeKey = body.sectionTypeKey;
    if (body.fields !== undefined) data.fields = body.fields;
    if (body.translations !== undefined) data.translations = body.translations;
    if (body.validation !== undefined) data.validation = body.validation;
    if (body.strengthWeight !== undefined) data.strengthWeight = body.strengthWeight;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    return this.prisma.onboardingStep.update({ where: { key }, data });
  }

  async deleteStep(key: string) {
    await this.prisma.onboardingStep.delete({ where: { key } });
  }

  async getConfig() {
    return this.prisma.onboardingConfig.findUnique({ where: { key: 'default' } });
  }

  async updateConfig(body: Record<string, unknown>) {
    return this.prisma.onboardingConfig.upsert({
      where: { key: 'default' },
      update: { strengthLevels: body.strengthLevels ?? [] },
      create: { key: 'default', strengthLevels: body.strengthLevels ?? [] },
    });
  }

  async getStats() {
    const [totalStarted, totalCompleted, allProgress] = await Promise.all([
      this.prisma.onboardingProgress.count(),
      this.prisma.user.count({ where: { hasCompletedOnboarding: true } }),
      this.prisma.onboardingProgress.findMany({
        select: { currentStep: true, completedSteps: true },
      }),
    ]);

    const completionRate = totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0;

    const dropOffByStep: Record<string, number> = {};
    for (const progress of allProgress) {
      const step = progress.currentStep;
      dropOffByStep[step] = (dropOffByStep[step] ?? 0) + 1;
    }

    return { totalStarted, totalCompleted, completionRate, dropOffByStep };
  }
}
