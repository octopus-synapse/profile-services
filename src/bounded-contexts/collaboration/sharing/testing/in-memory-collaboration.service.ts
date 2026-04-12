/**
 * In-Memory Collaboration Repository for testing
 *
 * Implements CollaborationRepositoryPort for unit tests.
 */

import type { CollaboratorRole } from '@/bounded-contexts/collaboration/domain/enums';
import { CollaborationRepositoryPort } from '../domain/ports/collaboration-repository.port';
import type { CollaboratorWithUser, SharedResume } from '../domain/types/collaboration.types';

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

export class InMemoryCollaborationRepository extends CollaborationRepositoryPort {
  private collaborators: StoredCollaborator[] = [];
  private resumes = new Map<string, StoredResume>();
  private users = new Map<string, StoredUser>();
  private idCounter = 0;

  async findResumeOwner(resumeId: string): Promise<{ userId: string } | null> {
    const resume = this.resumes.get(resumeId);
    return resume ? { userId: resume.userId } : null;
  }

  async findCollaborator(
    resumeId: string,
    userId: string,
  ): Promise<{ id: string; role: string } | null> {
    const collab = this.collaborators.find((c) => c.resumeId === resumeId && c.userId === userId);
    return collab ? { id: collab.id, role: collab.role } : null;
  }

  async findCollaborators(resumeId: string): Promise<CollaboratorWithUser[]> {
    return this.collaborators
      .filter((c) => c.resumeId === resumeId)
      .map((c) => this.enrichCollaborator(c));
  }

  async createCollaborator(data: {
    resumeId: string;
    userId: string;
    role: CollaboratorRole;
    invitedBy: string;
  }): Promise<CollaboratorWithUser> {
    const collaborator: StoredCollaborator = {
      id: `collab-${++this.idCounter}`,
      resumeId: data.resumeId,
      userId: data.userId,
      role: data.role,
      invitedBy: data.invitedBy,
      invitedAt: new Date(),
      joinedAt: new Date(),
    };

    this.collaborators.push(collaborator);
    return this.enrichCollaborator(collaborator);
  }

  async updateRole(
    resumeId: string,
    userId: string,
    role: CollaboratorRole,
  ): Promise<CollaboratorWithUser> {
    const collaborator = this.collaborators.find(
      (c) => c.resumeId === resumeId && c.userId === userId,
    );

    if (!collaborator) throw new Error('Collaborator not found');

    collaborator.role = role;
    return this.enrichCollaborator(collaborator);
  }

  async deleteCollaborator(resumeId: string, userId: string): Promise<void> {
    const index = this.collaborators.findIndex(
      (c) => c.resumeId === resumeId && c.userId === userId,
    );
    if (index !== -1) this.collaborators.splice(index, 1);
  }

  async getSharedResumes(userId: string): Promise<SharedResume[]> {
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

    return { ...collaborator, user };
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
