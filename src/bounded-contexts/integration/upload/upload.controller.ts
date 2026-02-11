import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import type { UserPayload } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { DeleteResponseDto } from '@/shared-kernel';
import { UploadService } from './upload.service';

@SdkExport({ tag: 'upload', description: 'Upload API' })
@ApiTags('upload')
@ApiBearerAuth('JWT-auth')
@Controller('v1/upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('profile-image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload user profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Profile image file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile image uploaded successfully',
    schema: {
      example: {
        url: 'http://minio.example.com:9000/profile-uploads/profiles/userId/uuid.jpg',
        key: 'profiles/userId/uuid.jpg',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadProfileImage(
    @CurrentUser() user: UserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadService.uploadProfileImage(user.userId, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
  }

  @Post('company-logo/:resumeId')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload company logo for resume' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiBody({
    description: 'Company logo file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Company logo uploaded successfully',
    schema: {
      example: {
        url: 'http://minio.example.com:9000/profile-uploads/logos/userId/resumeId/uuid.png',
        key: 'logos/userId/resumeId/uuid.png',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadCompanyLogo(
    @CurrentUser() user: UserPayload,
    @Param('resumeId') resumeId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadService.uploadCompanyLogo(user.userId, resumeId, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
  }

  @Delete('file/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete uploaded file' })
  @ApiResponse({ status: 200, type: DeleteResponseDto })
  @ApiParam({ name: 'key', description: 'File key in S3' })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'File deleted successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteFile(@Param('key') key: string) {
    const result = await this.uploadService.deleteFile(key);

    return {
      success: result,
      message: result ? 'File deleted successfully' : 'Failed to delete file',
    };
  }
}
