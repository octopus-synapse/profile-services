/**
 * In-Memory Import Job Repository
 *
 * Implements ImportJobRepositoryPort for unit testing.
 * No Prisma, no database — pure Map-based storage.
 */

import type {
  ImportJobRepositoryPort,
} from '../domain/ports/import-job.repository.port';
import type {
  CreateImportJobParams,
  ImportJobData,
  ImportStatus,
} from '../domain/types/import.types';

export class InMemoryImportJobRepository implements ImportJobRepositoryPort {
  private records = new Map<string, ImportJobData>();
  private idCounter = 1;

  async create(params: CreateImportJobParams): Promise<ImportJobData> {
    const id = `import-${this.idCounter++}`;
    const job: ImportJobData = {
      id,
      userId: params.userId,
      source: params.source,
      status: 'PENDING',
      fileUrl: null,
      fileName: params.fileName ?? null,
      rawData: params.rawData ?? null,
      mappedData: null,
      errors: [],
      errorMessage: null,
      resumeId: null,
      metadata: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
    };
    this.records.set(id, job);
    return job;
  }

  async findById(id: string): Promise<ImportJobData | null> {
    return this.records.get(id) ?? null;
  }

  async findByUserId(userId: string): Promise<ImportJobData[]> {
    return Array.from(this.records.values())
      .filter((job) => job.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateStatus(
    id: string,
    status: ImportStatus,
    errorMessage?: string | null,
    resumeId?: string,
  ): Promise<ImportJobData> {
    const job = this.records.get(id);
    if (!job) {
      throw new Error(`Import ${id} not found`);
    }

    const updated: ImportJobData = {
      ...job,
      status,
      errorMessage: errorMessage !== undefined ? (errorMessage ?? null) : job.errorMessage,
      resumeId: resumeId ?? job.resumeId,
      completedAt: status === 'COMPLETED' || status === 'FAILED' ? new Date() : job.completedAt,
    };

    this.records.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  // Test helpers
  seed(job: ImportJobData): void {
    this.records.set(job.id, job);
  }

  getAll(): ImportJobData[] {
    return Array.from(this.records.values());
  }

  clear(): void {
    this.records.clear();
    this.idCounter = 1;
  }
}
