/**
 * Post Controller
 *
 * Handles HTTP endpoints for post CRUD operations and image upload.
 *
 * Endpoints:
 * - POST   /v1/posts              - Create a post
 * - GET    /v1/posts/:id          - Get a post by ID
 * - DELETE /v1/posts/:id          - Soft delete a post
 * - POST   /v1/posts/upload-image - Upload post image
 */

import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { PostType, Prisma } from '@prisma/client';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import { ERROR_MESSAGES, FILE_UPLOAD_CONFIG } from '@/shared-kernel';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  PostByIdDataDto,
  PostCreatedDataDto,
  PostDeletedDataDto,
  PostImageUploadDataDto,
} from '../dto/feed-response.dto';
import { LinkPreviewService } from '../services/link-preview.service';
import { PostService } from '../services/post.service';

@SdkExport({
  tag: 'posts',
  description: 'Posts API',
  requiresAuth: true,
})
@ApiTags('posts')
@ApiBearerAuth('JWT-auth')
@RequirePermission(Permission.FEED_USE)
@Controller('v1/posts')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly linkPreviewService: LinkPreviewService,
    private readonly s3UploadService: S3UploadService,
  ) {}

  /**
   * Create a new post.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new post' })
  @ApiDataResponse(PostCreatedDataDto, {
    status: 201,
    description: 'Post created successfully',
  })
  async create(
    @CurrentUser() user: UserPayload,
    @Body()
    body: {
      type: PostType;
      subtype?: string;
      content?: string;
      hardSkills?: string[];
      softSkills?: string[];
      data?: Prisma.InputJsonValue;
      imageUrl?: string;
      linkUrl?: string;
      originalPostId?: string;
      coAuthors?: string[];
      scheduledAt?: string;
      threadId?: string;
      codeSnippet?: { language: string; code: string; filename?: string };
    },
  ) {
    // Auto-fetch link preview if linkUrl is provided
    let linkPreview: Prisma.InputJsonValue | undefined;
    if (body.linkUrl) {
      const preview = await this.linkPreviewService.fetchPreview(body.linkUrl);
      if (preview) {
        linkPreview = preview;
      }
    }

    return this.postService.create(user.userId, {
      ...body,
      linkPreview,
    });
  }

  /**
   * Get a post by ID.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a post by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(PostByIdDataDto, { description: 'Post details' })
  async findById(@Param('id') id: string) {
    return this.postService.findById(id);
  }

  /**
   * Soft delete a post (only the author can delete).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a post' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(PostDeletedDataDto, { description: 'Post deleted' })
  async delete(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    await this.postService.delete(id, user.userId);
    return { deleted: true };
  }

  /**
   * Upload an image for a post.
   */
  @Post('upload-image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload post image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiDataResponse(PostImageUploadDataDto, {
    description: 'Image uploaded successfully',
  })
  async uploadImage(@CurrentUser() user: UserPayload, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (file.size > FILE_UPLOAD_CONFIG.MAX_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${FILE_UPLOAD_CONFIG.MAX_SIZE / 1024 / 1024}MB`,
      );
    }

    const allowedTypes = FILE_UPLOAD_CONFIG.ALLOWED_IMAGE_TYPES;
    if (!allowedTypes.includes(file.mimetype as (typeof allowedTypes)[number])) {
      throw new BadRequestException(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    const extension = file.originalname.split('.').pop()?.toLowerCase() ?? 'jpg';
    const key = `posts/${user.userId}/${randomUUID()}.${extension}`;

    const result = await this.s3UploadService.uploadFile(file.buffer, key, file.mimetype);

    if (!result) {
      throw new BadRequestException(ERROR_MESSAGES.FILE_UPLOAD_UNAVAILABLE);
    }

    return result;
  }
}
