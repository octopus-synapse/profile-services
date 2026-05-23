/**
 * Route descriptors for the resume-sharing collaboration BC. Replaces
 * `CollaborationController`. The HTTP surface mixes the framework-free
 * collaboration use-cases with the still-Nest-flavoured
 * `CollabCommentService`, so we expose a single aggregated bundle
 * (`CollaborationHttpBundle`) that the synthesizer can inject.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { buildFixedListResponse } from '@/shared-kernel/schemas/common/build-paginated-response';
import {
  CollaborationHttpBundle,
  CommentDeleteResponseSchema,
  CommentIdParam,
  CommentResponseSchema,
  CommentsListResponseSchema,
  CreateCommentSchema,
  InviteCollaboratorResponseSchema,
  InviteCollaboratorSchema,
  ListCollaboratorsResponseSchema,
  RemoveCollaboratorResponseSchema,
  ResumeAndUserIdParams,
  ResumeIdParam,
  SharedWithMeResponseSchema,
  UpdateCollaboratorResponseSchema,
  UpdateRoleSchema,
} from './collaboration.routes.schemas';

export type { CollaborationHttpBundle } from './collaboration.routes.schemas';

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
      const items = await bundle.comments.listForResume(resumeId, ctx.user!.userId);
      return buildFixedListResponse(items);
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
