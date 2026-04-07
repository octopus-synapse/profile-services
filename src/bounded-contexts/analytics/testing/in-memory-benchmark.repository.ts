/**
 * In-Memory Benchmark Repository
 *
 * Test implementation for BenchmarkService dependencies.
 * Stores resume analytics snapshots in memory for testing.
 */

export interface ResumeAnalyticsRecord {
  id?: string;
  resumeId?: string;
  atsScore: number;
  keywordScore?: number;
  completenessScore?: number;
  createdAt?: Date;
}

export class InMemoryBenchmarkRepository {
  private analytics: Map<string, ResumeAnalyticsRecord> = new Map();
  private idCounter = 0;

  /**
   * Mimics PrismaService.resumeAnalytics.findMany
   */
  async findMany(args?: {
    select?: Record<string, boolean>;
    where?: Record<string, unknown>;
  }): Promise<ResumeAnalyticsRecord[]> {
    let results = Array.from(this.analytics.values());

    // Apply filtering if where clause provided
    if (args?.where) {
      // Simple filtering implementation - extend as needed
      const whereClause = args.where;
      results = results.filter((record) => {
        for (const [key, value] of Object.entries(whereClause)) {
          if (record[key as keyof ResumeAnalyticsRecord] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    // Apply selection if select clause provided
    if (args?.select) {
      const selectClause = args.select;
      return results.map((record) => {
        const selected = Object.keys(selectClause).reduce<Partial<ResumeAnalyticsRecord>>(
          (acc, key) => {
            if (selectClause[key] && key in record) {
              const typedKey = key as keyof ResumeAnalyticsRecord;
              return { ...acc, [typedKey]: record[typedKey] };
            }
            return acc;
          },
          {},
        );
        return selected as ResumeAnalyticsRecord;
      });
    }

    return results;
  }

  /**
   * Seeds analytics data for testing
   */
  seedAnalytics(record: ResumeAnalyticsRecord): void {
    const id = record.id ?? `analytics-${++this.idCounter}`;
    this.analytics.set(id, {
      id,
      resumeId: record.resumeId ?? `resume-${this.idCounter}`,
      atsScore: record.atsScore,
      keywordScore: record.keywordScore ?? 0,
      completenessScore: record.completenessScore ?? 0,
      createdAt: record.createdAt ?? new Date(),
    });
  }

  /**
   * Seeds multiple analytics records at once
   */
  seedMultipleAnalytics(records: ResumeAnalyticsRecord[]): void {
    for (const record of records) {
      this.seedAnalytics(record);
    }
  }

  /**
   * Gets all analytics records (for test verification)
   */
  getAll(): ResumeAnalyticsRecord[] {
    return Array.from(this.analytics.values());
  }

  /**
   * Clears all data
   */
  clear(): void {
    this.analytics.clear();
    this.idCounter = 0;
  }
}
