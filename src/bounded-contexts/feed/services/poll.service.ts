/**
 * Poll Service
 *
 * Handles poll voting, results, and vote checking on posts.
 */

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class PollService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vote on a poll. Fails if user has already voted.
   */
  async vote(postId: string, userId: string, optionIndex: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundException('Post not found');
    }

    // Check if already voted
    const existing = await this.prisma.pollVote.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      throw new ConflictException('You have already voted on this poll');
    }

    const vote = await this.prisma.pollVote.create({
      data: { postId, userId, optionIndex },
    });

    return vote;
  }

  /**
   * Get poll results grouped by optionIndex.
   */
  async getResults(postId: string) {
    const votes = await this.prisma.pollVote.groupBy({
      by: ['optionIndex'],
      where: { postId },
      _count: { id: true },
    });

    const totalVotes = votes.reduce((sum, v) => sum + v._count.id, 0);

    const results = votes.map((v) => ({
      optionIndex: v.optionIndex,
      count: v._count.id,
    }));

    return { totalVotes, results };
  }

  /**
   * Check if user has voted on a poll.
   */
  async hasVoted(postId: string, userId: string): Promise<boolean> {
    const vote = await this.prisma.pollVote.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    return vote !== null;
  }
}
