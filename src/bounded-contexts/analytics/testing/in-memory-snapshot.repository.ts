/**
 * In-Memory Snapshot Repository
 *
 * Test implementation for SnapshotService dependencies.
 * Stores resume analytics snapshots in memory for testing.
 */

export interface SnapshotRecord {
  id: string;
  resumeId: string;
  atsScore: number;
  keywordScore: number;
  completenessScore: number;
  industryRank: number | null;
  totalInIndustry: number | null;
  topKeywords: string[];
  missingKeywords: string[];
  createdAt: Date;
}

export class InMemorySnapshotRepository {
  private snapshots: Map<string, SnapshotRecord> = new Map();
  private idCounter = 0;

  /**
   * Mimics PrismaService.resumeAnalytics.create
   */
  async create(args: {
    data: {
      resumeId: string;
      atsScore: number;
      keywordScore: number;
      completenessScore: number;
      topKeywords?: string[];
      missingKeywords?: string[];
      improvementSuggestions?: string[];
    };
  }): Promise<SnapshotRecord> {
    const id = `snapshot-${++this.idCounter}`;
    const snapshot: SnapshotRecord = {
      id,
      resumeId: args.data.resumeId,
      atsScore: args.data.atsScore,
      keywordScore: args.data.keywordScore,
      completenessScore: args.data.completenessScore,
      industryRank: null,
      totalInIndustry: null,
      topKeywords: args.data.topKeywords ?? [],
      missingKeywords: args.data.missingKeywords ?? [],
      createdAt: new Date(),
    };
    this.snapshots.set(id, snapshot);
    return snapshot;
  }

  /**
   * Mimics PrismaService.resumeAnalytics.findMany
   */
  async findMany(args: {
    where?: { resumeId?: string; createdAt?: { gte?: Date } };
    orderBy?: { createdAt?: 'asc' | 'desc' };
    take?: number;
    select?: Record<string, boolean>;
  }): Promise<SnapshotRecord[] | Array<{ atsScore: number; createdAt: Date }>> {
    let results = Array.from(this.snapshots.values());

    // Apply filtering
    if (args.where?.resumeId) {
      results = results.filter((s) => s.resumeId === args.where?.resumeId);
    }
    const gteDate = args.where?.createdAt?.gte;
    if (gteDate) {
      results = results.filter((s) => s.createdAt >= gteDate);
    }

    // Apply sorting
    if (args.orderBy?.createdAt) {
      results.sort((a, b) => {
        const diff = a.createdAt.getTime() - b.createdAt.getTime();
        return args.orderBy?.createdAt === 'desc' ? -diff : diff;
      });
    }

    // Apply limit
    if (args.take) {
      results = results.slice(0, args.take);
    }

    // Apply selection
    const selectClause = args.select;
    if (selectClause) {
      return results.map((s) => {
        const selected: Record<string, unknown> = {};
        for (const key of Object.keys(selectClause)) {
          if (selectClause[key] && key in s) {
            selected[key] = s[key as keyof SnapshotRecord];
          }
        }
        return selected as { atsScore: number; createdAt: Date };
      });
    }

    return results;
  }

  /**
   * Seeds a snapshot for testing
   */
  seedSnapshot(snapshot: Partial<SnapshotRecord>): void {
    const id = snapshot.id ?? `snapshot-${++this.idCounter}`;
    this.snapshots.set(id, {
      id,
      resumeId: snapshot.resumeId ?? 'resume-1',
      atsScore: snapshot.atsScore ?? 0,
      keywordScore: snapshot.keywordScore ?? 0,
      completenessScore: snapshot.completenessScore ?? 0,
      industryRank: snapshot.industryRank ?? null,
      totalInIndustry: snapshot.totalInIndustry ?? null,
      topKeywords: snapshot.topKeywords ?? [],
      missingKeywords: snapshot.missingKeywords ?? [],
      createdAt: snapshot.createdAt ?? new Date(),
    });
  }

  /**
   * Seeds multiple snapshots at once
   */
  seedSnapshots(snapshots: Partial<SnapshotRecord>[]): void {
    for (const snapshot of snapshots) {
      this.seedSnapshot(snapshot);
    }
  }

  /**
   * Gets all snapshots (for test verification)
   */
  getAll(): SnapshotRecord[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * Clears all data
   */
  clear(): void {
    this.snapshots.clear();
    this.idCounter = 0;
  }
}
