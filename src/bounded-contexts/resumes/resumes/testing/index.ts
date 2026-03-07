/**
 * Resumes Testing Module
 *
 * In-memory implementations for unit testing resumes service.
 * Following clean architecture - no Prisma, no mocks.
 */

import type { CreateResumeData, UpdateResumeData } from '@/shared-kernel';
import type { ResumeEventPublisher } from '../../domain/ports';
import { ResumeVersionServicePort } from '../ports/resume-version-service.port';
import { type ResumeEntity, ResumesRepositoryPort } from '../ports/resumes-repository.port';
import { ResumesService } from '../resumes.service';

export type { ResumeEntity };

// Type for seeding resumes - accepts broader input
type SeedResumeInput = {
  id: string;
  userId: string;
  title?: string | null;
  summary?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: unknown; // Allow extra fields from full Resume type
};

// ============================================================================
// In-Memory Repository
// ============================================================================

export class InMemoryResumesRepository extends ResumesRepositoryPort {
  private resumes = new Map<string, ResumeEntity>();

  async findAllUserResumes(userId: string): Promise<ResumeEntity[]> {
    return Array.from(this.resumes.values()).filter((r) => r.userId === userId);
  }

  async findAllUserResumesPaginated(
    userId: string,
    skip: number,
    take: number,
  ): Promise<ResumeEntity[]> {
    const all = await this.findAllUserResumes(userId);
    return all.slice(skip, skip + take);
  }

  async findResumeByIdAndUserId(id: string, userId: string): Promise<ResumeEntity | null> {
    const resume = this.resumes.get(id);
    if (resume && resume.userId === userId) {
      return resume;
    }
    return null;
  }

  async findResumeByUserId(userId: string): Promise<ResumeEntity | null> {
    const userResumes = await this.findAllUserResumes(userId);
    return userResumes[0] ?? null;
  }

  async countUserResumes(userId: string): Promise<number> {
    const resumes = await this.findAllUserResumes(userId);
    return resumes.length;
  }

  async createResumeForUser(userId: string, data: CreateResumeData): Promise<ResumeEntity> {
    const id = `resume-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const resume: ResumeEntity = {
      id,
      userId,
      title: data.title ?? null,
      summary: data.summary ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.resumes.set(id, resume);
    return resume;
  }

  async updateResumeForUser(
    id: string,
    userId: string,
    data: UpdateResumeData,
  ): Promise<ResumeEntity | null> {
    const resume = this.resumes.get(id);
    if (!resume || resume.userId !== userId) {
      return null;
    }
    const updated: ResumeEntity = {
      ...resume,
      title: data.title !== undefined ? (data.title ?? null) : resume.title,
      summary: data.summary !== undefined ? (data.summary ?? null) : resume.summary,
      updatedAt: new Date(),
    };
    this.resumes.set(id, updated);
    return updated;
  }

  async deleteResumeForUser(id: string, userId: string): Promise<boolean> {
    const resume = this.resumes.get(id);
    if (!resume || resume.userId !== userId) {
      return false;
    }
    this.resumes.delete(id);
    return true;
  }

  // ========== Test Helpers ==========

  seedResume(input: SeedResumeInput): void {
    const resume: ResumeEntity = {
      id: input.id,
      userId: input.userId,
      title: input.title ?? null,
      summary: input.summary ?? null,
      createdAt: input.createdAt ?? new Date(),
      updatedAt: input.updatedAt ?? new Date(),
    };
    this.resumes.set(resume.id, resume);
  }

  getResume(id: string): ResumeEntity | undefined {
    return this.resumes.get(id);
  }

  getAllResumes(): ResumeEntity[] {
    return Array.from(this.resumes.values());
  }

  clear(): void {
    this.resumes.clear();
  }
}

// ============================================================================
// In-Memory Version Service (Stub)
// ============================================================================

export class StubResumeVersionService extends ResumeVersionServicePort {
  private snapshots: Array<{ resumeId: string; label?: string }> = [];

  async createSnapshot(resumeId: string, label?: string): Promise<void> {
    this.snapshots.push({ resumeId, label });
  }

  async getVersions(
    _resumeId: string,
    _userId: string,
  ): Promise<
    Array<{
      id: string;
      versionNumber: number;
      label: string | null;
      createdAt: Date;
    }>
  > {
    return [];
  }

  async restoreVersion(
    _resumeId: string,
    _versionId: string,
    _userId: string,
  ): Promise<{ restoredFrom: Date }> {
    return { restoredFrom: new Date() };
  }

  // Test helpers
  getSnapshots() {
    return [...this.snapshots];
  }

  clear(): void {
    this.snapshots = [];
  }
}

// ============================================================================
// In-Memory Event Publisher
// ============================================================================

export class InMemoryResumesEventPublisher implements ResumeEventPublisher {
  private events: Array<{ type: string; resumeId: string; payload: unknown }> = [];

  publishResumeCreated(resumeId: string, payload: unknown): void {
    this.events.push({ type: 'resume_created', resumeId, payload });
  }

  publishResumeUpdated(resumeId: string, payload: unknown): void {
    this.events.push({ type: 'resume_updated', resumeId, payload });
  }

  publishResumeDeleted(resumeId: string, payload: unknown): void {
    this.events.push({ type: 'resume_deleted', resumeId, payload });
  }

  publishSectionAdded(resumeId: string, payload: unknown): void {
    this.events.push({ type: 'section_added', resumeId, payload });
  }

  publishSectionUpdated(resumeId: string, payload: unknown): void {
    this.events.push({ type: 'section_updated', resumeId, payload });
  }

  publishSectionRemoved(resumeId: string, payload: unknown): void {
    this.events.push({ type: 'section_removed', resumeId, payload });
  }

  publishVersionCreated(resumeId: string, payload: unknown): void {
    this.events.push({ type: 'version_created', resumeId, payload });
  }

  publishVersionRestored(resumeId: string, payload: unknown): void {
    this.events.push({ type: 'version_restored', resumeId, payload });
  }

  // Test helpers
  getEvents() {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}

// ============================================================================
// Type-Safe Service Factory
// ============================================================================

/**
 * Create a ResumesService instance with test doubles.
 * All test doubles extend their respective ports, so no type assertions needed.
 */
export function createTestResumesService(
  repository: InMemoryResumesRepository,
  versionService: StubResumeVersionService,
  eventPublisher: InMemoryResumesEventPublisher,
): ResumesService {
  return new ResumesService(repository, versionService, eventPublisher);
}
