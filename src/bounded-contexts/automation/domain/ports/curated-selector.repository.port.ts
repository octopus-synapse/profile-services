/**
 * Domain port for the curated-selector workflow's persistence concerns.
 *
 * P2-#24 (clean-arch fix): `CuratedSelectorService` used to import
 * `PrismaService` directly. Application services are POJOs; persistence
 * lives in adapters. The port surfaces only what the selector needs:
 *   - read the user's primary-resume id + structured `applyCriteria`
 *   - read the candidate-job pool the selector ranks against
 */

export interface CuratedSelectorUserView {
  primaryResumeId: string | null;
  applyCriteria: {
    remotePolicies?: string[] | null;
    paymentCurrencies?: string[] | null;
    stacks?: string[] | null;
  } | null;
}

export interface CuratedSelectorJobView {
  id: string;
  title: string | null;
  description: string | null;
  requirements: string[];
  skills: string[];
}

export interface CuratedSelectorJobQuery {
  userId: string;
  since: Date;
  remotePolicies?: string[];
  paymentCurrencies?: string[];
  stacks?: string[];
  limit: number;
}

export abstract class CuratedSelectorRepositoryPort {
  abstract findUserView(userId: string): Promise<CuratedSelectorUserView | null>;
  abstract listCandidateJobs(query: CuratedSelectorJobQuery): Promise<CuratedSelectorJobView[]>;
}
