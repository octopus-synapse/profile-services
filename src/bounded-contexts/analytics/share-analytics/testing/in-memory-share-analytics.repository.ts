/**
 * In-Memory Share Analytics Repository
 *
 * Test implementation of ShareAnalyticsRepositoryPort.
 * Stores data in memory for fast, isolated testing.
 *
 * Benefits:
 * - No database required for tests
 * - Fast execution (no I/O)
 * - Easy to seed test data
 * - Clear test isolation
 */

import type { AnalyticsEvent } from '../application/ports/share-analytics.port';
import type {
  CountryResult,
  CreateShareAnalyticsData,
  DetailedEventResult,
  EventCountResult,
  EventFilters,
  RecentEventResult,
  ShareAnalyticsRecord,
  ShareAnalyticsRepositoryPort,
  ShareWithOwner,
  UniqueViewResult,
} from '../ports';

export class InMemoryShareAnalyticsRepository implements ShareAnalyticsRepositoryPort {
  private analytics: Map<string, ShareAnalyticsRecord> = new Map();
  private shares: Map<string, ShareWithOwner> = new Map();
  private idCounter = 0;

  // =========================================================================
  // Repository Port Implementation
  // =========================================================================

  async create(data: CreateShareAnalyticsData): Promise<ShareAnalyticsRecord> {
    const id = `analytics-${++this.idCounter}`;
    const record: ShareAnalyticsRecord = {
      id,
      shareId: data.shareId,
      event: data.event,
      ipHash: data.ipHash,
      userAgent: data.userAgent ?? null,
      referer: data.referer ?? null,
      country: data.country ?? null,
      city: data.city ?? null,
      createdAt: new Date(),
    };
    this.analytics.set(id, record);
    return record;
  }

  async findShareWithOwner(shareId: string): Promise<ShareWithOwner | null> {
    return this.shares.get(shareId) ?? null;
  }

  async groupByEvent(shareId: string): Promise<EventCountResult[]> {
    const events = this.getAnalyticsForShare(shareId);
    const counts = new Map<AnalyticsEvent, number>();

    for (const record of events) {
      counts.set(record.event, (counts.get(record.event) ?? 0) + 1);
    }

    return Array.from(counts.entries()).map(([event, count]) => ({
      event,
      _count: { event: count },
    }));
  }

  async groupByIpHash(shareId: string): Promise<UniqueViewResult[]> {
    const events = this.getAnalyticsForShare(shareId).filter((e) => e.event === 'VIEW');
    const counts = new Map<string, number>();

    for (const record of events) {
      counts.set(record.ipHash, (counts.get(record.ipHash) ?? 0) + 1);
    }

    return Array.from(counts.entries()).map(([ipHash, count]) => ({
      ipHash,
      _count: { ipHash: count },
    }));
  }

  async groupByCountry(shareId: string, limit: number): Promise<CountryResult[]> {
    const events = this.getAnalyticsForShare(shareId).filter((e) => e.country !== null);
    const counts = new Map<string, number>();

    for (const record of events) {
      if (record.country) {
        counts.set(record.country, (counts.get(record.country) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([country, count]) => ({
        country,
        _count: { country: count },
      }))
      .sort((a, b) => b._count.country - a._count.country)
      .slice(0, limit);
  }

  async getRecentEvents(shareId: string, limit: number): Promise<RecentEventResult[]> {
    return this.getAnalyticsForShare(shareId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map(({ event, country, city, createdAt }) => ({
        event,
        country,
        city,
        createdAt,
      }));
  }

  async getDetailedEvents(shareId: string, filters?: EventFilters): Promise<DetailedEventResult[]> {
    let events = this.getAnalyticsForShare(shareId);

    if (filters?.startDate) {
      const start = filters.startDate;
      events = events.filter((e) => e.createdAt >= start);
    }

    if (filters?.endDate) {
      const end = filters.endDate;
      events = events.filter((e) => e.createdAt <= end);
    }

    if (filters?.eventType) {
      events = events.filter((e) => e.event === filters.eventType);
    }

    return events
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(({ event, ipHash, userAgent, referer, country, city, createdAt }) => ({
        event,
        ipHash,
        userAgent,
        referer,
        country,
        city,
        createdAt,
      }));
  }

  // =========================================================================
  // Test Helpers
  // =========================================================================

  /**
   * Seeds a share with owner information for testing
   */
  seedShare(share: ShareWithOwner): void {
    this.shares.set(share.id, share);
  }

  /**
   * Seeds analytics records for testing
   * Accepts a single record or an array of records
   */
  seedAnalytics(records: Partial<ShareAnalyticsRecord> | Partial<ShareAnalyticsRecord>[]): void {
    const recordsArray = Array.isArray(records) ? records : [records];
    for (const record of recordsArray) {
      const id = record.id ?? `analytics-${++this.idCounter}`;
      this.analytics.set(id, {
        id,
        shareId: record.shareId ?? '',
        event: record.event ?? 'VIEW',
        ipHash: record.ipHash ?? 'default-hash',
        userAgent: record.userAgent ?? null,
        referer: record.referer ?? null,
        country: record.country ?? null,
        city: record.city ?? null,
        createdAt: record.createdAt ?? new Date(),
      });
    }
  }

  /**
   * Gets all analytics records (for test verification)
   */
  getAll(): ShareAnalyticsRecord[] {
    return Array.from(this.analytics.values());
  }

  /**
   * Clears all data
   */
  clear(): void {
    this.analytics.clear();
    this.shares.clear();
    this.idCounter = 0;
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private getAnalyticsForShare(shareId: string): ShareAnalyticsRecord[] {
    return Array.from(this.analytics.values()).filter((a) => a.shareId === shareId);
  }
}
