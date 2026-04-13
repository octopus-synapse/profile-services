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
import { AdminTechSkillsService } from './admin-tech-skills.service';
import { TechSkillDataDto, TechSkillListDataDto } from './dto/admin-tech-skills-response.dto';

@SdkExport({
  tag: 'admin-tech-skills',
  description: 'Admin Tech Skills API',
  requiresAuth: true,
})
@ApiTags('Admin - Tech Skills')
@ApiBearerAuth()
@RequirePermission(Permission.SKILL_MANAGE)
@Controller('v1/admin/tech-skills')
export class AdminTechSkillsController {
  constructor(private readonly service: AdminTechSkillsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tech skills' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'nicheId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiDataResponse(TechSkillListDataDto, { description: 'List of tech skills' })
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
    @Query('nicheId') nicheId?: string,
    @Query('type') type?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.service.findAll({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      nicheId,
      type,
      isActive: isActive !== undefined ? String(isActive) === 'true' : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tech skill by ID' })
  @ApiDataResponse(TechSkillDataDto, { description: 'Tech skill details' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create tech skill' })
  @ApiDataResponse(TechSkillDataDto, { description: 'Tech skill created', status: 201 })
  async create(@Body() dto: Record<string, unknown>) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tech skill' })
  @ApiDataResponse(TechSkillDataDto, { description: 'Tech skill updated' })
  async update(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete tech skill' })
  @ApiEmptyDataResponse({ description: 'Tech skill deleted', status: 204 })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
  }
}
