/**
 * Outbound port for post-report persistence (moderation queue).
 */

import type { Post, PostReport } from '../entities';

export abstract class ReportRepositoryPort {
  abstract findPostById(id: string): Promise<Post | null>;
  abstract findReport(postId: string, userId: string): Promise<PostReport | null>;
  abstract createReport(postId: string, userId: string, reason: string): Promise<PostReport>;
  abstract listReportsByPost(postId: string): Promise<PostReport[]>;
}
