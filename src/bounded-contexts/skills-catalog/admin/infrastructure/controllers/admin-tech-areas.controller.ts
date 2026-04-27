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
import { CreateAdminTechAreaUseCase } from '../../application/use-cases/create-admin-tech-area/create-admin-tech-area.use-case';
import { DeleteAdminTechAreaUseCase } from '../../application/use-cases/delete-admin-tech-area/delete-admin-tech-area.use-case';
import { GetAdminTechAreaUseCase } from '../../application/use-cases/get-admin-tech-area/get-admin-tech-area.use-case';
import { ListAdminTechAreasUseCase } from '../../application/use-cases/list-admin-tech-areas/list-admin-tech-areas.use-case';
import { UpdateAdminTechAreaUseCase } from '../../application/use-cases/update-admin-tech-area/update-admin-tech-area.use-case';
import { TechAreaDataDto, TechAreaListDataDto } from '../../dto/admin-tech-areas-response.dto';

@SdkExport({ tag: 'admin-tech-areas', description: 'Admin Tech Areas API', requiresAuth: true })
@ApiTags('Admin - Tech Areas')
@ApiBearerAuth()
@RequirePermission(Permission.SKILL_MANAGE)
@Controller('v1/admin/tech-areas')
export class AdminTechAreasController {
  constructor(
    private readonly listUseCase: ListAdminTechAreasUseCase,
    private readonly getUseCase: GetAdminTechAreaUseCase,
    private readonly createUseCase: CreateAdminTechAreaUseCase,
    private readonly updateUseCase: UpdateAdminTechAreaUseCase,
    private readonly deleteUseCase: DeleteAdminTechAreaUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all tech areas' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiDataResponse(TechAreaListDataDto, { description: 'List of tech areas' })
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

  @Get(':id')
  @ApiOperation({ summary: 'Get tech area by ID' })
  @ApiDataResponse(TechAreaDataDto, { description: 'Tech area details' })
  async findOne(@Param('id') id: string) {
    return this.getUseCase.execute(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create tech area' })
  @ApiDataResponse(TechAreaDataDto, { description: 'Tech area created', status: 201 })
  async create(@Body() dto: Record<string, unknown>) {
    return this.createUseCase.execute(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tech area' })
  @ApiDataResponse(TechAreaDataDto, { description: 'Tech area updated' })
  async update(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.updateUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete tech area' })
  @ApiEmptyDataResponse({ description: 'Tech area deleted', status: 204 })
  async remove(@Param('id') id: string) {
    await this.deleteUseCase.execute(id);
  }
}
