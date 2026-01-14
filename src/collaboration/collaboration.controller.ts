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
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/interfaces/auth-request.interface';
import {
  CollaborationService,
  CollaboratorRole,
} from './collaboration.service';

/**
 * Invite DTO
 */
class InviteCollaboratorDto {
  userId!: string;
  role!: keyof typeof CollaboratorRole;
}

/**
 * Update role DTO
 */
class UpdateRoleDto {
  role!: keyof typeof CollaboratorRole;
}

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
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiBody({ type: InviteCollaboratorDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Collaborator invited',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not resume owner',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Already collaborator',
  })
  async invite(
    @Param('resumeId') resumeId: string,
    @Body() dto: InviteCollaboratorDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.collaborationService.inviteCollaborator({
      resumeId,
      inviterId: user.userId,
      inviteeId: dto.userId,
      role: dto.role,
    });
  }

  /**
   * List collaborators
   */
  @Get(':resumeId/collaborators')
  @ApiOperation({ summary: 'Get collaborators for a resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of collaborators' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied' })
  async getCollaborators(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.collaborationService.getCollaborators(resumeId, user.userId);
  }

  /**
   * Update collaborator role
   */
  @Patch(':resumeId/collaborators/:userId')
  @ApiOperation({ summary: 'Update collaborator role' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'userId', description: 'Collaborator user ID' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Role updated' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not resume owner',
  })
  async updateRole(
    @Param('resumeId') resumeId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.collaborationService.updateCollaboratorRole({
      resumeId,
      requesterId: user.userId,
      targetUserId,
      newRole: dto.role,
    });
  }

  /**
   * Remove collaborator
   */
  @Delete(':resumeId/collaborators/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove collaborator from resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'userId', description: 'Collaborator user ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Collaborator removed',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  async remove(
    @Param('resumeId') resumeId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: UserPayload,
  ) {
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
  @ApiResponse({ status: HttpStatus.OK, description: 'List of shared resumes' })
  async getSharedWithMe(@CurrentUser() user: UserPayload) {
    return this.collaborationService.getSharedWithMe(user.userId);
  }
}
