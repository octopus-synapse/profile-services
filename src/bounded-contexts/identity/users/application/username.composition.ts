/**
 * Username sub-composition.
 *
 * Returns the per-UC ports the parent users.composition.ts exposes via
 * `useCases.{updateUsername, checkUsernameAvailability, validateUsername}`.
 * The route handler depends on the ports (not the concrete UC classes)
 * so test fixtures can swap in fakes without touching production wiring.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { UsernameRepository } from '../infrastructure/adapters/persistence/username.repository';
import { CheckUsernameAvailabilityUseCasePort } from './ports/check-username-availability.use-case.port';
import { UpdateUsernameUseCasePort } from './ports/update-username.use-case.port';
import { ValidateUsernameUseCasePort } from './ports/validate-username.use-case.port';
import { CheckUsernameAvailabilityUseCase } from './use-cases/username/check-username-availability.use-case';
import { UpdateUsernameUseCase } from './use-cases/username/update-username.use-case';
import { ValidateUsernameUseCase } from './use-cases/username/validate-username.use-case';

export interface UsernameUseCasesBundle {
  readonly updateUsername: UpdateUsernameUseCasePort;
  readonly checkUsernameAvailability: CheckUsernameAvailabilityUseCasePort;
  readonly validateUsername: ValidateUsernameUseCasePort;
}

export function buildUsernameUseCases(prisma: PrismaService): UsernameUseCasesBundle {
  const repository = new UsernameRepository(prisma);
  return {
    updateUsername: new UpdateUsernameUseCase(repository),
    checkUsernameAvailability: new CheckUsernameAvailabilityUseCase(repository),
    validateUsername: new ValidateUsernameUseCase(repository),
  };
}
