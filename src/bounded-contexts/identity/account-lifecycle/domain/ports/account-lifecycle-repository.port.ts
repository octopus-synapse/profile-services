/**
 * Account Lifecycle Repository Port
 *
 * Outbound port for account lifecycle persistence operations.
 */

export interface AccountData {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateAccountData {
  name?: string | null;
  email: string;
  passwordHash: string;
}

export abstract class AccountLifecycleRepositoryPort {
  abstract findById(userId: string): Promise<AccountData | null>;
  abstract findByEmail(email: string): Promise<AccountData | null>;
  abstract emailExists(email: string): Promise<boolean>;
  abstract create(data: CreateAccountData): Promise<AccountData>;
  abstract deactivate(userId: string): Promise<void>;
  abstract reactivate(userId: string): Promise<void>;
  abstract delete(userId: string): Promise<void>;
}
