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
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { AdminTechNichesService } from './admin-tech-niches.service';

@SdkExport({
  tag: 'admin-tech-niches',
  description: 'Admin Tech Niches API',
  requiresAuth: true,
})
@ApiTags('Admin - Tech Niches')
@ApiBearerAuth()
@RequirePermission(Permission.SKILL_MANAGE)
@Controller('v1/admin/tech-niches')
export class AdminTechNichesController {
  constructor(private readonly service: AdminTechNichesService) {}

  @Get()
  @ApiOperation({ summary: 'List all tech niches' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'areaId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
    @Query('areaId') areaId?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    const result = await this.service.findAll({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      areaId,
      isActive: isActive !== undefined ? String(isActive) === 'true' : undefined,
    });
    return { success: true, data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tech niche by ID' })
  async findOne(@Param('id') id: string) {
    const result = await this.service.findOne(id);
    return { success: true, data: result };
  }

  @Post()
  @ApiOperation({ summary: 'Create tech niche' })
  async create(@Body() dto: Record<string, unknown>) {
    const result = await this.service.create(dto);
    return { success: true, data: result };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tech niche' })
  async update(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    const result = await this.service.update(id, dto);
    return { success: true, data: result };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete tech niche' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
  }
}
