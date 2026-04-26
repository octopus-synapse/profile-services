import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import {
  ApiDataResponse,
  ApiEmptyDataResponse,
} from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { AdminOnly } from '@/shared-kernel/authorization';
import { CreateFitQuestionUseCase } from '../../application/use-cases/create-fit-question.use-case';
import { DeleteFitQuestionUseCase } from '../../application/use-cases/delete-fit-question.use-case';
import { GetFitQuestionUseCase } from '../../application/use-cases/get-fit-question.use-case';
import { ListFitQuestionsUseCase } from '../../application/use-cases/list-fit-questions.use-case';
import { UpdateFitQuestionUseCase } from '../../application/use-cases/update-fit-question.use-case';
import { FitQuestionNotFoundException } from '../../domain/exceptions/fit-profile.exceptions';
import {
  CreateFitQuestionDto,
  FitQuestionListResponseDto,
  FitQuestionResponseDto,
  UpdateFitQuestionDto,
} from '../../dto/admin-fit-question.dto';
import { presentFitQuestion, presentFitQuestionList } from '../presenters/fit-question.presenter';

/**
 * Admin CRUD for the `FitQuestion` pool. Intentionally thin — the real
 * seeding work lives in `prisma/seeds/fit-questions.seed.ts` (Task
 * #21). This surface lets us tweak the pool without touching code in
 * production.
 */
@SdkExport({ tag: 'admin-fit-questions', description: 'Admin FitQuestion CRUD' })
@ApiTags('admin-fit-questions')
@ApiBearerAuth('JWT-auth')
@Controller('v1/admin/fit-questions')
@UseGuards(JwtAuthGuard)
export class AdminFitQuestionsController {
  constructor(
    private readonly list: ListFitQuestionsUseCase,
    private readonly create: CreateFitQuestionUseCase,
    private readonly update: UpdateFitQuestionUseCase,
    private readonly deleteUseCase: DeleteFitQuestionUseCase,
    private readonly getOneUseCase: GetFitQuestionUseCase,
  ) {}

  @Get()
  @AdminOnly()
  @ApiOperation({ summary: 'List every FitQuestion in the pool' })
  @ApiDataResponse(FitQuestionListResponseDto, { description: 'FitQuestion pool' })
  async listAll(): Promise<DataResponse<FitQuestionListResponseDto>> {
    const rows = await this.list.execute();
    return { success: true, data: presentFitQuestionList(rows) };
  }

  @Get(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Get one FitQuestion by id' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(FitQuestionResponseDto, { description: 'FitQuestion row' })
  async getOne(@Param('id') id: string): Promise<DataResponse<FitQuestionResponseDto>> {
    const row = await this.getOneUseCase.execute(id);
    if (!row) throw new FitQuestionNotFoundException(id);
    return { success: true, data: presentFitQuestion(row) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AdminOnly()
  @ApiOperation({ summary: 'Create a new FitQuestion' })
  @ApiDataResponse(FitQuestionResponseDto, { description: 'Created FitQuestion' })
  async createOne(
    @Body() body: CreateFitQuestionDto,
  ): Promise<DataResponse<FitQuestionResponseDto>> {
    const row = await this.create.execute({
      key: body.key,
      dimension: body.dimension,
      textEn: body.textEn,
      textPtBr: body.textPtBr,
      scaleType: body.scaleType,
      weight: body.weight,
      isActive: body.isActive,
      reverseScored: body.reverseScored,
    });
    return { success: true, data: presentFitQuestion(row) };
  }

  @Patch(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Update an existing FitQuestion' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(FitQuestionResponseDto, { description: 'Updated FitQuestion' })
  async updateOne(
    @Param('id') id: string,
    @Body() body: UpdateFitQuestionDto,
  ): Promise<DataResponse<FitQuestionResponseDto>> {
    const row = await this.update.execute(id, body);
    return { success: true, data: presentFitQuestion(row) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AdminOnly()
  @ApiOperation({ summary: 'Delete a FitQuestion' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiEmptyDataResponse({ status: HttpStatus.NO_CONTENT })
  async deleteOne(@Param('id') id: string): Promise<void> {
    await this.deleteUseCase.execute(id);
  }
}
