/**
 * Post Controller (legacy multipart-only shell)
 *
 * Most post endpoints have moved to `feed.routes.ts`. The image upload
 * endpoint stays here because it relies on Nest's `FileInterceptor`
 * for multipart parsing, which the Route descriptor synthesizer does
 * not yet support.
 */

import {
  Controller,
  HttpCode,
  HttpStatus,
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
  ApiTags,
} from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { FeedUseCases } from '../../application/ports/feed.port';
import { PostImageUploadDataDto } from '../../dto/feed-response.dto';

@SdkExport({ tag: 'posts', description: 'Posts API', requiresAuth: true })
@ApiTags('posts')
@ApiBearerAuth('JWT-auth')
@RequirePermission(Permission.FEED_USE)
@Controller('v1/posts')
export class PostController {
  constructor(private readonly bc: FeedUseCases) {}

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
    return this.bc.uploadPostImage.execute(
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
