import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure/interfaces/auth-request.interface';
import {
  ApiDataResponse,
  ApiEmptyDataResponse,
} from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { ApplyStyleToResumeUseCase } from '../../application/use-cases/apply-style-to-resume.use-case';
import { GetStyleUseCase } from '../../application/use-cases/get-style.use-case';
import { ListStylesUseCase } from '../../application/use-cases/list-styles.use-case';
import { PreviewStyleUseCase } from '../../application/use-cases/preview-style.use-case';
import {
  ResumeNotFoundForStyleApplyError,
  StyleNotFoundError,
} from '../../domain/exceptions/resume-styles.exceptions';
import {
  ApplyStyleRequestDto,
  StyleDetailDto,
  StyleListResponseDto,
} from '../dto/resume-style.dto';
import { presentDetail, presentList } from '../presenters/resume-style.presenter';

@SdkExport({ tag: 'resume-styles', description: 'ResumeStyle catalog + apply' })
@ApiTags('resume-styles')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard)
export class ResumeStylesController {
  constructor(
    private readonly listUseCase: ListStylesUseCase,
    private readonly getUseCase: GetStyleUseCase,
    private readonly previewUseCase: PreviewStyleUseCase,
    private readonly applyUseCase: ApplyStyleToResumeUseCase,
  ) {}

  @Get('v1/resume-styles')
  @ApiOperation({ summary: 'List published resume styles' })
  @ApiDataResponse(StyleListResponseDto, { description: 'Paginated styles' })
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<DataResponse<StyleListResponseDto>> {
    const result = await this.listUseCase.execute({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return { success: true, data: presentList(result) };
  }

  @Get('v1/resume-styles/:id')
  @ApiOperation({ summary: 'Get one ResumeStyle by id' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(StyleDetailDto, { description: 'Style detail' })
  async getOne(@Param('id') id: string): Promise<DataResponse<StyleDetailDto>> {
    try {
      const style = await this.getUseCase.execute(id);
      return { success: true, data: presentDetail(style) };
    } catch (err) {
      if (err instanceof StyleNotFoundError) throw new NotFoundException(err.message);
      throw err;
    }
  }

  @Get('v1/resume-styles/:id/preview.pdf')
  @ApiOperation({ summary: 'Render a generic preview PDF for the style' })
  @ApiParam({ name: 'id', type: 'string' })
  async preview(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      const buffer = await this.previewUseCase.execute(id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="style-${id}-preview.pdf"`);
      res.end(buffer);
    } catch (err) {
      if (err instanceof StyleNotFoundError) throw new NotFoundException(err.message);
      throw err;
    }
  }

  @Post('v1/resumes/:resumeId/style')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Apply a ResumeStyle to a resume' })
  @ApiParam({ name: 'resumeId', type: 'string' })
  @ApiEmptyDataResponse({ status: HttpStatus.NO_CONTENT, description: 'Style applied' })
  async apply(
    @Param('resumeId') resumeId: string,
    @Body() body: ApplyStyleRequestDto,
    @CurrentUser() user: UserPayload,
  ): Promise<void> {
    try {
      await this.applyUseCase.execute({
        userId: user.userId,
        resumeId,
        styleId: body.styleId,
      });
    } catch (err) {
      if (err instanceof StyleNotFoundError || err instanceof ResumeNotFoundForStyleApplyError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }
}
