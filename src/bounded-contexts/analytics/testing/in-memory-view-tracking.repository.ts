/**
 * In-Memory View Tracking Repository
 *
 * Port-level fake for ViewTrackingRepositoryPort.
 */

import { ViewTrackingRepositoryPort } from '../resume-analytics/application/ports/resume-analytics.port';

export interface ViewEventRecord {
  id: string;
  resumeId: string;
  ipHash: string;
  userAgent: string | null;
  referer: string | null;
  country: string | null;
  city: string | null;
  source: string;
  createdAt: Date;
}

export class InMemoryViewTrackingRepository extends ViewTrackingRepositoryPort {
  private viewEvents: Map<string, ViewEventRecord> = new Map();
  private idCounter = 0;

  async trackView(data: {
    resumeId: string;
    ipHash: string;
    userAgent?: string;
    referer?: string;
    country?: string;
    city?: string;
    source: string;
  }): Promise<void> {
    const id = `view-${++this.idCounter}`;
    this.viewEvents.set(id, {
      id,
      resumeId: data.resumeId,
      ipHash: data.ipHash,
      userAgent: data.userAgent ?? null,
      referer: data.referer ?? null,
      country: data.country ?? null,
      city: data.city ?? null,
      source: data.source,
      createdAt: new Date(),
    });
  }

  async countViews(resumeId: string, startDate: Date, endDate: Date): Promise<number> {
    return Array.from(this.viewEvents.values()).filter(
      (e) => e.resumeId === resumeId && e.createdAt >= startDate && e.createdAt <= endDate,
    ).length;
  }

  async countUniqueVisitors(resumeId: string, startDate: Date, endDate: Date): Promise<number> {
    const filtered = Array.from(this.viewEvents.values()).filter(
      (e) => e.resumeId === resumeId && e.createdAt >= startDate && e.createdAt <= endDate,
    );
    return new Set(filtered.map((e) => e.ipHash)).size;
  }

  seedViewEvent(event: Partial<ViewEventRecord>): void {
    const id = event.id ?? `view-${++this.idCounter}`;
    this.viewEvents.set(id, {
      id,
      resumeId: event.resumeId ?? 'resume-1',
      ipHash: event.ipHash ?? 'default-hash',
      userAgent: event.userAgent ?? null,
      referer: event.referer ?? null,
      country: event.country ?? null,
      city: event.city ?? null,
      source: event.source ?? 'direct',
      createdAt: event.createdAt ?? new Date(),
    });
  }

  seedViewEvents(events: Partial<ViewEventRecord>[]): void {
    for (const event of events) {
      this.seedViewEvent(event);
    }
  }

  getAll(): ViewEventRecord[] {
    return Array.from(this.viewEvents.values());
  }

  clear(): void {
    this.viewEvents.clear();
    this.idCounter = 0;
  }
}
