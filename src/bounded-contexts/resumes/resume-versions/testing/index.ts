/**
 * In-memory test doubles for the resume-versions BC.
 *
 * - `InMemoryResumeVersionsRepository` covers both versioning and tailor
 *   reads/writes against process-local maps so use cases stay testable
 *   without Prisma.
 * - `InMemoryResumeEventPublisher` records every publishX call; tests
 *   inspect `getEvents()` / `getVersionCreatedEvents()` directly.
 * - `StubResumeTailorLlm` lets tailor specs swap a deterministic LLM in.
 */

import type { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';
import type {
  JsonValue,
  ResumeForSnapshot,
  ResumeVersionListItem,
  ResumeVersionRecord,
} from '../domain/entities/resume-version';
import type {
  JobForTailor,
  ResumeForTailor,
  TailoredVersionSummary,
} from '../domain/entities/tailor';
import {
  ResumeTailorLlmPort,
  type TailorLlmInput,
  type TailorLlmOutput,
} from '../domain/ports/resume-tailor-llm.port';
import { ResumeVersionsRepositoryPort } from '../domain/ports/resume-versions.repository.port';

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class InMemoryResumeVersionsRepository extends ResumeVersionsRepositoryPort {
  private snapshotResumes = new Map<string, ResumeForSnapshot & { id: string }>();
  private tailorResumes = new Map<string, ResumeForTailor>();
  private versions = new Map<
    string,
    ResumeVersionRecord & { isTailored: boolean; tailoredJobId: string | null }
  >();
  private versionsByResumeId = new Map<string, string[]>();
  private jobs = new Map<string, JobForTailor>();

  async findResumeForSnapshot(resumeId: string): Promise<ResumeForSnapshot | null> {
    return this.snapshotResumes.get(resumeId) ?? null;
  }

  async findLastVersionNumber(resumeId: string): Promise<number | null> {
    const ids = this.versionsByResumeId.get(resumeId) ?? [];
    if (ids.length === 0) return null;
    const numbers = ids
      .map((id) => this.versions.get(id))
      .filter(Boolean)
      .map((v) => (v as ResumeVersionRecord).versionNumber);
    if (numbers.length === 0) return null;
    return Math.max(...numbers);
  }

  async createResumeVersion(data: {
    resumeId: string;
    versionNumber: number;
    snapshot: Record<string, unknown>;
    label?: string;
    isTailored?: boolean;
    tailoredJobId?: string | null;
  }): Promise<ResumeVersionRecord> {
    const id = `version-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const record = {
      id,
      resumeId: data.resumeId,
      versionNumber: data.versionNumber,
      snapshot: data.snapshot as JsonValue,
      label: data.label ?? null,
      createdAt: new Date(),
      isTailored: data.isTailored ?? false,
      tailoredJobId: data.tailoredJobId ?? null,
    };
    this.versions.set(id, record);
    const existing = this.versionsByResumeId.get(data.resumeId) ?? [];
    this.versionsByResumeId.set(data.resumeId, [...existing, id]);
    return {
      id: record.id,
      resumeId: record.resumeId,
      versionNumber: record.versionNumber,
      snapshot: record.snapshot,
      label: record.label,
      createdAt: record.createdAt,
    };
  }

  async createNextResumeVersion(
    resumeId: string,
    data: {
      snapshot: Record<string, unknown>;
      label?: string;
      isTailored?: boolean;
      tailoredJobId?: string | null;
    },
  ): Promise<ResumeVersionRecord> {
    // Mirrors the adapter's compute-then-insert. The in-memory store is
    // single-threaded so the retry loop never trips here; the race
    // coverage lives in the integration spec.
    const last = await this.findLastVersionNumber(resumeId);
    const versionNumber = (last ?? 0) + 1;
    return this.createResumeVersion({
      resumeId,
      versionNumber,
      snapshot: data.snapshot,
      label: data.label,
      isTailored: data.isTailored,
      tailoredJobId: data.tailoredJobId,
    });
  }

  async findResumeOwner(resumeId: string): Promise<{ userId: string } | null> {
    const snap = this.snapshotResumes.get(resumeId);
    if (snap) return { userId: snap.userId };
    const tailor = this.tailorResumes.get(resumeId);
    if (tailor) return { userId: tailor.userId };
    return null;
  }

  async findResumeVersions(resumeId: string): Promise<ResumeVersionListItem[]> {
    const ids = this.versionsByResumeId.get(resumeId) ?? [];
    return ids
      .map((id) => this.versions.get(id))
      .filter(Boolean)
      .map((v) => {
        const r = v as ResumeVersionRecord;
        return {
          id: r.id,
          versionNumber: r.versionNumber,
          label: r.label,
          createdAt: r.createdAt,
        };
      })
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  async findResumeVersionById(versionId: string): Promise<ResumeVersionRecord | null> {
    const v = this.versions.get(versionId);
    if (!v) return null;
    return {
      id: v.id,
      resumeId: v.resumeId,
      versionNumber: v.versionNumber,
      snapshot: v.snapshot,
      label: v.label,
      createdAt: v.createdAt,
    };
  }

  readonly capturedRestoreSnapshots: Array<{
    resumeId: string;
    snapshot: Record<string, unknown>;
  }> = [];

  async updateResumeFromSnapshot(
    resumeId: string,
    snapshot: Record<string, unknown>,
  ): Promise<void> {
    this.capturedRestoreSnapshots.push({ resumeId, snapshot });
  }

  async findVersionIdsByResumeIdDesc(resumeId: string): Promise<string[]> {
    const ids = this.versionsByResumeId.get(resumeId) ?? [];
    return ids
      .map((id) => this.versions.get(id))
      .filter(Boolean)
      .map((v) => v as ResumeVersionRecord)
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .map((v) => v.id);
  }

  async deleteVersionsByIds(ids: string[]): Promise<void> {
    for (const id of ids) {
      const v = this.versions.get(id);
      if (!v) continue;
      this.versions.delete(id);
      const others = this.versionsByResumeId.get(v.resumeId) ?? [];
      this.versionsByResumeId.set(
        v.resumeId,
        others.filter((x) => x !== id),
      );
    }
  }

  async findResumeForTailor(resumeId: string): Promise<ResumeForTailor | null> {
    return this.tailorResumes.get(resumeId) ?? null;
  }

  async findJobById(jobId: string): Promise<JobForTailor | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async findTailoredVersions(resumeId: string): Promise<TailoredVersionSummary[]> {
    const ids = this.versionsByResumeId.get(resumeId) ?? [];
    return ids
      .map((id) => this.versions.get(id))
      .filter(
        (v): v is NonNullable<typeof v> => Boolean(v) && (v as { isTailored: boolean }).isTailored,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        label: v.label,
        createdAt: v.createdAt,
        tailoredJobId: v.tailoredJobId,
      }));
  }

  // ---- Test helpers ----

  seedResume(resume: ResumeForSnapshot & { id: string }): void {
    this.snapshotResumes.set(resume.id, resume);
  }

  seedTailorResume(resume: ResumeForTailor): void {
    this.tailorResumes.set(resume.id, resume);
    if (!this.snapshotResumes.has(resume.id)) {
      this.snapshotResumes.set(resume.id, {
        id: resume.id,
        userId: resume.userId,
        resumeSections: resume.resumeSections.map((s) => ({
          sectionType: { semanticKind: s.sectionType.semanticKind },
          items: s.items.map((i) => ({ content: i.content as JsonValue })),
        })),
      });
    }
  }

  seedJob(jobId: string, job: JobForTailor): void {
    this.jobs.set(jobId, job);
  }

  seedVersion(
    version: ResumeVersionRecord & { isTailored?: boolean; tailoredJobId?: string | null },
  ): void {
    this.versions.set(version.id, {
      ...version,
      isTailored: version.isTailored ?? false,
      tailoredJobId: version.tailoredJobId ?? null,
    });
    const existing = this.versionsByResumeId.get(version.resumeId) ?? [];
    if (!existing.includes(version.id)) {
      this.versionsByResumeId.set(version.resumeId, [...existing, version.id]);
    }
  }

  getAllVersions(): ResumeVersionRecord[] {
    return Array.from(this.versions.values()).map((v) => ({
      id: v.id,
      resumeId: v.resumeId,
      versionNumber: v.versionNumber,
      snapshot: v.snapshot,
      label: v.label,
      createdAt: v.createdAt,
    }));
  }

  clear(): void {
    this.snapshotResumes.clear();
    this.tailorResumes.clear();
    this.versions.clear();
    this.versionsByResumeId.clear();
    this.jobs.clear();
  }
}

// ---------------------------------------------------------------------------
// Event publisher
// ---------------------------------------------------------------------------

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

  async publishResumeCreatedAsync(resumeId: string, payload: unknown): Promise<void> {
    this.events.push({ type: 'resume_created', resumeId, payload });
  }

  async publishResumeDeletedAsync(resumeId: string, payload: unknown): Promise<void> {
    this.events.push({ type: 'resume_deleted', resumeId, payload });
  }

  async publishResumeDuplicatedAsync(resumeId: string, payload: unknown): Promise<void> {
    this.events.push({ type: 'resume_duplicated', resumeId, payload });
  }

  async publishVersionCreatedAsync(resumeId: string, payload: unknown): Promise<void> {
    this.events.push({ type: 'version_created', resumeId, payload });
  }

  async publishVersionRestoredAsync(resumeId: string, payload: unknown): Promise<void> {
    this.events.push({ type: 'version_restored', resumeId, payload });
  }

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

// ---------------------------------------------------------------------------
// LLM stub
// ---------------------------------------------------------------------------

export class StubResumeTailorLlm extends ResumeTailorLlmPort {
  constructor(private readonly impl: (input: TailorLlmInput) => TailorLlmOutput) {
    super();
  }

  async tailorResume(input: TailorLlmInput): Promise<TailorLlmOutput> {
    return this.impl(input);
  }
}
