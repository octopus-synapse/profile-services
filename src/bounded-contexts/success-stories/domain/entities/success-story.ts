/**
 * Domain shapes for the success-stories carousel.
 *
 * `SuccessStoryView` is the flat row the public landing carousel
 * consumes — no further joins needed. `SuccessStoryRecord` is the
 * persisted shape returned by mutating use cases (create/update); we
 * keep the bare minimum the controllers actually echo back to clients
 * to avoid leaking the Prisma type across the domain boundary.
 */

import type { SuccessStoryStatus } from '@prisma/client';

export interface SuccessStoryAuthorView {
  readonly name: string | null;
  readonly username: string | null;
  readonly photoURL: string | null;
}

export interface SuccessStoryView {
  readonly id: string;
  readonly userId: string;
  readonly headline: string;
  readonly beforeText: string;
  readonly afterText: string;
  readonly quote: string;
  readonly timeframeDays: number | null;
  readonly publishedAt: string | null;
  readonly user: SuccessStoryAuthorView;
}

export interface SuccessStoryRecord {
  readonly id: string;
  readonly userId: string;
  readonly status: SuccessStoryStatus;
}

export interface CreateSuccessStoryInput {
  readonly userId: string;
  readonly headline: string;
  readonly beforeText: string;
  readonly afterText: string;
  readonly quote: string;
  readonly timeframeDays?: number;
  readonly weight?: number;
  readonly status?: SuccessStoryStatus;
}

export interface UpdateSuccessStoryInput {
  readonly headline?: string;
  readonly beforeText?: string;
  readonly afterText?: string;
  readonly quote?: string;
  readonly timeframeDays?: number;
  readonly weight?: number;
  readonly status?: SuccessStoryStatus;
}
