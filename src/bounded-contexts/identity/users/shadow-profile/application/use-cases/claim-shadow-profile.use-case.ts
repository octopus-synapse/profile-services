import type { LoggerPort } from '@/shared-kernel';
import type { ApplyShadowPayloadToUserPolicy } from '../../domain/rules/apply-shadow-payload-to-user.policy';
import {
  ShadowProfileAlreadyClaimedException,
  ShadowProfileNotFoundException,
} from '../../shadow-profile.exceptions';
import { ClaimShadowProfileUseCasePort } from '../ports/claim-shadow-profile.use-case.port';
import {
  ShadowProfileRepositoryPort,
  type ShadowProfileSnapshot,
} from '../ports/shadow-profile-repository.port';

export class ClaimShadowProfileUseCase extends ClaimShadowProfileUseCasePort {
  constructor(
    private readonly repository: ShadowProfileRepositoryPort,
    private readonly applyPolicy: ApplyShadowPayloadToUserPolicy,
    private readonly logger?: LoggerPort,
  ) {
    super();
  }

  async execute(shadowId: string, userId: string): Promise<ShadowProfileSnapshot> {
    const existing = await this.repository.findById(shadowId);
    if (!existing) throw new ShadowProfileNotFoundException();
    if (existing.claimedByUserId && existing.claimedByUserId !== userId) {
      throw new ShadowProfileAlreadyClaimedException();
    }

    await this.applyPolicy.apply(userId, existing.payload as never);
    const claimed = await this.repository.markClaimed(shadowId, userId);
    this.logger?.log(
      `Shadow profile ${shadowId} claimed by ${userId}`,
      'ClaimShadowProfileUseCase',
    );
    return claimed;
  }
}
