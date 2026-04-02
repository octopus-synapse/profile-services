/**
 * Import Testing Module
 *
 * In-memory implementations for testing import functionality.
 */

import { type ImportSource, type Prisma, type ResumeImport } from '@prisma/client';

/**
 * Import status values
 */
type ImportStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'MAPPING'
  | 'VALIDATING'
  | 'IMPORTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PARTIAL';

/**
 * In-Memory Resume Import Repository
 */
export class InMemoryResumeImportRepository {
  private imports = new Map<string, ResumeImport>();
  private idCounter = 1;

  async create(data: {
    userId: string;
    source: ImportSource;
    status: ImportStatus;
    rawData?: Prisma.InputJsonValue;
    fileName?: string | null;
  }): Promise<ResumeImport> {
    const id = `import-${this.idCounter++}`;
    const importJob: ResumeImport = {
      id,
      userId: data.userId,
      source: data.source as ImportSource,
      status: data.status,
      fileUrl: null,
      fileName: data.fileName ?? null,
      rawData: data.rawData as Prisma.JsonValue,
      mappedData: null,
      errors: [],
      errorMessage: null,
      resumeId: null,
      metadata: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
    };
    this.imports.set(id, importJob);
    return importJob;
  }

  async findUnique(id: string): Promise<ResumeImport | null> {
    return this.imports.get(id) ?? null;
  }

  async findMany(filter: { where: { userId: string } }): Promise<ResumeImport[]> {
    return Array.from(this.imports.values())
      .filter((imp) => imp.userId === filter.where.userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async update(
    id: string,
    data: {
      status?: ImportStatus;
      errorMessage?: string | null;
      resumeId?: string;
      completedAt?: Date;
    },
  ): Promise<ResumeImport> {
    const importJob = this.imports.get(id);
    if (!importJob) {
      throw new Error(`Import ${id} not found`);
    }

    const updated: ResumeImport = {
      ...importJob,
      status: data.status ?? importJob.status,
      errorMessage: data.errorMessage !== undefined ? data.errorMessage : importJob.errorMessage,
      resumeId: data.resumeId ?? importJob.resumeId,
      completedAt: data.completedAt ?? importJob.completedAt,
    };

    this.imports.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.imports.delete(id);
  }

  // Test helpers
  seedImport(importJob: ResumeImport): void {
    this.imports.set(importJob.id, importJob);
  }

  clear(): void {
    this.imports.clear();
    this.idCounter = 1;
  }
}

/**
 * In-Memory Resume Repository (for import context)
 */
export class InMemoryResumeRepository {
  private resumes = new Map<string, { id: string; userId: string; title: string }>();
  private idCounter = 1;

  async create(data: {
    userId: string;
    title: string;
    summary?: string;
    import?: { connect: { id: string } };
  }): Promise<{ id: string }> {
    const id = `resume-${this.idCounter++}`;
    const resume = {
      id,
      userId: data.userId,
      title: data.title,
    };
    this.resumes.set(id, resume);
    return resume;
  }

  // Test helpers
  getResume(id: string) {
    return this.resumes.get(id);
  }

  clear(): void {
    this.resumes.clear();
    this.idCounter = 1;
  }
}

/**
 * Null Logger for testing
 */
export class NullLogger {
  log(_message: string): void {}
  error(_message: string): void {}
  warn(_message: string): void {}
  debug(_message: string): void {}
}
