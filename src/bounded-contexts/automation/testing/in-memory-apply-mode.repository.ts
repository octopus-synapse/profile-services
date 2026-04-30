/**
 * In-memory `ApplyModeRepositoryPort` for use case specs. Mirrors the
 * Prisma adapter's surface — batches, items, JobApplication idempotency
 * by `(jobId, userId)`, and the user defaults lookup.
 */

import type {
  ApplyModeUserDefaults,
  JobApplicationRow,
  OwnedWeeklyCuratedItem,
  WeeklyCuratedBatchRow,
  WeeklyCuratedItemRow,
} from '../domain/entities/weekly-curated-item';
import {
  ApplyModeRepositoryPort,
  type CreateJobApplicationInput,
  type UpdateItemDecisionInput,
} from '../domain/ports/apply-mode.repository.port';

interface Batch {
  id: string;
  userId: string;
  weekOf: Date;
  sentAt: Date | null;
  status: string;
  createdAt: Date;
}

interface Item {
  id: string;
  batchId: string;
  jobId: string;
  matchScore: number;
  status: string;
  decidedAt: Date | null;
  applicationId: string | null;
}

interface Application {
  id: string;
  jobId: string;
  userId: string;
  resumeId: string | null;
  coverLetter: string | null;
}

let appCounter = 0;
const nextAppId = () => `app_${++appCounter}`;

export class InMemoryApplyModeRepository extends ApplyModeRepositoryPort {
  readonly batches: Batch[] = [];
  readonly items: Item[] = [];
  readonly applications: Application[] = [];
  private readonly userDefaults = new Map<string, ApplyModeUserDefaults>();

  setUserDefaults(userId: string, defaults: ApplyModeUserDefaults): void {
    this.userDefaults.set(userId, defaults);
  }

  addBatch(batch: {
    id: string;
    userId: string;
    weekOf?: Date;
    sentAt?: Date | null;
    status?: string;
    createdAt?: Date;
  }): void {
    this.batches.push({
      id: batch.id,
      userId: batch.userId,
      weekOf: batch.weekOf ?? new Date('2026-01-05'),
      sentAt: batch.sentAt ?? null,
      status: batch.status ?? 'SENT',
      createdAt: batch.createdAt ?? new Date(),
    });
  }

  addItem(item: {
    id: string;
    batchId: string;
    jobId: string;
    matchScore?: number;
    status?: string;
    decidedAt?: Date | null;
    applicationId?: string | null;
  }): void {
    this.items.push({
      id: item.id,
      batchId: item.batchId,
      jobId: item.jobId,
      matchScore: item.matchScore ?? 80,
      status: item.status ?? 'PENDING_APPROVAL',
      decidedAt: item.decidedAt ?? null,
      applicationId: item.applicationId ?? null,
    });
  }

  async findCurrentBatchForUser(userId: string): Promise<WeeklyCuratedBatchRow | null> {
    const userBatches = this.batches
      .filter((b) => b.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const batch = userBatches[0];
    if (!batch) return null;
    const items: WeeklyCuratedItemRow[] = this.items
      .filter((i) => i.batchId === batch.id)
      .sort((a, b) => b.matchScore - a.matchScore)
      .map((i) => ({
        id: i.id,
        jobId: i.jobId,
        matchScore: i.matchScore,
        status: i.status,
        decidedAt: i.decidedAt,
      }));
    return {
      id: batch.id,
      weekOf: batch.weekOf,
      sentAt: batch.sentAt,
      status: batch.status,
      items,
    };
  }

  async findItemWithOwner(itemId: string): Promise<OwnedWeeklyCuratedItem | null> {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return null;
    const batch = this.batches.find((b) => b.id === item.batchId);
    if (!batch) return null;
    return { id: item.id, jobId: item.jobId, userId: batch.userId };
  }

  async findApplication(jobId: string, userId: string): Promise<JobApplicationRow | null> {
    const found = this.applications.find((a) => a.jobId === jobId && a.userId === userId);
    return found ? { id: found.id } : null;
  }

  async getUserApplicationDefaults(userId: string): Promise<ApplyModeUserDefaults> {
    return this.userDefaults.get(userId) ?? { primaryResumeId: null, defaultCover: null };
  }

  async createApplication(input: CreateJobApplicationInput): Promise<JobApplicationRow> {
    const row: Application = {
      id: nextAppId(),
      jobId: input.jobId,
      userId: input.userId,
      resumeId: input.resumeId,
      coverLetter: input.coverLetter,
    };
    this.applications.push(row);
    return { id: row.id };
  }

  async updateItemDecision(itemId: string, input: UpdateItemDecisionInput): Promise<void> {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return;
    item.status = input.status;
    item.decidedAt = input.decidedAt;
    if (input.applicationId) item.applicationId = input.applicationId;
  }
}
