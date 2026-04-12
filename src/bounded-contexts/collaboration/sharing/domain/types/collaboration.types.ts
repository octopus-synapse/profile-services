import type { CollaboratorRole } from '@/bounded-contexts/collaboration/domain/enums';

export interface InviteCollaboratorParams {
  resumeId: string;
  inviterId: string;
  inviteeId: string;
  role: CollaboratorRole;
}

export interface UpdateRoleParams {
  resumeId: string;
  requesterId: string;
  targetUserId: string;
  newRole: CollaboratorRole;
}

export interface RemoveCollaboratorParams {
  resumeId: string;
  requesterId: string;
  targetUserId: string;
}

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

export interface SharedResume {
  role: string;
  invitedAt: Date;
  resume: { id: string; title: string | null };
}
