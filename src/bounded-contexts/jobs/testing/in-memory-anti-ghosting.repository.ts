/**
 * In-memory `AntiGhostingRepositoryPort` for sweep specs.
 *
 * Stores stale-application candidates, the reminder log (keyed by
 * `applicationId|threshold` to mirror the production unique
 * constraint), users keyed by id, and notifications written by the
 * sweep so tests can assert the in-app nudge fired.
 *
 * `findStaleCandidates` filters by the ≥7-day cutoff in the same way
 * the Prisma adapter does (`updatedAt <= cutoff`). Tests can seed a
 * candidate with an explicit `updatedAt` to simulate the row aging.
 */

import type {
  AntiGhostingNotificationInput,
  AntiGhostingUser,
  ReminderThreshold,
  StaleApplicationCandidate,
} from '../domain/entities/anti-ghosting';
import { AntiGhostingRepositoryPort } from '../domain/ports/anti-ghosting.repository.port';

interface CandidateRow extends StaleApplicationCandidate {
  readonly updatedAt: Date;
  readonly status: string;
}

export class InMemoryAntiGhostingRepository extends AntiGhostingRepositoryPort {
  readonly candidates = new Map<string, CandidateRow>();
  readonly reminderLogs = new Set<string>();
  readonly users = new Map<string, AntiGhostingUser>();
  readonly notifications: AntiGhostingNotificationInput[] = [];

  seedCandidate(row: Partial<CandidateRow> & { id: string; userId: string }): CandidateRow {
    const full: CandidateRow = {
      id: row.id,
      userId: row.userId,
      createdAt: row.createdAt ?? new Date(),
      updatedAt: row.updatedAt ?? new Date(),
      status: row.status ?? 'SUBMITTED',
      jobTitle: row.jobTitle ?? 'Backend Engineer',
      company: row.company ?? 'Acme',
      lastEvent: row.lastEvent ?? null,
    };
    this.candidates.set(full.id, full);
    return full;
  }

  seedUser(userId: string, user: AntiGhostingUser): void {
    this.users.set(userId, user);
  }

  async findStaleCandidates(cutoff: Date): Promise<StaleApplicationCandidate[]> {
    return [...this.candidates.values()]
      .filter((c) => c.status === 'SUBMITTED' && c.updatedAt.getTime() <= cutoff.getTime())
      .map(({ id, userId, createdAt, jobTitle, company, lastEvent }) => ({
        id,
        userId,
        createdAt,
        jobTitle,
        company,
        lastEvent,
      }));
  }

  async hasReminderBeenSent(applicationId: string, threshold: ReminderThreshold): Promise<boolean> {
    return this.reminderLogs.has(this.logKey(applicationId, threshold));
  }

  async findUser(userId: string): Promise<AntiGhostingUser | null> {
    return this.users.get(userId) ?? null;
  }

  async recordReminderLog(applicationId: string, threshold: ReminderThreshold): Promise<void> {
    this.reminderLogs.add(this.logKey(applicationId, threshold));
  }

  async createStaleNotification(input: AntiGhostingNotificationInput): Promise<void> {
    this.notifications.push(input);
  }

  private logKey(applicationId: string, threshold: ReminderThreshold): string {
    return `${applicationId}|${threshold}`;
  }
}
