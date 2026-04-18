import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

export interface CreateCommentInput {
  resumeId: string;
  authorId: string;
  content: string;
  parentId?: string;
  sectionId?: string;
  itemId?: string;
}

@Injectable()
export class CollabCommentService {
  constructor(private readonly prisma: PrismaService) {}

  async listForResume(resumeId: string, viewerId: string) {
    await this.assertViewer(resumeId, viewerId);
    return this.prisma.collaborationComment.findMany({
      where: { resumeId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, name: true, username: true, photoURL: true } },
      },
    });
  }

  async create(input: CreateCommentInput) {
    await this.assertViewer(input.resumeId, input.authorId);
    if (input.parentId) {
      const parent = await this.prisma.collaborationComment.findUnique({
        where: { id: input.parentId },
        select: { resumeId: true },
      });
      if (!parent || parent.resumeId !== input.resumeId) {
        throw new NotFoundException('Parent comment not found');
      }
    }
    return this.prisma.collaborationComment.create({
      data: {
        resumeId: input.resumeId,
        authorId: input.authorId,
        content: input.content,
        parentId: input.parentId,
        sectionId: input.sectionId,
        itemId: input.itemId,
      },
      include: {
        author: { select: { id: true, name: true, username: true, photoURL: true } },
      },
    });
  }

  async resolve(commentId: string, viewerId: string) {
    const comment = await this.prisma.collaborationComment.findUnique({
      where: { id: commentId },
      select: { resumeId: true, resolved: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    await this.assertViewer(comment.resumeId, viewerId);
    return this.prisma.collaborationComment.update({
      where: { id: commentId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedById: viewerId,
      },
    });
  }

  async delete(commentId: string, viewerId: string) {
    const comment = await this.prisma.collaborationComment.findUnique({
      where: { id: commentId },
      select: { authorId: true, resumeId: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== viewerId) {
      // Non-authors may only delete if they own the resume.
      const resume = await this.prisma.resume.findUnique({
        where: { id: comment.resumeId },
        select: { userId: true },
      });
      if (!resume || resume.userId !== viewerId) {
        throw new ForbiddenException("Cannot delete another user's comment");
      }
    }
    await this.prisma.collaborationComment.delete({ where: { id: commentId } });
  }

  /** A viewer must own the resume OR be an active collaborator on it. */
  private async assertViewer(resumeId: string, userId: string): Promise<void> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { userId: true },
    });
    if (!resume) throw new NotFoundException('Resume not found');
    if (resume.userId === userId) return;

    const collab = await this.prisma.resumeCollaborator.findUnique({
      where: { resumeId_userId: { resumeId, userId } },
      select: { role: true },
    });
    if (!collab) {
      throw new ForbiddenException('Not a collaborator on this resume');
    }
  }
}
