import { describe, expect, it } from 'bun:test';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type { OnboardingData } from '../../../domain/schemas/onboarding.schema';
import { ResumeOnboardingAdapter } from './resume-onboarding.adapter';

/**
 * ADR-003 §10 — the résumé must be born in the language it was written in.
 *
 * These exercise the upsert's `data` payload directly; the surrounding
 * transaction is a hand-rolled double because the only thing under test is
 * which columns the adapter decides to write.
 */

type UpsertArgs = { create: Record<string, unknown>; update: Record<string, unknown> };

function buildTx(existingResumeId: string | null) {
  const calls: UpsertArgs[] = [];
  const tx = {
    resume: {
      findFirst: async () => (existingResumeId ? { id: existingResumeId } : null),
      upsert: async (args: UpsertArgs) => {
        calls.push(args);
        return { id: existingResumeId ?? 'resume-new' };
      },
    },
    resumeStyle: {
      findUnique: async () => ({ id: 'style-1', name: 'default' }),
      findFirst: async () => ({ id: 'style-1', name: 'default' }),
    },
    user: { update: async () => ({}) },
  } as unknown as Prisma.TransactionClient;

  return { tx, calls };
}

const DATA = {
  username: 'johndoe',
  personalInfo: { fullName: 'John Doe', phone: null, location: null },
  professionalProfile: { headline: 'Engineer', summary: 'Builds things.' },
  sections: [],
  resumeStyleId: 'style-1',
} as unknown as OnboardingData;

function adapter() {
  return new ResumeOnboardingAdapter({} as PrismaService, stubLogger);
}

describe('ResumeOnboardingAdapter — authored language (ADR-003 §10)', () => {
  it('writes language when the request named a locale', async () => {
    const { tx, calls } = buildTx(null);

    await adapter().upsertResumeWithTx(tx, 'user-1', DATA, 'en');

    expect(calls[0]?.create.language).toBe('en');
  });

  it('records pt-BR in the canonical spelling, not the legacy column default', async () => {
    const { tx, calls } = buildTx(null);

    await adapter().upsertResumeWithTx(tx, 'user-1', DATA, 'pt-BR');

    expect(calls[0]?.create.language).toBe('pt-BR');
  });

  it('omits the column when the locale is unknown, so the default stands', async () => {
    const { tx, calls } = buildTx(null);

    await adapter().upsertResumeWithTx(tx, 'user-1', DATA, null);

    expect(calls[0]?.create).not.toHaveProperty('language');
  });

  it('does not clobber an existing resume language on an onboarding re-run', async () => {
    const { tx, calls } = buildTx('resume-existing');

    await adapter().upsertResumeWithTx(tx, 'user-1', DATA, undefined);

    expect(calls[0]?.update).not.toHaveProperty('language');
    expect(calls[0]?.update).not.toHaveProperty('primaryLanguage');
  });
});
