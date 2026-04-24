import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure/interfaces/auth-request.interface';
import {
  ApiDataResponse,
  ApiEmptyDataResponse,
} from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { AdminOnly } from '@/shared-kernel/authorization';
import { CreateStyleUseCase } from '../../application/use-cases/admin/create-style.use-case';
import { DeleteStyleUseCase } from '../../application/use-cases/admin/delete-style.use-case';
import { UpdateStyleUseCase } from '../../application/use-cases/admin/update-style.use-case';
import {
  StyleBelowAtsThresholdError,
  StyleNotEditableError,
  StyleNotFoundError,
  StyleScoreRegressionError,
} from '../../domain/exceptions/resume-styles.exceptions';
import { CreateStyleRequestDto, UpdateStyleRequestDto } from '../dto/admin-resume-style.dto';
import { StyleDetailDto } from '../dto/resume-style.dto';
import { presentDetail } from '../presenters/resume-style.presenter';

/**
 * Admin CRUD over `ResumeStyle`. The plan invariants enforced here:
 *   - 422 if the calculated styleScore is below the ATS-safety threshold.
 *   - 422 if an update would regress the styleScore (also enforced by
 *     a Postgres trigger as a hard floor).
 *   - 422 (`style_not_editable`) for any attempt to mutate a system style.
 */
@SdkExport({ tag: 'admin-resume-styles', description: 'Admin ResumeStyle CRUD' })
@ApiTags('admin-resume-styles')
@ApiBearerAuth('JWT-auth')
@Controller('v1/admin/resume-styles')
@UseGuards(JwtAuthGuard)
export class AdminResumeStylesController {
  constructor(
    private readonly createUseCase: CreateStyleUseCase,
    private readonly updateUseCase: UpdateStyleUseCase,
    private readonly deleteUseCase: DeleteStyleUseCase,
  ) {}

  @Post()
  @AdminOnly()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new ResumeStyle (validates ATS threshold)' })
  @ApiDataResponse(StyleDetailDto, { description: 'Created style' })
  async create(
    @Body() body: CreateStyleRequestDto,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<StyleDetailDto>> {
    try {
      const created = await this.createUseCase.execute({
        name: body.name,
        description: body.description ?? null,
        typstTemplate: body.typstTemplate,
        layoutKind: body.layoutKind,
        styleConfig: body.styleConfig,
        sectionStyles: body.sectionStyles,
        authorId: user.userId,
      });
      return { success: true, data: presentDetail(created) };
    } catch (err) {
      this.translate(err);
    }
  }

  @Patch(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Update a non-system ResumeStyle' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(StyleDetailDto, { description: 'Updated style' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateStyleRequestDto,
  ): Promise<DataResponse<StyleDetailDto>> {
    try {
      const updated = await this.updateUseCase.execute(id, {
        name: body.name,
        description: body.description,
        typstTemplate: body.typstTemplate,
        layoutKind: body.layoutKind,
        styleConfig: body.styleConfig,
        sectionStyles: body.sectionStyles,
      });
      return { success: true, data: presentDetail(updated) };
    } catch (err) {
      this.translate(err);
    }
  }

  @Delete(':id')
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a non-system ResumeStyle' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiEmptyDataResponse({ status: HttpStatus.NO_CONTENT, description: 'Style deleted' })
  async delete(@Param('id') id: string): Promise<void> {
    try {
      await this.deleteUseCase.execute(id);
    } catch (err) {
      this.translate(err);
    }
  }

  private translate(err: unknown): never {
    if (err instanceof StyleNotFoundError) {
      throw new NotFoundException(err.message);
    }
    if (err instanceof StyleBelowAtsThresholdError) {
      throw new UnprocessableEntityException({
        code: 'style_below_ats_threshold',
        message: err.message,
        score: err.score,
        threshold: err.threshold,
      });
    }
    if (err instanceof StyleScoreRegressionError) {
      throw new UnprocessableEntityException({
        code: 'style_score_regression',
        message: err.message,
        currentScore: err.currentScore,
        attemptedScore: err.attemptedScore,
      });
    }
    if (err instanceof StyleNotEditableError) {
      throw new UnprocessableEntityException({
        code: 'style_not_editable',
        message: err.message,
      });
    }
    throw err;
  }
}
