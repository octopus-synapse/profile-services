/**
 * Resume Version Testing Module
 *
 * In-memory implementations for unit testing resume version use cases.
 * Following clean architecture - no Prisma, no mocks.
 */

import type { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';
import type {
  JsonValue,
  ResumeForSnapshot,
  ResumeVersionListItem,
  ResumeVersionRecord,
  ResumeVersionRepositoryPort,
} from '../ports/resume-version.port';

// ============================================================================
// In-Memory Repository
// ============================================================================

export class InMemoryResumeVersionRepository implements ResumeVersionRepositoryPort {
  private resumes = new Map<string, ResumeForSnapshot & { id: string }>();
  private versions = new Map<string, ResumeVersionRecord>();
  private versionsByResumeId = new Map<string, string[]>();

  async findResumeForSnapshot(resumeId: string): Promise<ResumeForSnapshot | null> {
    return this.resumes.get(resumeId) ?? null;
  }

  async findLastVersionNumber(resumeId: string): Promise<number | null> {
    const versionIds = this.versionsByResumeId.get(resumeId) ?? [];
    if (versionIds.length === 0) return null;

    const versions = versionIds
      .map((id) => this.versions.get(id))
      .filter(Boolean) as ResumeVersionRecord[];

    if (versions.length === 0) return null;

    return Math.max(...versions.map((v) => v.versionNumber));
  }

  async createResumeVersion(data: {
    resumeId: string;
    versionNumber: number;
    snapshot: unknown;
    label?: string;
  }): Promise<ResumeVersionRecord> {
    const id = `version-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const record: ResumeVersionRecord = {
      id,
      resumeId: data.resumeId,
      versionNumber: data.versionNumber,
      snapshot: data.snapshot as JsonValue,
      label: data.label ?? null,
      createdAt: new Date(),
    };

    this.versions.set(id, record);

    const existing = this.versionsByResumeId.get(data.resumeId) ?? [];
    this.versionsByResumeId.set(data.resumeId, [...existing, id]);

    return record;
  }

  async findResumeOwner(resumeId: string): Promise<{ userId: string } | null> {
    const resume = this.resumes.get(resumeId);
    return resume ? { userId: resume.userId } : null;
  }

  async findResumeVersions(resumeId: string): Promise<ResumeVersionListItem[]> {
    const versionIds = this.versionsByResumeId.get(resumeId) ?? [];
    const versions = versionIds
      .map((id) => this.versions.get(id))
      .filter(Boolean) as ResumeVersionRecord[];
    return versions
      .map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        label: v.label,
        createdAt: v.createdAt,
      }))
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  async findResumeVersionById(versionId: string): Promise<ResumeVersionRecord | null> {
    return this.versions.get(versionId) ?? null;
  }

  async updateResumeFromSnapshot(
    _resumeId: string,
    _snapshot: Record<string, unknown>,
  ): Promise<void> {
    // In-memory: no-op for testing
  }

  async findVersionIdsByResumeIdDesc(resumeId: string): Promise<string[]> {
    const versionIds = this.versionsByResumeId.get(resumeId) ?? [];
    const versions = versionIds
      .map((id) => this.versions.get(id))
      .filter(Boolean) as ResumeVersionRecord[];

    return versions.sort((a, b) => b.versionNumber - a.versionNumber).map((v) => v.id);
  }

  async deleteVersionsByIds(ids: string[]): Promise<void> {
    for (const id of ids) {
      const version = this.versions.get(id);
      if (version) {
        this.versions.delete(id);
        const resumeVersions = this.versionsByResumeId.get(version.resumeId);
        if (resumeVersions) {
          this.versionsByResumeId.set(
            version.resumeId,
            resumeVersions.filter((vid) => vid !== id),
          );
        }
      }
    }
  }

  // ========== Test Helpers ==========

  seedResume(resume: ResumeForSnapshot & { id: string }): void {
    this.resumes.set(resume.id, resume);
  }

  seedVersion(version: ResumeVersionRecord): void {
    this.versions.set(version.id, version);
    const existing = this.versionsByResumeId.get(version.resumeId) ?? [];
    if (!existing.includes(version.id)) {
      this.versionsByResumeId.set(version.resumeId, [...existing, version.id]);
    }
  }

  getVersion(id: string): ResumeVersionRecord | undefined {
    return this.versions.get(id);
  }

  getAllVersions(): ResumeVersionRecord[] {
    return Array.from(this.versions.values());
  }

  clear(): void {
    this.resumes.clear();
    this.versions.clear();
    this.versionsByResumeId.clear();
  }
}

// ============================================================================
// In-Memory Event Publisher
// ============================================================================

export class InMemoryResumeEventPublisher implements ResumeEventPublisher {
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

  // ========== Test Helpers ==========

  getEvents(): Array<{ type: string; resumeId: string; payload: unknown }> {
    return [...this.events];
  }

  getVersionCreatedEvents(): Array<{
    resumeId: string;
    userId: string;
    versionNumber: number;
  }> {
    return this.events
      .filter((e) => e.type === 'version_created')
      .map((e) => ({
        resumeId: e.resumeId,
        ...(e.payload as { userId: string; versionNumber: number }),
      }));
  }

  getVersionRestoredEvents(): Array<{
    resumeId: string;
    userId: string;
    restoredFromVersion: number;
  }> {
    return this.events
      .filter((e) => e.type === 'version_restored')
      .map((e) => ({
        resumeId: e.resumeId,
        ...(e.payload as { userId: string; restoredFromVersion: number }),
      }));
  }

  clear(): void {
    this.events = [];
  }
}
