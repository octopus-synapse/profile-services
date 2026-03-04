/**
 * Collaboration Controller
 *
 * REST endpoints for resume collaboration.
 *
 * Endpoints:
 * - POST /:resumeId/collaborators - Invite collaborator
 * - GET /:resumeId/collaborators - List collaborators
 * - PATCH /:resumeId/collaborators/:userId - Update role
 * - DELETE /:resumeId/collaborators/:userId - Remove collaborator
 * - GET /shared-with-me - Get resumes shared with current user
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { CollaborationService, type CollaboratorWithUser } from './collaboration.service';
import { InviteCollaboratorDto, UpdateRoleDto } from './dto/collaboration.dto';

// Wrapper DTOs for responses
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
@Controller('resumes')
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  /**
   * Invite a collaborator
   */
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
    const collaborator = await this.collaborationService.inviteCollaborator({
      resumeId,
      inviterId: user.userId,
      inviteeId: dto.userId,
      role: dto.role,
    });
    return { success: true, data: { collaborator } };
  }

  /**
   * List collaborators
   */
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
    const collaborators = await this.collaborationService.getCollaborators(resumeId, user.userId);
    return { success: true, data: { collaborators } };
  }

  /**
   * Update collaborator role
   */
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
    const collaborator = await this.collaborationService.updateCollaboratorRole({
      resumeId,
      requesterId: user.userId,
      targetUserId,
      newRole: dto.role,
    });
    return { success: true, data: { collaborator } };
  }

  /**
   * Remove collaborator
   */
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
    await this.collaborationService.removeCollaborator({
      resumeId,
      requesterId: user.userId,
      targetUserId,
    });
  }

  /**
   * Get resumes shared with current user
   */
  @Get('shared-with-me')
  @ApiOperation({ summary: 'Get resumes shared with current user' })
  @ApiDataResponse(SharedResumesListDataDto, {
    description: 'List of shared resumes',
  })
  async getSharedWithMe(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<SharedResumesListDataDto>> {
    const sharedResumes = await this.collaborationService.getSharedWithMe(user.userId);
    return { success: true, data: { sharedResumes } };
  }
}
