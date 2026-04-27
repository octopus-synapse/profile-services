/**
 * User Engagement Controller
 *
 * Endpoints:
 * - GET /v1/users/:userId/comments  - Comments authored by the user
 * - GET /v1/users/:userId/reactions - Reactions given by the user
 */

import { Controller, Get, HttpCode, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { ListUserCommentsUseCase } from '../../application/use-cases/list-user-comments/list-user-comments.use-case';
import { ListUserReactionsUseCase } from '../../application/use-cases/list-user-reactions/list-user-reactions.use-case';

@SdkExport({
  tag: 'user-engagement',
  description: 'User-scoped feed engagement',
  requiresAuth: true,
})
@ApiTags('user-engagement')
@ApiBearerAuth('JWT-auth')
@RequirePermission(Permission.FEED_USE)
@Controller('v1/users')
export class UserEngagementController {
  constructor(
    private readonly listUserCommentsUseCase: ListUserCommentsUseCase,
    private readonly listUserReactionsUseCase: ListUserReactionsUseCase,
  ) {}

  @Get(':userId/comments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List comments authored by a user' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getComments(
    @Param('userId') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.listUserCommentsUseCase.execute(userId, cursor, limit ? Number(limit) : undefined);
  }

  @Get(':userId/reactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List reactions given by a user' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getReactions(
    @Param('userId') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.listUserReactionsUseCase.execute(userId, cursor, limit ? Number(limit) : undefined);
  }
}
