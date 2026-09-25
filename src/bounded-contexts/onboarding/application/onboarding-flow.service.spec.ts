import { describe, expect, it } from 'bun:test';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { OnboardingFlowService } from './onboarding-flow.service';

function fixture() {
  const row: Record<string, unknown> = {
    userId: 'user-1',
    flowStep: null,
    flowResumeStep: null,
    currentStep: 'username',
    flowCompletedSteps: [],
    selectedPlan: null,
    selectedOfferCode: null,
    selectedLocale: null,
    flowDrafts: null,
    personalInfo: { fullName: 'Saved years ago' },
  };
  let activePlan: string | null = null;
  const prisma = {
    onboardingProgress: {
      findUnique: async () => ({ ...row }),
      findUniqueOrThrow: async () => ({ ...row }),
      upsert: async ({ update }: { update: Record<string, unknown> }) => Object.assign(row, update),
      update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(row, data),
    },
  } as unknown as PrismaService;
  return {
    flow: new OnboardingFlowService(
      prisma,
      (code, plan) => code.startsWith(`${plan}_`),
      async (_userId, plan) => activePlan === plan,
    ),
    row,
    activate: (plan: string) => {
      activePlan = plan;
    },
  };
}

describe('OnboardingFlowService', () => {
  it('migrates an incomplete legacy account to language without losing answers', async () => {
    const { flow, row } = fixture();
    const state = await flow.get('user-1');
    expect(state.step).toBe('language');
    expect(state.resumeStep).toBe('username');
    expect(row.personalInfo).toEqual({ fullName: 'Saved years ago' });
  });

  it('requires language and plan, but skips payment for Free', async () => {
    const { flow, row } = fixture();
    row.currentStep = 'welcome';
    await expect(flow.move('user-1', { to: 'location', plan: 'free' })).rejects.toThrow();
    await flow.move('user-1', { to: 'plan', locale: 'pt-BR' });
    const state = await flow.move('user-1', { to: 'location', plan: 'free' });
    expect(state.selectedPlan).toBe('free');
    expect(state.completedSteps).toEqual(['language', 'plan']);
    expect((await flow.move('user-1', { to: 'plan' })).step).toBe('plan');
  });

  it('keeps a paid user on payment until entitlement is active', async () => {
    const { flow, activate, row } = fixture();
    row.currentStep = 'welcome';
    await flow.move('user-1', { to: 'plan', locale: 'en' });
    await flow.move('user-1', { to: 'payment', plan: 'go', offerCode: 'go_card_month' });
    await expect(flow.move('user-1', { to: 'location' })).rejects.toThrow();
    activate('go');
    expect((await flow.move('user-1', { to: 'location' })).step).toBe('location');
  });

  it('persists the current step draft on the server', async () => {
    const { flow } = fixture();
    await flow.saveDraft('user-1', 'language', { note: 'saved' });
    expect((await flow.get('user-1')).drafts.language).toEqual({ note: 'saved' });
  });

  it('resumes a legacy user at the saved profile step after selecting Free', async () => {
    const { flow } = fixture();
    await flow.move('user-1', { to: 'plan', locale: 'en' });
    const state = await flow.move('user-1', { to: 'username', plan: 'free' });
    expect(state.step).toBe('username');
    expect(state.completedSteps).toContain('personal');
    expect(state.completedSteps).not.toContain('payment');
  });
});
