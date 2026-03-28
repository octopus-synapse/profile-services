import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  ATSValidationResponseDto,
  ValidateCVOptionsDto,
  ValidationResponseDto,
} from './dto/ats.dto';
import { ATSService } from './services/ats.service';

@SdkExport({ tag: 'ats-validation', description: 'Ats Validation API' })
@ApiTags('ATS Validation')
@ApiBearerAuth('JWT-auth')
@Controller('v1/ats')
@RequirePermission(Permission.RESUME_READ)
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
  @UseInterceptors(FileInterceptor('file'))
  async validateCV(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() options: ValidateCVOptionsDto,
  ): Promise<DataResponse<ValidationResponseDto>> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.atsService.validateCV(file, options);
    return { success: true, data: result };
  }
}
