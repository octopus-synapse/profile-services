export interface ViewCareerGraphInput {
  readonly requesterId: string;
  readonly stack: ReadonlyArray<string>;
  readonly maxBuckets: number;
}

export interface CareerGraphBucketOutput {
  readonly experienceYears: number;
  readonly peerCount: number;
  readonly topJobTitles: ReadonlyArray<{ title: string; count: number }>;
}

export interface CareerGraphProjectionOutput {
  readonly yearsAhead: number;
  readonly bucket: CareerGraphBucketOutput | null;
}

export interface ViewCareerGraphOutput {
  readonly stack: ReadonlyArray<string>;
  readonly user: { readonly experienceYears: number; readonly jobTitle: string | null };
  readonly totalPeers: number;
  readonly current: CareerGraphBucketOutput | null;
  readonly buckets: ReadonlyArray<CareerGraphBucketOutput>;
  readonly projections: ReadonlyArray<CareerGraphProjectionOutput>;
}
