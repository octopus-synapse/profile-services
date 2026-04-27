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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  ApiDataResponse,
  ApiEmptyDataResponse,
} from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { CreateAdminProgrammingLanguageUseCase } from '../../application/use-cases/create-admin-programming-language/create-admin-programming-language.use-case';
import { DeleteAdminProgrammingLanguageUseCase } from '../../application/use-cases/delete-admin-programming-language/delete-admin-programming-language.use-case';
import { GetAdminProgrammingLanguageUseCase } from '../../application/use-cases/get-admin-programming-language/get-admin-programming-language.use-case';
import { ListAdminProgrammingLanguagesUseCase } from '../../application/use-cases/list-admin-programming-languages/list-admin-programming-languages.use-case';
import { UpdateAdminProgrammingLanguageUseCase } from '../../application/use-cases/update-admin-programming-language/update-admin-programming-language.use-case';
import {
  ProgrammingLanguageDataDto,
  ProgrammingLanguageListDataDto,
} from '../../dto/admin-programming-languages-response.dto';

@SdkExport({
  tag: 'admin-programming-languages',
  description: 'Admin Programming Languages API',
  requiresAuth: true,
})
@ApiTags('Admin - Programming Languages')
@ApiBearerAuth()
@RequirePermission(Permission.SKILL_MANAGE)
@Controller('v1/admin/programming-languages')
export class AdminProgrammingLanguagesController {
  constructor(
    private readonly listUseCase: ListAdminProgrammingLanguagesUseCase,
    private readonly getUseCase: GetAdminProgrammingLanguageUseCase,
    private readonly createUseCase: CreateAdminProgrammingLanguageUseCase,
    private readonly updateUseCase: UpdateAdminProgrammingLanguageUseCase,
    private readonly deleteUseCase: DeleteAdminProgrammingLanguageUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all programming languages' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiDataResponse(ProgrammingLanguageListDataDto, { description: 'List of programming languages' })
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.listUseCase.execute({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      isActive: isActive !== undefined ? String(isActive) === 'true' : undefined,
    });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get programming language by slug' })
  @ApiDataResponse(ProgrammingLanguageDataDto, { description: 'Programming language details' })
  async findOne(@Param('slug') slug: string) {
    return this.getUseCase.execute(slug);
  }

  @Post()
  @ApiOperation({ summary: 'Create programming language' })
  @ApiDataResponse(ProgrammingLanguageDataDto, {
    description: 'Programming language created',
    status: 201,
  })
  async create(@Body() dto: Record<string, unknown>) {
    return this.createUseCase.execute(dto);
  }

  @Patch(':slug')
  @ApiOperation({ summary: 'Update programming language' })
  @ApiDataResponse(ProgrammingLanguageDataDto, { description: 'Programming language updated' })
  async update(@Param('slug') slug: string, @Body() dto: Record<string, unknown>) {
    return this.updateUseCase.execute(slug, dto);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete programming language' })
  @ApiEmptyDataResponse({ description: 'Programming language deleted', status: 204 })
  async remove(@Param('slug') slug: string) {
    await this.deleteUseCase.execute(slug);
  }
}
