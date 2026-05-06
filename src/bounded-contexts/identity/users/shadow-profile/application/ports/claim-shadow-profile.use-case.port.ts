import type { ShadowProfileSnapshot } from './shadow-profile-repository.port';

export abstract class ClaimShadowProfileUseCasePort {
  abstract execute(shadowId: string, userId: string): Promise<ShadowProfileSnapshot>;
}
