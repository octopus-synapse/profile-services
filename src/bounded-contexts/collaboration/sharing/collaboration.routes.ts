/**
 * Route descriptors for the resume-sharing collaboration BC. Replaces
 * `CollaborationController`. The HTTP surface mixes the framework-free
 * collaboration use-cases with the still-Nest-flavoured
 * `CollabCommentService`, so we expose a single aggregated bundle
 * (`CollaborationHttpBundle`) that the synthesizer can inject.
 */

import { z } from 'zod';
import { CollaboratorRoleSchema } from '@/bounded-contexts/collaboration/domain/enums';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { CollaborationUseCases } from './application/collaboration.composition';
import type { CollabCommentService } from './services/collab-comment.service';

export abstract class CollaborationHttpBundle {
  abstract readonly collaboration: CollaborationUseCases;
  abstract readonly comments: CollabCommentService;
}

const ResumeIdParam = z.object({ resumeId: z.string() });
const ResumeAndUserIdParams = z.object({ resumeId: z.string(), userId: z.string() });
const CommentIdParam = z.object({ commentId: z.string() });

const InviteCollaboratorSchema = z.object({
  userId: z.string().min(1),
  role: CollaboratorRoleSchema,
});

const UpdateRoleSchema = z.object({ role: CollaboratorRoleSchema });

const CreateCommentSchema = z.object({
  content: z.string().min(1).max(4000),
  parentId: z.string().optional(),
  sectionId: z.string().optional(),
  itemId: z.string().optional(),
});

// ─── Response schemas ─────────────────────────────────────────────────
const CollaboratorUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
});

const CollaboratorWithUserSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  userId: z.string(),
  role: z.string(),
  invitedBy: z.string(),
  invitedAt: z.string().datetime(),
  joinedAt: z.string().datetime().nullable(),
  user: CollaboratorUserSchema,
});

const InviteCollaboratorResponseSchema = z.object({ collaborator: CollaboratorWithUserSchema });
const ListCollaboratorsResponseSchema = z.object({
  collaborators: z.array(CollaboratorWithUserSchema),
});
const UpdateCollaboratorResponseSchema = z.object({ collaborator: CollaboratorWithUserSchema });
const RemoveCollaboratorResponseSchema = z.object({}).strict();

const SharedResumeSchema = z.object({
  role: z.string(),
  invitedAt: z.string().datetime(),
  resume: z.object({
    id: z.string(),
    title: z.string().nullable(),
  }),
});

const SharedWithMeResponseSchema = z.object({
  sharedResumes: z.array(SharedResumeSchema),
});

const CommentAuthorSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

const CommentSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  authorId: z.string(),
  content: z.string(),
  parentId: z.string().nullable(),
  sectionId: z.string().nullable(),
  itemId: z.string().nullable(),
  resolved: z.boolean(),
  resolvedAt: z.string().datetime().nullable(),
  resolvedById: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  author: CommentAuthorSchema,
});

const CommentsListResponseSchema = z.object({ comments: z.array(CommentSchema) });
const CommentResponseSchema = z.object({ comment: CommentSchema });
const CommentDeleteResponseSchema = z.object({}).strict();

export const collaborationRoutes: ReadonlyArray<Route<CollaborationHttpBundle>> = [
  {
    method: 'POST',
    path: '/v1/resumes/:resumeId/collaborators',
    statusCode: 201,
    auth: { kind: 'jwt' },
    permission: Permission.COLLABORATION_USE,
    params: ResumeIdParam,
    body: InviteCollaboratorSchema,
    response: InviteCollaboratorResponseSchema,
    openapi: {
      summary: 'Invite user to collaborate on resume',
      tags: ['collaboration'],
      description: 'Collaboration API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const dto = ctx.body as z.infer<typeof InviteCollaboratorSchema>;
      const collaborator = await bundle.collaboration.inviteCollaborator.execute({
        resumeId,
        inviterId: ctx.user!.userId,
        inviteeId: dto.userId,
        role: dto.role,
      });
      return { collaborator };
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/collaborators',
    auth: { kind: 'jwt' },
    permission: Permission.COLLABORATION_USE,
    params: ResumeIdParam,
    response: ListCollaboratorsResponseSchema,
    openapi: {
      summary: 'Get collaborators for a resume',
      tags: ['collaboration'],
      description: 'Collaboration API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const collaborators = await bundle.collaboration.getCollaborators.execute(
        resumeId,
        ctx.user!.userId,
      );
      return { collaborators };
    },
  },
  {
    method: 'PATCH',
    path: '/v1/resumes/:resumeId/collaborators/:userId',
    auth: { kind: 'jwt' },
    permission: Permission.COLLABORATION_USE,
    params: ResumeAndUserIdParams,
    body: UpdateRoleSchema,
    response: UpdateCollaboratorResponseSchema,
    openapi: {
      summary: 'Update collaborator role',
      tags: ['collaboration'],
      description: 'Collaboration API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { resumeId, userId } = ctx.params as { resumeId: string; userId: string };
      const dto = ctx.body as z.infer<typeof UpdateRoleSchema>;
      const collaborator = await bundle.collaboration.updateRole.execute({
        resumeId,
        requesterId: ctx.user!.userId,
        targetUserId: userId,
        newRole: dto.role,
      });
      return { collaborator };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/resumes/:resumeId/collaborators/:userId',
    auth: { kind: 'jwt' },
    permission: Permission.COLLABORATION_USE,
    params: ResumeAndUserIdParams,
    response: RemoveCollaboratorResponseSchema,
    openapi: {
      summary: 'Remove collaborator from resume',
      tags: ['collaboration'],
      description: 'Collaboration API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { resumeId, userId } = ctx.params as { resumeId: string; userId: string };
      await bundle.collaboration.removeCollaborator.execute({
        resumeId,
        requesterId: ctx.user!.userId,
        targetUserId: userId,
      });
      return {};
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/shared-with-me',
    auth: { kind: 'jwt' },
    permission: Permission.COLLABORATION_USE,
    response: SharedWithMeResponseSchema,
    openapi: {
      summary: 'Get resumes shared with current user',
      tags: ['collaboration'],
      description: 'Collaboration API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const sharedResumes = await bundle.collaboration.getSharedWithMe.execute(ctx.user!.userId);
      return { sharedResumes };
    },
  },

  // ─── Comments ──────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/comments',
    auth: { kind: 'jwt' },
    permission: Permission.COLLABORATION_USE,
    params: ResumeIdParam,
    response: CommentsListResponseSchema,
    openapi: {
      summary: 'List collaboration comments on a resume',
      tags: ['collaboration'],
      description: 'Collaboration API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const comments = await bundle.comments.listForResume(resumeId, ctx.user!.userId);
      return { comments };
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/:resumeId/comments',
    auth: { kind: 'jwt' },
    permission: Permission.COLLABORATION_USE,
    params: ResumeIdParam,
    body: CreateCommentSchema,
    response: CommentResponseSchema,
    openapi: {
      summary: 'Add a comment / reply to a resume',
      tags: ['collaboration'],
      description: 'Collaboration API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const dto = ctx.body as z.infer<typeof CreateCommentSchema>;
      const comment = await bundle.comments.create({
        resumeId,
        authorId: ctx.user!.userId,
        content: dto.content,
        parentId: dto.parentId,
        sectionId: dto.sectionId,
        itemId: dto.itemId,
      });
      return { comment };
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/comments/:commentId/resolve',
    auth: { kind: 'jwt' },
    permission: Permission.COLLABORATION_USE,
    params: CommentIdParam,
    response: CommentResponseSchema,
    openapi: {
      summary: 'Mark a comment thread as resolved',
      tags: ['collaboration'],
      description: 'Collaboration API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { commentId } = ctx.params as { commentId: string };
      const comment = await bundle.comments.resolve(commentId, ctx.user!.userId);
      return { comment };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/resumes/comments/:commentId',
    auth: { kind: 'jwt' },
    permission: Permission.COLLABORATION_USE,
    params: CommentIdParam,
    response: CommentDeleteResponseSchema,
    openapi: {
      summary: 'Delete a comment (author or resume owner)',
      tags: ['collaboration'],
      description: 'Collaboration API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { commentId } = ctx.params as { commentId: string };
      await bundle.comments.delete(commentId, ctx.user!.userId);
      return {};
    },
  },
];
