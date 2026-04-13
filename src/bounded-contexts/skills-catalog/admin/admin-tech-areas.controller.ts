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
import { AdminTechAreasService } from './admin-tech-areas.service';

@SdkExport({
  tag: 'admin-tech-areas',
  description: 'Admin Tech Areas API',
  requiresAuth: true,
})
@ApiTags('Admin - Tech Areas')
@ApiBearerAuth()
@RequirePermission(Permission.SKILL_MANAGE)
@Controller('v1/admin/tech-areas')
export class AdminTechAreasController {
  constructor(private readonly service: AdminTechAreasService) {}

  @Get()
  @ApiOperation({ summary: 'List all tech areas' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    const result = await this.service.findAll({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      isActive: isActive !== undefined ? String(isActive) === 'true' : undefined,
    });
    return { success: true, data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tech area by ID' })
  async findOne(@Param('id') id: string) {
    const result = await this.service.findOne(id);
    return { success: true, data: result };
  }

  @Post()
  @ApiOperation({ summary: 'Create tech area' })
  async create(@Body() dto: Record<string, unknown>) {
    const result = await this.service.create(dto);
    return { success: true, data: result };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tech area' })
  async update(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    const result = await this.service.update(id, dto);
    return { success: true, data: result };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete tech area' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
  }
}
