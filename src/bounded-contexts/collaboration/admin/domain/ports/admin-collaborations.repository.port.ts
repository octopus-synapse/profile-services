/**
 * Outbound port for admin resume-collaboration reads. Mirrors the
 * controller surface: aggregate stats plus a paginated list of
 * collaborator records.
 */

import type { PaginatedResult } from '@/shared-kernel/database';

export interface CollaborationsByRole {
  readonly role: string;
  readonly count: number;
}

export interface AdminCollaborationsStats {
  readonly totalCollaborations: number;
  readonly byRole: CollaborationsByRole[];
}

export interface CollaboratorUserView {
  readonly id: string;
  readonly name: string | null;
  readonly email: string;
}

export interface CollaboratorResumeView {
  readonly id: string;
  readonly title: string | null;
}

export interface AdminCollaborationView {
  readonly id: string;
  readonly resumeId: string;
  readonly userId: string;
  readonly role: string;
  readonly invitedBy: string;
  readonly invitedAt: Date;
  readonly joinedAt: Date | null;
  readonly user: CollaboratorUserView;
  readonly resume: CollaboratorResumeView;
}

export interface ListCollaborationsQuery {
  readonly page?: number;
  readonly pageSize?: number;
}

export abstract class AdminCollaborationsRepositoryPort {
  abstract getStats(): Promise<AdminCollaborationsStats>;
  abstract listCollaborations(
    query: ListCollaborationsQuery,
  ): Promise<PaginatedResult<AdminCollaborationView>>;
  abstract removeCollaborator(resumeId: string, userId: string): Promise<void>;
}
