/**
 * Comment Controller
 *
 * Handles HTTP endpoints for post comments and replies.
 *
 * Endpoints:
 * - GET    /v1/posts/:id/comments  - Get comments for a post
 * - POST   /v1/posts/:id/comments  - Create a comment on a post
 * - DELETE /v1/posts/comments/:id  - Delete a comment
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { CommentService } from '../services/comment.service';

@SdkExport({
  tag: 'comments',
  description: 'Comments API',
  requiresAuth: true,
})
@ApiTags('comments')
@ApiBearerAuth('JWT-auth')
@RequirePermission(Permission.FEED_USE)
@Controller('v1/posts')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  /**
   * Get comments for a post.
   */
  @Get(':id/comments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getByPost(
    @Param('id') postId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.commentService.getByPost(postId, cursor, limit ? Math.min(Number(limit), 50) : 20);
  }

  /**
   * Create a comment on a post.
   */
  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a comment' })
  @ApiParam({ name: 'id', type: 'string' })
  async create(
    @CurrentUser() user: UserPayload,
    @Param('id') postId: string,
    @Body() body: { content: string; parentId?: string },
  ) {
    return this.commentService.create(postId, user.userId, body.content, body.parentId);
  }

  /**
   * Delete a comment (only the author can delete).
   */
  @Delete('comments/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'id', type: 'string' })
  async delete(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    await this.commentService.delete(id, user.userId);
    return { deleted: true };
  }
}
