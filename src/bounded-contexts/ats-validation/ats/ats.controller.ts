import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { ValidateCV } from '@/shared-kernel';
import { ValidateCVRequestDto } from '@/shared-kernel/dtos/sdk-request.dto';
import { ATSService } from './services/ats.service';

/** DTO wrapper for ValidationResponse to satisfy Dto suffix rule */
export class ValidationResponseDto {
  @ApiProperty({ example: true })
  isValid!: boolean;

  @ApiProperty({ example: 85 })
  score!: number;

  @ApiProperty({ example: [], type: [Object] })
  issues!: {
    severity: string;
    category: string;
    message: string;
    location?: string;
    suggestion?: string;
  }[];

  @ApiProperty({ example: [], type: [String] })
  suggestions!: string[];

  @ApiProperty({ type: Object })
  metadata!: {
    fileName: string;
    fileType: string;
    fileSize: number;
    analyzedAt: string;
    semanticScore?: number;
  };
}

/** DTO for ATS validation response */
export class ATSValidationResponseDto {
  @ApiProperty({ example: 85 })
  score!: number;

  @ApiProperty({ example: [], type: [Object] })
  issues!: { field: string; message: string; severity: string }[];

  @ApiProperty({ example: [], type: [String] })
  suggestions!: string[];

  @ApiProperty({ example: true })
  isATSCompatible!: boolean;
}

@SdkExport({ tag: 'ats-validation', description: 'Ats Validation API' })
@ApiTags('ATS Validation')
@Controller('v1/ats')
export class ATSController {
  constructor(private readonly atsService: ATSService) {}

  @Post('validate')
  @ApiDataResponse(ATSValidationResponseDto, {
    description: 'ATS validation completed',
  })
  @ApiOperation({
    summary: 'Validate CV for ATS compatibility',
    description:
      'Upload a CV (PDF or DOCX) to validate its compatibility with Applicant Tracking Systems. Returns detailed validation results including issues and suggestions.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ValidateCVRequestDto })
  @UseInterceptors(FileInterceptor('file'))
  async validateCV(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() options: ValidateCV,
  ): Promise<DataResponse<ValidationResponseDto>> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.atsService.validateCV(file, options);
    return { success: true, data: result };
  }
}
