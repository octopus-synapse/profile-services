/**
 * Route descriptors for the resume-sharing collaboration BC. Replaces
 * `CollaborationController`. The HTTP surface mixes the framework-free
 * collaboration use-cases with the still-Nest-flavoured
 * `CollabCommentService`, so we expose a single aggregated bundle
 * (`CollaborationHttpBundle`) that the synthesizer can inject.
 */

import { z } from 'zod';
import { CollaboratorRoleSchema } from '@/bounded-contexts/collaboration/domain/enums';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import { CollaborationUseCases } from './application/collaboration.composition';
import type { CollabCommentService } from './services/collab-comment.service';

export abstract class CollaborationHttpBundle {
  abstract readonly collaboration: CollaborationUseCases;
  abstract readonly comments: CollabCommentService;
}

export const ResumeIdParam = z.object({ resumeId: z.string() });
export const ResumeAndUserIdParams = z.object({ resumeId: z.string(), userId: z.string() });
export const CommentIdParam = z.object({ commentId: z.string() });

export const InviteCollaboratorSchema = z
  .object({
    userId: z.string().min(1),
    role: CollaboratorRoleSchema,
  })
  .openapi({
    example: {
      userId: '01900000-0000-7000-a000-000000000001',
      role: 'EDITOR',
    },
  });

export const UpdateRoleSchema = z.object({ role: CollaboratorRoleSchema }).openapi({
  example: {
    role: 'VIEWER',
  },
});

export const CreateCommentSchema = z
  .object({
    content: z.string().min(1).max(4000),
    parentId: z.string().optional(),
    sectionId: z.string().optional(),
    itemId: z.string().optional(),
  })
  .openapi({
    example: {
      content: 'Consider expanding on the impact of this project.',
    },
  });

// ─── Response schemas ─────────────────────────────────────────────────
export const CollaboratorUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
});

export const CollaboratorWithUserSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  userId: z.string(),
  role: z.string(),
  invitedBy: z.string(),
  invitedAt: IsoDateTimeSchema,
  joinedAt: IsoDateTimeSchema.nullable(),
  user: CollaboratorUserSchema,
});

export const InviteCollaboratorResponseSchema = z.object({
  collaborator: CollaboratorWithUserSchema,
});
export const ListCollaboratorsResponseSchema = z.object({
  collaborators: z.array(CollaboratorWithUserSchema),
});
export const UpdateCollaboratorResponseSchema = z.object({
  collaborator: CollaboratorWithUserSchema,
});
export const RemoveCollaboratorResponseSchema = z.object({}).strict();

export const SharedResumeSchema = z.object({
  role: z.string(),
  invitedAt: IsoDateTimeSchema,
  resume: z.object({
    id: z.string(),
    title: z.string().nullable(),
  }),
});

export const SharedWithMeResponseSchema = z.object({
  sharedResumes: z.array(SharedResumeSchema),
});

export const CommentAuthorSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

export const CommentSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  authorId: z.string(),
  content: z.string(),
  parentId: z.string().nullable(),
  sectionId: z.string().nullable(),
  itemId: z.string().nullable(),
  resolved: z.boolean(),
  resolvedAt: IsoDateTimeSchema.nullable(),
  resolvedById: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  author: CommentAuthorSchema,
});

export const CommentsListResponseSchema = z.object({ comments: z.array(CommentSchema) });
export const CommentResponseSchema = z.object({ comment: CommentSchema });
export const CommentDeleteResponseSchema = z.object({}).strict();
