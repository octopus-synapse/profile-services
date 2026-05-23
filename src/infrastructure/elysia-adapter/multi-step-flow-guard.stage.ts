import type { PipelineStage } from '@/shared-kernel/http/pipeline';

/**
 * No-op stage. Routes that declare guards: [{ id: 'multi-step-flow' }]
 * carry a marker for the contract test suite to skip them — these are
 * middle-of-flow endpoints (2FA verify, post-login challenge, password
 * mutation) that can't be deterministically probed in isolation.
 */
export function multiStepFlowGuardStage(): PipelineStage {
  return {
    name: 'multiStepFlowGuard',
    async run(_ctx, next) {
      await next();
    },
  };
}
