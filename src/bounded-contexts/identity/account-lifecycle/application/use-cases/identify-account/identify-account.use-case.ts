import type {
  IdentifyAccountPort,
  IdentifyAccountQuery,
  IdentifyAccountResult,
} from '../../../application/ports';
import { AccountLifecycleRepositoryPort } from '../../../domain/ports';

export class IdentifyAccountUseCase implements IdentifyAccountPort {
  constructor(private readonly repository: AccountLifecycleRepositoryPort) {}

  async execute(query: IdentifyAccountQuery): Promise<IdentifyAccountResult> {
    // The route schema already normalized the e-mail (trim + lowercase via
    // EmailSchema), so the lookup key matches what `create` stored.
    const signals = await this.repository.findIdentitySignalsByEmail(query.email);
    if (!signals) {
      return { exists: false };
    }
    return {
      exists: true,
      emailVerified: signals.emailVerified,
      hasPassword: signals.hasPassword,
    };
  }
}
