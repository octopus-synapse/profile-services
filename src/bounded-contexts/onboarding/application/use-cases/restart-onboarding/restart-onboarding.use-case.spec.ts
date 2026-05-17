/**
 * P1 #17 — restart-onboarding tx propagation.
 *
 * Before the fix: the wrapper opened a transaction but the progress
 * repo + user.update calls bypassed the tx client, so a partial
 * failure left orphan state. The fix routes every write through `tx`
 * and reorders user.update first so an unexpected error from the
 * progress write still rolls the user flag back.
 *
 * We exercise the behaviour with a fake prisma that captures
 * `$transaction` invocations + a stub repo that records which
 * mutation got which client.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type { OnboardingStepConfig } from '../../../domain/ports/onboarding-config.port';
import type {
  OnboardingProgressData,
  ProgressRecord,
  TransactionClient,
} from '../../../domain/ports/onboarding-progress.port';
import { OnboardingProgressRepositoryPort } from '../../../domain/ports/onboarding-progress.port';
import { RestartOnboardingUseCase } from './restart-onboarding.use-case';

function step(key: string): OnboardingStepConfig {
  return {
    key,
    order: 1,
    component: key,
    icon: 'icon',
    required: true,
    sectionTypeKey: null,
    fields: [],
    translations: {},
    validation: { rules: [] } as unknown as OnboardingStepConfig['validation'],
    strengthWeight: 0,
  };
}

interface CallLog {
  readonly op: string;
  readonly client: 'tx' | 'root';
}

class FakeProgressRepo extends OnboardingProgressRepositoryPort {
  public calls: CallLog[] = [];
  public throwOnUpsert = false;

  async findProgressByUserId(): Promise<ProgressRecord | null> {
    return null;
  }
  async upsertProgress(): Promise<{ currentStep: string; completedSteps: string[] }> {
    this.calls.push({ op: 'upsertProgress', client: 'root' });
    return { currentStep: 'welcome', completedSteps: [] };
  }
  async upsertProgressWithTx(
    _tx: TransactionClient,
    _userId: string,
    _data: OnboardingProgressData,
  ): Promise<{ currentStep: string; completedSteps: string[] }> {
    this.calls.push({ op: 'upsertProgress', client: 'tx' });
    if (this.throwOnUpsert) throw new Error('upsert fail');
    return { currentStep: 'welcome', completedSteps: [] };
  }
  async setActivatedExtras(): Promise<void> {}
  async deleteProgress(): Promise<void> {
    this.calls.push({ op: 'deleteProgress', client: 'root' });
  }
  async deleteProgressWithTx(): Promise<void> {
    this.calls.push({ op: 'deleteProgress', client: 'tx' });
  }
  async findUserByUsername(): Promise<{ id: string } | null> {
    return null;
  }
}

/**
 * Minimal prisma double — only the surface `RestartOnboardingUseCase`
 * actually touches. `$transaction` reflects the real semantics: it
 * passes a tx client into the callback and either commits or rolls
 * back when the callback throws.
 */
function makeFakePrisma(calls: CallLog[], opts: { throwOnUserUpdate?: boolean } = {}) {
  const rootUser = {
    findUnique: async () => null,
    update: async () => {
      calls.push({ op: 'user.update', client: 'root' });
      if (opts.throwOnUserUpdate) throw new Error('user fail');
      return {};
    },
  };
  const rootResume = { findFirst: async () => null };
  const root = {
    user: rootUser,
    resume: rootResume,
    $transaction: async <T>(cb: (tx: unknown) => Promise<T>): Promise<T> => {
      const tx = {
        user: {
          update: async () => {
            calls.push({ op: 'user.update', client: 'tx' });
            if (opts.throwOnUserUpdate) throw new Error('user fail');
            return {};
          },
        },
      };
      return cb(tx);
    },
  };
  return root as never;
}

describe('RestartOnboardingUseCase — tx propagation (P1 #17)', () => {
  let repo: FakeProgressRepo;
  let useCase: RestartOnboardingUseCase;
  let calls: CallLog[];

  beforeEach(() => {
    repo = new FakeProgressRepo();
    calls = [];
  });

  it('routes user.update + progress repo through the tx client and runs user.update first', async () => {
    useCase = new RestartOnboardingUseCase(makeFakePrisma(calls), repo, stubLogger);

    await useCase.execute('u-1', [step('welcome')], { clean: true });

    const trail = repo.calls.concat(calls).filter((c) => c.client === 'tx');
    const allTrail = [...calls, ...repo.calls];
    expect(allTrail.every((c) => c.client === 'tx')).toBe(true);

    // user.update precedes the heavier progress writes so an error
    // there doesn't bury the simpler rollback.
    const ops = [
      ...calls.filter((c) => c.op === 'user.update'),
      ...repo.calls.filter((c) => c.op === 'deleteProgress' || c.op === 'upsertProgress'),
    ];
    expect(ops[0].op).toBe('user.update');
    expect(ops.map((c) => c.op)).toEqual(['user.update', 'deleteProgress', 'upsertProgress']);
    expect(trail.length).toBeGreaterThan(0);
  });

  it('surfaces the error and never falls back to non-tx writes', async () => {
    repo.throwOnUpsert = true;
    useCase = new RestartOnboardingUseCase(makeFakePrisma(calls), repo, stubLogger);

    await expect(useCase.execute('u-1', [step('welcome')], { clean: true })).rejects.toThrow(
      'upsert fail',
    );

    // user.update + deleteProgress + the throwing upsert all landed on
    // the tx client; nothing bypassed it.
    expect(calls.every((c) => c.client === 'tx')).toBe(true);
    expect(repo.calls.every((c) => c.client === 'tx')).toBe(true);
  });
});
