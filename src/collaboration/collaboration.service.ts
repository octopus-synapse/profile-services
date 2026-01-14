/**
 * Collaboration Service
 *
 * Manages resume collaboration (sharing for editing).
 *
 * Robert C. Martin: "Single Responsibility"
 * - Invite: manages collaborator invitations
 * - Access: checks permissions
 * - Role: manages collaborator roles
 */

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Collaborator role enum
 */
export enum CollaboratorRole {
  VIEWER = 'VIEWER',
  EDITOR = 'EDITOR',
  ADMIN = 'ADMIN',
}

/**
 * Invite collaborator params
 */
export interface InviteCollaboratorParams {
  resumeId: string;
  inviterId: string;
  inviteeId: string;
  role: keyof typeof CollaboratorRole;
}

/**
 * Update role params
 */
export interface UpdateRoleParams {
  resumeId: string;
  requesterId: string;
  targetUserId: string;
  newRole: keyof typeof CollaboratorRole;
}

/**
 * Remove collaborator params
 */
export interface RemoveCollaboratorParams {
  resumeId: string;
  requesterId: string;
  targetUserId: string;
}

/**
 * Collaborator with user info
 */
export interface CollaboratorWithUser {
  id: string;
  resumeId: string;
  userId: string;
  role: string;
  invitedBy: string;
  invitedAt: Date;
  joinedAt: Date | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

@Injectable()
export class CollaborationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Invite a user to collaborate on a resume
   */
  async inviteCollaborator(
    params: InviteCollaboratorParams,
  ): Promise<CollaboratorWithUser> {
    const { resumeId, inviterId, inviteeId, role } = params;

    // Verify resume exists and user is owner
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== inviterId) {
      throw new ForbiddenException(
        'Only resume owner can invite collaborators',
      );
    }

    // Check if already a collaborator
    const existing = await this.prisma.resumeCollaborator.findFirst({
      where: { resumeId, userId: inviteeId },
    });

    if (existing) {
      throw new ConflictException('User is already a collaborator');
    }

    // Create collaborator
    const collaborator = await this.prisma.resumeCollaborator.create({
      data: {
        resumeId,
        userId: inviteeId,
        role,
        invitedBy: inviterId,
        joinedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return collaborator as CollaboratorWithUser;
  }

  /**
   * Get all collaborators for a resume
   */
  async getCollaborators(
    resumeId: string,
    requesterId: string,
  ): Promise<CollaboratorWithUser[]> {
    // Verify access
    const hasAccess = await this.hasAccess(resumeId, requesterId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this resume');
    }

    const collaborators = await this.prisma.resumeCollaborator.findMany({
      where: { resumeId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { invitedAt: 'asc' },
    });

    return collaborators as CollaboratorWithUser[];
  }

  /**
   * Update collaborator role
   */
  async updateCollaboratorRole(
    params: UpdateRoleParams,
  ): Promise<CollaboratorWithUser> {
    const { resumeId, requesterId, targetUserId, newRole } = params;

    // Only owner can update roles
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== requesterId) {
      throw new ForbiddenException('Only resume owner can update roles');
    }

    const collaborator = await this.prisma.resumeCollaborator.update({
      where: {
        resumeId_userId: { resumeId, userId: targetUserId },
      },
      data: { role: newRole },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return collaborator as CollaboratorWithUser;
  }

  /**
   * Remove a collaborator
   */
  async removeCollaborator(params: RemoveCollaboratorParams): Promise<void> {
    const { resumeId, requesterId, targetUserId } = params;

    // Owner can remove anyone, collaborator can remove themselves
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    const isOwner = resume.userId === requesterId;
    const isSelf = requesterId === targetUserId;

    if (!isOwner && !isSelf) {
      throw new ForbiddenException(
        'Only owner can remove collaborators, or you can remove yourself',
      );
    }

    // Verify collaborator exists
    const collaborator = await this.prisma.resumeCollaborator.findFirst({
      where: { resumeId, userId: targetUserId },
    });

    if (!collaborator) {
      throw new NotFoundException('Collaborator not found');
    }

    await this.prisma.resumeCollaborator.delete({
      where: { id: collaborator.id },
    });
  }

  /**
   * Get resumes shared with a user
   */
  async getSharedWithMe(userId: string): Promise<
    Array<{
      role: string;
      invitedAt: Date;
      resume: { id: string; title: string | null };
    }>
  > {
    const collaborations = await this.prisma.resumeCollaborator.findMany({
      where: { userId },
      include: {
        resume: {
          select: { id: true, title: true },
        },
      },
      orderBy: { invitedAt: 'desc' },
    });

    return collaborations;
  }

  /**
   * Check if user has access to resume (owner or collaborator)
   */
  async hasAccess(resumeId: string, userId: string): Promise<boolean> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      return false;
    }

    // Owner has access
    if (resume.userId === userId) {
      return true;
    }

    // Check if collaborator
    const collaborator = await this.prisma.resumeCollaborator.findFirst({
      where: { resumeId, userId },
    });

    return collaborator !== null;
  }

  /**
   * Check if user can edit resume (owner, editor, or admin)
   */
  async canEdit(resumeId: string, userId: string): Promise<boolean> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      return false;
    }

    // Owner can edit
    if (resume.userId === userId) {
      return true;
    }

    // Check collaborator role
    const collaborator = await this.prisma.resumeCollaborator.findFirst({
      where: { resumeId, userId },
    });

    if (!collaborator) {
      return false;
    }

    // EDITOR and ADMIN can edit
    return collaborator.role === 'EDITOR' || collaborator.role === 'ADMIN';
  }
}
