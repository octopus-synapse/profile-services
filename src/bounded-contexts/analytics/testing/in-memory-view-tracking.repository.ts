/**
 * In-Memory View Tracking Repository
 *
 * Test implementation for ViewTrackingService dependencies.
 * Stores resume view events in memory for testing.
 */

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

export class InMemoryViewTrackingRepository {
  private viewEvents: Map<string, ViewEventRecord> = new Map();
  private idCounter = 0;

  /**
   * Mimics PrismaService.resumeViewEvent.create
   */
  async create(args: {
    data: {
      resumeId: string;
      ipHash: string;
      userAgent?: string;
      referer?: string;
      country?: string;
      city?: string;
      source: string;
    };
  }): Promise<ViewEventRecord> {
    const id = `view-${++this.idCounter}`;
    const event: ViewEventRecord = {
      id,
      resumeId: args.data.resumeId,
      ipHash: args.data.ipHash,
      userAgent: args.data.userAgent ?? null,
      referer: args.data.referer ?? null,
      country: args.data.country ?? null,
      city: args.data.city ?? null,
      source: args.data.source,
      createdAt: new Date(),
    };
    this.viewEvents.set(id, event);
    return event;
  }

  /**
   * Mimics PrismaService.resumeViewEvent.count
   */
  async count(args?: {
    where?: { resumeId?: string; createdAt?: { gte?: Date; lte?: Date } };
  }): Promise<number> {
    let results = Array.from(this.viewEvents.values());

    if (args?.where?.resumeId) {
      results = results.filter((e) => e.resumeId === args.where?.resumeId);
    }
    const gteDate = args?.where?.createdAt?.gte;
    if (gteDate) {
      results = results.filter((e) => e.createdAt >= gteDate);
    }
    const lteDate = args?.where?.createdAt?.lte;
    if (lteDate) {
      results = results.filter((e) => e.createdAt <= lteDate);
    }

    return results.length;
  }

  /**
   * Mimics PrismaService.resumeViewEvent.groupBy
   */
  async groupBy(args: {
    by: string[];
    where?: { resumeId?: string; createdAt?: { gte?: Date; lte?: Date } };
  }): Promise<Array<{ ipHash: string }>> {
    let results = Array.from(this.viewEvents.values());

    if (args.where?.resumeId) {
      results = results.filter((e) => e.resumeId === args.where?.resumeId);
    }
    const groupGteDate = args.where?.createdAt?.gte;
    if (groupGteDate) {
      results = results.filter((e) => e.createdAt >= groupGteDate);
    }
    const groupLteDate = args.where?.createdAt?.lte;
    if (groupLteDate) {
      results = results.filter((e) => e.createdAt <= groupLteDate);
    }

    // Group by ipHash (simplified - assumes groupBy is always by ipHash)
    const uniqueIpHashes = new Set(results.map((e) => e.ipHash));
    return Array.from(uniqueIpHashes).map((ipHash) => ({ ipHash }));
  }

  /**
   * Seeds a view event for testing
   */
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

  /**
   * Seeds multiple view events at once
   */
  seedViewEvents(events: Partial<ViewEventRecord>[]): void {
    for (const event of events) {
      this.seedViewEvent(event);
    }
  }

  /**
   * Gets all view events (for test verification)
   */
  getAll(): ViewEventRecord[] {
    return Array.from(this.viewEvents.values());
  }

  /**
   * Clears all data
   */
  clear(): void {
    this.viewEvents.clear();
    this.idCounter = 0;
  }
}
