import { Inject, Injectable } from '@nestjs/common';
import { Password } from '../../../password-management/domain/value-objects';
import { EventBusPort } from '../../../shared-kernel/ports';
import { AccountCreatedEvent } from '../../domain/events';
import { AccountAlreadyExistsException } from '../../domain/exceptions';
import { CreateAccountCommand, CreateAccountPort, CreateAccountResult } from '../../ports/inbound';
import { AccountLifecycleRepositoryPort, PasswordHasherPort } from '../../ports/outbound';

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

    // Publish domain event
    const event = new AccountCreatedEvent(account.id, account.email);
    this.eventBus.publish(event);

    return {
      userId: account.id,
      email: account.email,
    };
  }
}

export { ACCOUNT_REPOSITORY, PASSWORD_HASHER, EVENT_BUS };
