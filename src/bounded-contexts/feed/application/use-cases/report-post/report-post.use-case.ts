/**
 * Create a moderation report on a post. Each user can only report a
 * given post once.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { PostReport } from '../../../domain/entities';
import { PostAlreadyReportedException } from '../../../domain/exceptions/feed.exceptions';
import { ReportRepositoryPort } from '../../../domain/ports/report.repository.port';

export class ReportPostUseCase {
  constructor(private readonly repository: ReportRepositoryPort) {}

  async execute(postId: string, userId: string, reason: string): Promise<PostReport> {
    const post = await this.repository.findPostById(postId);
    if (!post || post.isDeleted) {
      throw new EntityNotFoundException('Post', postId);
    }

    const existing = await this.repository.findReport(postId, userId);
    if (existing) {
      throw new PostAlreadyReportedException();
    }

    return this.repository.createReport(postId, userId, reason);
  }
}
