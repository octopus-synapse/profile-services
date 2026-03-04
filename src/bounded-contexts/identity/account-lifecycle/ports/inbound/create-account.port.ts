/**
 * Create Account Port (Inbound)
 *
 * Use-case interface for account registration.
 */

export interface CreateAccountCommand {
  name?: string;
  email: string;
  password: string;
}

export interface CreateAccountResult {
  userId: string;
  email: string;
}

export interface CreateAccountPort {
  /**
   * Creates a new user account.
   * @throws AccountAlreadyExistsException if email is already registered
   * @throws WeakPasswordException if password doesn't meet requirements
   */
  execute(command: CreateAccountCommand): Promise<CreateAccountResult>;
}

export const CREATE_ACCOUNT_PORT = Symbol('CreateAccountPort');
