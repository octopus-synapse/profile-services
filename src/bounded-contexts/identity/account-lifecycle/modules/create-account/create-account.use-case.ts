import { Inject, Injectable } from '@nestjs/common';
import type { TokenGeneratorPort } from '@/bounded-contexts/identity/authentication/ports/outbound/token-generator.port';
import { TOKEN_GENERATOR_PORT } from '@/bounded-contexts/identity/authentication/ports/outbound/token-generator.port';
import { Password } from '../../../password-management/domain/value-objects';
import type { EventBusPort } from '../../../shared-kernel/ports';
import { AccountCreatedEvent } from '../../domain/events';
import { AccountAlreadyExistsException } from '../../domain/exceptions';
import type {
  CreateAccountCommand,
  CreateAccountPort,
  CreateAccountResult,
} from '../../ports/inbound';
import type { AccountLifecycleRepositoryPort, PasswordHasherPort } from '../../ports/outbound';

const ACCOUNT_REPOSITORY = Symbol('AccountLifecycleRepositoryPort');
const PASSWORD_HASHER = Symbol('PasswordHasherPort');
const EVENT_BUS = Symbol('EventBusPort');

@Injectable()
export class CreateAccountUseCase implements CreateAccountPort {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly repository: AccountLifecycleRepositoryPort,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBusPort,
    @Inject(TOKEN_GENERATOR_PORT)
    private readonly tokenGenerator: TokenGeneratorPort,
  ) {}

  async execute(command: CreateAccountCommand): Promise<CreateAccountResult> {
    const { name, email, password } = command;

    // Validate password strength (throws WeakPasswordException if invalid)
    Password.create(password);

    // Check if email already exists
    const existingAccount = await this.repository.emailExists(email);
    if (existingAccount) {
      throw new AccountAlreadyExistsException(email);
    }

    // Hash password
    const passwordHash = await this.passwordHasher.hash(password);

    // Create account
    const account = await this.repository.create({
      name: name || null,
      email,
      passwordHash,
    });

    // Generate auth tokens for auto-login (eliminates extra login request)
    const tokens = await this.tokenGenerator.generateTokenPair({
      userId: account.id,
      email: account.email,
    });

    // Publish domain event
    const event = new AccountCreatedEvent(account.id, account.email);
    this.eventBus.publish(event);

    return {
      userId: account.id,
      email: account.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }
}

export { ACCOUNT_REPOSITORY, PASSWORD_HASHER, EVENT_BUS };
