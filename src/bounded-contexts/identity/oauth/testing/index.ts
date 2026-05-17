/**
 * In-memory test doubles for the OAuth ports.
 *
 * `InMemoryOAuthAccountsRepository` keeps users + accounts in maps
 * and exposes seed helpers so specs can exercise the matching ladder.
 * `InMemoryOAuthProviderConfig` is a flat boolean map.
 */

import type { OAuthProfile, OAuthProvider } from '../domain/entities/oauth-profile';
import {
  OAuthAccountsRepositoryPort,
  type OAuthUserByEmailResult,
} from '../domain/ports/oauth-accounts.repository.port';
import { OAuthProviderConfigPort } from '../domain/ports/oauth-provider-config.port';

interface UserRow {
  readonly id: string;
  readonly email: string | null;
  readonly emailVerified: boolean;
  readonly displayName: string | null;
  readonly photoURL: string | null;
}

interface AccountRow {
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  accessToken: string;
  refreshToken: string | null;
}

let userCounter = 0;

export class InMemoryOAuthAccountsRepository extends OAuthAccountsRepositoryPort {
  readonly users = new Map<string, UserRow>();
  readonly accounts: AccountRow[] = [];

  seedUser(row: { id?: string; email?: string | null; emailVerified?: boolean }): UserRow {
    const id = row.id ?? `u-${++userCounter}`;
    const user: UserRow = {
      id,
      email: row.email ?? null,
      emailVerified: row.emailVerified ?? false,
      displayName: null,
      photoURL: null,
    };
    this.users.set(id, user);
    return user;
  }

  seedAccount(account: AccountRow): void {
    this.accounts.push({ ...account });
  }

  async findUserIdByProviderAccount(
    provider: OAuthProvider,
    providerAccountId: string,
  ): Promise<string | null> {
    return (
      this.accounts.find(
        (a) => a.provider === provider && a.providerAccountId === providerAccountId,
      )?.userId ?? null
    );
  }

  async findUserByEmail(email: string): Promise<OAuthUserByEmailResult | null> {
    for (const u of this.users.values()) {
      if (u.email === email) return { userId: u.id, emailVerified: u.emailVerified };
    }
    return null;
  }

  async createUserFromProfile(profile: OAuthProfile): Promise<string> {
    const id = `u-${++userCounter}`;
    this.users.set(id, {
      id,
      email: profile.email,
      emailVerified: profile.emailVerified,
      displayName: profile.displayName,
      photoURL: profile.photoURL,
    });
    return id;
  }

  async createAccountForUser(userId: string, profile: OAuthProfile): Promise<void> {
    this.accounts.push({
      userId,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
    });
  }

  async refreshAccountTokens(userId: string, profile: OAuthProfile): Promise<void> {
    for (const a of this.accounts) {
      if (
        a.userId === userId &&
        a.provider === profile.provider &&
        a.providerAccountId === profile.providerAccountId
      ) {
        a.accessToken = profile.accessToken;
        a.refreshToken = profile.refreshToken;
      }
    }
  }

  async findAccessToken(userId: string, provider: OAuthProvider): Promise<string | null> {
    return (
      this.accounts.find((a) => a.userId === userId && a.provider === provider)?.accessToken ?? null
    );
  }
}

export class InMemoryOAuthProviderConfig extends OAuthProviderConfigPort {
  private available = new Map<OAuthProvider, boolean>();

  setProvider(provider: OAuthProvider, available: boolean): void {
    this.available.set(provider, available);
  }

  hasProvider(provider: OAuthProvider): boolean {
    return this.available.get(provider) ?? false;
  }
}
