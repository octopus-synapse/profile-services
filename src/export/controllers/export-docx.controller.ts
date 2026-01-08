/**
 * Export DOCX Controller
 * Handles DOCX resume export
 */

import {
  Controller,
  Get,
  UseGuards,
  StreamableFile,
  Header,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProduces,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResumeDOCXService } from '../services/resume-docx.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../../auth/interfaces/auth-request.interface';
import { AppLoggerService } from '../../common/logger/logger.service';

@ApiTags('export')
@ApiBearerAuth('JWT-auth')
@Controller('v1/export')
export class ExportDocxController {
  constructor(
    private readonly resumeDOCXService: ResumeDOCXService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(ExportDocxController.name);
  }

  @UseGuards(JwtAuthGuard)
  @Get('resume/docx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
  @Header('Content-Disposition', 'attachment; filename="resume.docx"')
  @ApiOperation({ summary: 'Export resume as DOCX document' })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
  @ApiResponse({ status: 200, description: 'DOCX document file' })
  @ApiResponse({ status: 400, description: 'Failed to generate DOCX' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportResumeDOCX(
    @CurrentUser() user: UserPayload,
  ): Promise<StreamableFile> {
    try {
      const buffer = await this.resumeDOCXService.generate(user.userId);
      return new StreamableFile(buffer);
    } catch (error) {
      this.logger.errorWithMeta('Failed to generate DOCX', {
        userId: user.userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new InternalServerErrorException(
        'Failed to generate DOCX. Please try again later.',
      );
    }
  }
}
