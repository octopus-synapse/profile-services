import { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { OnboardingStepNotCompletedException } from '../domain/exceptions/onboarding.exceptions';

export const ONBOARDING_FLOW_STEPS = [
  'language',
  'plan',
  'payment',
  'location',
  'personal',
  'username',
  'experience',
  'headline',
  'links',
  'education',
  'review',
] as const;
export type OnboardingFlowStep = (typeof ONBOARDING_FLOW_STEPS)[number];
export type OnboardingPlan = 'free' | 'go' | 'max';

export interface OnboardingFlowState {
  step: OnboardingFlowStep;
  resumeStep: OnboardingFlowStep;
  completedSteps: string[];
  selectedPlan: OnboardingPlan | null;
  selectedOfferCode: string | null;
  selectedLocale: string | null;
  drafts: Record<string, unknown>;
}

function validStep(step: string | null): OnboardingFlowStep {
  return ONBOARDING_FLOW_STEPS.find((candidate) => candidate === step) ?? 'language';
}

function legacyResumeStep(step: string): OnboardingFlowStep {
  if (step === 'username') return 'username';
  if (step === 'professional-profile') return 'headline';
  if (step === 'resume-style') return 'review';
  if (step.includes('work_experience')) return 'experience';
  if (step.includes('education')) return 'education';
  return 'location';
}

function jsonObject(value: Prisma.JsonValue | null): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export class OnboardingFlowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offerMatchesPlan: (offerCode: string, plan: 'go' | 'max') => boolean,
    private readonly hasActivePlan: (userId: string, plan: 'go' | 'max') => Promise<boolean>,
  ) {}

  async get(userId: string): Promise<OnboardingFlowState> {
    const progress = await this.prisma.onboardingProgress.findUnique({ where: { userId } });
    // A legacy user has no flow cursor. Start at language while retaining all
    // profile answers in the separate legacy progress columns.
    if (!progress?.flowStep) {
      const resumeStep = legacyResumeStep(progress?.currentStep ?? 'welcome');
      await this.prisma.onboardingProgress.upsert({
        where: { userId },
        create: { userId, flowStep: 'language', flowResumeStep: resumeStep },
        update: { flowStep: 'language', flowResumeStep: resumeStep, expiresAt: null },
      });
    }
    const row = progress?.flowStep
      ? progress
      : await this.prisma.onboardingProgress.findUniqueOrThrow({ where: { userId } });
    return {
      step: validStep(row.flowStep),
      resumeStep:
        row.flowResumeStep &&
        ONBOARDING_FLOW_STEPS.includes(row.flowResumeStep as OnboardingFlowStep)
          ? (row.flowResumeStep as OnboardingFlowStep)
          : 'location',
      completedSteps: row.flowCompletedSteps,
      selectedPlan:
        row.selectedPlan === 'free' || row.selectedPlan === 'go' || row.selectedPlan === 'max'
          ? row.selectedPlan
          : null,
      selectedOfferCode: row.selectedOfferCode,
      selectedLocale: row.selectedLocale,
      drafts: jsonObject(row.flowDrafts),
    };
  }

  async move(
    userId: string,
    input: {
      to: OnboardingFlowStep;
      locale?: string;
      plan?: OnboardingPlan;
      offerCode?: string;
    },
  ): Promise<OnboardingFlowState> {
    const state = await this.get(userId);
    const fromIndex = ONBOARDING_FLOW_STEPS.indexOf(state.step);
    const toIndex = ONBOARDING_FLOW_STEPS.indexOf(input.to);
    const isFreeSkip =
      state.step === 'plan' && input.to === state.resumeStep && input.plan === 'free';
    const isPaidResume = state.step === 'payment' && input.to === state.resumeStep;
    const isFreeBack =
      state.step === state.resumeStep && input.to === 'plan' && state.selectedPlan === 'free';
    if (
      toIndex !== fromIndex - 1 &&
      toIndex !== fromIndex + 1 &&
      !isFreeSkip &&
      !isPaidResume &&
      !isFreeBack
    ) {
      throw new OnboardingStepNotCompletedException(state.step);
    }
    const movingForward = toIndex > fromIndex;
    if (
      movingForward &&
      state.step === 'language' &&
      !['en', 'pt-BR'].includes(input.locale ?? '')
    ) {
      throw new OnboardingStepNotCompletedException('language');
    }
    if (movingForward && state.step === 'plan') {
      if (!input.plan || (input.plan === 'free' && input.to !== state.resumeStep)) {
        throw new OnboardingStepNotCompletedException('plan');
      }
      if (input.plan !== 'free') {
        if (
          !input.offerCode ||
          !this.offerMatchesPlan(input.offerCode, input.plan) ||
          input.to !== 'payment'
        ) {
          throw new OnboardingStepNotCompletedException('plan');
        }
      }
    }
    if (movingForward && state.step === 'payment') {
      const paid =
        state.selectedPlan !== 'free' && state.selectedPlan
          ? await this.hasActivePlan(userId, state.selectedPlan)
          : false;
      if (!paid) throw new OnboardingStepNotCompletedException('payment');
    }
    const completedSteps = movingForward
      ? Array.from(
          new Set([
            ...state.completedSteps,
            ...ONBOARDING_FLOW_STEPS.slice(fromIndex, toIndex).filter(
              (step) => !(input.plan === 'free' && step === 'payment'),
            ),
          ]),
        )
      : state.completedSteps;
    await this.prisma.onboardingProgress.update({
      where: { userId },
      data: {
        flowStep: input.to,
        flowCompletedSteps: completedSteps,
        ...(movingForward && state.step === 'language' ? { selectedLocale: input.locale } : {}),
        ...(movingForward && state.step === 'plan'
          ? { selectedPlan: input.plan, selectedOfferCode: input.offerCode ?? null }
          : {}),
        expiresAt: null,
      },
    });
    return this.get(userId);
  }

  async saveDraft(userId: string, step: OnboardingFlowStep, draft: unknown): Promise<void> {
    const state = await this.get(userId);
    // Do not let another tab overwrite an unrelated step or smuggle draft
    // values into a step that has not been reached.
    if (step !== state.step) throw new OnboardingStepNotCompletedException(state.step);
    await this.prisma.onboardingProgress.update({
      where: { userId },
      data: {
        flowDrafts: { ...state.drafts, [step]: draft } as Prisma.InputJsonObject,
        expiresAt: null,
      },
    });
  }

  async assertCanComplete(userId: string): Promise<void> {
    const state = await this.get(userId);
    if (
      state.step !== 'review' ||
      !state.completedSteps.includes('language') ||
      !state.completedSteps.includes('plan') ||
      !state.selectedPlan
    ) {
      throw new OnboardingStepNotCompletedException(state.step);
    }
    if (state.selectedPlan !== 'free') {
      const paid = await this.hasActivePlan(userId, state.selectedPlan);
      if (!paid) throw new OnboardingStepNotCompletedException('payment');
    }
  }
}
