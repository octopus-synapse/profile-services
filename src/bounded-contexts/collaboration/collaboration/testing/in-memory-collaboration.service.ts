/**
 * In-Memory Collaboration Service for testing
 *
 * Pure test implementation following clean architecture.
 */

import type { CollaboratorRole } from '@/shared-kernel';
import type {
  CollaboratorWithUser,
  InviteCollaboratorParams,
  RemoveCollaboratorParams,
  UpdateRoleParams,
} from '../collaboration.service';
import type { CollaborationServicePort } from '../ports';

interface StoredResume {
  id: string;
  userId: string;
  title: string | null;
}

interface StoredUser {
  id: string;
  name: string | null;
  email: string;
}

interface StoredCollaborator {
  id: string;
  resumeId: string;
  userId: string;
  role: CollaboratorRole;
  invitedBy: string;
  invitedAt: Date;
  joinedAt: Date | null;
}

export class InMemoryCollaborationService implements CollaborationServicePort {
  private collaborators: StoredCollaborator[] = [];
  private resumes = new Map<string, StoredResume>();
  private users = new Map<string, StoredUser>();
  private idCounter = 0;

  async inviteCollaborator(params: InviteCollaboratorParams): Promise<CollaboratorWithUser> {
    const resume = this.resumes.get(params.resumeId);
    if (!resume) {
      throw new Error('Resume not found');
    }

    if (resume.userId !== params.inviterId) {
      throw new Error('Only resume owner can invite collaborators');
    }

    const existing = this.collaborators.find(
      (c) => c.resumeId === params.resumeId && c.userId === params.inviteeId,
    );

    if (existing) {
      throw new Error('User is already a collaborator');
    }

    const collaborator: StoredCollaborator = {
      id: `collab-${++this.idCounter}`,
      resumeId: params.resumeId,
      userId: params.inviteeId,
      role: params.role,
      invitedBy: params.inviterId,
      invitedAt: new Date(),
      joinedAt: new Date(),
    };

    this.collaborators.push(collaborator);
    return this.enrichCollaborator(collaborator);
  }

  async getCollaborators(resumeId: string, _userId: string): Promise<CollaboratorWithUser[]> {
    const collaborators = this.collaborators.filter((c) => c.resumeId === resumeId);
    return collaborators.map((c) => this.enrichCollaborator(c));
  }

  async updateCollaboratorRole(params: UpdateRoleParams): Promise<CollaboratorWithUser> {
    const collaborator = this.collaborators.find(
      (c) => c.resumeId === params.resumeId && c.userId === params.targetUserId,
    );

    if (!collaborator) {
      throw new Error('Collaborator not found');
    }

    collaborator.role = params.newRole;
    return this.enrichCollaborator(collaborator);
  }

  async removeCollaborator(params: RemoveCollaboratorParams): Promise<void> {
    const index = this.collaborators.findIndex(
      (c) => c.resumeId === params.resumeId && c.userId === params.targetUserId,
    );

    if (index !== -1) {
      this.collaborators.splice(index, 1);
    }
  }

  async getSharedWithMe(userId: string): Promise<
    Array<{
      role: string;
      invitedAt: Date;
      resume: {
        id: string;
        title: string | null;
      };
    }>
  > {
    return this.collaborators
      .filter((c) => c.userId === userId)
      .map((c) => ({
        role: c.role,
        invitedAt: c.invitedAt,
        resume: {
          id: c.resumeId,
          title: this.resumes.get(c.resumeId)?.title ?? null,
        },
      }));
  }

  private enrichCollaborator(collaborator: StoredCollaborator): CollaboratorWithUser {
    const user = this.users.get(collaborator.userId) ?? {
      id: collaborator.userId,
      name: null,
      email: `${collaborator.userId}@example.com`,
    };

    return {
      ...collaborator,
      user,
    };
  }

  // Test helpers
  seedResume(resume: Partial<StoredResume> & { id: string }): void {
    this.resumes.set(resume.id, {
      id: resume.id,
      userId: resume.userId ?? 'owner-1',
      title: resume.title ?? null,
    });
  }

  seedUser(user: Partial<StoredUser> & { id: string }): void {
    this.users.set(user.id, {
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? `${user.id}@example.com`,
    });
  }

  seedCollaborator(collab: Partial<StoredCollaborator>): void {
    this.collaborators.push({
      id: collab.id ?? `collab-${++this.idCounter}`,
      resumeId: collab.resumeId ?? 'resume-1',
      userId: collab.userId ?? 'user-1',
      role: collab.role ?? 'VIEWER',
      invitedBy: collab.invitedBy ?? 'owner-1',
      invitedAt: collab.invitedAt ?? new Date(),
      joinedAt: collab.joinedAt ?? new Date(),
    });
  }

  clear(): void {
    this.collaborators = [];
    this.resumes.clear();
    this.users.clear();
    this.idCounter = 0;
  }
}
