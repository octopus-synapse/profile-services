/**
 * Report Service
 *
 * Handles post reporting for moderation.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  ConflictException,
  EntityNotFoundException,
} from '@/shared-kernel/exceptions/domain.exceptions';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a report for a post.
   * Each user can only report a post once (enforced by @@unique([postId, userId])).
   */
  async create(postId: string, userId: string, reason: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.isDeleted) {
      throw new EntityNotFoundException('Post', postId);
    }

    // Check if already reported by this user
    const existing = await this.prisma.postReport.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      throw new ConflictException('You have already reported this post');
    }

    return this.prisma.postReport.create({
      data: { postId, userId, reason },
    });
  }

  /**
   * Get all reports for a specific post (admin use).
   */
  async getByPost(postId: string) {
    return this.prisma.postReport.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
