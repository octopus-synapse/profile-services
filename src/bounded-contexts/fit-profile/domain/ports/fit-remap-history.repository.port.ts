import type { FitVector } from '../types';

export interface FitRemapSnapshot {
  readonly id: string;
  readonly userId: string;
  readonly vector: FitVector;
  readonly snapshotAt: Date;
}

export abstract class FitRemapHistoryRepositoryPort {
  abstract append(userId: string, vector: FitVector): Promise<FitRemapSnapshot>;
  abstract listByUser(userId: string, limit: number): Promise<readonly FitRemapSnapshot[]>;
}
