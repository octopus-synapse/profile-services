import {
  Controller,
  Delete,
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
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  DeleteResponseDto,
  UploadCompanyLogoRequestDto,
  UploadProfileImageRequestDto,
  UploadResponseDto,
} from './dto/upload.dto';
import { UploadService } from './upload.service';

@SdkExport({ tag: 'upload', description: 'Upload API' })
@ApiTags('upload')
@ApiBearerAuth('JWT-auth')
@Controller('v1/upload')
@RequirePermission(Permission.RESUME_UPDATE)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('profile-image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload user profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadProfileImageRequestDto })
  @ApiDataResponse(UploadResponseDto, {
    description: 'Profile image uploaded successfully',
  })
  async uploadProfileImage(
    @CurrentUser() user: UserPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<DataResponse<UploadResponseDto>> {
    const result = await this.uploadService.uploadProfileImage(user.userId, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
    return { success: true, data: result };
  }

  @Post('company-logo/:resumeId')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload company logo for resume' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiBody({ type: UploadCompanyLogoRequestDto })
  @ApiDataResponse(UploadResponseDto, {
    description: 'Company logo uploaded successfully',
  })
  async uploadCompanyLogo(
    @CurrentUser() user: UserPayload,
    @Param('resumeId') resumeId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<DataResponse<UploadResponseDto>> {
    const result = await this.uploadService.uploadCompanyLogo(user.userId, resumeId, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
    return { success: true, data: result };
  }

  @Delete('file/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete uploaded file' })
  @ApiParam({ name: 'key', description: 'File key in S3' })
  @ApiDataResponse(DeleteResponseDto, {
    description: 'File deleted successfully',
  })
  async deleteFile(@Param('key') key: string): Promise<DataResponse<DeleteResponseDto>> {
    const result = await this.uploadService.deleteFile(key);

    return {
      success: true,
      data: {
        deleted: result,
      },
    };
  }
}
