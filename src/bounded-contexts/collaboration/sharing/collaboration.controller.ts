/**
 * Collaboration Controller
 *
 * REST endpoints for resume collaboration.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiProperty, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import {
  ApiDataResponse,
  ApiEmptyDataResponse,
} from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  COLLABORATION_USE_CASES,
  type CollaborationUseCases,
} from './application/collaboration.composition';
import type { CollaboratorWithUser } from './domain/types/collaboration.types';
import { CreateCollabCommentDto } from './dto/collab-comment.dto';
import { InviteCollaboratorDto, UpdateRoleDto } from './dto/collaboration.dto';
import { CollabCommentService } from './services/collab-comment.service';

export class CollaboratorDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  collaborator!: CollaboratorWithUser;
}

export class CollaboratorsListDataDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  collaborators!: CollaboratorWithUser[];
}

export class SharedResumesListDataDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  sharedResumes!: {
    role: string;
    invitedAt: Date;
    resume: { id: string; title: string | null };
  }[];
}

@SdkExport({ tag: 'collaboration', description: 'Collaboration API' })
@ApiTags('Collaboration')
@RequirePermission(Permission.COLLABORATION_USE)
@Controller('resumes')
export class CollaborationController {
  constructor(
    @Inject(COLLABORATION_USE_CASES)
    private readonly collaboration: CollaborationUseCases,
    private readonly comments: CollabCommentService,
  ) {}

  @Post(':resumeId/collaborators')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite user to collaborate on resume' })
  @ApiDataResponse(CollaboratorDataDto, {
    status: HttpStatus.CREATED,
    description: 'Collaborator invited',
  })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiBody({ type: InviteCollaboratorDto })
  async invite(
    @Param('resumeId') resumeId: string,
    @Body() dto: InviteCollaboratorDto,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<CollaboratorDataDto>> {
    const collaborator = await this.collaboration.inviteCollaborator.execute({
      resumeId,
      inviterId: user.userId,
      inviteeId: dto.userId,
      role: dto.role,
    });
    return { success: true, data: { collaborator } };
  }

  @Get(':resumeId/collaborators')
  @ApiOperation({ summary: 'Get collaborators for a resume' })
  @ApiDataResponse(CollaboratorsListDataDto, {
    description: 'List of collaborators',
  })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  async getCollaborators(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<CollaboratorsListDataDto>> {
    const collaborators = await this.collaboration.getCollaborators.execute(resumeId, user.userId);
    return { success: true, data: { collaborators } };
  }

  @Patch(':resumeId/collaborators/:userId')
  @ApiOperation({ summary: 'Update collaborator role' })
  @ApiDataResponse(CollaboratorDataDto, { description: 'Role updated' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'userId', description: 'Collaborator user ID' })
  @ApiBody({ type: UpdateRoleDto })
  async updateRole(
    @Param('resumeId') resumeId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<CollaboratorDataDto>> {
    const collaborator = await this.collaboration.updateRole.execute({
      resumeId,
      requesterId: user.userId,
      targetUserId,
      newRole: dto.role,
    });
    return { success: true, data: { collaborator } };
  }

  @Delete(':resumeId/collaborators/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove collaborator from resume' })
  @ApiEmptyDataResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Collaborator removed',
  })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'userId', description: 'Collaborator user ID' })
  async remove(
    @Param('resumeId') resumeId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<void> {
    await this.collaboration.removeCollaborator.execute({
      resumeId,
      requesterId: user.userId,
      targetUserId,
    });
  }

  @Get('shared-with-me')
  @ApiOperation({ summary: 'Get resumes shared with current user' })
  @ApiDataResponse(SharedResumesListDataDto, {
    description: 'List of shared resumes',
  })
  async getSharedWithMe(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<SharedResumesListDataDto>> {
    const sharedResumes = await this.collaboration.getSharedWithMe.execute(user.userId);
    return { success: true, data: { sharedResumes } };
  }

  // -------- Comments --------

  @Get(':resumeId/comments')
  @ApiOperation({ summary: 'List collaboration comments on a resume' })
  async listComments(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<{ comments: unknown[] }>> {
    const comments = await this.comments.listForResume(resumeId, user.userId);
    return { success: true, data: { comments } };
  }

  @Post(':resumeId/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a comment / reply to a resume' })
  @ApiBody({ type: CreateCollabCommentDto })
  async createComment(
    @Param('resumeId') resumeId: string,
    @Body() dto: CreateCollabCommentDto,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<{ comment: unknown }>> {
    const comment = await this.comments.create({
      resumeId,
      authorId: user.userId,
      content: dto.content,
      parentId: dto.parentId,
      sectionId: dto.sectionId,
      itemId: dto.itemId,
    });
    return { success: true, data: { comment } };
  }

  @Post('comments/:commentId/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a comment thread as resolved' })
  async resolveComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<{ comment: unknown }>> {
    const comment = await this.comments.resolve(commentId, user.userId);
    return { success: true, data: { comment } };
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment (author or resume owner)' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<void> {
    await this.comments.delete(commentId, user.userId);
  }
}
