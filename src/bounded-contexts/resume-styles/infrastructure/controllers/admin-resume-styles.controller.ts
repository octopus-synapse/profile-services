import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
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
import { CreateStyleRequestDto, UpdateStyleRequestDto } from '../dto/admin-resume-style.dto';
import { StyleDetailDto } from '../dto/resume-style.dto';
import { presentDetail } from '../presenters/resume-style.presenter';

/**
 * Admin CRUD over `ResumeStyle`. The domain enforces:
 *   - 404 when the style id does not exist.
 *   - 422 when the calculated styleScore is below the ATS-safety threshold.
 *   - 422 when an update would regress the styleScore (also a Postgres
 *     trigger acts as a hard floor).
 *   - 422 (`RESUME_STYLE_NOT_EDITABLE`) for any attempt to mutate a system
 *     style.
 *
 * The mapping to HTTP is handled by `DomainExceptionFilter` — domain
 * subclasses already declare `code` + `statusHint`.
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
    const updated = await this.updateUseCase.execute(id, {
      name: body.name,
      description: body.description,
      typstTemplate: body.typstTemplate,
      layoutKind: body.layoutKind,
      styleConfig: body.styleConfig,
      sectionStyles: body.sectionStyles,
    });
    return { success: true, data: presentDetail(updated) };
  }

  @Delete(':id')
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a non-system ResumeStyle' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiEmptyDataResponse({ status: HttpStatus.NO_CONTENT, description: 'Style deleted' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.deleteUseCase.execute(id);
  }
}
