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

import { Injectable } from '@nestjs/common';
import {
  CollaboratorRole,
  canRoleEdit,
  ResumeNotFoundError,
  ResourceNotFoundError,
  ResourceOwnershipError,
  PermissionDeniedError,
  DuplicateResourceError,
} from '@octopus-synapse/profile-contracts';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Invite collaborator params
 */
export interface InviteCollaboratorParams {
  resumeId: string;
  inviterId: string;
  inviteeId: string;
  role: CollaboratorRole;
}

/**
 * Update role params
 */
export interface UpdateRoleParams {
  resumeId: string;
  requesterId: string;
  targetUserId: string;
  newRole: CollaboratorRole;
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
      throw new ResumeNotFoundError(resumeId);
    }

    if (resume.userId !== inviterId) {
      throw new ResourceOwnershipError('resume', resumeId);
    }

    // Check if already a collaborator
    const existing = await this.prisma.resumeCollaborator.findFirst({
      where: { resumeId, userId: inviteeId },
    });

    if (existing) {
      throw new DuplicateResourceError('collaborator', 'userId', inviteeId);
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
      throw new PermissionDeniedError('view collaborators', resumeId);
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
      throw new ResumeNotFoundError(resumeId);
    }

    if (resume.userId !== requesterId) {
      throw new ResourceOwnershipError('resume', resumeId);
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
      throw new ResumeNotFoundError(resumeId);
    }

    const isOwner = resume.userId === requesterId;
    const isSelf = requesterId === targetUserId;

    if (!isOwner && !isSelf) {
      throw new PermissionDeniedError('remove collaborator', resumeId);
    }

    // Verify collaborator exists
    const collaborator = await this.prisma.resumeCollaborator.findFirst({
      where: { resumeId, userId: targetUserId },
    });

    if (!collaborator) {
      throw new ResourceNotFoundError('Collaborator', targetUserId);
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

    return canRoleEdit(collaborator.role as CollaboratorRole);
  }
}
