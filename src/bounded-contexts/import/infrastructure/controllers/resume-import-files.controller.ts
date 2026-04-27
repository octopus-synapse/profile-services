/**
 * Resume Import - file upload controller (legacy, kept as Nest).
 *
 * Multipart `FileInterceptor` requires real Express middleware, which
 * the framework-free Route descriptors don't model yet. The PDF +
 * GitHub upload endpoints continue to live here while the rest of the
 * import surface is described by `import.routes.ts`.
 */

import { Controller, HttpStatus, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { MissingPdfUploadException } from '../../domain/exceptions/import.exceptions';
import { GithubImportService } from '../adapters/github-import.service';
import { PdfImportService } from '../adapters/pdf-import.service';
import { ImportResultDto } from '../dto';

@SdkExport({ tag: 'resume-import', description: 'Resume import from JSON Resume format' })
@ApiTags('Resume Import')
@ApiBearerAuth('JWT-auth')
@RequirePermission(Permission.RESUME_IMPORT)
@Controller('resume-import')
export class ResumeImportFilesController {
  constructor(
    private readonly pdfImport: PdfImportService,
    private readonly githubImport: GithubImportService,
  ) {}

  @Post('pdf')
  @ApiOperation({
    summary: 'Import resume from a PDF file',
    description:
      'Accepts a PDF upload (multipart/form-data, field name `file`), extracts the text with pdf-parse and structures it with the LLM. Creates a Resume row and marks it as primary when the user has none.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Binary PDF payload',
    required: true,
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'PDF file (max 5MB)' },
      },
    },
  })
  @ApiDataResponse(ImportResultDto, {
    status: HttpStatus.CREATED,
    description: 'CV imported from PDF',
  })
  @UseInterceptors(FileInterceptor('file'))
  async importPdf(
    @CurrentUser() user: UserPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<DataResponse<{ resumeId: string }>> {
    if (!file) throw new MissingPdfUploadException();
    const result = await this.pdfImport.import(user.userId, {
      buffer: file.buffer,
      originalname: file.originalname,
    });
    return { success: true, data: { resumeId: result.resumeId } };
  }

  @Post('github')
  @ApiOperation({
    summary: 'Import profile data from GitHub',
    description:
      "Uses the user's previously-connected GitHub OAuth token to fetch top repos and derive skills + BUILD posts. Fails with 409 GITHUB_NOT_CONNECTED if the user hasn't linked GitHub yet.",
  })
  @ApiDataResponse(ImportResultDto, { status: HttpStatus.OK, description: 'GitHub data imported' })
  async importGithub(
    @CurrentUser() user: UserPayload,
  ): Promise<
    DataResponse<{ primaryStack: string[]; buildPostsCreated: number; profileUpdated: boolean }>
  > {
    const result = await this.githubImport.import(user.userId);
    return {
      success: true,
      data: {
        primaryStack: result.primaryStack,
        buildPostsCreated: result.buildPostsCreated,
        profileUpdated: result.profileUpdated,
      },
    };
  }
}
