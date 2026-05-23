import type { DomainCode } from '@/shared-kernel/i18n/domain-code';

export interface UsernameValidationResult {
  readonly username: string;
  readonly valid: boolean;
  readonly available?: boolean;
  readonly errors: readonly DomainCode[];
}

export abstract class ValidateUsernameUseCasePort {
  abstract execute(username: string, requesterUserId?: string): Promise<UsernameValidationResult>;
}
