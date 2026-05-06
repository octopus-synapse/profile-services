/**
 * In-memory `UsernameRepositoryPort` fake for unit specs.
 *
 * Stateful fake (Beck/Fowler — fakes over mocks): tests assert behaviour
 * (`fake.usernames.has(...)`) instead of interaction sequences. Simpler
 * to reason about than `mock(async () => ...)` chains and resilient to
 * refactors that swap repository methods.
 */

import { UsernameRepositoryPort } from '../application/ports/username.port';

interface UserRow {
  id: string;
  username: string | null;
  lastUsernameUpdate: Date | null;
}

export class InMemoryUsernameRepository extends UsernameRepositoryPort {
  private readonly usersById = new Map<string, UserRow>();

  /** Seed a user. Returns the row so tests can mutate it directly when needed. */
  seedUser(row: {
    id: string;
    username?: string | null;
    lastUsernameUpdate?: Date | null;
  }): UserRow {
    const stored: UserRow = {
      id: row.id,
      username: row.username ?? null,
      lastUsernameUpdate: row.lastUsernameUpdate ?? null,
    };
    this.usersById.set(row.id, stored);
    return stored;
  }

  /** All currently-claimed usernames — handy for assertions. */
  get usernames(): ReadonlySet<string> {
    const out = new Set<string>();
    for (const u of this.usersById.values()) {
      if (u.username) out.add(u.username);
    }
    return out;
  }

  async findUserById(userId: string): Promise<{ id: string; username: string | null } | null> {
    const row = this.usersById.get(userId);
    return row ? { id: row.id, username: row.username } : null;
  }

  async updateUsername(userId: string, username: string): Promise<{ username: string }> {
    const row = this.usersById.get(userId);
    if (!row) throw new Error(`InMemoryUsernameRepository: user ${userId} not found`);
    row.username = username;
    row.lastUsernameUpdate = new Date();
    return { username };
  }

  async findLastUsernameUpdateByUserId(userId: string): Promise<Date | null> {
    return this.usersById.get(userId)?.lastUsernameUpdate ?? null;
  }

  async isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
    for (const row of this.usersById.values()) {
      if (row.username === username && row.id !== excludeUserId) return true;
    }
    return false;
  }
}
