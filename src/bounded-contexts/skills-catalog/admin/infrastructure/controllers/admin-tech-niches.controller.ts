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
import { CreateAdminTechNicheUseCase } from '../../application/use-cases/create-admin-tech-niche/create-admin-tech-niche.use-case';
import { DeleteAdminTechNicheUseCase } from '../../application/use-cases/delete-admin-tech-niche/delete-admin-tech-niche.use-case';
import { GetAdminTechNicheUseCase } from '../../application/use-cases/get-admin-tech-niche/get-admin-tech-niche.use-case';
import { ListAdminTechNichesUseCase } from '../../application/use-cases/list-admin-tech-niches/list-admin-tech-niches.use-case';
import { UpdateAdminTechNicheUseCase } from '../../application/use-cases/update-admin-tech-niche/update-admin-tech-niche.use-case';
import { TechNicheDataDto, TechNicheListDataDto } from '../../dto/admin-tech-niches-response.dto';

@SdkExport({ tag: 'admin-tech-niches', description: 'Admin Tech Niches API', requiresAuth: true })
@ApiTags('Admin - Tech Niches')
@ApiBearerAuth()
@RequirePermission(Permission.SKILL_MANAGE)
@Controller('v1/admin/tech-niches')
export class AdminTechNichesController {
  constructor(
    private readonly listUseCase: ListAdminTechNichesUseCase,
    private readonly getUseCase: GetAdminTechNicheUseCase,
    private readonly createUseCase: CreateAdminTechNicheUseCase,
    private readonly updateUseCase: UpdateAdminTechNicheUseCase,
    private readonly deleteUseCase: DeleteAdminTechNicheUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all tech niches' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'areaId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiDataResponse(TechNicheListDataDto, { description: 'List of tech niches' })
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
    @Query('areaId') areaId?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.listUseCase.execute({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      areaId,
      isActive: isActive !== undefined ? String(isActive) === 'true' : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tech niche by ID' })
  @ApiDataResponse(TechNicheDataDto, { description: 'Tech niche details' })
  async findOne(@Param('id') id: string) {
    return this.getUseCase.execute(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create tech niche' })
  @ApiDataResponse(TechNicheDataDto, { description: 'Tech niche created', status: 201 })
  async create(@Body() dto: Record<string, unknown>) {
    return this.createUseCase.execute(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tech niche' })
  @ApiDataResponse(TechNicheDataDto, { description: 'Tech niche updated' })
  async update(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.updateUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete tech niche' })
  @ApiEmptyDataResponse({ description: 'Tech niche deleted', status: 204 })
  async remove(@Param('id') id: string) {
    await this.deleteUseCase.execute(id);
  }
}
