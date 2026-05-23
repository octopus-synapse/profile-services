/**
 * Prisma adapter for `PollRepositoryPort`.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { runInTransaction } from '@/shared-kernel/persistence/transaction';
import type { PollResultBucket, PollVote, Post } from '../../../domain/entities';
import {
  type AtomicVoteResult,
  PollRepositoryPort,
} from '../../../domain/ports/poll.repository.port';

export class PrismaPollRepository extends PollRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findPostById(id: string): Promise<Post | null> {
    return (await this.prisma.post.findUnique({ where: { id } })) as Post | null;
  }

  async findVote(postId: string, userId: string): Promise<PollVote | null> {
    return (await this.prisma.pollVote.findUnique({
      where: { postId_userId: { postId, userId } },
    })) as PollVote | null;
  }

  async createVote(postId: string, userId: string, optionIndex: number): Promise<PollVote> {
    return (await this.prisma.pollVote.create({
      data: { postId, userId, optionIndex },
    })) as PollVote;
  }

  async incrementVotesCount(postId: string, by: number): Promise<void> {
    await this.prisma.post.update({
      where: { id: postId },
      data: { votesCount: { increment: by } },
    });
  }

  async groupVotesByOption(postId: string): Promise<PollResultBucket[]> {
    const votes = await this.prisma.pollVote.groupBy({
      by: ['optionIndex'],
      where: { postId },
      _count: { id: true },
    });
    return votes.map((v) => ({ optionIndex: v.optionIndex, count: v._count.id }));
  }

  async voteAtomic(postId: string, userId: string, optionIndex: number): Promise<AtomicVoteResult> {
    return runInTransaction(this.prisma, async (tx) => {
      try {
        const vote = (await tx.pollVote.create({
          data: { postId, userId, optionIndex },
        })) as PollVote;
        await tx.post.update({
          where: { id: postId },
          data: { votesCount: { increment: 1 } },
        });
        return { outcome: 'created' as const, vote };
      } catch (err) {
        if ((err as { code?: string }).code === 'P2002') {
          return { outcome: 'duplicate' as const };
        }
        throw err;
      }
    });
  }
}
