import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { ATSService } from './services/ats.service';
import type { ValidateCV, Validation } from '@/shared-kernel';

@SdkExport({ tag: 'ats-validation', description: 'Ats Validation API' })
@ApiTags('ATS Validation')
@Controller('v1/ats')
export class ATSController {
  constructor(private readonly atsService: ATSService) {}

  @Post('validate')
  @ApiOperation({
    summary: 'Validate CV for ATS compatibility',
    description:
      'Upload a CV (PDF or DOCX) to validate its compatibility with Applicant Tracking Systems. Returns detailed validation results including issues and suggestions.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CV file (PDF or DOCX)',
        },
        checkFormat: {
          type: 'boolean',
          description: 'Check document format (default: true)',
          default: true,
        },
        checkSections: {
          type: 'boolean',
          description: 'Check CV sections (default: true)',
          default: true,
        },
        checkGrammar: {
          type: 'boolean',
          description: 'Check grammar and spelling (default: false)',
          default: false,
        },
        checkOrder: {
          type: 'boolean',
          description: 'Check section order (default: true)',
          default: true,
        },
        checkLayout: {
          type: 'boolean',
          description: 'Check layout safety (default: true)',
          default: true,
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async validateCV(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() options: ValidateCV,
  ): Promise<Validation> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.atsService.validateCV(file, options);
  }
}
