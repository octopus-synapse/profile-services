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

import {
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
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { CreatePostUseCase } from '../../application/use-cases/create-post/create-post.use-case';
import { DeletePostUseCase } from '../../application/use-cases/delete-post/delete-post.use-case';
import { GetPostUseCase } from '../../application/use-cases/get-post/get-post.use-case';
import { UploadPostImageUseCase } from '../../application/use-cases/upload-post-image/upload-post-image.use-case';
import { CreatePostDto } from '../../dto/create-post-request.dto';
import {
  PostByIdDataDto,
  PostCreatedDataDto,
  PostDeletedDataDto,
  PostImageUploadDataDto,
} from '../../dto/feed-response.dto';

@SdkExport({ tag: 'posts', description: 'Posts API', requiresAuth: true })
@ApiTags('posts')
@ApiBearerAuth('JWT-auth')
@RequirePermission(Permission.FEED_USE)
@Controller('v1/posts')
export class PostController {
  constructor(
    private readonly createPostUseCase: CreatePostUseCase,
    private readonly getPostUseCase: GetPostUseCase,
    private readonly deletePostUseCase: DeletePostUseCase,
    private readonly uploadPostImageUseCase: UploadPostImageUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new post' })
  @ApiBody({ type: CreatePostDto })
  @ApiDataResponse(PostCreatedDataDto, { status: 201, description: 'Post created successfully' })
  async create(@CurrentUser() user: UserPayload, @Body() body: CreatePostDto) {
    return this.createPostUseCase.execute(user.userId, body);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a post by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(PostByIdDataDto, { description: 'Post details' })
  async findById(@Param('id') id: string) {
    return this.getPostUseCase.execute(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a post' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(PostDeletedDataDto, { description: 'Post deleted' })
  async delete(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    await this.deletePostUseCase.execute(id, user.userId);
    return { deleted: true };
  }

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
  @ApiDataResponse(PostImageUploadDataDto, { description: 'Image uploaded successfully' })
  async uploadImage(@CurrentUser() user: UserPayload, @UploadedFile() file: Express.Multer.File) {
    return this.uploadPostImageUseCase.execute(
      file
        ? {
            userId: user.userId,
            buffer: file.buffer,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
          }
        : null,
    );
  }
}
